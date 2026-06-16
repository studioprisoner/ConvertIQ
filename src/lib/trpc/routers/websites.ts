import { z } from 'zod';
import { createTRPCRouter, publicProcedure, protectedProcedure } from '../server';
import { websites, pageTypeEnum } from '@/db/schema/websites';
import { analyses } from '@/db/schema/analyses';
import { user } from '@/db/schema/auth';
import { eq, desc, and, ne } from 'drizzle-orm';
import { db } from '@/db/connection';
import { checkFeatureAccess } from '@/lib/feature-gate';
import { trackUsage } from '@/lib/subscription-service';

// Import URL validation
import { validateUrl, assertPublicTarget } from '@/lib/url-validation';
import { randomUUID } from 'node:crypto';

// Helper function to extract domain from URL
function extractDomain(url: string): string {
  try {
    const urlObj = new URL(url);
    return urlObj.hostname.toLowerCase();
  } catch {
    return url.toLowerCase();
  }
}

// Helper function to normalize domain (remove www prefix)
function normalizeDomain(hostname: string): string {
  return hostname.toLowerCase().replace(/^www\./, '');
}

// Helper function to check if two URLs belong to the same domain (ignoring www)
function isSameDomain(url1: string, url2: string): boolean {
  const domain1 = normalizeDomain(extractDomain(url1));
  const domain2 = normalizeDomain(extractDomain(url2));
  return domain1 === domain2;
}

// Helper function to map validation page types to database enum values
type PageType = (typeof pageTypeEnum.enumValues)[number];

