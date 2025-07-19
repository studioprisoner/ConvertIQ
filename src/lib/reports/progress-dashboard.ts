import { recommendationTracker } from './recommendation-tracker';
import { databaseTrackingService } from './database-tracking';
import type { RecommendationProgress, RecommendationMilestone, RecommendationMeasurement } from './recommendation-tracker';

export interface DashboardData {
  overview: {
    totalRecommendations: number;
    completedRecommendations: number;
    inProgressRecommendations: number;
    pendingRecommendations: number;
    completionRate: number;
    averageCompletionTime: number;
  };
  
  recentActivity: Array<{
    id: string;
    title: string;
    action: string;
    timestamp: Date;
    reportTitle: string;
  }>;
  
  priorityQueue: Array<{
    id: string;
    title: string;
    priority: string;
    category: string;
    estimatedImpact: number;
    estimatedEffort: number;
    status: string;
    reportTitle: string;
  }>;
  
  needsAttention: Array<{
    id: string;
    title: string;
    reason: 'overdue' | 'blocked' | 'stalled';
    daysSinceUpdate: number;
    priority: string;
    reportTitle: string;
  }>;
  
  categoryPerformance: Array<{
    category: string;
    totalRecommendations: number;
    completedRecommendations: number;
    completionRate: number;
    averageImpact: number;
  }>;
  
  completionTrends: Array<{
    month: string;
    completedCount: number;
    totalCount: number;
    completionRate: number;
  }>;
}

export interface RecommendationDetails {
  id: string;
  title: string;
  description: string;
  priority: string;
  status: string;
  category: string;
  estimatedImpact: number;
  estimatedEffort: number;
  progress: RecommendationProgress | null;
  reportTitle: string;
  createdAt: Date;
  updatedAt: Date;
}

export class ProgressDashboardService {
  /**
   * Get comprehensive dashboard data for a user
   */
  async getDashboardData(userId: string): Promise<DashboardData> {
    // Run all queries in parallel for better performance
    const [
      overview,
      recentActivity,
      priorityQueue,
      needsAttention,
      categoryPerformance,
      completionTrends
    ] = await Promise.all([
      databaseTrackingService.getUserProgressStats(userId),
      databaseTrackingService.getRecentActivity(userId, 10),
      this.getPriorityQueue(userId),
      this.getRecommendationsNeedingAttention(userId),
      databaseTrackingService.getCategoryPerformance(userId),
      databaseTrackingService.getCompletionTrends(userId, 6)
    ]);

    return {
      overview,
      recentActivity,
      priorityQueue,
      needsAttention,
      categoryPerformance,
      completionTrends
    };
  }

  /**
   * Get detailed information about a specific recommendation
   */
  async getRecommendationDetails(recommendationId: string, userId: string): Promise<RecommendationDetails | null> {
    // Get basic recommendation data
    const pendingRecs = await databaseTrackingService.getRecommendationsByStatus(userId, 'pending');
    const inProgressRecs = await databaseTrackingService.getRecommendationsByStatus(userId, 'in_progress');
    const completedRecs = await databaseTrackingService.getRecommendationsByStatus(userId, 'completed');
    const dismissedRecs = await databaseTrackingService.getRecommendationsByStatus(userId, 'dismissed');
    
    const allRecs = [...pendingRecs, ...inProgressRecs, ...completedRecs, ...dismissedRecs];
    const recommendation = allRecs.find(rec => rec.id === recommendationId);
    
    if (!recommendation) {
      return null;
    }

    // Get progress tracking data
    const progress = await recommendationTracker.getProgress(recommendationId);

    return {
      id: recommendation.id,
      title: recommendation.title,
      description: recommendation.description,
      priority: recommendation.priority,
      status: recommendation.status || 'pending',
      category: recommendation.category,
      estimatedImpact: recommendation.estimatedImpact,
      estimatedEffort: recommendation.estimatedEffort,
      progress,
      reportTitle: 'Report Title', // Would need to join with reports table
      createdAt: recommendation.createdAt,
      updatedAt: recommendation.updatedAt
    };
  }

  /**
   * Start tracking a recommendation
   */
  async startRecommendation(recommendationId: string, userId: string): Promise<RecommendationProgress> {
    // Update status to in_progress
    await databaseTrackingService.updateRecommendationStatus(recommendationId, 'in_progress');
    
    // Initialize tracking
    return await recommendationTracker.startTracking(recommendationId);
  }

