import { z } from 'zod';
import { createTRPCRouter, publicProcedure } from '../server';
import { validateUrl } from '@/lib/url-validation';

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

  validate: publicProcedure
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
      
      // Perform comprehensive URL validation
      const result = await validateUrl(url, validPageType);
      
      console.log('tRPC url.validate returning result:', JSON.stringify(result, null, 2));
      return result;
    }),
});