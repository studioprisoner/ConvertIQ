/**
 * Admin tRPC Router for Feature Flags and Monitoring
 * 
 * Provides admin endpoints for:
 * - Feature flag management
 * - Cost monitoring and alerts
 * - Performance comparison reports
 * - System health status
 */

import { z } from 'zod';
import { createTRPCRouter, protectedProcedure } from '@/lib/trpc/trpc';
import { featureFlagService } from '@/lib/feature-flags/service';
import { firecrawlMonitor } from '@/lib/monitoring/firecrawl-monitor';
import { costTracker } from '@/lib/monitoring/cost-tracker';
import { TRPCError } from '@trpc/server';

// Admin check middleware (you can expand this based on your user roles)
const adminProcedure = protectedProcedure.use(({ ctx, next }) => {
  // For now, check if user email is admin
  // You can expand this to check roles from your user schema
  const adminEmails = ['josh@convertiq.cloud']; // Add more admin emails
  
  if (!adminEmails.includes(ctx.session.user.email)) {
    throw new TRPCError({
      code: 'FORBIDDEN',
      message: 'Admin access required',
    });
  }
  
  return next();
});

export const adminRouter = createTRPCRouter({
  // Feature Flag Management
  getFeatureFlags: adminProcedure
    .query(async () => {
      const stats = featureFlagService.getRolloutStats();
      return {
        rolloutPercentages: stats.globalPercentages,
        userOverrideCount: stats.userOverrideCount,
        environment: stats.environment,
      };
    }),

  updateFeatureFlag: adminProcedure
    .input(z.object({
      flagName: z.enum(['firecrawl_v2_enabled', 'firecrawl_extraction_enabled', 'enhanced_analysis_enabled', 'batch_processing_enabled']),
      percentage: z.number().min(0).max(100),
    }))
    .mutation(async ({ input }) => {
      featureFlagService.updateGlobalRollout(input.flagName, input.percentage);
      
      return {
        success: true,
        message: `${input.flagName} updated to ${input.percentage}%`,
      };
    }),

  setUserOverride: adminProcedure
    .input(z.object({
      userId: z.string(),
      flagName: z.enum(['firecrawl_v2_enabled', 'firecrawl_extraction_enabled', 'enhanced_analysis_enabled', 'batch_processing_enabled']),
      enabled: z.boolean(),
      reason: z.string().optional(),
    }))
    .mutation(async ({ input }) => {
      featureFlagService.setUserOverride(
        input.userId,
        input.flagName,
        input.enabled,
        input.reason
      );
      
      return {
        success: true,
        message: `User override set for ${input.userId}`,
      };
    }),

  removeUserOverride: adminProcedure
    .input(z.object({
      userId: z.string(),
      flagName: z.enum(['firecrawl_v2_enabled', 'firecrawl_extraction_enabled', 'enhanced_analysis_enabled', 'batch_processing_enabled']),
    }))
    .mutation(async ({ input }) => {
      featureFlagService.removeUserOverride(input.userId, input.flagName);
      
      return {
        success: true,
        message: `User override removed for ${input.userId}`,
      };
    }),

  progressiveRollout: adminProcedure
    .input(z.object({
      flagName: z.enum(['firecrawl_v2_enabled', 'firecrawl_extraction_enabled', 'enhanced_analysis_enabled', 'batch_processing_enabled']),
      increaseBy: z.number().min(1).max(50),
    }))
    .mutation(async ({ input }) => {
      featureFlagService.progressiveRollout(input.flagName, input.increaseBy);
      const newStats = featureFlagService.getRolloutStats();
      
      return {
        success: true,
        newPercentage: newStats.globalPercentages[input.flagName],
        message: `${input.flagName} increased by ${input.increaseBy}%`,
      };
    }),

  emergencyDisableV2: adminProcedure
    .mutation(async () => {
      featureFlagService.emergencyDisableV2();
      
      return {
        success: true,
        message: '🚨 Emergency disable activated - all v2 features disabled',
      };
    }),

  // Performance Monitoring
  getPerformanceComparison: adminProcedure
    .input(z.object({
      hoursBack: z.number().min(1).max(168).default(24), // Max 1 week
    }))
    .query(async ({ input }) => {
      return firecrawlMonitor.generateComparisonReport(input.hoursBack);
    }),

  getHealthStatus: adminProcedure
    .query(async () => {
      return firecrawlMonitor.getHealthStatus();
    }),

  exportMetrics: adminProcedure
    .input(z.object({
      hoursBack: z.number().min(1).max(168).default(24),
    }))
    .query(async ({ input }) => {
      const metrics = firecrawlMonitor.exportMetrics(input.hoursBack);
      return {
        totalMetrics: metrics.length,
        timeRange: {
          start: new Date(Date.now() - input.hoursBack * 60 * 60 * 1000),
          end: new Date(),
        },
        // Return summary instead of full data to avoid large responses
        summary: {
          v1Requests: metrics.filter(m => m.version === 'v1').length,
          v2Requests: metrics.filter(m => m.version === 'v2').length,
          avgResponseTime: {
            v1: metrics.filter(m => m.version === 'v1').reduce((sum, m) => sum + m.responseTimeMs, 0) / Math.max(1, metrics.filter(m => m.version === 'v1').length),
            v2: metrics.filter(m => m.version === 'v2').reduce((sum, m) => sum + m.responseTimeMs, 0) / Math.max(1, metrics.filter(m => m.version === 'v2').length),
          },
          successRate: {
            v1: (metrics.filter(m => m.version === 'v1' && m.success).length / Math.max(1, metrics.filter(m => m.version === 'v1').length)) * 100,
            v2: (metrics.filter(m => m.version === 'v2' && m.success).length / Math.max(1, metrics.filter(m => m.version === 'v2').length)) * 100,
          },
        },
      };
    }),

  // Cost Monitoring
  getCostSummary: adminProcedure
    .input(z.object({
      hoursBack: z.number().min(1).max(168).default(24),
    }))
    .query(async ({ input }) => {
      return costTracker.generateCostSummary(input.hoursBack);
    }),

  getCostStatus: adminProcedure
    .query(async () => {
      return costTracker.getCostStatus();
    }),

  exportCostData: adminProcedure
    .input(z.object({
      hoursBack: z.number().min(1).max(168).default(24),
    }))
    .query(async ({ input }) => {
      const costData = costTracker.exportCostData(input.hoursBack);
      return {
        totalEntries: costData.length,
        totalCost: costData.reduce((sum, entry) => sum + entry.costUsd, 0),
        timeRange: {
          start: new Date(Date.now() - input.hoursBack * 60 * 60 * 1000),
          end: new Date(),
        },
        // Summary by service
        byService: costData.reduce((acc, entry) => {
          if (!acc[entry.service]) {
            acc[entry.service] = { totalCost: 0, count: 0 };
          }
          acc[entry.service].totalCost += entry.costUsd;
          acc[entry.service].count += 1;
          return acc;
        }, {} as Record<string, { totalCost: number; count: number }>),
      };
    }),

  // System Maintenance
  clearOldData: adminProcedure
    .input(z.object({
      hoursToKeep: z.number().min(24).max(720).default(168), // Between 1 day and 30 days
    }))
    .mutation(async ({ input }) => {
      firecrawlMonitor.clearOldMetrics(input.hoursToKeep);
      costTracker.clearOldEntries(input.hoursToKeep);
      
      return {
        success: true,
        message: `Old data cleared (kept ${input.hoursToKeep} hours)`,
      };
    }),

  // User Feature Status (for debugging specific users)
  getUserFeatureStatus: adminProcedure
    .input(z.object({
      userId: z.string(),
      userEmail: z.string().optional(),
    }))
    .query(async ({ input }) => {
      const flags = await featureFlagService.getUserFeatureFlags(input.userId, input.userEmail);
      
      return {
        userId: input.userId,
        userEmail: input.userEmail,
        flags,
        environment: featureFlagService['getCurrentEnvironment'](),
        isBetaTester: input.userEmail ? featureFlagService['isBetaTester'](input.userEmail) : false,
        userHash: featureFlagService['hashUserId'](input.userId),
      };
    }),

  // Rollout Analytics
  getRolloutAnalytics: adminProcedure
    .input(z.object({
      hoursBack: z.number().min(1).max(168).default(24),
    }))
    .query(async ({ input }) => {
      const metrics = firecrawlMonitor.exportMetrics(input.hoursBack);
      const costData = costTracker.exportCostData(input.hoursBack);
      
      // Calculate adoption metrics
      const totalUsers = new Set([...metrics.map(m => m.userId), ...costData.map(c => c.userId)]).size;
      const v2Users = new Set(metrics.filter(m => m.version === 'v2' && m.userId).map(m => m.userId)).size;
      const adoptionRate = totalUsers > 0 ? (v2Users / totalUsers) * 100 : 0;
      
      // Calculate cost efficiency
      const v1Cost = costData.filter(c => c.service === 'firecrawl-v1').reduce((sum, c) => sum + c.costUsd, 0);
      const v2Cost = costData.filter(c => c.service === 'firecrawl-v2').reduce((sum, c) => sum + c.costUsd, 0);
      const totalCost = v1Cost + v2Cost;
      const costEfficiency = totalCost > 0 ? ((v1Cost - v2Cost) / totalCost) * 100 : 0;
      
      return {
        adoption: {
          totalUsers,
          v2Users,
          adoptionRate,
        },
        cost: {
          v1Cost,
          v2Cost,
          totalCost,
          costEfficiency,
        },
        performance: {
          v1AvgResponse: metrics.filter(m => m.version === 'v1').reduce((sum, m) => sum + m.responseTimeMs, 0) / Math.max(1, metrics.filter(m => m.version === 'v1').length),
          v2AvgResponse: metrics.filter(m => m.version === 'v2').reduce((sum, m) => sum + m.responseTimeMs, 0) / Math.max(1, metrics.filter(m => m.version === 'v2').length),
          v1SuccessRate: (metrics.filter(m => m.version === 'v1' && m.success).length / Math.max(1, metrics.filter(m => m.version === 'v1').length)) * 100,
          v2SuccessRate: (metrics.filter(m => m.version === 'v2' && m.success).length / Math.max(1, metrics.filter(m => m.version === 'v2').length)) * 100,
        },
      };
    }),
});