  /**
   * Update recommendation progress
   */
  async updateRecommendationProgress(
    recommendationId: string,
    userId: string,
    update: {
      status?: 'pending' | 'in_progress' | 'completed' | 'dismissed';
      notes?: string;
      actualEffort?: number;
      milestoneCompletions?: string[];
      measurements?: Array<{
        metric: string;
        value: number;
        notes?: string;
      }>;
      blockers?: Array<{
        title: string;
        description: string;
        severity: 'low' | 'medium' | 'high';
      }>;
    }
  ): Promise<RecommendationProgress> {
    // Update in tracking system
    const progress = await recommendationTracker.updateProgress({
      recommendationId,
      ...update
    });

    // Update database if status changed
    if (update.status) {
      await databaseTrackingService.updateRecommendationStatus(recommendationId, update.status);
    }

    return progress;
  }

  /**
   * Complete a recommendation
   */
  async completeRecommendation(
    recommendationId: string,
    userId: string,
    completionNotes?: string,
    finalMeasurements?: Array<{
      metric: string;
      value: number;
      notes?: string;
    }>
  ): Promise<RecommendationProgress> {
    return await this.updateRecommendationProgress(recommendationId, userId, {
      status: 'completed',
      notes: completionNotes || 'Recommendation completed successfully',
      measurements: finalMeasurements
    });
  }

  /**
   * Dismiss a recommendation
   */
  async dismissRecommendation(
    recommendationId: string,
    userId: string,
    reason: string
  ): Promise<void> {
    await this.updateRecommendationProgress(recommendationId, userId, {
      status: 'dismissed',
      notes: `Dismissed: ${reason}`
    });
  }

  /**
   * Add a blocker to a recommendation
   */
  async addBlocker(
    recommendationId: string,
    userId: string,
    blocker: {
      title: string;
      description: string;
      severity: 'low' | 'medium' | 'high';
    }
  ): Promise<RecommendationProgress> {
    return await this.updateRecommendationProgress(recommendationId, userId, {
      blockers: [blocker],
      notes: `Added blocker: ${blocker.title}`
    });
  }

  /**
   * Resolve a blocker
   */
  async resolveBlocker(
    recommendationId: string,
    blockerId: string,
    userId: string,
    resolution: string
  ): Promise<void> {
    await recommendationTracker.resolveBlocker(recommendationId, blockerId, resolution);
  }

  /**
   * Get recommendations filtered and sorted
   */
  async getFilteredRecommendations(
    userId: string,
    filters: {
      status?: 'pending' | 'in_progress' | 'completed' | 'dismissed';
      category?: string;
      priority?: 'low' | 'medium' | 'high' | 'critical';
      search?: string;
    }
  ): Promise<RecommendationDetails[]> {
    if (filters.search) {
      const searchResults = await databaseTrackingService.searchRecommendations(
        userId,
        filters.search,
        filters.status
      );
      
      return await Promise.all(
        searchResults
          .filter(rec => !filters.category || rec.category === filters.category)
          .filter(rec => !filters.priority || rec.priority === filters.priority)
          .map(async rec => ({
            id: rec.id,
            title: rec.title,
            description: rec.description,
            priority: rec.priority,
            status: rec.status,
            category: rec.category,
            estimatedImpact: 5, // Default values - would come from database
            estimatedEffort: 5,
            progress: await recommendationTracker.getProgress(rec.id),
            reportTitle: rec.reportTitle,
            createdAt: rec.createdAt,
            updatedAt: rec.createdAt
          }))
      );
    }

    // Get by status
    let recommendations: Array<{
      id: string;
      title: string;
      description: string;
      priority: string;
      category: string;
      estimatedImpact: number;
      estimatedEffort: number;
      reportId: string;
      createdAt: Date;
      updatedAt: Date;
    }> = [];

    if (filters.status) {
      recommendations = await databaseTrackingService.getRecommendationsByStatus(userId, filters.status);
    } else {
      // Get all recommendations
      const [pending, inProgress, completed, dismissed] = await Promise.all([
        databaseTrackingService.getRecommendationsByStatus(userId, 'pending'),
        databaseTrackingService.getRecommendationsByStatus(userId, 'in_progress'),
        databaseTrackingService.getRecommendationsByStatus(userId, 'completed'),
        databaseTrackingService.getRecommendationsByStatus(userId, 'dismissed')
      ]);
      recommendations = [...pending, ...inProgress, ...completed, ...dismissed];
    }

    // Apply filters
    let filtered = recommendations;
    
    if (filters.category) {
      filtered = filtered.filter(rec => rec.category === filters.category);
    }
    
    if (filters.priority) {
      filtered = filtered.filter(rec => rec.priority === filters.priority);
    }

    // Convert to detailed format with progress
    return await Promise.all(
      filtered.map(async rec => ({
        id: rec.id,
        title: rec.title,
        description: rec.description,
        priority: rec.priority,
        status: filters.status || 'pending',
        category: rec.category,
        estimatedImpact: rec.estimatedImpact,
        estimatedEffort: rec.estimatedEffort,
        progress: await recommendationTracker.getProgress(rec.id),
        reportTitle: 'Report Title', // Would need to fetch from reports table
        createdAt: rec.createdAt,
        updatedAt: rec.updatedAt
      }))
    );
  }

