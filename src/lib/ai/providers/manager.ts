/**
 * Multi-Provider AI Manager - Phase 2 Implementation
 * 
 * This manager provides intelligent AI provider selection, cost optimization,
 * fallback mechanisms, and unified interface for all AI operations in ConvertIQ.
 */

import { anthropic } from '@ai-sdk/anthropic';
import { openai } from '@ai-sdk/openai';
// Google AI SDK not installed - will be handled gracefully
// import { google } from '@ai-sdk/google';
import { generateText, generateObject } from 'ai';
import { z } from 'zod';
import { aiProviderConfigs, selectOptimalProvider, calculateEstimatedCost, type AnalysisType } from '@/config/ai-providers';
import type { AIProvider } from '@/config';

export interface AIAnalysisRequest {
  type: AnalysisType;
  data: any;
  prompt?: string;
  schema?: z.ZodSchema;
  requirements?: {
    prioritizeSpeed?: boolean;
    prioritizeCost?: boolean;
    prioritizeReasoning?: boolean;
    maxCost?: number; // Maximum cost in dollars
    timeout?: number; // Timeout in seconds
  };
}

export interface AIAnalysisResult<T = any> {
  success: boolean;
  data?: T;
  error?: string;
  metadata: {
    provider: AIProvider;
    model: string;
    tokensUsed: number;
    cost: number;
    processingTime: number;
    requestId: string;
    retryCount: number;
    fallbackUsed: boolean;
  };
  reasoning?: string;
  confidence?: number;
}

export interface ProviderPerformanceMetrics {
  provider: AIProvider;
  totalRequests: number;
  successRate: number;
  averageResponseTime: number;
  averageCost: number;
  totalCost: number;
  errorTypes: Record<string, number>;
  lastUsed: Date;
}

/**
 * Multi-Provider AI Manager with intelligent selection and optimization
 */
export class AIProviderManager {
  private providerInstances: Map<AIProvider, any> = new Map();
  private performanceMetrics: Map<AIProvider, ProviderPerformanceMetrics> = new Map();
  private circuitBreakers: Map<AIProvider, { isOpen: boolean; lastFailure: Date; failureCount: number }> = new Map();

  constructor() {
    this.initializeProviders();
    this.initializeMetrics();
  }

