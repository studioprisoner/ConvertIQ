import { z } from 'zod';
import { createTRPCRouter, publicProcedure, protectedProcedure } from '../server';
import { websites } from '@/db/schema/websites';
import { analyses } from '@/db/schema/analyses';
import { eq, desc, and, ne } from 'drizzle-orm';
import { db } from '@/db/connection';
import { checkFeatureAccess } from '@/lib/feature-gate';
import { trackUsage } from '@/lib/subscription-service';

// Import URL validation
import { validateUrl } from '@/lib/url-validation';

// Helper function to extract domain from URL
function extractDomain(url: string): string {
  try {
    const urlObj = new URL(url);
    return urlObj.hostname.toLowerCase();
  } catch {
    return url.toLowerCase();
  }
}

// Helper function to check if two URLs belong to the same domain
function isSameDomain(url1: string, url2: string): boolean {
  return extractDomain(url1) === extractDomain(url2);
}

export const websitesRouter = createTRPCRouter({
  /**
   * List all domains for authenticated user (Pro feature)
   */
  list: protectedProcedure
    .query(async ({ ctx }) => {
      const userId = ctx.session.user.id;
      
      // Check if user has access to multiple domains feature
      const featureAccess = await checkFeatureAccess(userId, 'multiple_websites');
      if (!featureAccess.hasAccess) {
        throw new Error('Multiple domains feature requires Pro subscription');
      }

      // First get all websites for the user
      const userWebsites = await db
        .select()
        .from(websites)
        .where(eq(websites.userId, userId))
        .orderBy(desc(websites.updatedAt));

      // Get all completed analyses (we'll filter by domain in memory for now)
      // In a production app with many analyses, we'd want to optimize this further
      const allAnalyses = await db
        .select({
          createdAt: analyses.createdAt,
          rawData: analyses.rawData
        })
        .from(analyses)
        .where(eq(analyses.status, 'completed'))
        .orderBy(desc(analyses.createdAt));

      // Build a map of domains to their most recent analysis
      const domainToLatestAnalysis = new Map<string, { createdAt: Date }>();
      
      for (const analysis of allAnalyses) {
        if (!analysis.rawData) continue;
        
        try {
          const rawDataObj = JSON.parse(analysis.rawData);
          const scannedUrl = rawDataObj.url || rawDataObj.finalUrl || rawDataObj.redirectUrl;
          if (!scannedUrl || scannedUrl.trim() === '') continue;
          
          const scannedDomain = extractDomain(scannedUrl);
          
          // Only store if this is the most recent for this domain
          if (!domainToLatestAnalysis.has(scannedDomain)) {
            domainToLatestAnalysis.set(scannedDomain, { createdAt: analysis.createdAt });
          }
        } catch {
          continue;
        }
      }

      // Map websites to their scan dates based on domain matching
      const websitesWithScanDates = userWebsites.map(website => {
        const websiteDomain = extractDomain(website.url);
        const latestAnalysis = domainToLatestAnalysis.get(websiteDomain);

        return {
          ...website,
          lastScanAt: latestAnalysis?.createdAt || null,
          status: website.isValidated ? 'active' as const : 'inactive' as const
        };
      });

      return websitesWithScanDates;
    }),

  /**
   * Create new domain (Pro feature)
   */
  create: protectedProcedure
    .input(z.object({
      name: z.string().min(1, 'Domain name is required'),
      url: z.string().url('Please enter a valid URL'),
      description: z.string().optional(),
    }))
    .mutation(async ({ input, ctx }) => {
      const userId = ctx.session.user.id;
      
      // Check if user has access to multiple domains feature
      const featureAccess = await checkFeatureAccess(userId, 'multiple_websites');
      if (!featureAccess.hasAccess) {
        throw new Error('Multiple domains feature requires Pro subscription');
      }

      // Validate the URL (skip accessibility check to avoid timeouts)
      const validation = await validateUrl(input.url, undefined, undefined, undefined, true);
      if (!validation.isValid) {
        throw new Error(validation.error || 'Invalid URL');
      }

      // Check current domain count and enforce limits
      const userWebsites = await db
        .select()
        .from(websites)
        .where(eq(websites.userId, userId));

      // Pro plan limit: 10 domains
      const DOMAIN_LIMIT = 10;
      if (userWebsites.length >= DOMAIN_LIMIT) {
        throw new Error(`Pro plan allows up to ${DOMAIN_LIMIT} domains. You currently have ${userWebsites.length} domains. Please remove some domains or upgrade your plan.`);
      }

      // Check if domain with this URL already exists for this user
      const existing = userWebsites.find(website => website.url === input.url);
      if (existing) {
        throw new Error('Domain with this URL already exists');
      }

      // Create new domain
      const newWebsite = await db
        .insert(websites)
        .values({
          userId,
          name: input.name,
          url: input.url,
          description: input.description,
          pageType: 'homepage',
          isValidated: true,
          validationStatus: 'valid',
          validationMessage: validation.message,
          lastValidatedAt: new Date(),
        })
        .returning();

      // Track usage
      await trackUsage(userId, 'add_website');

      return newWebsite[0];
    }),

  /**
   * Update domain (Pro feature)
   */
  update: protectedProcedure
    .input(z.object({
      id: z.string().uuid(),
      name: z.string().min(1, 'Domain name is required').optional(),
      url: z.string().url('Please enter a valid URL').optional(),
      description: z.string().optional(),
    }))
    .mutation(async ({ input, ctx }) => {
      const userId = ctx.session.user.id;
      
      // Check if user has access to multiple domains feature
      const featureAccess = await checkFeatureAccess(userId, 'multiple_websites');
      if (!featureAccess.hasAccess) {
        throw new Error('Multiple domains feature requires Pro subscription');
      }

      // Check if website exists and belongs to user
      const existing = await db
        .select()
        .from(websites)
        .where(and(
          eq(websites.id, input.id),
          eq(websites.userId, userId)
        ))
        .limit(1);

      if (existing.length === 0) {
        throw new Error('Website not found or access denied');
      }

      const updateData: any = {
        updatedAt: new Date(),
      };

      if (input.name) updateData.name = input.name;
      if (input.description !== undefined) updateData.description = input.description;
      
      if (input.url) {
        // Validate the new URL
        const validation = await validateUrl(input.url);
        if (!validation.isValid) {
          throw new Error(validation.error || 'Invalid URL');
        }

        // Check if another website with this URL already exists for this user
        const urlExists = await db
          .select()
          .from(websites)
          .where(and(
            eq(websites.url, input.url),
            eq(websites.userId, userId),
            // Exclude current website
            ne(websites.id, input.id)
          ))
          .limit(1);

        if (urlExists.length > 0) {
          throw new Error('Another website with this URL already exists');
        }

        updateData.url = input.url;
        updateData.isValidated = true;
        updateData.validationStatus = 'valid';
        updateData.validationMessage = validation.message;
        updateData.lastValidatedAt = new Date();
      }

      const updatedWebsite = await db
        .update(websites)
        .set(updateData)
        .where(eq(websites.id, input.id))
        .returning();

      return updatedWebsite[0];
    }),

  /**
   * Delete domain (Pro feature)
   */
  delete: protectedProcedure
    .input(z.object({
      id: z.string().uuid(),
    }))
    .mutation(async ({ input, ctx }) => {
      const userId = ctx.session.user.id;
      
      // Check if user has access to multiple domains feature
      const featureAccess = await checkFeatureAccess(userId, 'multiple_websites');
      if (!featureAccess.hasAccess) {
        throw new Error('Multiple domains feature requires Pro subscription');
      }

      // Check if website exists and belongs to user
      const existing = await db
        .select()
        .from(websites)
        .where(and(
          eq(websites.id, input.id),
          eq(websites.userId, userId)
        ))
        .limit(1);

      if (existing.length === 0) {
        throw new Error('Website not found or access denied');
      }

      // Delete the website (this will cascade delete analyses due to foreign key constraint)
      await db
        .delete(websites)
        .where(eq(websites.id, input.id));

      return { success: true };
    }),

  /**
   * Create or get existing website record (with Pro plan domain validation)
   */
  createOrGet: protectedProcedure
    .input(z.object({
      url: z.string().url(),
      pageType: z.string().optional(),
    }))
    .mutation(async ({ input, ctx }): Promise<{
      id: string;
      userId: string;
      url: string;
      name: string | null;
      description: string | null;
      pageType: string | null;
      isValidated: boolean | null;
      validationStatus: string | null;
      validationMessage: string | null;
      lastValidatedAt: Date | null;
      createdAt: Date | null;
      updatedAt: Date | null;
      scanUrl: string;
    }> => {
      try {
        console.log('🚀 createOrGet mutation started for URL:', input.url);
        const userId = ctx.session.user.id;
        console.log('👤 User ID:', userId);
        
        // Extract domain from URL for validation (do this first)
        const urlObj = new URL(input.url);
        const scanDomain = urlObj.hostname.toLowerCase();
        console.log('🌐 Extracted scan domain:', scanDomain);

        // Get user's existing domains first
        console.log('📊 Querying user domains...');
        const userDomains = await db
          .select()
          .from(websites)
          .where(eq(websites.userId, userId));
        console.log('📊 Found user domains:', userDomains.length);

        // Check if the domain is already in user's allowed domains
        const isDomainAllowed = userDomains.some(domain => {
          const domainHost = new URL(domain.url).hostname.toLowerCase();
          return domainHost === scanDomain;
        });

        if (!isDomainAllowed) {
          console.log('❌ Domain not in allowed domains, checking if user can add new domains...');
          
          // Only check multiple_websites feature if user is trying to scan a NEW domain
          console.log('🔐 Checking feature access for multiple_websites...');
          const featureAccess = await checkFeatureAccess(userId, 'multiple_websites');
          console.log('🔐 Feature access result:', featureAccess);
          
          if (!featureAccess.hasAccess) {
            console.log('❌ User cannot add multiple domains - Basic plan restriction');
            throw new Error('DOMAIN_VALIDATION_REQUIRED');
          }

          // User has Pro plan, check domain limits
          const DOMAIN_LIMIT = 10;
          
          if (userDomains.length >= DOMAIN_LIMIT) {
            throw new Error(`DOMAIN_LIMIT_REACHED:This domain is not in your allowed domains list. Pro plan allows up to ${DOMAIN_LIMIT} domains. Please add this domain to your domains list first or scan a URL from your existing domains.`);
          } else {
            // User has space - offer to add domain
            throw new Error(`DOMAIN_NOT_ALLOWED:This domain is not in your allowed domains list. Would you like to add "${scanDomain}" to your domains? You are using ${userDomains.length} of ${DOMAIN_LIMIT} domains.`);
          }
        }

        console.log('✅ Domain is allowed - user can scan this domain');

        // Only validate URL if domain is allowed (to avoid timeout blocking domain validation)
        console.log('✅ Domain allowed, starting URL validation...');
        // Skip accessibility check to avoid timeouts during testing/development
        const validation = await validateUrl(input.url, input.pageType, undefined, undefined, true);
        console.log('✅ URL validation result:', validation);
        if (!validation.isValid) {
          console.log('❌ URL validation failed:', validation.error);
          throw new Error(validation.error || 'Invalid URL');
        }

        // For domain management, we want to check/create based on parent domain
        // but for scanning, we still want to use the specific URL
        const parentDomainUrl = `${urlObj.protocol}//${urlObj.hostname}`;
        
        // Check if website already exists for the parent domain
        const existing = await db
          .select()
          .from(websites)
          .where(and(
            eq(websites.url, parentDomainUrl),
            eq(websites.userId, userId)
          ))
          .limit(1);

        if (existing.length > 0) {
          // Update existing website with latest info
          const updated = await db
            .update(websites)
            .set({
              pageType: input.pageType || existing[0].pageType,
              isValidated: true,
              validationStatus: 'valid',
              validationMessage: validation.message,
              lastValidatedAt: new Date(),
              updatedAt: new Date(),
            })
            .where(eq(websites.id, existing[0].id))
            .returning();

          // Return the existing record but with the original scan URL for crawling
          return {
            ...updated[0],
            scanUrl: input.url // Add the original URL for crawling purposes
          };
        }

        // Create new website record for the parent domain
        const newWebsite = await db
          .insert(websites)
          .values({
            userId,
            url: parentDomainUrl, // Store parent domain for domain management
            name: urlObj.hostname,
            pageType: input.pageType || 'homepage',
            isValidated: true,
            validationStatus: 'valid',
            validationMessage: validation.message,
            lastValidatedAt: new Date(),
          })
          .returning();

        // Return the new record but with the original scan URL for crawling
        return {
          ...newWebsite[0],
          scanUrl: input.url // Add the original URL for crawling purposes
        };
      } catch (error) {
        // Don't log domain validation errors as they are expected user flow
        if (error instanceof Error && (
          error.message.startsWith('DOMAIN_NOT_ALLOWED:') || 
          error.message.startsWith('DOMAIN_LIMIT_REACHED:')
        )) {
          // These are expected validation errors, not system failures
          throw error;
        }
        
        // Only log unexpected errors
        console.error('Website creation failed:', error);
        throw new Error(`Failed to create website: ${error instanceof Error ? error.message : 'Unknown error'}`);
      }
    }),

  /**
   * Get website by ID
   */
  getById: publicProcedure
    .input(z.object({
      id: z.string().uuid(),
    }))
    .query(async ({ input }) => {
      const website = await db
        .select()
        .from(websites)
        .where(eq(websites.id, input.id))
        .limit(1);

      if (website.length === 0) {
        throw new Error('Website not found');
      }

      return website[0];
    }),

  /**
   * Get website by URL
   */
  getByUrl: publicProcedure
    .input(z.object({
      url: z.string().url(),
    }))
    .query(async ({ input }) => {
      const website = await db
        .select()
        .from(websites)
        .where(eq(websites.url, input.url))
        .limit(1);

      return website.length > 0 ? website[0] : null;
    }),

  /**
   * Get all websites for a user
   */
  getByUser: publicProcedure
    .input(z.object({
      userId: z.string().optional().default('anonymous-user'),
    }))
    .query(async ({ input }) => {
      const userWebsites = await db
        .select()
        .from(websites)
        .where(eq(websites.userId, input.userId))
        .orderBy(desc(websites.updatedAt));

      return userWebsites;
    }),

  /**
   * Get website with latest analysis
   */
  getWithLatestAnalysis: publicProcedure
    .input(z.object({
      websiteId: z.string().uuid(),
    }))
    .query(async ({ input }) => {
      // Get website info
      const website = await db
        .select()
        .from(websites)
        .where(eq(websites.id, input.websiteId))
        .limit(1);

      if (website.length === 0) {
        throw new Error('Website not found');
      }

      // Get latest analysis for this website
      const latestAnalysis = await db
        .select()
        .from(analyses)
        .where(eq(analyses.websiteId, input.websiteId))
        .orderBy(desc(analyses.createdAt))
        .limit(1);

      return {
        website: website[0],
        latestAnalysis: latestAnalysis.length > 0 ? latestAnalysis[0] : null,
      };
    }),
});