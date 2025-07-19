import { db } from '@/db/connection';
import { recommendations } from '@/db/schema/recommendations';
import { reports } from '@/db/schema/reports';
import { eq, and, desc, asc, gte, count, avg, sql } from 'drizzle-orm';
import type { RecommendationProgress, ProgressUpdate } from './recommendation-tracker';

/**
 * Database operations for recommendation tracking
 * Handles persistent storage of tracking data
 */
export class DatabaseTrackingService {
  /**
   * Update recommendation status in database
   */
  async updateRecommendationStatus(
    recommendationId: string, 
    status: 'pending' | 'in_progress' | 'completed' | 'dismissed'
  ): Promise<void> {
    await db
      .update(recommendations)
      .set({ 
        status,
        isCompleted: status === 'completed',
        updatedAt: new Date()
      })
      .where(eq(recommendations.id, recommendationId));
  }

  /**
   * Bulk update multiple recommendation statuses
   */
  async bulkUpdateRecommendationStatus(
    updates: Array<{ id: string; status: 'pending' | 'in_progress' | 'completed' | 'dismissed' }>
  ): Promise<void> {
    const promises = updates.map(update => 
      this.updateRecommendationStatus(update.id, update.status)
    );
    
    await Promise.all(promises);
  }

  /**
   * Get recommendations by status for a user
   */
  async getRecommendationsByStatus(
    userId: string, 
    status: 'pending' | 'in_progress' | 'completed' | 'dismissed'
  ): Promise<Array<{
    id: string;
    title: string;
    description: string;
    priority: string;
    category: string;
    reportId: string;
    estimatedImpact: number;
    estimatedEffort: number;
    createdAt: Date;
    updatedAt: Date;
  }>> {
    const result = await db
      .select({
        id: recommendations.id,
        title: recommendations.title,
        description: recommendations.description,
        priority: recommendations.priority,
        category: recommendations.category,
        reportId: recommendations.reportId,
        estimatedImpact: recommendations.estimatedImpact,
        estimatedEffort: recommendations.estimatedEffort,
        createdAt: recommendations.createdAt,
        updatedAt: recommendations.updatedAt,
      })
      .from(recommendations)
      .innerJoin(reports, eq(recommendations.reportId, reports.id))
      .where(and(
        eq(reports.userId, userId),
        eq(recommendations.status, status)
      ))
      .orderBy(desc(recommendations.updatedAt));

    return result.map(row => ({
      ...row,
      priority: row.priority || 'medium',
      category: row.category || 'general',
      estimatedImpact: row.estimatedImpact || 5,
      estimatedEffort: row.estimatedEffort || 5,
    }));
  }

  /**
   * Get progress statistics for a user
   */
  async getUserProgressStats(userId: string): Promise<{
    totalRecommendations: number;
    completedRecommendations: number;
    inProgressRecommendations: number;
    pendingRecommendations: number;
    dismissedRecommendations: number;
    completionRate: number;
    averageCompletionTime: number; // days
  }> {
    const stats = await db
      .select({
        status: recommendations.status,
        count: count(recommendations.id),
        avgCompletionTime: avg(sql`EXTRACT(EPOCH FROM (${recommendations.updatedAt} - ${recommendations.createdAt})) / 86400`)
      })
      .from(recommendations)
      .innerJoin(reports, eq(recommendations.reportId, reports.id))
      .where(eq(reports.userId, userId))
      .groupBy(recommendations.status);

    let totalRecommendations = 0;
    let completedRecommendations = 0;
    let inProgressRecommendations = 0;
    let pendingRecommendations = 0;
    let dismissedRecommendations = 0;
    let totalCompletionTime = 0;

    stats.forEach(stat => {
      const count = Number(stat.count);
      totalRecommendations += count;

      switch (stat.status) {
        case 'completed':
          completedRecommendations = count;
          totalCompletionTime = Number(stat.avgCompletionTime) || 0;
          break;
        case 'in_progress':
          inProgressRecommendations = count;
          break;
        case 'pending':
          pendingRecommendations = count;
          break;
        case 'dismissed':
          dismissedRecommendations = count;
          break;
      }
    });

    const completionRate = totalRecommendations > 0 
      ? Math.round((completedRecommendations / totalRecommendations) * 100) 
      : 0;

    return {
      totalRecommendations,
      completedRecommendations,
      inProgressRecommendations,
      pendingRecommendations,
      dismissedRecommendations,
      completionRate,
      averageCompletionTime: Math.round(totalCompletionTime)
    };
  }

  /**
   * Get recent activity for a user's recommendations
   */
  async getRecentActivity(
    userId: string, 
    limit: number = 10
  ): Promise<Array<{
    id: string;
    title: string;
    action: string;
    timestamp: Date;
    reportTitle: string;
  }>> {
    const recent = await db
      .select({
        id: recommendations.id,
        title: recommendations.title,
        status: recommendations.status,
        updatedAt: recommendations.updatedAt,
        reportTitle: reports.title,
      })
      .from(recommendations)
      .innerJoin(reports, eq(recommendations.reportId, reports.id))
      .where(eq(reports.userId, userId))
      .orderBy(desc(recommendations.updatedAt))
      .limit(limit);

    return recent.map(item => ({
      id: item.id,
      title: item.title,
      action: this.getActionFromStatus(item.status),
      timestamp: item.updatedAt,
      reportTitle: item.reportTitle
    }));
  }

  /**
   * Get recommendations that might need attention
   */
  async getStaleRecommendations(
    userId: string,
    daysWithoutUpdate: number = 7
  ): Promise<Array<{
    id: string;
    title: string;
    status: string;
    daysSinceUpdate: number;
    priority: string;
    reportTitle: string;
  }>> {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - daysWithoutUpdate);