  /**
   * Analyze data with optimal provider selection
   */
  async analyzeWithOptimalProvider<T = any>(
    request: AIAnalysisRequest
  ): Promise<AIAnalysisResult<T>> {
    const startTime = Date.now();
    const requestId = this.generateRequestId();

    try {
      // Select optimal provider
      const selectedProvider = this.selectProvider(request);
      
      // Check circuit breaker
      if (this.isCircuitBreakerOpen(selectedProvider)) {
        return await this.handleFallbackProvider(request, selectedProvider, startTime, requestId);
      }

      // Execute analysis
      const result = await this.executeAnalysis(request, selectedProvider, startTime, requestId);
      
      // Update performance metrics
      this.updateMetrics(selectedProvider, true, result.metadata.processingTime, result.metadata.cost);
      
      return result;

    } catch (error) {
      console.error('AI Analysis failed:', error);
      
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown analysis error',
        metadata: {
          provider: 'anthropic' as AIProvider, // Fallback
          model: 'unknown',
          tokensUsed: 0,
          cost: 0,
          processingTime: Date.now() - startTime,
          requestId,
          retryCount: 0,
          fallbackUsed: false
        }
      };
    }
  }

  /**
   * Perform batch analysis with load balancing across providers
   */
  async batchAnalyze<T = any>(
    requests: AIAnalysisRequest[]
  ): Promise<AIAnalysisResult<T>[]> {
    const results: AIAnalysisResult<T>[] = [];
    const batchSize = 3; // Concurrent requests per batch

    // Process requests in batches to manage rate limits
    for (let i = 0; i < requests.length; i += batchSize) {
      const batch = requests.slice(i, i + batchSize);
      
      const batchResults = await Promise.allSettled(
        batch.map(request => this.analyzeWithOptimalProvider<T>(request))
      );

      // Collect results and handle failures
      batchResults.forEach((result, index) => {
        if (result.status === 'fulfilled') {
          results.push(result.value);
        } else {
          results.push({
            success: false,
            error: `Batch analysis failed: ${result.reason}`,
            metadata: {
              provider: 'anthropic' as AIProvider,
              model: 'unknown',
              tokensUsed: 0,
              cost: 0,
              processingTime: 0,
              requestId: this.generateRequestId(),
              retryCount: 0,
              fallbackUsed: false
            }
          });
        }
      });

      // Add delay between batches to respect rate limits
      if (i + batchSize < requests.length) {
        await this.delay(1000);
      }
    }

    return results;
  }

  /**
   * Get performance metrics for all providers
   */
  getPerformanceMetrics(): Record<AIProvider, ProviderPerformanceMetrics> {
    const metrics: Record<string, ProviderPerformanceMetrics> = {};
    
    this.performanceMetrics.forEach((metric, provider) => {
      metrics[provider] = { ...metric };
    });

    return metrics as Record<AIProvider, ProviderPerformanceMetrics>;
  }

  /**
   * Get cost breakdown and recommendations
   */
  getCostAnalysis(): {
    totalCost: number;
    costByProvider: Record<AIProvider, number>;
    recommendations: string[];
    projectedMonthlyCost: number;
  } {
    let totalCost = 0;
    const costByProvider: Record<string, number> = {};
    const recommendations: string[] = [];

    this.performanceMetrics.forEach((metrics, provider) => {
      totalCost += metrics.totalCost;
      costByProvider[provider] = metrics.totalCost;
    });

    // Generate recommendations
    if (totalCost > 50) { // If spending more than $50
      recommendations.push('Consider using more cost-effective providers for routine analyses');
    }

    const mostExpensiveProvider = Object.entries(costByProvider)
      .sort(([,a], [,b]) => b - a)[0];

    if (mostExpensiveProvider && costByProvider[mostExpensiveProvider[0]] > totalCost * 0.7) {
      recommendations.push(`Consider diversifying usage - ${mostExpensiveProvider[0]} accounts for 70%+ of costs`);
    }

    return {
      totalCost,
      costByProvider: costByProvider as Record<AIProvider, number>,
      recommendations,
      projectedMonthlyCost: totalCost * 30 // Simple daily to monthly projection
    };
  }

  /**
   * Test all available providers and their health
   */
  async healthCheck(): Promise<Record<AIProvider, { healthy: boolean; responseTime: number; error?: string }>> {
    const healthResults: Record<string, { healthy: boolean; responseTime: number; error?: string }> = {};

    const testRequest: AIAnalysisRequest = {
      type: 'technical-analysis',
      data: { test: 'Simple health check test' },
      prompt: 'Respond with a simple "OK" message.',
      requirements: { timeout: 10 }
    };

    await Promise.allSettled(
      Array.from(this.providerInstances.keys()).map(async (provider) => {
        const startTime = Date.now();
        
        try {
          await this.executeAnalysis(testRequest, provider, startTime, 'health-check');
          healthResults[provider] = {
            healthy: true,
            responseTime: Date.now() - startTime
          };
        } catch (error) {
          healthResults[provider] = {
            healthy: false,
            responseTime: Date.now() - startTime,
            error: error instanceof Error ? error.message : 'Unknown error'
          };
        }
      })
    );

    return healthResults as Record<AIProvider, { healthy: boolean; responseTime: number; error?: string }>;
  }

  // Private methods

  private initializeProviders(): void {
    // Initialize Anthropic (always available)
    this.providerInstances.set('anthropic', anthropic);

    // Initialize OpenAI if configured
    if (aiProviderConfigs.openai) {
      this.providerInstances.set('openai', openai);
    }

    // Initialize Google/Gemini if configured and SDK is available
    if (aiProviderConfigs.google) {
      try {
        // Dynamically import Google SDK if available
        console.log('Google AI provider configured but SDK not installed. Skipping Google provider initialization.');
        // this.providerInstances.set('google', google);
      } catch (error) {
        console.warn('Google AI SDK not available:', error);
      }
    }
  }

  private initializeMetrics(): void {
    this.providerInstances.forEach((_, provider) => {
      this.performanceMetrics.set(provider, {
        provider,
        totalRequests: 0,
        successRate: 100,
        averageResponseTime: 0,
        averageCost: 0,
        totalCost: 0,
        errorTypes: {},
        lastUsed: new Date()
      });

      this.circuitBreakers.set(provider, {
        isOpen: false,
        lastFailure: new Date(0),
        failureCount: 0
      });
    });
  }

  private selectProvider(request: AIAnalysisRequest): AIProvider {
    // Get optimal provider from configuration
    let selectedProvider = selectOptimalProvider(request.type, request.requirements);

    // Check if provider is available and healthy
    if (!this.providerInstances.has(selectedProvider) || this.isCircuitBreakerOpen(selectedProvider)) {
      // Find alternative healthy provider
      const healthyProviders = Array.from(this.providerInstances.keys())
        .filter(provider => !this.isCircuitBreakerOpen(provider));

      if (healthyProviders.length > 0) {
        selectedProvider = healthyProviders[0];
      }
    }

    // Cost check if max cost specified
    if (request.requirements?.maxCost) {
      const estimatedCost = calculateEstimatedCost(selectedProvider, 2000); // Estimate 2k tokens
      if (estimatedCost > request.requirements.maxCost) {
        // Find cheaper alternative
        const cheaperProvider = this.findCheapestAvailableProvider();
        if (cheaperProvider) {
          selectedProvider = cheaperProvider;
        }
      }
    }

    return selectedProvider;
  }

  private async executeAnalysis<T>(
    request: AIAnalysisRequest,
    provider: AIProvider,
    startTime: number,
    requestId: string
  ): Promise<AIAnalysisResult<T>> {
    const providerInstance = this.providerInstances.get(provider);
    const providerConfig = aiProviderConfigs[provider];
    
    if (!providerInstance || !providerConfig) {
      throw new Error(`Provider ${provider} not available`);
    }

    const model = providerInstance(providerConfig.model);

    try {
      let result;
      let reasoning = '';

      if (request.schema) {
        // Structured generation with schema
        const response = await generateObject({
          model,
          prompt: this.buildPrompt(request),
          schema: request.schema,
          maxOutputTokens: providerConfig.maxTokens,
        });

        result = response.object;
      } else {
        // Text generation
        const response = await generateText({
          model,
          prompt: this.buildPrompt(request),
          maxOutputTokens: providerConfig.maxTokens,
          temperature: 0.7,
        });

        result = response.text;
        reasoning = 'Generated using text completion';
      }

      const processingTime = Date.now() - startTime;
      const estimatedTokens = this.estimateTokens(result);
      const cost = calculateEstimatedCost(provider, estimatedTokens);

      return {
        success: true,
        data: result,
        metadata: {
          provider,
          model: providerConfig.model,
          tokensUsed: estimatedTokens,
          cost,
          processingTime,
          requestId,
          retryCount: 0,
          fallbackUsed: false
        },
        reasoning,
        confidence: 0.8 // Default confidence
      };

    } catch (error) {
      // Update circuit breaker
      this.updateCircuitBreaker(provider, false);
      throw error;
    }
  }

  private async handleFallbackProvider<T>(
    request: AIAnalysisRequest,
    originalProvider: AIProvider,
    startTime: number,
    requestId: string
  ): Promise<AIAnalysisResult<T>> {
    // Find healthy fallback provider
    const fallbackProvider = this.findHealthyFallbackProvider(originalProvider);
    
    if (!fallbackProvider) {
      throw new Error('No healthy providers available');
    }

    const result = await this.executeAnalysis(request, fallbackProvider, startTime, requestId);
    result.metadata.fallbackUsed = true;
    
    return result;
  }

  private buildPrompt(request: AIAnalysisRequest): string {
    let prompt = `Analysis Type: ${request.type}\n\n`;
    
    if (request.prompt) {
      prompt += `Instructions: ${request.prompt}\n\n`;
    }

    prompt += `Data to analyze:\n${JSON.stringify(request.data, null, 2)}`;

    // Add specific instructions based on analysis type
    switch (request.type) {
      case 'conversion-analysis':
        prompt += '\n\nFocus on conversion optimization opportunities, psychological triggers, and user experience improvements.';
        break;
      case 'seo-analysis':
        prompt += '\n\nFocus on technical SEO, content optimization, and search engine visibility improvements.';
        break;
      case 'comprehensive-audit':
        prompt += '\n\nProvide a thorough analysis covering conversion, SEO, technical, and user experience aspects.';
        break;
    }

    return prompt;
  }

  private isCircuitBreakerOpen(provider: AIProvider): boolean {
    const breaker = this.circuitBreakers.get(provider);
    if (!breaker) return false;

    // Reset circuit breaker if enough time has passed (5 minutes)
    if (breaker.isOpen && Date.now() - breaker.lastFailure.getTime() > 5 * 60 * 1000) {
      breaker.isOpen = false;
      breaker.failureCount = 0;
    }

    return breaker.isOpen;
  }

  private updateCircuitBreaker(provider: AIProvider, success: boolean): void {
    const breaker = this.circuitBreakers.get(provider);
    if (!breaker) return;

    if (success) {
      breaker.failureCount = 0;
    } else {
      breaker.failureCount++;
      breaker.lastFailure = new Date();
      
      // Open circuit breaker after 3 consecutive failures
      if (breaker.failureCount >= 3) {
        breaker.isOpen = true;
      }
    }
  }

  private findHealthyFallbackProvider(excludeProvider: AIProvider): AIProvider | null {
    const availableProviders = Array.from(this.providerInstances.keys())
      .filter(provider => provider !== excludeProvider && !this.isCircuitBreakerOpen(provider));

    return availableProviders.length > 0 ? availableProviders[0] : null;
  }

  private findCheapestAvailableProvider(): AIProvider | null {
    const availableProviders = Array.from(this.providerInstances.keys())
      .filter(provider => !this.isCircuitBreakerOpen(provider));

    if (availableProviders.length === 0) return null;

    return availableProviders.reduce((cheapest, current) => {
      const cheapestCost = aiProviderConfigs[cheapest]?.costPer1kTokens || Infinity;
      const currentCost = aiProviderConfigs[current]?.costPer1kTokens || Infinity;
      return currentCost < cheapestCost ? current : cheapest;
    });
  }

  private updateMetrics(provider: AIProvider, success: boolean, responseTime: number, cost: number): void {
    const metrics = this.performanceMetrics.get(provider);
    if (!metrics) return;

    metrics.totalRequests++;
    metrics.lastUsed = new Date();
    metrics.totalCost += cost;
    
    // Update success rate
    const previousSuccessCount = Math.floor(metrics.successRate * (metrics.totalRequests - 1) / 100);
    const newSuccessCount = success ? previousSuccessCount + 1 : previousSuccessCount;
    metrics.successRate = (newSuccessCount / metrics.totalRequests) * 100;

    // Update average response time
    metrics.averageResponseTime = 
      (metrics.averageResponseTime * (metrics.totalRequests - 1) + responseTime) / metrics.totalRequests;

    // Update average cost
    metrics.averageCost = metrics.totalCost / metrics.totalRequests;
  }

  private estimateTokens(content: any): number {
    // Simple token estimation (4 characters ≈ 1 token)
    const contentStr = typeof content === 'string' ? content : JSON.stringify(content);
    return Math.ceil(contentStr.length / 4);
  }

  private generateRequestId(): string {
    return `ai_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

// Singleton instance for application-wide use
export const aiProviderManager = new AIProviderManager();