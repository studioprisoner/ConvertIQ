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
          const scannedUrl = rawDataObj.url;
          if (!scannedUrl) continue;
          
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

      // Validate the URL
      const validation = await validateUrl(input.url);
      if (!validation.isValid) {
        throw new Error(validation.error || 'Invalid URL');
      }

      // Check if domain with this URL already exists for this user
      const existing = await db
        .select()
        .from(websites)
        .where(and(
          eq(websites.url, input.url),
          eq(websites.userId, userId)
        ))
        .limit(1);

      if (existing.length > 0) {
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
   * Create or get existing website record
   */
  createOrGet: publicProcedure
    .input(z.object({
      url: z.string().url(),
      pageType: z.string().optional(),
      userId: z.string().optional().default('test-user-123'), // For now, until auth is fully implemented
    }))
    .mutation(async ({ input }) => {
      try {
        // Validate the URL first
        const validation = await validateUrl(input.url, input.pageType);
        if (!validation.isValid) {
          throw new Error(validation.error || 'Invalid URL');
        }

        // Check if website already exists for this URL
        const existing = await db
          .select()
          .from(websites)
          .where(eq(websites.url, input.url))
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

          return updated[0];
        }

        // Create new website record (using a fallback userId for now)
        const newWebsite = await db
          .insert(websites)
          .values({
            userId: 'anonymous', // Simplified for testing - will need proper auth later
            url: input.url,
            name: new URL(input.url).hostname,
            pageType: input.pageType || 'homepage',
            isValidated: true,
            validationStatus: 'valid',
            validationMessage: validation.message,
            lastValidatedAt: new Date(),
          })
          .returning();

        return newWebsite[0];
      } catch (error) {
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