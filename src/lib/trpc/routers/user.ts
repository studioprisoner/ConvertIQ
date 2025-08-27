import { z } from 'zod';
import { createTRPCRouter, protectedProcedure } from '@/lib/trpc/server';
import { TRPCError } from '@trpc/server';
import { db } from '@/db/connection';
import { user } from '@/db/schema/auth';
import { eq } from 'drizzle-orm';
import { validatePrimaryDomain } from '@/lib/domain-validation';

export const userRouter = createTRPCRouter({
  // Get current user profile including primary domain
  getProfile: protectedProcedure
    .query(async ({ ctx }) => {
      const [userProfile] = await db
        .select()
        .from(user)
        .where(eq(user.id, ctx.session.user.id))
        .limit(1);

      if (!userProfile) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'User profile not found',
        });
      }

      return {
        ...userProfile,
        subscription: ctx.subscription,
        plan: ctx.userPlan,
      };
    }),

  // Update user's primary domain
  updatePrimaryDomain: protectedProcedure
    .input(
      z.object({
        primaryDomain: z.string().min(1, 'Domain is required'),
      })
    )
    .mutation(async ({ input, ctx }) => {
      // Validate the domain format
      const validation = validatePrimaryDomain(input.primaryDomain);
      if (!validation.valid) {
        throw new TRPCError({
          code: 'BAD_REQUEST',
          message: validation.error || 'Invalid domain format',
        });
      }

      // Only basic plan users need domain restrictions
      if (ctx.userPlan === 'basic') {
        // Check if user already has a primary domain set
        const [currentUser] = await db
          .select({ primaryDomain: user.primaryDomain })
          .from(user)
          .where(eq(user.id, ctx.session.user.id))
          .limit(1);

        if (currentUser?.primaryDomain && currentUser.primaryDomain !== input.primaryDomain) {
          throw new TRPCError({
            code: 'FORBIDDEN',
            message: 'Basic plan users can only change their primary domain by upgrading to Pro',
          });
        }
      }

      // Update the user's primary domain
      const updateResult = await db
        .update(user)
        .set({
          primaryDomain: input.primaryDomain,
          updatedAt: new Date(),
        })
        .where(eq(user.id, ctx.session.user.id));

      console.log('Primary domain update result:', updateResult);
      console.log('Updated domain for user:', ctx.session.user.id, 'to:', input.primaryDomain);

      // Verify the update by fetching the user again
      const [updatedUser] = await db
        .select({ primaryDomain: user.primaryDomain })
        .from(user)
        .where(eq(user.id, ctx.session.user.id))
        .limit(1);
      
      console.log('Verified updated user domain:', updatedUser?.primaryDomain);

      return {
        success: true,
        primaryDomain: input.primaryDomain,
        message: 'Primary domain updated successfully',
      };
    }),

  // Clear user's primary domain (Pro+ users only)
  clearPrimaryDomain: protectedProcedure
    .mutation(async ({ ctx }) => {
      if (ctx.userPlan === 'basic') {
        throw new TRPCError({
          code: 'FORBIDDEN',
          message: 'Basic plan users cannot clear their primary domain. Upgrade to Pro for more flexibility.',
        });
      }

      await db
        .update(user)
        .set({
          primaryDomain: null,
          updatedAt: new Date(),
        })
        .where(eq(user.id, ctx.session.user.id));

      return {
        success: true,
        message: 'Primary domain cleared successfully',
      };
    }),
});