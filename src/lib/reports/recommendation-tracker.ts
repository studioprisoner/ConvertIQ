import { db } from '@/db/connection';
import { recommendations, recommendationsRelations } from '@/db/schema/recommendations';
import { reports } from '@/db/schema/reports';
import { eq, and, desc, asc } from 'drizzle-orm';
import type { ReportRecommendation } from './types';

export interface RecommendationProgress {
  id: string;
  status: 'pending' | 'in_progress' | 'completed' | 'dismissed';
  startedAt?: Date;
  completedAt?: Date;
  progressNotes: string[];
  milestones: RecommendationMilestone[];
  measurements: RecommendationMeasurement[];
  estimatedCompletionDate?: Date;
  actualEffort?: number; // Hours spent
  blockers: RecommendationBlocker[];
}

export interface RecommendationMilestone {
  id: string;
  title: string;
  description: string;
  isCompleted: boolean;
  completedAt?: Date;
  targetDate?: Date;
  order: number;
}

export interface RecommendationMeasurement {
  id: string;
  metric: string;
  baselineValue: number;
  currentValue: number;
  targetValue: number;
  measurementDate: Date;
  notes?: string;
}

export interface RecommendationBlocker {
  id: string;
  title: string;
  description: string;
  severity: 'low' | 'medium' | 'high';
  isResolved: boolean;
  resolvedAt?: Date;
  createdAt: Date;
}

export interface ProgressUpdate {
  recommendationId: string;
  status?: 'pending' | 'in_progress' | 'completed' | 'dismissed';
  notes?: string;
  actualEffort?: number;
  milestoneCompletions?: string[]; // milestone IDs
  measurements?: {
    metric: string;
    value: number;
    notes?: string;
  }[];
  blockers?: {
    title: string;
    description: string;
    severity: 'low' | 'medium' | 'high';
  }[];
}

export class RecommendationTracker {
  /**
   * Start tracking a recommendation
   */
  async startTracking(recommendationId: string): Promise<RecommendationProgress> {
    // Update status in database
    await db
      .update(recommendations)
      .set({ 
        status: 'in_progress',
        updatedAt: new Date()
      })
      .where(eq(recommendations.id, recommendationId));

    // Initialize tracking data
    const progress: RecommendationProgress = {
      id: recommendationId,
      status: 'in_progress',
      startedAt: new Date(),
      progressNotes: ['Started implementation'],
      milestones: await this.generateMilestones(recommendationId),
      measurements: await this.initializeMeasurements(recommendationId),
      blockers: []
    };

    // Store in local tracking system (could be database table or local storage)
    await this.saveProgress(progress);

    return progress;
  }

  /**
   * Update recommendation progress
   */
  async updateProgress(update: ProgressUpdate): Promise<RecommendationProgress> {
    const currentProgress = await this.getProgress(update.recommendationId);
    
    if (!currentProgress) {
      throw new Error('Recommendation not being tracked');
    }

    // Update status if provided
    if (update.status) {
      currentProgress.status = update.status;
      
      if (update.status === 'completed') {
        currentProgress.completedAt = new Date();
      }

      // Update database
      await db
        .update(recommendations)
        .set({ 
          status: update.status,
          isCompleted: update.status === 'completed',
          updatedAt: new Date()
        })
        .where(eq(recommendations.id, update.recommendationId));
    }

    // Add progress notes
    if (update.notes) {
      currentProgress.progressNotes.push(`${new Date().toISOString()}: ${update.notes}`);
    }

    // Update effort tracking
    if (update.actualEffort) {
      currentProgress.actualEffort = (currentProgress.actualEffort || 0) + update.actualEffort;
    }

    // Complete milestones
    if (update.milestoneCompletions) {
      for (const milestoneId of update.milestoneCompletions) {
        const milestone = currentProgress.milestones.find(m => m.id === milestoneId);
        if (milestone) {
          milestone.isCompleted = true;
          milestone.completedAt = new Date();
        }
      }
    }

    // Add measurements
    if (update.measurements) {
      for (const measurement of update.measurements) {
        const existing = currentProgress.measurements.find(m => m.metric === measurement.metric);
        if (existing) {
          existing.currentValue = measurement.value;
          existing.measurementDate = new Date();
          existing.notes = measurement.notes;
        } else {
          currentProgress.measurements.push({
            id: `measure_${Date.now()}`,
            metric: measurement.metric,
            baselineValue: 0, // Should be set during initialization
            currentValue: measurement.value,
            targetValue: 0, // Should be set during initialization
            measurementDate: new Date(),
            notes: measurement.notes
          });
        }
      }
    }

    // Add blockers
    if (update.blockers) {
      for (const blocker of update.blockers) {
        currentProgress.blockers.push({
          id: `blocker_${Date.now()}`,
          title: blocker.title,
          description: blocker.description,
          severity: blocker.severity,
          isResolved: false,
          createdAt: new Date()
        });
      }
    }

    await this.saveProgress(currentProgress);
    return currentProgress;
  }

