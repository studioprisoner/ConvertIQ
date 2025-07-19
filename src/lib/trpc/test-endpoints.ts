/**
 * Test file for tRPC report endpoints
 * This file demonstrates how to use the report and recommendation APIs
 */

import type { AppRouter } from './root';
import type { inferRouterInputs, inferRouterOutputs } from '@trpc/server';

// Type helpers for the API
type RouterInputs = inferRouterInputs<AppRouter>;
type RouterOutputs = inferRouterOutputs<AppRouter>;

// Example API usage patterns
export const apiUsageExamples = {
  /**
   * Generate a new report
   */
  async generateReport(
    trpc: any, // In real usage, this would be properly typed tRPC client
    websiteId: string,
    analysisId: string
  ) {
    const reportData: RouterInputs['reports']['generate'] = {
      websiteId,
      analysisId,
      reportType: 'marketing',
      title: 'Marketing Improvement Report for Website',
    };

    try {
      const result = await trpc.reports.generate.mutate(reportData);
      console.log('✅ Report generated:', result.reportId);
      return result;
    } catch (error) {
      console.error('❌ Failed to generate report:', error);
      throw error;
    }
  },

  /**
   * Get all user reports
   */
  async getUserReports(trpc: any, filters?: {
    websiteId?: string;
    type?: 'marketing' | 'conversion';
    limit?: number;
  }) {
    const input: RouterInputs['reports']['list'] = {
      limit: filters?.limit || 20,
      offset: 0,
      websiteId: filters?.websiteId,
      type: filters?.type,
    };

    try {
      const reports = await trpc.reports.list.query(input);
      console.log(`✅ Found ${reports.length} reports`);
      return reports;
    } catch (error) {
      console.error('❌ Failed to get reports:', error);
      throw error;
    }
  },

  /**
   * Get detailed report with recommendations
   */
  async getReportDetails(trpc: any, reportId: string) {
    try {
      const report = await trpc.reports.getById.query({ reportId });
      console.log('✅ Report details loaded:', report.title);
      console.log(`   Recommendations: ${report.recommendations.length}`);
      return report;
    } catch (error) {
      console.error('❌ Failed to get report details:', error);
      throw error;
    }
  },

  /**
   * Export report as PDF
   */
  async exportReportPDF(trpc: any, reportId: string) {
    try {
      const pdfData = await trpc.reports.exportPDF.mutate({
        reportId,
        includeImplementationGuide: true,
      });
      
      console.log('✅ PDF exported:', pdfData.filename);
      console.log(`   Size: ${Math.round(pdfData.content.length / 1024)} KB`);
      return pdfData;
    } catch (error) {
      console.error('❌ Failed to export PDF:', error);
      throw error;
    }
  },

  /**
   * Get progress dashboard
   */
  async getProgressDashboard(trpc: any) {
    try {
      const dashboard = await trpc.reports.getProgressDashboard.query();
      console.log('✅ Dashboard data loaded');
      console.log(`   Total recommendations: ${dashboard.overview.totalRecommendations}`);
      console.log(`   Completion rate: ${dashboard.overview.completionRate}%`);
      return dashboard;
    } catch (error) {
      console.error('❌ Failed to get dashboard:', error);
      throw error;
    }
  },

  /**
   * Start tracking a recommendation
   */
  async startTrackingRecommendation(trpc: any, recommendationId: string) {
    try {
      const result = await trpc.recommendations.startTracking.mutate({
        recommendationId,
      });
      
      console.log('✅ Started tracking recommendation');
      console.log(`   Status: ${result.progress.status}`);
      console.log(`   Milestones: ${result.progress.milestones.length}`);
      return result;
    } catch (error) {
      console.error('❌ Failed to start tracking:', error);
      throw error;
    }
  },

  /**
   * Update recommendation progress
   */
  async updateRecommendationProgress(
    trpc: any,
    recommendationId: string,
    updates: {
      status?: 'pending' | 'in_progress' | 'completed' | 'dismissed';
      notes?: string;
      actualEffort?: number;
      measurements?: Array<{ metric: string; value: number; notes?: string }>;
    }
  ) {
    const input: RouterInputs['recommendations']['updateProgress'] = {
      recommendationId,
      ...updates,
    };

    try {
      const result = await trpc.recommendations.updateProgress.mutate(input);
      console.log('✅ Progress updated');
      console.log(`   Status: ${result.progress.status}`);
      if (updates.actualEffort) {
        console.log(`   Total effort: ${result.progress.actualEffort || 0} hours`);
      }
      return result;
    } catch (error) {
      console.error('❌ Failed to update progress:', error);
      throw error;
    }
  },

  /**
   * Complete a recommendation
   */
  async completeRecommendation(
    trpc: any,
    recommendationId: string,
    completionData?: {
      notes?: string;
      finalMeasurements?: Array<{ metric: string; value: number; notes?: string }>;
    }
  ) {
    const input: RouterInputs['recommendations']['complete'] = {
      recommendationId,
      completionNotes: completionData?.notes,
      finalMeasurements: completionData?.finalMeasurements,
    };

    try {
      const result = await trpc.recommendations.complete.mutate(input);
      console.log('✅ Recommendation completed');
      console.log(`   Completion date: ${result.progress.completedAt}`);
      return result;
    } catch (error) {
      console.error('❌ Failed to complete recommendation:', error);
      throw error;
    }
  },

  /**
   * Add a blocker to a recommendation
   */
  async addBlocker(
    trpc: any,
    recommendationId: string,
    blocker: {
      title: string;
      description: string;
      severity: 'low' | 'medium' | 'high';
    }
  ) {
    const input: RouterInputs['recommendations']['addBlocker'] = {
      recommendationId,
      ...blocker,
    };

    try {
      const result = await trpc.recommendations.addBlocker.mutate(input);
      console.log('✅ Blocker added');
      console.log(`   Severity: ${blocker.severity}`);
      return result;
    } catch (error) {
      console.error('❌ Failed to add blocker:', error);
      throw error;
    }
  },

  /**
   * Get recommendation statistics
   */
  async getRecommendationStats(trpc: any) {
    try {
      const stats = await trpc.recommendations.getStats.query();
      console.log('✅ Recommendation stats loaded');
      console.log(`   Total: ${stats.totalRecommendations}`);
      console.log(`   Completed: ${stats.completedRecommendations}`);
      console.log(`   Completion rate: ${stats.completionRate}%`);
      return stats;
    } catch (error) {
      console.error('❌ Failed to get stats:', error);
      throw error;
    }
  },

  /**
   * Search recommendations
   */
  async searchRecommendations(
    trpc: any,
    query: string,
    filters?: {
      status?: 'pending' | 'in_progress' | 'completed' | 'dismissed';
      limit?: number;
    }
  ) {
    const input: RouterInputs['recommendations']['search'] = {
      query,
      status: filters?.status,
      limit: filters?.limit || 20,
    };

    try {
      const results = await trpc.recommendations.search.query(input);
      console.log(`✅ Found ${results.recommendations.length} recommendations`);
      console.log(`   Total matches: ${results.total}`);
      return results;
    } catch (error) {
      console.error('❌ Failed to search recommendations:', error);
      throw error;
    }
  },

  /**
   * Get completion trends for analytics
   */
  async getCompletionTrends(trpc: any, months = 6) {
    try {
      const trends = await trpc.recommendations.getCompletionTrends.query({ months });
      console.log(`✅ Completion trends for ${months} months`);
      console.log(`   Data points: ${trends.length}`);
      return trends;
    } catch (error) {
      console.error('❌ Failed to get trends:', error);
      throw error;
    }
  },

  /**
   * Bulk update recommendation statuses
   */
  async bulkUpdateRecommendations(
    trpc: any,
    updates: Array<{
      recommendationId: string;
      status: 'pending' | 'in_progress' | 'completed' | 'dismissed';
    }>
  ) {
    const input: RouterInputs['recommendations']['bulkUpdate'] = {
      updates,
    };

    try {
      const result = await trpc.recommendations.bulkUpdate.mutate(input);
      console.log(`✅ Bulk updated ${result.updatedCount} recommendations`);
      return result;
    } catch (error) {
      console.error('❌ Failed to bulk update:', error);
      throw error;
    }
  }
};

