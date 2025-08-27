/**
 * AI Cost Optimizer - Phase 2 Implementation
 * 
 * This service provides intelligent cost optimization for AI operations,
 * including usage tracking, budget management, and cost-effective provider selection.
 */

import { AIProviderManager } from './providers/manager';
import { aiProviderConfigs, type AnalysisType } from '@/config/ai-providers';
import type { AIProvider } from '@/config';

export interface CostBudget {
  daily: number;
  monthly: number;
  perAnalysis: number;
  emergency: number; // Emergency budget for critical operations
}

export interface CostAlert {
  id: string;
  type: 'budget_exceeded' | 'unusual_spending' | 'cost_spike' | 'efficiency_warning';
  severity: 'low' | 'medium' | 'high' | 'critical';
  message: string;
  timestamp: Date;
  suggestion: string;
  data: any;
}

export interface CostOptimization {
  currentCost: number;
  optimizedCost: number;
  savings: number;
  savingsPercent: number;
  recommendations: {
    provider: AIProvider;
    reason: string;
    expectedSavings: number;
  }[];
}

export interface UsagePattern {
  analysisType: AnalysisType;
  frequency: number; // requests per day
  averageCost: number;
  provider: AIProvider;
  trend: 'increasing' | 'decreasing' | 'stable';
}

/**
 * AI Cost Optimization Service
 */
export class AICostOptimizer {
  private aiManager: AIProviderManager;
  private usageHistory: Map<string, { timestamp: Date; cost: number; provider: AIProvider; type: AnalysisType }[]> = new Map();
  private budgets: CostBudget;
  private alerts: CostAlert[] = [];

  constructor(
    aiManager: AIProviderManager,
    budgets: CostBudget = {
      daily: 10, // $10 per day
      monthly: 300, // $300 per month  
      perAnalysis: 0.50, // $0.50 per analysis
      emergency: 50 // $50 emergency budget
    }
  ) {
    this.aiManager = aiManager;
    this.budgets = budgets;
    this.startPeriodicOptimization();
  }

  /**
   * Get cost-optimized provider recommendation for a specific analysis
   */
  async getOptimalProviderForCost(
    analysisType: AnalysisType,
    estimatedTokens: number,
    quality: 'fast' | 'balanced' | 'high_quality' = 'balanced'
  ): Promise<{
    provider: AIProvider;
    estimatedCost: number;
    reasoning: string;
    alternatives: Array<{
      provider: AIProvider;
      cost: number;
      tradeoffs: string;
    }>;
  }> {
    
    const availableProviders = Object.keys(aiProviderConfigs) as AIProvider[];
    const providerOptions = availableProviders.map(provider => {
      const config = aiProviderConfigs[provider];
      const estimatedCost = (estimatedTokens / 1000) * config.costPer1kTokens;
      
      return {
        provider,
        cost: estimatedCost,
        config,
        qualityScore: this.calculateQualityScore(provider, analysisType, quality)
      };
    }).filter(option => option.cost <= this.budgets.perAnalysis);

    // Sort by cost-effectiveness ratio (quality/cost)
    providerOptions.sort((a, b) => {
      const aRatio = a.qualityScore / a.cost;
      const bRatio = b.qualityScore / b.cost;
      return bRatio - aRatio;
    });

    if (providerOptions.length === 0) {
      // Fallback to cheapest available
      const cheapest = availableProviders.reduce((min, provider) => {
        const cost = (estimatedTokens / 1000) * aiProviderConfigs[provider].costPer1kTokens;
        const minCost = (estimatedTokens / 1000) * aiProviderConfigs[min].costPer1kTokens;
        return cost < minCost ? provider : min;
      });

      return {
        provider: cheapest,
        estimatedCost: (estimatedTokens / 1000) * aiProviderConfigs[cheapest].costPer1kTokens,
        reasoning: 'Selected cheapest available provider due to budget constraints',
        alternatives: []
      };
    }

    const optimal = providerOptions[0];
    const alternatives = providerOptions.slice(1, 4).map(option => ({
      provider: option.provider,
      cost: option.cost,
      tradeoffs: this.generateTradeoffDescription(optimal, option)
    }));

    return {
      provider: optimal.provider,
      estimatedCost: optimal.cost,
      reasoning: this.generateOptimalProviderReasoning(optimal, analysisType, quality),
      alternatives
    };
  }

