import { z } from 'zod';
import { createTRPCRouter, publicProcedure, protectedProcedure } from '../server';
import { websites, domains, pageTypeEnum } from '@/db/schema/websites';
import { analyses } from '@/db/schema/analyses';
import { user } from '@/db/schema/auth';
import { eq, desc, and } from 'drizzle-orm';
import { db } from '@/db/connection';
import { checkFeatureAccess } from '@/lib/feature-gate';
import { trackUsage } from '@/lib/subscription-service';

// Import URL validation
import { validateUrl, assertPublicTarget } from '@/lib/url-validation';
import { randomUUID } from 'node:crypto';

// Normalize any URL or bare domain to its root domain (e.g. "https://www.example.com/path" → "example.com")
function normalizeRootDomain(url: string): string {
  try {
    const input = url.startsWith('http') ? url : `https://${url}`;
    return new URL(input).hostname.toLowerCase().replace(/^www\./, '');
  } catch {
    return url.toLowerCase().replace(/^www\./, '');
  }
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

const DOMAIN_LIMIT = 10;

export const websitesRouter = createTRPCRouter({
  /**
   * List all root domains for authenticated user (Pro feature).
   * Returns one entry per root domain with aggregated page count and last scan date.
   */
  list: protectedProcedure
    .query(async ({ ctx }) => {
      const userId = ctx.session.user.id;

      const featureAccess = await checkFeatureAccess(userId, 'multiple_websites');
      if (!featureAccess.hasAccess) {
        throw new Error('Multiple domains feature requires Pro subscription');
      }

      const userDomains = await db
        .select()
        .from(domains)
        .where(eq(domains.userId, userId))
        .orderBy(desc(domains.updatedAt));

      // Aggregate page count and last-updated date per domain from websites table
      const websiteRows = await db
        .select({ domainId: websites.domainId, updatedAt: websites.updatedAt })
        .from(websites)
        .where(eq(websites.userId, userId));

      const pageCountMap = new Map<string, number>();
      const lastScanMap = new Map<string, Date>();
      for (const w of websiteRows) {
        if (!w.domainId) continue;
        pageCountMap.set(w.domainId, (pageCountMap.get(w.domainId) ?? 0) + 1);
        const prev = lastScanMap.get(w.domainId);
        if (!prev || (w.updatedAt && w.updatedAt > prev)) {
          lastScanMap.set(w.domainId, w.updatedAt!);
        }
      }

      return userDomains.map(d => ({
        ...d,
        pageCount: pageCountMap.get(d.id) ?? 0,
        lastScanAt: lastScanMap.get(d.id) ?? null,
        status: d.validationStatus === 'invalid' ? 'inactive' as const : 'active' as const,
      }));
    }),

  /**
   * Add a new root domain (Pro feature).
   * Accepts a bare domain ("example.com") or full URL ("https://example.com").
   */
  create: protectedProcedure
    .input(z.object({
      displayName: z.string().min(1, 'Display name is required'),
      domain: z.string().min(1, 'Domain is required'),
      description: z.string().optional(),
    }))
    .mutation(async ({ input, ctx }) => {
      const userId = ctx.session.user.id;

      const featureAccess = await checkFeatureAccess(userId, 'multiple_websites');
      if (!featureAccess.hasAccess) {
        throw new Error('Multiple domains feature requires Pro subscription');
      }

      const rootDomain = normalizeRootDomain(input.domain);

      if (!rootDomain || rootDomain.includes('/')) {
        throw new Error('Invalid domain — enter a domain like "example.com"');
      }

      const existing = await db
        .select()
        .from(domains)
        .where(eq(domains.userId, userId));

      if (existing.length >= DOMAIN_LIMIT) {
        throw new Error(
          `Pro plan allows up to ${DOMAIN_LIMIT} domains. You have ${existing.length}. Remove a domain to add a new one.`,
        );
      }

      const dup = existing.find(d => d.rootDomain === rootDomain);
      if (dup) {
        throw new Error(`${rootDomain} is already in your domains list.`);
      }

      const [newDomain] = await db
        .insert(domains)
        .values({
          userId,
          rootDomain,
          displayName: input.displayName,
          description: input.description,
          isValidated: false,
          validationStatus: 'unverified',
        })
        .returning();

      await trackUsage(userId, 'add_website');

      return newDomain;
    }),

  /**
   * Update display name / description of a root domain (Pro feature).
   * The rootDomain itself is immutable — delete and re-add to change it.
   */
  update: protectedProcedure
    .input(z.object({
      id: z.string().uuid(),
      displayName: z.string().min(1).optional(),
      description: z.string().optional(),
    }))
    .mutation(async ({ input, ctx }) => {
      const userId = ctx.session.user.id;

      const featureAccess = await checkFeatureAccess(userId, 'multiple_websites');
      if (!featureAccess.hasAccess) {
        throw new Error('Multiple domains feature requires Pro subscription');
      }

      const [existing] = await db
        .select()
        .from(domains)
        .where(and(eq(domains.id, input.id), eq(domains.userId, userId)))
        .limit(1);

      if (!existing) throw new Error('Domain not found or access denied');

      const updateData: Partial<typeof domains.$inferInsert> = {
        updatedAt: new Date(),
      };
      if (input.displayName) updateData.displayName = input.displayName;
      if (input.description !== undefined) updateData.description = input.description;

      const [updated] = await db
        .update(domains)
        .set(updateData)
        .where(eq(domains.id, input.id))
        .returning();

      return updated;
    }),

  /**
   * Delete a root domain (Pro feature).
   * Cascade FK removes linked websites rows and their analyses.
   */
  delete: protectedProcedure
    .input(z.object({
      id: z.string().uuid(),
    }))
    .mutation(async ({ input, ctx }) => {
      const userId = ctx.session.user.id;

      const featureAccess = await checkFeatureAccess(userId, 'multiple_websites');
      if (!featureAccess.hasAccess) {
        throw new Error('Multiple domains feature requires Pro subscription');
      }

      const [existing] = await db
        .select({ id: domains.id })
        .from(domains)
        .where(and(eq(domains.id, input.id), eq(domains.userId, userId)))
        .limit(1);

      if (!existing) throw new Error('Domain not found or access denied');

      await db.delete(domains).where(eq(domains.id, input.id));

      return { success: true };
    }),

  /**
   * Create or get existing website record (with Pro plan domain validation).
   * Used by the scan flow. Finds/creates a domains row for the root domain,
   * then finds/creates a websites row for the specific URL.
   * Return type is unchanged so the scan page is unaffected.
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
        const urlObj = new URL(input.url);
        const rootDomain = normalizeRootDomain(input.url);

        // Load user's domain list
        const userDomainRows = await db
          .select()
          .from(domains)
          .where(eq(domains.userId, userId));

        // Load primaryDomain for basic-plan compatibility
        const [userRow] = await db
          .select({ primaryDomain: user.primaryDomain })
          .from(user)
          .where(eq(user.id, userId))
          .limit(1);

        const primaryRootDomain = userRow?.primaryDomain
          ? normalizeRootDomain(userRow.primaryDomain)
          : null;

        const existingDomain = userDomainRows.find(d => d.rootDomain === rootDomain);
        const isPrimaryDomain = primaryRootDomain === rootDomain;

        if (!existingDomain && !isPrimaryDomain) {
          const featureAccess = await checkFeatureAccess(userId, 'multiple_websites');

          if (!featureAccess.hasAccess) {
            throw new Error('DOMAIN_VALIDATION_REQUIRED');
          }

          if (userDomainRows.length >= DOMAIN_LIMIT) {
            throw new Error(
              `DOMAIN_LIMIT_REACHED:This domain is not in your allowed domains list. Pro plan allows up to ${DOMAIN_LIMIT} domains. Please add this domain to your domains list first or scan a URL from your existing domains.`,
            );
          } else {
            throw new Error(
              `DOMAIN_NOT_ALLOWED:This domain is not in your allowed domains list. Would you like to add "${rootDomain}" to your domains? You are using ${userDomainRows.length} of ${DOMAIN_LIMIT} domains.`,
            );
          }
        }

        const validation = await validateUrl(input.url, input.pageType, undefined, undefined, true);
        if (!validation.isValid) throw new Error(validation.error || 'Invalid URL');

        // Find or create the domains row (auto-creates for basic-plan / primary domain users)
        let domainRow = existingDomain;
        if (!domainRow) {
          const [created] = await db
            .insert(domains)
            .values({
              userId,
              rootDomain,
              displayName: rootDomain,
              isValidated: false,
              validationStatus: 'unverified',
            })
            .onConflictDoNothing()
            .returning();

          domainRow = created ?? (
            await db
              .select()
              .from(domains)
              .where(and(eq(domains.userId, userId), eq(domains.rootDomain, rootDomain)))
              .limit(1)
          )[0];
        }

        // Find or create the websites row for this specific URL
        const [existingWebsite] = await db
          .select()
          .from(websites)
          .where(and(eq(websites.url, input.url), eq(websites.userId, userId)))
          .limit(1);

        if (existingWebsite) {
          const [updated] = await db
            .update(websites)
            .set({
              pageType: input.pageType
                ? mapPageTypeToDbEnum(input.pageType)
                : existingWebsite.pageType,
              domainId: domainRow?.id ?? existingWebsite.domainId,
              validationMessage: validation.message,
              updatedAt: new Date(),
            })
            .where(eq(websites.id, existingWebsite.id))
            .returning();

          return { ...updated, scanUrl: input.url };
        }

        const [newWebsite] = await db
          .insert(websites)
          .values({
            userId,
            domainId: domainRow?.id,
            url: input.url,
            name: `${urlObj.hostname}${urlObj.pathname !== '/' ? urlObj.pathname : ''}`,
            pageType: mapPageTypeToDbEnum(input.pageType || 'homepage'),
            isValidated: false,
            validationStatus: 'unverified',
            validationMessage: validation.message,
          })
          .returning();

        return { ...newWebsite, scanUrl: input.url };
      } catch (error) {
        // Don't log domain validation errors as they are expected user flow
        if (error instanceof Error && (
          error.message.startsWith('DOMAIN_NOT_ALLOWED:') ||
          error.message.startsWith('DOMAIN_LIMIT_REACHED:')
        )) {
          throw error;
        }

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
      const website = await db
        .select()
        .from(websites)
        .where(and(eq(websites.id, input.websiteId), eq(websites.userId, ctx.user!.id)))
        .limit(1);

      if (website.length === 0) {
        throw new Error('Website not found');
      }

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
   * homepage. Sets the domain's status to 'pending' until confirmed.
   */
  requestVerification: protectedProcedure
    .input(z.object({
      domainId: z.string().uuid(),
    }))
    .mutation(async ({ input, ctx }) => {
      const [existing] = await db
        .select({ id: domains.id })
        .from(domains)
        .where(and(eq(domains.id, input.domainId), eq(domains.userId, ctx.user!.id)))
        .limit(1);

      if (!existing) throw new Error('Domain not found');

      const token = randomUUID().replace(/-/g, '');

      await db
        .update(domains)
        .set({
          verificationToken: token,
          validationStatus: 'pending',
          updatedAt: new Date(),
        })
        .where(eq(domains.id, input.domainId));

      return {
        token,
        metaTag: `<meta name="convertiq-verification" content="${token}" />`,
      };
    }),

  /**
   * Confirm domain-ownership verification.
   * Fetches the root domain homepage and checks for the verification meta tag.
   * On success: marks the domain validated and clears the token.
   */
  confirmVerification: protectedProcedure
    .input(z.object({
      domainId: z.string().uuid(),
    }))
    .mutation(async ({ input, ctx }) => {
      const [domain] = await db
        .select()
        .from(domains)
        .where(and(eq(domains.id, input.domainId), eq(domains.userId, ctx.user!.id)))
        .limit(1);

      if (!domain) throw new Error('Domain not found');
      if (!domain.verificationToken) {
        throw new Error('No verification in progress. Call requestVerification first.');
      }

      // Always fetch the root domain homepage, regardless of which page was originally added
      const homepageUrl = `https://${domain.rootDomain}/`;

      // SSRF guard (CON-94): refuse private/internal targets before fetching
      const safety = await assertPublicTarget(homepageUrl);
      if (!safety.safe) {
        return { verified: false, reason: safety.reason ?? 'Target is not a public address' };
      }

      let html: string;
      try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 10000);
        const response = await fetch(homepageUrl, {
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

      // Match name + content in either attribute order
      const token = domain.verificationToken;
      const hasTag =
        new RegExp(`name=["']convertiq-verification["'][^>]*content=["']${token}["']`, 'i').test(html) ||
        new RegExp(`content=["']${token}["'][^>]*name=["']convertiq-verification["']`, 'i').test(html);

      if (!hasTag) {
        await db
          .update(domains)
          .set({ validationStatus: 'unverified', updatedAt: new Date() })
          .where(eq(domains.id, input.domainId));
        return { verified: false, reason: 'Verification tag not found on homepage' };
      }

      await db
        .update(domains)
        .set({
          isValidated: true,
          validationStatus: 'valid',
          verificationToken: null,
          lastValidatedAt: new Date(),
          updatedAt: new Date(),
        })
        .where(eq(domains.id, input.domainId));

      return { verified: true };
    }),
});