function mapPageTypeToDbEnum(pageType: string): PageType {
  switch (pageType) {
    case 'homepage': return 'homepage';
    case 'product': return 'ecommerce-product';
    case 'service': return 'service-landing';
    case 'landing': return 'landing-page';
    case 'other': return 'unknown';
    default: return 'unknown';
  }
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
          // 'inactive' is reserved for explicitly invalid domains; unverified
          // domains remain usable (ownership verification is additive, not gating)
          status: website.validationStatus === 'invalid' ? 'inactive' as const : 'active' as const
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

      // Check if domain with this URL already exists for this user (ignoring www)
      const inputDomain = normalizeDomain(extractDomain(input.url));
      const existing = userWebsites.find(website => {
        const websiteDomain = normalizeDomain(extractDomain(website.url));
        return websiteDomain === inputDomain;
      });
      if (existing) {
        throw new Error('Domain already exists (www and non-www versions are treated as the same domain)');
      }

      // Create new domain
      const newWebsite = await db
        .insert(websites)
        .values({
          userId,
          name: input.name,
          url: input.url,
          description: input.description,
          pageType: mapPageTypeToDbEnum('homepage'),
          // Ownership is unverified until the user passes meta-tag verification.
          // validationMessage still reflects the URL accessibility check.
          isValidated: false,
          validationStatus: 'unverified',
          validationMessage: validation.message,
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

        // Check if another website with this domain already exists for this user (ignoring www)
        const inputDomain = normalizeDomain(extractDomain(input.url));
        const allUserWebsites = await db
          .select()
          .from(websites)
          .where(and(
            eq(websites.userId, userId),
            // Exclude current website
            ne(websites.id, input.id)
          ));

        const domainExists = allUserWebsites.some(website => {
          const websiteDomain = normalizeDomain(extractDomain(website.url));
          return websiteDomain === inputDomain;
        });

        if (domainExists) {
          throw new Error('Another website with this domain already exists (www and non-www versions are treated as the same domain)');
        }

        updateData.url = input.url;
        // Changing the URL resets ownership verification — the new domain has
        // not been verified yet.
        updateData.isValidated = false;
        updateData.validationStatus = 'unverified';
        updateData.validationMessage = validation.message;
        updateData.verificationToken = null;
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
        const userId = ctx.session.user.id;
        
        // Extract domain from URL for validation (do this first)
        const urlObj = new URL(input.url);
        const scanDomain = urlObj.hostname.toLowerCase();
        const normalizedScanDomain = normalizeDomain(scanDomain);

        // Get user's existing domains first
        const userDomains = await db
          .select()
          .from(websites)
          .where(eq(websites.userId, userId));

        // The user's primaryDomain (set at onboarding) is always an allowed
        // domain for basic-plan users, even when no website row exists yet —
        // e.g. after deleting all their sites. Without this, a basic user who
        // removed their site could never scan their own primary domain again.
        const userRow = await db
          .select({ primaryDomain: user.primaryDomain })
          .from(user)
          .where(eq(user.id, userId))
          .limit(1);

        const hostFromDomain = (value: string): string | null => {
          try {
            return normalizeDomain(new URL(value).hostname.toLowerCase());
          } catch {
            return value ? normalizeDomain(value.toLowerCase()) : null;
          }
        };

        const primaryDomainHost = userRow[0]?.primaryDomain
          ? hostFromDomain(userRow[0].primaryDomain)
          : null;

        // Check if the domain is in the user's allowed domains (ignoring www):
        // their primaryDomain, or the hostname of any existing website URL.
        const isDomainAllowed =
          (primaryDomainHost != null && primaryDomainHost === normalizedScanDomain) ||
          userDomains.some(domain => {
            const domainHost = new URL(domain.url).hostname.toLowerCase();
            const normalizedDomainHost = normalizeDomain(domainHost);
            return normalizedScanDomain === normalizedDomainHost;
          });

        if (!isDomainAllowed) {
          // Only check multiple_websites feature if user is trying to scan a NEW domain
          const featureAccess = await checkFeatureAccess(userId, 'multiple_websites');
          
          if (!featureAccess.hasAccess) {
            throw new Error('DOMAIN_VALIDATION_REQUIRED');
          }

          // User has Pro plan, check domain limits (count unique domains, not URLs)
          const DOMAIN_LIMIT = 10;
          
          // Count unique domains from user's websites
          const uniqueDomains = new Set();
          userDomains.forEach(domain => {
            const domainHost = new URL(domain.url).hostname.toLowerCase();
            const normalizedDomainHost = normalizeDomain(domainHost);
            uniqueDomains.add(normalizedDomainHost);
          });
          
          if (uniqueDomains.size >= DOMAIN_LIMIT) {
            throw new Error(`DOMAIN_LIMIT_REACHED:This domain is not in your allowed domains list. Pro plan allows up to ${DOMAIN_LIMIT} domains. Please add this domain to your domains list first or scan a URL from your existing domains.`);
          } else {
            // User has space - offer to add domain
            throw new Error(`DOMAIN_NOT_ALLOWED:This domain is not in your allowed domains list. Would you like to add "${normalizedScanDomain}" to your domains? You are using ${uniqueDomains.size} of ${DOMAIN_LIMIT} domains.`);
          }
        }

        // Only validate URL if domain is allowed (to avoid timeout blocking domain validation)
        // Skip accessibility check to avoid timeouts during testing/development
        const validation = await validateUrl(input.url, input.pageType, undefined, undefined, true);
        if (!validation.isValid) {
          throw new Error(validation.error || 'Invalid URL');
        }

        // Check if website already exists for this specific URL
        // This allows multiple reports for different pages of the same domain
        const existing = await db
          .select()
          .from(websites)
          .where(and(
            eq(websites.url, input.url),
            eq(websites.userId, userId)
          ))
          .limit(1);

        if (existing.length > 0) {
          // Update existing website with latest info
          const updated = await db
            .update(websites)
            .set({
              pageType: input.pageType ? mapPageTypeToDbEnum(input.pageType) : existing[0].pageType,
              validationMessage: validation.message,
              updatedAt: new Date(),
            })
            .where(eq(websites.id, existing[0].id))
            .returning();

          // Return the existing record with the same URL for crawling
          return {
            ...updated[0],
            scanUrl: input.url
          };
        }

        // Create new website record for this specific URL
        const newWebsite = await db
          .insert(websites)
          .values({
            userId,
            url: input.url, // Store the specific URL to allow multiple pages per domain
            name: `${urlObj.hostname}${urlObj.pathname !== '/' ? urlObj.pathname : ''}`,
            pageType: mapPageTypeToDbEnum(input.pageType || 'homepage'),
            // Ownership unverified until meta-tag verification passes
            isValidated: false,
            validationStatus: 'unverified',
            validationMessage: validation.message,
          })
          .returning();

        // Return the new record with the same URL for crawling
        return {
          ...newWebsite[0],
          scanUrl: input.url
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
  getById: protectedProcedure
    .input(z.object({
      id: z.string().uuid(),
    }))
    .query(async ({ input, ctx }) => {
      const website = await db
        .select()
        .from(websites)
        .where(and(eq(websites.id, input.id), eq(websites.userId, ctx.user!.id)))
        .limit(1);

      if (website.length === 0) {
        throw new Error('Website not found');
      }

      return website[0];
    }),

  /**
   * Get website by URL
   */
  getByUrl: protectedProcedure
    .input(z.object({
      url: z.string().url(),
    }))
    .query(async ({ input, ctx }) => {
      const website = await db
        .select()
        .from(websites)
        .where(and(eq(websites.url, input.url), eq(websites.userId, ctx.user!.id)))
        .limit(1);

      return website.length > 0 ? website[0] : null;
    }),

  /**
   * Get all websites for a user
   */
  getByUser: protectedProcedure
    .query(async ({ ctx }) => {
      const userWebsites = await db
        .select()
        .from(websites)
        .where(eq(websites.userId, ctx.user!.id))
        .orderBy(desc(websites.updatedAt));

      return userWebsites;
    }),

  /**
   * Get website with latest analysis
   */
  getWithLatestAnalysis: protectedProcedure
    .input(z.object({
      websiteId: z.string().uuid(),
    }))
    .query(async ({ input, ctx }) => {
      // Get website info
      const website = await db
        .select()
        .from(websites)
        .where(and(eq(websites.id, input.websiteId), eq(websites.userId, ctx.user!.id)))
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

  /**
   * Request domain-ownership verification.
   * Generates a token and returns the meta tag the user must add to their
   * homepage. Sets the website's status to 'pending' until confirmed.
   */
  requestVerification: protectedProcedure
    .input(z.object({
      websiteId: z.string().uuid(),
    }))
    .mutation(async ({ input, ctx }) => {
      // Ownership check: the website must belong to the caller
      const existing = await db
        .select({ id: websites.id })
        .from(websites)
        .where(and(eq(websites.id, input.websiteId), eq(websites.userId, ctx.user!.id)))
        .limit(1);

      if (existing.length === 0) {
        throw new Error('Website not found');
      }

      const token = randomUUID().replace(/-/g, ''); // 32 hex chars

      await db
        .update(websites)
        .set({
          verificationToken: token,
          validationStatus: 'pending',
          updatedAt: new Date(),
        })
        .where(eq(websites.id, input.websiteId));

      return {
        token,
        metaTag: `<meta name="convertiq-verification" content="${token}" />`,
      };
    }),

  /**
   * Confirm domain-ownership verification.
   * Fetches the website's homepage and checks for the verification meta tag.
   * On success: marks the website validated and clears the token.
   */
  confirmVerification: protectedProcedure
    .input(z.object({
      websiteId: z.string().uuid(),
    }))
    .mutation(async ({ input, ctx }) => {
      // Ownership check + load the token and URL
      const [website] = await db
        .select({
          id: websites.id,
          url: websites.url,
          verificationToken: websites.verificationToken,
        })
        .from(websites)
        .where(and(eq(websites.id, input.websiteId), eq(websites.userId, ctx.user!.id)))
        .limit(1);

      if (!website) {
        throw new Error('Website not found');
      }
      if (!website.verificationToken) {
        throw new Error('No verification in progress. Call requestVerification first.');
      }

      // SSRF guard (CON-94): refuse private/internal targets before fetching
      const safety = await assertPublicTarget(website.url);
      if (!safety.safe) {
        return { verified: false, reason: safety.reason ?? 'Target is not a public address' };
      }

      // Fetch the homepage with a timeout (modelled on checkUrlAccessibility)
      let html: string;
      try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 10000);
        const response = await fetch(website.url, {
          method: 'GET',
          headers: { 'User-Agent': 'ConvertIQ-Verification/1.0' },
          redirect: 'follow',
          signal: controller.signal,
        });
        clearTimeout(timeoutId);

        if (!response.ok) {
          return { verified: false, reason: `Homepage returned HTTP ${response.status}` };
        }
        html = await response.text();
      } catch (error) {
        const reason = error instanceof Error && error.name === 'AbortError'
          ? 'Request timed out after 10 seconds'
          : 'Could not fetch the homepage';
        return { verified: false, reason };
      }

      // Look for the verification tag. Match name + content in either attribute
      // order so we don't depend on how the user pasted it.
      const token = website.verificationToken;
      const hasTag =
        new RegExp(`name=["']convertiq-verification["'][^>]*content=["']${token}["']`, 'i').test(html) ||
        new RegExp(`content=["']${token}["'][^>]*name=["']convertiq-verification["']`, 'i').test(html);

      if (!hasTag) {
        await db
          .update(websites)
          .set({ validationStatus: 'unverified', updatedAt: new Date() })
          .where(eq(websites.id, input.websiteId));
        return { verified: false, reason: 'Verification tag not found on homepage' };
      }

      await db
        .update(websites)
        .set({
          isValidated: true,
          validationStatus: 'valid',
          verificationToken: null,
          lastValidatedAt: new Date(),
          updatedAt: new Date(),
        })
        .where(eq(websites.id, input.websiteId));

      return { verified: true };
    }),
});