  /**
   * Get recommendation progress
   */
  async getProgress(recommendationId: string): Promise<RecommendationProgress | null> {
    // In a real implementation, this would fetch from a dedicated tracking table
    // For now, we'll simulate with localStorage or return basic progress
    try {
      const stored = localStorage.getItem(`rec_progress_${recommendationId}`);
      return stored ? JSON.parse(stored) : null;
    } catch {
      // Fallback to database data
      const rec = await db
        .select()
        .from(recommendations)
        .where(eq(recommendations.id, recommendationId))
        .limit(1);

      if (rec.length === 0) return null;

      const recommendation = rec[0];
      return {
        id: recommendationId,
        status: recommendation.status,
        startedAt: recommendation.status !== 'pending' ? recommendation.updatedAt : undefined,
        completedAt: recommendation.isCompleted ? recommendation.updatedAt : undefined,
        progressNotes: [`Status: ${recommendation.status}`],
        milestones: await this.generateMilestones(recommendationId),
        measurements: [],
        blockers: []
      };
    }
  }

  /**
   * Get progress for all recommendations in a report
   */
  async getReportProgress(reportId: string): Promise<{
    totalRecommendations: number;
    completedRecommendations: number;
    inProgressRecommendations: number;
    overallProgress: number;
    recommendations: Array<{
      id: string;
      title: string;
      status: string;
      progress: RecommendationProgress | null;
    }>;
  }> {
    const reportRecommendations = await db
      .select({
        id: recommendations.id,
        title: recommendations.title,
        status: recommendations.status
      })
      .from(recommendations)
      .where(eq(recommendations.reportId, reportId))
      .orderBy(asc(recommendations.createdAt));

    const progressData = await Promise.all(
      reportRecommendations.map(async (rec) => ({
        id: rec.id,
        title: rec.title,
        status: rec.status,
        progress: await this.getProgress(rec.id)
      }))
    );

    const completed = reportRecommendations.filter(r => r.status === 'completed').length;
    const inProgress = reportRecommendations.filter(r => r.status === 'in_progress').length;
    const total = reportRecommendations.length;

    return {
      totalRecommendations: total,
      completedRecommendations: completed,
      inProgressRecommendations: inProgress,
      overallProgress: total > 0 ? Math.round((completed / total) * 100) : 0,
      recommendations: progressData
    };
  }

  /**
   * Resolve a blocker
   */
  async resolveBlocker(recommendationId: string, blockerId: string, resolution?: string): Promise<void> {
    const progress = await this.getProgress(recommendationId);
    if (!progress) return;

    const blocker = progress.blockers.find(b => b.id === blockerId);
    if (blocker) {
      blocker.isResolved = true;
      blocker.resolvedAt = new Date();
      
      if (resolution) {
        progress.progressNotes.push(`${new Date().toISOString()}: Resolved blocker "${blocker.title}": ${resolution}`);
      }

      await this.saveProgress(progress);
    }
  }

  /**
   * Generate tracking milestones based on recommendation type
   */
  private async generateMilestones(recommendationId: string): Promise<RecommendationMilestone[]> {
    const rec = await db
      .select({
        title: recommendations.title,
        category: recommendations.category,
        description: recommendations.description
      })
      .from(recommendations)
      .where(eq(recommendations.id, recommendationId))
      .limit(1);

    if (rec.length === 0) return [];

    const recommendation = rec[0];
    const category = recommendation.category?.toLowerCase() || '';

    // Generate milestones based on category
    if (category.includes('seo') || recommendation.title.toLowerCase().includes('seo')) {
      return [
        {
          id: 'milestone_1',
          title: 'Research and Planning',
          description: 'Complete keyword research and optimization strategy',
          isCompleted: false,
          order: 1
        },
        {
          id: 'milestone_2',
          title: 'Implementation',
          description: 'Apply SEO changes to website',
          isCompleted: false,
          order: 2
        },
        {
          id: 'milestone_3',
          title: 'Testing and Validation',
          description: 'Verify changes and test functionality',
          isCompleted: false,
          order: 3
        },
        {
          id: 'milestone_4',
          title: 'Monitoring Setup',
          description: 'Set up tracking and monitoring for results',
          isCompleted: false,
          order: 4
        }
      ];
    }

    if (category.includes('ux') || category.includes('mobile')) {
      return [
        {
          id: 'milestone_1',
          title: 'UX Audit',
          description: 'Complete user experience audit and identify issues',
          isCompleted: false,
          order: 1
        },
        {
          id: 'milestone_2',
          title: 'Design Changes',
          description: 'Implement design and layout improvements',
          isCompleted: false,
          order: 2
        },
        {
          id: 'milestone_3',
          title: 'Mobile Testing',
          description: 'Test changes across multiple devices and browsers',
          isCompleted: false,
          order: 3
        },
        {
          id: 'milestone_4',
          title: 'User Testing',
          description: 'Conduct user testing and gather feedback',
          isCompleted: false,
          order: 4
        }
      ];
    }

    // Generic milestones
    return [
      {
        id: 'milestone_1',
        title: 'Planning',
        description: 'Plan implementation approach and gather requirements',
        isCompleted: false,
        order: 1
      },
      {
        id: 'milestone_2',
        title: 'Implementation',
        description: 'Execute the recommendation changes',
        isCompleted: false,
        order: 2
      },
      {
        id: 'milestone_3',
        title: 'Testing',
        description: 'Test and validate the implementation',
        isCompleted: false,
        order: 3
      },
      {
        id: 'milestone_4',
        title: 'Monitoring',
        description: 'Monitor results and measure impact',
        isCompleted: false,
        order: 4
      }
    ];
  }