    const stale = await db
      .select({
        id: recommendations.id,
        title: recommendations.title,
        status: recommendations.status,
        priority: recommendations.priority,
        updatedAt: recommendations.updatedAt,
        reportTitle: reports.title,
      })
      .from(recommendations)
      .innerJoin(reports, eq(recommendations.reportId, reports.id))
      .where(and(
        eq(reports.userId, userId),
        eq(recommendations.status, 'in_progress'),
        sql`${recommendations.updatedAt} < ${cutoffDate}`
      ))
      .orderBy(asc(recommendations.updatedAt));

    return stale.map(item => ({
      id: item.id,
      title: item.title,
      status: item.status,
      daysSinceUpdate: Math.floor(
        (Date.now() - item.updatedAt.getTime()) / (1000 * 60 * 60 * 24)
      ),
      priority: item.priority || 'medium',
      reportTitle: item.reportTitle
    }));
  }

  /**
   * Get completion trends for analytics
   */
  async getCompletionTrends(
    userId: string,
    months: number = 6
  ): Promise<Array<{
    month: string;
    completedCount: number;
    totalCount: number;
    completionRate: number;
  }>> {
    const startDate = new Date();
    startDate.setMonth(startDate.getMonth() - months);

    const trends = await db
      .select({
        month: sql`TO_CHAR(${recommendations.updatedAt}, 'YYYY-MM')`,
        completed: sql`SUM(CASE WHEN ${recommendations.status} = 'completed' THEN 1 ELSE 0 END)`,
        total: count(recommendations.id)
      })
      .from(recommendations)
      .innerJoin(reports, eq(recommendations.reportId, reports.id))
      .where(and(
        eq(reports.userId, userId),
        gte(recommendations.updatedAt, startDate)
      ))
      .groupBy(sql`TO_CHAR(${recommendations.updatedAt}, 'YYYY-MM')`)
      .orderBy(sql`TO_CHAR(${recommendations.updatedAt}, 'YYYY-MM')`);

    return trends.map(trend => ({
      month: String(trend.month),
      completedCount: Number(trend.completed),
      totalCount: Number(trend.total),
      completionRate: Number(trend.total) > 0 
        ? Math.round((Number(trend.completed) / Number(trend.total)) * 100)
        : 0
    }));
  }

  /**
   * Get category performance analytics
   */
  async getCategoryPerformance(userId: string): Promise<Array<{
    category: string;
    totalRecommendations: number;
    completedRecommendations: number;
    completionRate: number;
    averageImpact: number;
    averageEffort: number;
  }>> {
    const performance = await db
      .select({
        category: recommendations.category,
        total: count(recommendations.id),
        completed: sql`SUM(CASE WHEN ${recommendations.status} = 'completed' THEN 1 ELSE 0 END)`,
        avgImpact: avg(recommendations.estimatedImpact),
        avgEffort: avg(recommendations.estimatedEffort)
      })
      .from(recommendations)
      .innerJoin(reports, eq(recommendations.reportId, reports.id))
      .where(eq(reports.userId, userId))
      .groupBy(recommendations.category)
      .orderBy(desc(sql`SUM(CASE WHEN ${recommendations.status} = 'completed' THEN 1 ELSE 0 END)`));

    return performance.map(perf => ({
      category: perf.category || 'Uncategorized',
      totalRecommendations: Number(perf.total),
      completedRecommendations: Number(perf.completed),
      completionRate: Number(perf.total) > 0 
        ? Math.round((Number(perf.completed) / Number(perf.total)) * 100)
        : 0,
      averageImpact: Math.round(Number(perf.avgImpact) || 5),
      averageEffort: Math.round(Number(perf.avgEffort) || 5)
    }));
  }

  /**
   * Search recommendations by title or description
   */
  async searchRecommendations(
    userId: string,
    query: string,
    status?: 'pending' | 'in_progress' | 'completed' | 'dismissed'
  ): Promise<Array<{
    id: string;
    title: string;
    description: string;
    status: string;
    priority: string;
    category: string;
    reportTitle: string;
    createdAt: Date;
  }>> {
    const whereConditions = [
      eq(reports.userId, userId),
      sql`(
        LOWER(${recommendations.title}) LIKE LOWER(${'%' + query + '%'}) OR 
        LOWER(${recommendations.description}) LIKE LOWER(${'%' + query + '%'})
      )`
    ];

    if (status) {
      whereConditions.push(eq(recommendations.status, status));
    }

    const results = await db
      .select({
        id: recommendations.id,
        title: recommendations.title,
        description: recommendations.description,
        status: recommendations.status,
        priority: recommendations.priority,
        category: recommendations.category,
        reportTitle: reports.title,
        createdAt: recommendations.createdAt,
      })
      .from(recommendations)
      .innerJoin(reports, eq(recommendations.reportId, reports.id))
      .where(and(...whereConditions))
      .orderBy(desc(recommendations.createdAt))
      .limit(50);

    return results.map(result => ({
      ...result,
      status: result.status || 'pending',
      priority: result.priority || 'medium',
      category: result.category || 'general'
    }));
  }

  private getActionFromStatus(status: string): string {
    switch (status) {
      case 'completed':
        return 'Completed';
      case 'in_progress':
        return 'Started working on';
      case 'dismissed':
        return 'Dismissed';
      default:
        return 'Updated';
    }
  }
}

// Export singleton instance
export const databaseTrackingService = new DatabaseTrackingService();