  /**
   * Track usage and costs for analysis
   */
  trackUsage(
    userId: string,
    analysisType: AnalysisType,
    provider: AIProvider,
    cost: number
  ): void {
    if (!this.usageHistory.has(userId)) {
      this.usageHistory.set(userId, []);
    }

    const userHistory = this.usageHistory.get(userId)!;
    userHistory.push({
      timestamp: new Date(),
      cost,
      provider,
      type: analysisType
    });

    // Keep only last 30 days of history
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    const recentHistory = userHistory.filter(entry => entry.timestamp > thirtyDaysAgo);
    this.usageHistory.set(userId, recentHistory);

    // Check for budget alerts
    this.checkBudgetAlerts(userId, recentHistory);
  }

  /**
   * Get comprehensive cost analysis for a user
   */
  getCostAnalysis(userId: string): {
    dailyCost: number;
    weeklyCost: number;
    monthlyCost: number;
    budgetStatus: {
      daily: { used: number; remaining: number; percentage: number };
      monthly: { used: number; remaining: number; percentage: number };
    };
    topCostDrivers: Array<{
      analysisType: AnalysisType;
      cost: number;
      frequency: number;
    }>;
    recommendations: string[];
  } {
    const userHistory = this.usageHistory.get(userId) || [];
    const now = new Date();

    // Calculate time-based costs
    const oneDayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);
    const oneWeekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    const oneMonthAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

    const dailyCost = userHistory
      .filter(entry => entry.timestamp > oneDayAgo)
      .reduce((sum, entry) => sum + entry.cost, 0);

    const weeklyCost = userHistory
      .filter(entry => entry.timestamp > oneWeekAgo)
      .reduce((sum, entry) => sum + entry.cost, 0);

    const monthlyCost = userHistory
      .filter(entry => entry.timestamp > oneMonthAgo)
      .reduce((sum, entry) => sum + entry.cost, 0);

    // Budget status
    const budgetStatus = {
      daily: {
        used: dailyCost,
        remaining: Math.max(0, this.budgets.daily - dailyCost),
        percentage: Math.min(100, (dailyCost / this.budgets.daily) * 100)
      },
      monthly: {
        used: monthlyCost,
        remaining: Math.max(0, this.budgets.monthly - monthlyCost),
        percentage: Math.min(100, (monthlyCost / this.budgets.monthly) * 100)
      }
    };

    // Top cost drivers
    const costByType: Record<string, { cost: number; frequency: number }> = {};
    userHistory.forEach(entry => {
      if (!costByType[entry.type]) {
        costByType[entry.type] = { cost: 0, frequency: 0 };
      }
      costByType[entry.type].cost += entry.cost;
      costByType[entry.type].frequency++;
    });

    const topCostDrivers = Object.entries(costByType)
      .map(([type, data]) => ({
        analysisType: type as AnalysisType,
        cost: data.cost,
        frequency: data.frequency
      }))
      .sort((a, b) => b.cost - a.cost)
      .slice(0, 5);

    // Generate recommendations
    const recommendations = this.generateCostRecommendations(userHistory, budgetStatus);