  /**
   * Get priority queue of recommendations
   */
  private async getPriorityQueue(userId: string): Promise<Array<{
    id: string;
    title: string;
    priority: string;
    category: string;
    estimatedImpact: number;
    estimatedEffort: number;
    status: string;
    reportTitle: string;
  }>> {
    // Get pending and in-progress recommendations
    const [pending, inProgress] = await Promise.all([
      databaseTrackingService.getRecommendationsByStatus(userId, 'pending'),
      databaseTrackingService.getRecommendationsByStatus(userId, 'in_progress')
    ]);

    const combined = [...pending, ...inProgress];

    // Sort by priority and impact/effort ratio
    return combined
      .sort((a, b) => {
        // Priority order: critical > high > medium > low
        const priorityOrder = { critical: 4, high: 3, medium: 2, low: 1 };
        const aPriority = priorityOrder[a.priority as keyof typeof priorityOrder] || 2;
        const bPriority = priorityOrder[b.priority as keyof typeof priorityOrder] || 2;
        
        if (aPriority !== bPriority) {
          return bPriority - aPriority; // Higher priority first
        }

        // Secondary sort by impact/effort ratio
        const aRatio = a.estimatedImpact / a.estimatedEffort;
        const bRatio = b.estimatedImpact / b.estimatedEffort;
        return bRatio - aRatio; // Higher ratio first
      })
      .slice(0, 10) // Top 10
      .map(rec => ({
        id: rec.id,
        title: rec.title,
        priority: rec.priority,
        category: rec.category,
        estimatedImpact: rec.estimatedImpact,
        estimatedEffort: rec.estimatedEffort,
        status: 'pending', // From the query filter
        reportTitle: 'Report Title' // Would need to join with reports table
      }));
  }

  /**
   * Get recommendations that need attention
   */
  private async getRecommendationsNeedingAttention(userId: string): Promise<Array<{
    id: string;
    title: string;
    reason: 'overdue' | 'blocked' | 'stalled';
    daysSinceUpdate: number;
    priority: string;
    reportTitle: string;
  }>> {
    // Get stale recommendations (not updated in 7+ days)
    const stale = await databaseTrackingService.getStaleRecommendations(userId, 7);
    
    return stale.map(rec => ({
      id: rec.id,
      title: rec.title,
      reason: 'stalled' as const,
      daysSinceUpdate: rec.daysSinceUpdate,
      priority: rec.priority,
      reportTitle: rec.reportTitle
    }));
  }

  /**
   * Get analytics for a specific time period
   */
  async getAnalytics(
    userId: string,
    startDate: Date,
    endDate: Date
  ): Promise<{
    completionRate: number;
    averageCompletionTime: number;
    topCategories: string[];
    productivityTrend: 'increasing' | 'decreasing' | 'stable';
    blockerFrequency: number;
    recommendations: {
      mostImpactful: string[];
      quickestWins: string[];
      mostChallenging: string[];
    };
  }> {
    // This would analyze completion data within the date range
    // For now, return mock analytics
    return {
      completionRate: 75,
      averageCompletionTime: 14,
      topCategories: ['SEO', 'UX', 'Conversion'],
      productivityTrend: 'increasing',
      blockerFrequency: 0.2,
      recommendations: {
        mostImpactful: ['SEO optimization', 'Mobile improvements'],
        quickestWins: ['Trust badges', 'Contact info'],
        mostChallenging: ['Complete mobile redesign', 'Content strategy overhaul']
      }
    };
  }
}

// Export singleton instance
export const progressDashboardService = new ProgressDashboardService();