  /**
   * Initialize measurement tracking based on recommendation type
   */
  private async initializeMeasurements(recommendationId: string): Promise<RecommendationMeasurement[]> {
    const rec = await db
      .select({
        title: recommendations.title,
        category: recommendations.category,
        estimatedImpact: recommendations.estimatedImpact
      })
      .from(recommendations)
      .where(eq(recommendations.id, recommendationId))
      .limit(1);

    if (rec.length === 0) return [];

    const recommendation = rec[0];
    const category = recommendation.category?.toLowerCase() || '';
    const impact = recommendation.estimatedImpact || 5;

    const measurements: RecommendationMeasurement[] = [];

    // SEO measurements
    if (category.includes('seo')) {
      measurements.push(
        {
          id: 'metric_organic_traffic',
          metric: 'Organic Traffic',
          baselineValue: 100, // Placeholder - should be actual current value
          currentValue: 100,
          targetValue: 100 + (impact * 5), // Target increase based on impact
          measurementDate: new Date()
        },
        {
          id: 'metric_search_rankings',
          metric: 'Average Search Ranking',
          baselineValue: 50, // Placeholder
          currentValue: 50,
          targetValue: Math.max(50 - (impact * 2), 1),
          measurementDate: new Date()
        }
      );
    }

    // UX measurements
    if (category.includes('ux') || category.includes('mobile')) {
      measurements.push(
        {
          id: 'metric_bounce_rate',
          metric: 'Bounce Rate (%)',
          baselineValue: 50, // Placeholder
          currentValue: 50,
          targetValue: Math.max(50 - (impact * 2), 10),
          measurementDate: new Date()
        },
        {
          id: 'metric_time_on_page',
          metric: 'Average Time on Page (seconds)',
          baselineValue: 120, // Placeholder
          currentValue: 120,
          targetValue: 120 + (impact * 10),
          measurementDate: new Date()
        }
      );
    }

    // Conversion measurements
    if (category.includes('conversion') || recommendation.title.toLowerCase().includes('conversion')) {
      measurements.push(
        {
          id: 'metric_conversion_rate',
          metric: 'Conversion Rate (%)',
          baselineValue: 2.5, // Placeholder
          currentValue: 2.5,
          targetValue: 2.5 + (impact * 0.5),
          measurementDate: new Date()
        }
      );
    }

    // Default metrics for all recommendations
    measurements.push(
      {
        id: 'metric_user_satisfaction',
        metric: 'User Satisfaction Score',
        baselineValue: 7, // Placeholder
        currentValue: 7,
        targetValue: Math.min(7 + impact, 10),
        measurementDate: new Date()
      }
    );

    return measurements;
  }

  /**
   * Save progress data (in real implementation, this would go to database)
   */
  private async saveProgress(progress: RecommendationProgress): Promise<void> {
    try {
      localStorage.setItem(`rec_progress_${progress.id}`, JSON.stringify(progress));
    } catch (error) {
      console.warn('Could not save progress to localStorage:', error);
      // In production, this would save to database
    }
  }

  /**
   * Generate progress summary for all tracked recommendations
   */
  async getOverallProgressSummary(userId: string): Promise<{
    totalTracked: number;
    completedThisWeek: number;
    blockedRecommendations: number;
    averageCompletionTime: number; // days
    topPerformingCategories: string[];
  }> {
    // This would query actual tracking data in production
    return {
      totalTracked: 0,
      completedThisWeek: 0,
      blockedRecommendations: 0,
      averageCompletionTime: 14,
      topPerformingCategories: ['SEO', 'UX', 'Conversion']
    };
  }

  /**
   * Get recommendations that need attention (overdue, blocked, etc.)
   */
  async getRecommendationsNeedingAttention(userId: string): Promise<Array<{
    id: string;
    title: string;
    reason: 'overdue' | 'blocked' | 'stalled';
    daysSinceLastUpdate: number;
    priority: string;
  }>> {
    // This would analyze tracking data to identify recommendations needing attention
    return [];
  }
}

// Export singleton instance
export const recommendationTracker = new RecommendationTracker();