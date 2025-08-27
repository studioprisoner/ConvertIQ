import { z } from 'zod';
import { createTRPCRouter, publicProcedure } from '../server';
import { recommendations } from '@/db/schema/recommendations';
import { reports } from '@/db/schema/reports';
import { analyses } from '@/db/schema/analyses';
import { websites } from '@/db/schema/websites';
import { eq, and, desc } from 'drizzle-orm';
import { TRPCError } from '@trpc/server';

// Import tracking services
import { recommendationTracker } from '@/lib/reports/recommendation-tracker';
import { progressDashboardService } from '@/lib/reports/progress-dashboard';
import { databaseTrackingService } from '@/lib/reports/database-tracking';

// Import types
import { recommendationStatusSchema } from '@/lib/reports/types';

export const recommendationsRouter = createTRPCRouter({
  /**
   * Start tracking a recommendation
   */
  startTracking: publicProcedure
    .input(z.object({
      recommendationId: z.string().uuid(),
    }))
    .mutation(async ({ ctx, input }) => {
      const { user } = ctx;
      
      try {
        // Verify recommendation ownership using proper relation chain
        const recommendation = await ctx.db
          .select({ reportId: recommendations.reportId })
          .from(recommendations)
          .innerJoin(reports, eq(recommendations.reportId, reports.id))
          .innerJoin(analyses, eq(reports.analysisId, analyses.id))
          .innerJoin(websites, eq(analyses.websiteId, websites.id))
          .where(and(
            eq(recommendations.id, input.recommendationId),
            eq(websites.userId, user.id)
          ))
          .limit(1);

        if (recommendation.length === 0) {
          throw new TRPCError({
            code: 'NOT_FOUND',
            message: 'Recommendation not found or access denied'
          });
        }

        // Start tracking
        const progress = await progressDashboardService.startRecommendation(
          input.recommendationId,
          user.id
        );

        return {
          message: 'Started tracking recommendation',
          progress
        };
      } catch (error) {
        console.error('Failed to start tracking:', error);
        if (error instanceof TRPCError) throw error;
        
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: 'Failed to start tracking recommendation'
        });
      }
    }),

  /**
   * Update recommendation progress
   */
  updateProgress: publicProcedure
    .input(z.object({
      recommendationId: z.string().uuid(),
      status: recommendationStatusSchema.optional(),
      notes: z.string().optional(),
      actualEffort: z.number().min(0).optional(),
      milestoneCompletions: z.array(z.string()).optional(),
      measurements: z.array(z.object({
        metric: z.string(),
        value: z.number(),
        notes: z.string().optional(),
      })).optional(),
      blockers: z.array(z.object({
        title: z.string(),
        description: z.string(),
        severity: z.enum(['low', 'medium', 'high']),
      })).optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      const { user } = ctx;
      
      try {
        // Verify recommendation ownership using proper relation chain
        const recommendation = await ctx.db
          .select({ reportId: recommendations.reportId })
          .from(recommendations)
          .innerJoin(reports, eq(recommendations.reportId, reports.id))
          .innerJoin(analyses, eq(reports.analysisId, analyses.id))
          .innerJoin(websites, eq(analyses.websiteId, websites.id))
          .where(and(
            eq(recommendations.id, input.recommendationId),
            eq(websites.userId, user.id)
          ))
          .limit(1);

        if (recommendation.length === 0) {
          throw new TRPCError({
            code: 'NOT_FOUND',
            message: 'Recommendation not found or access denied'
          });
        }

        // Update progress
        const progress = await progressDashboardService.updateRecommendationProgress(
          input.recommendationId,
          user.id,
          {
            status: input.status,
            notes: input.notes,
            actualEffort: input.actualEffort,
            milestoneCompletions: input.milestoneCompletions,
            measurements: input.measurements,
            blockers: input.blockers
          }
        );

        return {
          message: 'Progress updated successfully',
          progress
        };
      } catch (error) {
        console.error('Failed to update progress:', error);
        if (error instanceof TRPCError) throw error;
        
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: 'Failed to update recommendation progress'
        });
      }
    }),

  /**
   * Complete a recommendation
   */
  complete: publicProcedure
    .input(z.object({
      recommendationId: z.string().uuid(),
      completionNotes: z.string().optional(),
      finalMeasurements: z.array(z.object({
        metric: z.string(),
        value: z.number(),
        notes: z.string().optional(),
      })).optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      const { user } = ctx;
      
      try {
        // Verify recommendation ownership using proper relation chain
        const recommendation = await ctx.db
          .select({ reportId: recommendations.reportId })
          .from(recommendations)
          .innerJoin(reports, eq(recommendations.reportId, reports.id))
          .innerJoin(analyses, eq(reports.analysisId, analyses.id))
          .innerJoin(websites, eq(analyses.websiteId, websites.id))
          .where(and(
            eq(recommendations.id, input.recommendationId),
            eq(websites.userId, user.id)
          ))
          .limit(1);

        if (recommendation.length === 0) {
          throw new TRPCError({
            code: 'NOT_FOUND',
            message: 'Recommendation not found or access denied'
          });
        }

        // Complete recommendation
        const progress = await progressDashboardService.completeRecommendation(
          input.recommendationId,
          user.id,
          input.completionNotes,
          input.finalMeasurements
        );

        return {
          message: 'Recommendation completed successfully',
          progress
        };
      } catch (error) {
        console.error('Failed to complete recommendation:', error);
        if (error instanceof TRPCError) throw error;
        
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: 'Failed to complete recommendation'
        });
      }
    }),

  /**
   * Dismiss a recommendation
   */
  dismiss: publicProcedure
    .input(z.object({
      recommendationId: z.string().uuid(),
      reason: z.string().min(1, 'Dismissal reason is required'),
    }))
    .mutation(async ({ ctx, input }) => {
      const { user } = ctx;
      
      try {
        // Verify recommendation ownership using proper relation chain
        const recommendation = await ctx.db
          .select({ reportId: recommendations.reportId })
          .from(recommendations)
          .innerJoin(reports, eq(recommendations.reportId, reports.id))
          .innerJoin(analyses, eq(reports.analysisId, analyses.id))
          .innerJoin(websites, eq(analyses.websiteId, websites.id))
          .where(and(
            eq(recommendations.id, input.recommendationId),
            eq(websites.userId, user.id)
          ))
          .limit(1);

        if (recommendation.length === 0) {
          throw new TRPCError({
            code: 'NOT_FOUND',
            message: 'Recommendation not found or access denied'
          });
        }

        // Dismiss recommendation
        await progressDashboardService.dismissRecommendation(
          input.recommendationId,
          user.id,
          input.reason
        );

        return {
          message: 'Recommendation dismissed successfully'
        };
      } catch (error) {
        console.error('Failed to dismiss recommendation:', error);
        if (error instanceof TRPCError) throw error;
        
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: 'Failed to dismiss recommendation'
        });
      }
    }),

  /**
   * Add a blocker to a recommendation
   */
  addBlocker: publicProcedure
    .input(z.object({
      recommendationId: z.string().uuid(),
      title: z.string().min(1),
      description: z.string().min(1),
      severity: z.enum(['low', 'medium', 'high']),
    }))
    .mutation(async ({ ctx, input }) => {
      const { user } = ctx;
      
      try {
        // Verify recommendation ownership using proper relation chain
        const recommendation = await ctx.db
          .select({ reportId: recommendations.reportId })
          .from(recommendations)
          .innerJoin(reports, eq(recommendations.reportId, reports.id))
          .innerJoin(analyses, eq(reports.analysisId, analyses.id))
          .innerJoin(websites, eq(analyses.websiteId, websites.id))
          .where(and(
            eq(recommendations.id, input.recommendationId),
            eq(websites.userId, user.id)
          ))
          .limit(1);

        if (recommendation.length === 0) {
          throw new TRPCError({
            code: 'NOT_FOUND',
            message: 'Recommendation not found or access denied'
          });
        }

        // Add blocker
        const progress = await progressDashboardService.addBlocker(
          input.recommendationId,
          user.id,
          {
            title: input.title,
            description: input.description,
            severity: input.severity
          }
        );

        return {
          message: 'Blocker added successfully',
          progress
        };
      } catch (error) {
        console.error('Failed to add blocker:', error);
        if (error instanceof TRPCError) throw error;
        
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: 'Failed to add blocker'
        });
      }
    }),

  /**
   * Resolve a blocker
   */
  resolveBlocker: publicProcedure
    .input(z.object({
      recommendationId: z.string().uuid(),
      blockerId: z.string(),
      resolution: z.string().min(1),
    }))
    .mutation(async ({ ctx, input }) => {
      const { user } = ctx;
      
      try {
        // Verify recommendation ownership using proper relation chain
        const recommendation = await ctx.db
          .select({ reportId: recommendations.reportId })
          .from(recommendations)
          .innerJoin(reports, eq(recommendations.reportId, reports.id))
          .innerJoin(analyses, eq(reports.analysisId, analyses.id))
          .innerJoin(websites, eq(analyses.websiteId, websites.id))
          .where(and(
            eq(recommendations.id, input.recommendationId),
            eq(websites.userId, user.id)
          ))
          .limit(1);

        if (recommendation.length === 0) {
          throw new TRPCError({
            code: 'NOT_FOUND',
            message: 'Recommendation not found or access denied'
          });
        }

        // Resolve blocker
        await progressDashboardService.resolveBlocker(
          input.recommendationId,
          input.blockerId,
          user.id,
          input.resolution
        );

        return {
          message: 'Blocker resolved successfully'
        };
      } catch (error) {
        console.error('Failed to resolve blocker:', error);
        if (error instanceof TRPCError) throw error;
        
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: 'Failed to resolve blocker'
        });
      }
    }),

  /**
   * Get detailed recommendation information with progress
   */
  getDetails: publicProcedure
    .input(z.object({
      recommendationId: z.string().uuid(),
    }))
    .query(async ({ ctx, input }) => {
      const { user } = ctx;
      
      try {
        // Get detailed recommendation information
        const details = await progressDashboardService.getRecommendationDetails(
          input.recommendationId,
          user.id
        );

        if (!details) {
          throw new TRPCError({
            code: 'NOT_FOUND',
            message: 'Recommendation not found or access denied'
          });
        }

        return details;
      } catch (error) {
        console.error('Failed to get recommendation details:', error);
        if (error instanceof TRPCError) throw error;
        
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: 'Failed to load recommendation details'
        });
      }
    }),

  /**
   * Get user's recommendation statistics
   */
  getStats: publicProcedure
    .query(async ({ ctx }) => {
      const { user } = ctx;
      
      try {
        const stats = await databaseTrackingService.getUserProgressStats(user.id);
        return stats;
      } catch (error) {
        console.error('Failed to get recommendation stats:', error);
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: 'Failed to load recommendation statistics'
        });
      }
    }),

  /**
   * Get recent activity
   */
  getRecentActivity: publicProcedure
    .input(z.object({
      limit: z.number().min(1).max(50).default(10),
    }))
    .query(async ({ ctx, input }) => {
      const { user } = ctx;
      
      try {
        const activity = await databaseTrackingService.getRecentActivity(user.id, input.limit);
        return activity;
      } catch (error) {
        console.error('Failed to get recent activity:', error);
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: 'Failed to load recent activity'
        });
      }
    }),

  /**
   * Get recommendations needing attention
   */
  getNeedingAttention: publicProcedure
    .input(z.object({
      daysWithoutUpdate: z.number().min(1).max(30).default(7),
    }))
    .query(async ({ ctx, input }) => {
      const { user } = ctx;
      
      try {
        const staleRecommendations = await databaseTrackingService.getStaleRecommendations(
          user.id,
          input.daysWithoutUpdate
        );
        return staleRecommendations;
      } catch (error) {
        console.error('Failed to get stale recommendations:', error);
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: 'Failed to load recommendations needing attention'
        });
      }
    }),

  /**
   * Search recommendations
   */
  search: publicProcedure
    .input(z.object({
      query: z.string().min(1),
      status: recommendationStatusSchema.optional(),
      limit: z.number().min(1).max(100).default(20),
    }))
    .query(async ({ ctx, input }) => {
      const { user } = ctx;
      
      try {
        const results = await databaseTrackingService.searchRecommendations(
          user.id,
          input.query,
          input.status
        );

        // Limit results
        const limitedResults = results.slice(0, input.limit);

        return {
          recommendations: limitedResults,
          total: results.length,
          hasMore: results.length > input.limit
        };
      } catch (error) {
        console.error('Failed to search recommendations:', error);
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: 'Failed to search recommendations'
        });
      }
    }),

  /**
   * Bulk update recommendation statuses
   */
  bulkUpdate: publicProcedure
    .input(z.object({
      updates: z.array(z.object({
        recommendationId: z.string().uuid(),
        status: recommendationStatusSchema,
      })).min(1).max(50), // Limit bulk operations
    }))
    .mutation(async ({ ctx, input }) => {
      const { user } = ctx;
      
      try {
        // Verify all recommendations belong to the user
        const recommendationIds = input.updates.map(u => u.recommendationId);
        const userRecommendations = await ctx.db
          .select({ id: recommendations.id })
          .from(recommendations)
          .innerJoin(reports, eq(recommendations.reportId, reports.id))
          .innerJoin(analyses, eq(reports.analysisId, analyses.id))
          .innerJoin(websites, eq(analyses.websiteId, websites.id))
          .where(and(
            eq(websites.userId, user.id)
          ));

        const userRecommendationIds = new Set(userRecommendations.map(r => r.id));
        const unauthorizedIds = recommendationIds.filter(id => !userRecommendationIds.has(id));

        if (unauthorizedIds.length > 0) {
          throw new TRPCError({
            code: 'FORBIDDEN',
            message: 'Some recommendations do not belong to the user'
          });
        }

        // Perform bulk update
        await databaseTrackingService.bulkUpdateRecommendationStatus(
          input.updates.map(u => ({
            id: u.recommendationId,
            status: u.status
          }))
        );

        return {
          message: `Successfully updated ${input.updates.length} recommendations`,
          updatedCount: input.updates.length
        };
      } catch (error) {
        console.error('Failed to bulk update recommendations:', error);
        if (error instanceof TRPCError) throw error;
        
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: 'Failed to update recommendations'
        });
      }
    }),

  /**
   * Get completion trends for analytics
   */
  getCompletionTrends: publicProcedure
    .input(z.object({
      months: z.number().min(1).max(24).default(6),
    }))
    .query(async ({ ctx, input }) => {
      const { user } = ctx;
      
      try {
        const trends = await databaseTrackingService.getCompletionTrends(user.id, input.months);
        return trends;
      } catch (error) {
        console.error('Failed to get completion trends:', error);
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: 'Failed to load completion trends'
        });
      }
    }),

  /**
   * Get category performance analytics
   */
  getCategoryPerformance: publicProcedure
    .query(async ({ ctx }) => {
      const { user } = ctx;
      
      try {
        const performance = await databaseTrackingService.getCategoryPerformance(user.id);
        return performance;
      } catch (error) {
        console.error('Failed to get category performance:', error);
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: 'Failed to load category performance'
        });
      }
    }),
});