/**
 * Example workflow: Complete recommendation lifecycle
 */
export async function exampleWorkflow(trpc: any) {
  console.log('🚀 Starting recommendation lifecycle example...\n');

  try {
    // 1. Get dashboard overview
    console.log('📊 Step 1: Getting dashboard overview');
    const dashboard = await apiUsageExamples.getProgressDashboard(trpc);
    console.log('');

    // 2. Get user reports
    console.log('📋 Step 2: Getting user reports');
    const reports = await apiUsageExamples.getUserReports(trpc, { limit: 5 });
    console.log('');

    if (reports.length > 0) {
      // 3. Get detailed report
      console.log('📄 Step 3: Getting report details');
      const reportDetails = await apiUsageExamples.getReportDetails(trpc, reports[0].id);
      console.log('');

      if (reportDetails.recommendations.length > 0) {
        const recommendation = reportDetails.recommendations[0];

        // 4. Start tracking recommendation
        console.log('⏱️ Step 4: Starting recommendation tracking');
        await apiUsageExamples.startTrackingRecommendation(trpc, recommendation.id);
        console.log('');

        // 5. Update progress
        console.log('📝 Step 5: Updating progress');
        await apiUsageExamples.updateRecommendationProgress(trpc, recommendation.id, {
          status: 'in_progress',
          notes: 'Started implementation',
          actualEffort: 2
        });
        console.log('');

        // 6. Add measurement
        console.log('📏 Step 6: Adding measurement');
        await apiUsageExamples.updateRecommendationProgress(trpc, recommendation.id, {
          measurements: [
            {
              metric: 'Page Load Speed',
              value: 3.2,
              notes: 'Baseline measurement'
            }
          ]
        });
        console.log('');

        // 7. Complete recommendation
        console.log('✅ Step 7: Completing recommendation');
        await apiUsageExamples.completeRecommendation(trpc, recommendation.id, {
          notes: 'Successfully implemented all changes',
          finalMeasurements: [
            {
              metric: 'Page Load Speed',
              value: 1.8,
              notes: 'Final measurement - 44% improvement!'
            }
          ]
        });
        console.log('');
      }

      // 8. Export PDF
      console.log('📄 Step 8: Exporting PDF report');
      await apiUsageExamples.exportReportPDF(trpc, reports[0].id);
      console.log('');
    }

    // 9. Get final stats
    console.log('📊 Step 9: Getting final statistics');
    await apiUsageExamples.getRecommendationStats(trpc);
    console.log('');

    console.log('🎉 Workflow completed successfully!');

  } catch (error) {
    console.error('❌ Workflow failed:', error);
    throw error;
  }
}

// Type exports for external usage
export type ReportGenerateInput = RouterInputs['reports']['generate'];
export type ReportListInput = RouterInputs['reports']['list'];
export type ReportListOutput = RouterOutputs['reports']['list'];
export type RecommendationUpdateInput = RouterInputs['recommendations']['updateProgress'];
export type DashboardOutput = RouterOutputs['reports']['getProgressDashboard'];