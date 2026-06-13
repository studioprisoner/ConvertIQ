import { z } from 'zod';
import { createTRPCRouter, publicProcedure, protectedProcedure } from '../server';
import { validateUrl } from '@/lib/url-validation';
import { WebCrawler } from '@/lib/crawler/crawler';
import { crawlerOptionsSchema } from '@/lib/crawler/types';
import { db } from '@/db/connection';
import { user } from '@/db/schema/auth';
import { eq } from 'drizzle-orm';

export const urlRouter = createTRPCRouter({
  // No-input test procedure
  ping: publicProcedure
    .query(() => {
      console.log('tRPC ping called');
      return { message: 'pong', timestamp: new Date().toISOString() };
    }),

  // Simple test procedure
  test: publicProcedure
    .input(z.object({ message: z.string() }))
    .mutation(async ({ input }) => {
      console.log('tRPC test received:', input);
      return { success: true, echo: input.message };
    }),

  validate: protectedProcedure
    .input(z.object({
      url: z.string().url(),
      pageType: z.string().optional(),
    }))
    .mutation(async ({ input }) => {
      console.log('tRPC url.validate received input:', JSON.stringify(input, null, 2));

      if (!input) {
        throw new Error('Input is undefined');
      }

      const { url, pageType } = input;

      // Convert pageType to the expected enum type
      const validPageType = pageType as 'homepage' | 'product' | 'service' | 'landing' | 'other' | undefined;

      // Perform comprehensive URL validation (auth required: triggers
      // server-side DNS resolution and an outbound HEAD fetch)
      const result = await validateUrl(url, validPageType);
      
      console.log('tRPC url.validate returning result:', JSON.stringify(result, null, 2));
      return result;
    }),

  // Authenticated URL validation with domain restrictions
  validateWithUser: protectedProcedure
    .input(z.object({
      url: z.string().url(),
      pageType: z.string().optional(),
    }))
    .mutation(async ({ input, ctx }) => {
      console.log('tRPC url.validateWithUser received input:', JSON.stringify(input, null, 2));
      console.log('User context:', { userId: ctx.user.id, plan: ctx.userPlan });
      
      const { url, pageType } = input;
      
      // Convert pageType to the expected enum type
      const validPageType = pageType as 'homepage' | 'product' | 'service' | 'landing' | 'other' | undefined;
      
      // Get fresh user data from database to ensure we have the latest primary domain
      const [freshUser] = await db
        .select({ primaryDomain: user.primaryDomain })
        .from(user)
        .where(eq(user.id, ctx.user.id))
        .limit(1);
      
      const userPrimaryDomain = freshUser?.primaryDomain || null;
      
      console.log('Fresh user primary domain:', userPrimaryDomain);
      
      // Perform URL validation with user context and domain restrictions
      const result = await validateUrl(
        url, 
        validPageType, 
        ctx.userPlan as 'basic' | 'pro' | 'enterprise',
        userPrimaryDomain
      );
      
      console.log('tRPC url.validateWithUser returning result:', JSON.stringify(result, null, 2));
      return result;
    }),

  // Crawl a website and extract content (legacy v1 method)
  crawl: protectedProcedure
    .input(z.object({
      url: z.string().url(),
      options: crawlerOptionsSchema.optional(),
    }))
    .mutation(async ({ input }) => {
      console.log('🕷️ tRPC url.crawl received input:', JSON.stringify(input, null, 2));
      
      const { url, options = {} } = input;
      
      // Create crawler instance with options
      const crawler = new WebCrawler(options);
      
      // Perform the crawl
      const result = await crawler.crawl(url);
      
      console.log('🕷️ tRPC url.crawl completed for:', url);
      return result;
    }),

  // Enhanced crawl with v2 extraction capabilities
  crawlEnhanced: protectedProcedure
    .input(z.object({
      url: z.string().url(),
      options: crawlerOptionsSchema.optional(),
    }))
    .mutation(async ({ input, ctx }) => {
      console.log('🚀 tRPC url.crawlEnhanced received input:', JSON.stringify(input, null, 2));

      const { url, options = {} } = input;

      // Create crawler instance with options
      const crawler = new WebCrawler(options);

      // Perform enhanced crawl with feature flag support — identity comes from
      // the session, never from the caller (CON-104)
      const result = await crawler.crawlWithEnhancedExtraction(url, ctx.user!.id, ctx.user!.email ?? undefined);
      
      console.log('🚀 tRPC url.crawlEnhanced completed for:', url);
      console.log(`📊 Extraction version used: ${result.extractionMetadata.extractionVersion}`);
      
      return result;
    }),
});