    return {
      dailyCost,
      weeklyCost,
      monthlyCost,
      budgetStatus,
      topCostDrivers,
      recommendations
    };
  }

  /**
   * Optimize costs for a batch of analyses
   */
  async optimizeBatchCosts(
    analyses: Array<{
      type: AnalysisType;
      estimatedTokens: number;
      priority: 'low' | 'medium' | 'high';
    }>
  ): Promise<CostOptimization> {
    let currentCost = 0;
    let optimizedCost = 0;
    const recommendations: CostOptimization['recommendations'] = [];

    for (const analysis of analyses) {
      // Calculate current cost (using default provider)
      const defaultProvider = this.getDefaultProvider(analysis.type);
      const defaultCost = (analysis.estimatedTokens / 1000) * aiProviderConfigs[defaultProvider].costPer1kTokens;
      currentCost += defaultCost;

      // Get optimized provider
      const optimal = await this.getOptimalProviderForCost(
        analysis.type,
        analysis.estimatedTokens,
        analysis.priority === 'high' ? 'high_quality' : 'balanced'
      );
      
      optimizedCost += optimal.estimatedCost;

      if (optimal.provider !== defaultProvider) {
        recommendations.push({
          provider: optimal.provider,
          reason: optimal.reasoning,
          expectedSavings: defaultCost - optimal.estimatedCost
        });
      }
    }

    const savings = currentCost - optimizedCost;
    const savingsPercent = currentCost > 0 ? (savings / currentCost) * 100 : 0;

    return {
      currentCost,
      optimizedCost,
      savings,
      savingsPercent,
      recommendations: recommendations.filter(rec => rec.expectedSavings > 0)
    };
  }

  /**
   * Get current cost alerts
   */
  getCostAlerts(): CostAlert[] {
    return [...this.alerts].sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());
  }

  /**
   * Clear processed alerts
   */
  clearAlerts(alertIds: string[]): void {
    this.alerts = this.alerts.filter(alert => !alertIds.includes(alert.id));
  }

  // Private methods

  private calculateQualityScore(
    provider: AIProvider,
    analysisType: AnalysisType,
    quality: 'fast' | 'balanced' | 'high_quality'
  ): number {
    const config = aiProviderConfigs[provider];
    
    // Base quality score from provider capabilities
    let score = config.capabilities.reasoning * 0.4 + 
                config.capabilities.speed * 0.3 + 
                config.capabilities.costEfficiency * 0.3;

    // Adjust based on analysis type preferences
    switch (analysisType) {
      case 'conversion-analysis':
        score += config.capabilities.reasoning * 0.2; // Bonus for reasoning
        break;
      case 'content-generation':
        score += config.capabilities.speed * 0.2; // Bonus for speed
        break;
      case 'comprehensive-audit':
        score += config.capabilities.reasoning * 0.3; // Heavy bonus for reasoning
        break;
    }

    // Adjust based on quality preference
    switch (quality) {
      case 'fast':
        score += config.capabilities.speed * 0.3;
        break;
      case 'high_quality':
        score += config.capabilities.reasoning * 0.3;
        break;
      case 'balanced':
        // No additional adjustment
        break;
    }

    return Math.min(10, score);
  }

  private getDefaultProvider(analysisType: AnalysisType): AIProvider {
    // Simple default provider logic
    switch (analysisType) {
      case 'conversion-analysis':
      case 'comprehensive-audit':
        return 'anthropic';
      case 'seo-analysis':
        return aiProviderConfigs.openai ? 'openai' : 'anthropic';
      default:
        return 'anthropic';
    }
  }

  private generateOptimalProviderReasoning(
    optimal: any,
    analysisType: AnalysisType,
    quality: string
  ): string {
    const config = optimal.config;
    const reasons = [];

    reasons.push(`Best cost-effectiveness ratio (${optimal.qualityScore.toFixed(1)}/cost)`);
    
    if (config.capabilities.reasoning >= 8) {
      reasons.push('excellent reasoning capabilities');
    }
    
    if (quality === 'fast' && config.capabilities.speed >= 8) {
      reasons.push('optimized for speed');
    }
    
    if (optimal.cost <= 0.01) {
      reasons.push('very cost-effective');
    }

    return `Selected ${config.name} for ${analysisType}: ${reasons.join(', ')}.`;
  }

  private generateTradeoffDescription(optimal: any, alternative: any): string {
    const optimalConfig = optimal.config;
    const altConfig = alternative.config;

    const tradeoffs = [];

    if (altConfig.capabilities.speed > optimalConfig.capabilities.speed) {
      tradeoffs.push('faster responses');
    }
    
    if (altConfig.capabilities.reasoning > optimalConfig.capabilities.reasoning) {
      tradeoffs.push('better reasoning');
    }

    if (alternative.cost < optimal.cost) {
      tradeoffs.push('lower cost');
    } else if (alternative.cost > optimal.cost) {
      tradeoffs.push('higher cost');
    }

    return tradeoffs.length > 0 ? tradeoffs.join(', ') : 'similar capabilities';
  }

  private checkBudgetAlerts(userId: string, userHistory: any[]): void {
    const now = new Date();
    const oneDayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);
    const oneMonthAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

    const dailyCost = userHistory
      .filter(entry => entry.timestamp > oneDayAgo)
      .reduce((sum, entry) => sum + entry.cost, 0);

    const monthlyCost = userHistory
      .filter(entry => entry.timestamp > oneMonthAgo)
      .reduce((sum, entry) => sum + entry.cost, 0);

    // Daily budget alert
    if (dailyCost > this.budgets.daily * 0.9) {
      this.addAlert({
        type: 'budget_exceeded',
        severity: dailyCost > this.budgets.daily ? 'high' : 'medium',
        message: `Daily budget ${dailyCost > this.budgets.daily ? 'exceeded' : '90% reached'}: $${dailyCost.toFixed(2)} / $${this.budgets.daily}`,
        suggestion: 'Consider using more cost-effective providers or reducing analysis frequency',
        data: { userId, dailyCost, budget: this.budgets.daily }
      });
    }

    // Monthly budget alert
    if (monthlyCost > this.budgets.monthly * 0.8) {
      this.addAlert({
        type: 'budget_exceeded',
        severity: monthlyCost > this.budgets.monthly ? 'critical' : 'high',
        message: `Monthly budget ${monthlyCost > this.budgets.monthly ? 'exceeded' : '80% reached'}: $${monthlyCost.toFixed(2)} / $${this.budgets.monthly}`,
        suggestion: 'Review usage patterns and consider upgrading plan or optimizing AI provider usage',
        data: { userId, monthlyCost, budget: this.budgets.monthly }
      });
    }
  }

  private addAlert(alertData: Omit<CostAlert, 'id' | 'timestamp'>): void {
    const alert: CostAlert = {
      ...alertData,
      id: `alert_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      timestamp: new Date()
    };

    this.alerts.push(alert);

    // Keep only last 100 alerts
    if (this.alerts.length > 100) {
      this.alerts = this.alerts.slice(-100);
    }
  }

  private generateCostRecommendations(userHistory: any[], budgetStatus: any): string[] {
    const recommendations: string[] = [];

    if (budgetStatus.daily.percentage > 80) {
      recommendations.push('Consider scheduling non-urgent analyses during off-peak hours');
    }

    if (budgetStatus.monthly.percentage > 70) {
      recommendations.push('Review your most expensive analysis types and consider alternatives');
    }

    // Analyze provider usage patterns
    const providerUsage: Record<AIProvider, { count: number; cost: number }> = {};
    userHistory.forEach(entry => {
      if (!providerUsage[entry.provider]) {
        providerUsage[entry.provider] = { count: 0, cost: 0 };
      }
      providerUsage[entry.provider].count++;
      providerUsage[entry.provider].cost += entry.cost;
    });

    // Check if user is consistently using expensive providers
    const totalCost = Object.values(providerUsage).reduce((sum, usage) => sum + usage.cost, 0);
    const expensiveUsage = Object.entries(providerUsage).filter(([provider, usage]) => {
      const avgCost = usage.cost / usage.count;
      return avgCost > 0.05; // More than 5 cents per request
    });

    if (expensiveUsage.length > 0 && totalCost > this.budgets.monthly * 0.5) {
      recommendations.push('Consider using more cost-effective AI providers for routine analyses');
    }

    return recommendations;
  }

  private startPeriodicOptimization(): void {
    // Run optimization checks every hour
    setInterval(() => {
      this.performPeriodicChecks();
    }, 60 * 60 * 1000);
  }

  private performPeriodicChecks(): void {
    // Check for unusual spending patterns
    this.checkForUnusualSpending();
    
    // Clean up old alerts
    const oneWeekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
    this.alerts = this.alerts.filter(alert => alert.timestamp > oneWeekAgo);
  }

  private checkForUnusualSpending(): void {
    // This would implement anomaly detection for unusual spending patterns
    // For now, just a placeholder
    console.log('Performing periodic cost optimization checks...');
  }
}

// Export singleton instance creator function to avoid circular imports
export const createCostOptimizer = (aiManager: AIProviderManager) => {
  return new AICostOptimizer(aiManager);
};

// Lazy initialization to be used in API routes
export const getCostOptimizer = () => {
  return new AICostOptimizer(new AIProviderManager());
};