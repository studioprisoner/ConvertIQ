import { z } from 'zod';
import { createTRPCRouter, publicProcedure } from '../server';
import { websites } from '@/db/schema/websites';
import { analyses } from '@/db/schema/analyses';
import { eq, desc } from 'drizzle-orm';
import { db } from '@/db/connection';

// Import URL validation
import { validateUrl } from '@/lib/url-validation';

export const websitesRouter = createTRPCRouter({
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