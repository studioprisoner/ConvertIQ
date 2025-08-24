import { createAnthropic } from '@ai-sdk/anthropic';
import { 
  generateObject, 
  generateText,
  // AI SDK v5 Error Types for enhanced error handling
  APICallError,
  InvalidResponseDataError,
  InvalidArgumentError,
  JSONParseError,
  NoObjectGeneratedError,
  RetryError,
  TypeValidationError,
  UnsupportedFunctionalityError,
  EmptyResponseBodyError,
  InvalidPromptError,
  NoSuchModelError
} from 'ai';
import type { CrawlResult } from '../../crawler/types';
import type { ExtractionResults, EnhancedAnalysisResult } from '../../../db/schema/analyses';
import {
  CONVERSION_PSYCHOLOGY_SYSTEM_PROMPT,
  generateConversionAnalysisPrompt,
  CONVERSION_ANALYSIS_VERSION,
} from '../prompts/conversion-analysis';
import {
  UX_ANALYSIS_SYSTEM_PROMPT,
  generateUxAnalysisPrompt,
  UX_ANALYSIS_VERSION,
} from '../prompts/ux-analysis';
import {
  TECHNICAL_SEO_SYSTEM_PROMPT,
  generateSeoAnalysisPrompt,
  SEO_ANALYSIS_VERSION,
} from '../prompts/seo-analysis';
import {
  conversionPsychologyAnalysisSchema,
  uxAnalysisSchema,
  technicalSeoAnalysisSchema,
} from '../types';

// Initialize Anthropic client
const anthropicClient = createAnthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

export class AnthropicAnalysisProvider {
  private model = anthropicClient('claude-3-5-sonnet-20241022');
  private tokenUsageMonitor = {
    sessionStats: {
      totalPromptTokens: 0,
      totalCompletionTokens: 0,
      totalTokens: 0,
      totalCalls: 0,
      averagePromptTokens: 0,
      averageCompletionTokens: 0,
      costEstimate: 0, // USD estimate
    },
    callHistory: [] as Array<{
      timestamp: Date,
      operation: string,
      promptTokens: number,
      completionTokens: number,
      totalTokens: number,
      costEstimate: number,
      processingTime: number,
      success: boolean
    }>
  };

  // Phase 4: Performance monitoring for AI SDK v5
  private performanceMonitor = {
    responseTimings: {
      fastestResponse: Infinity,
      slowestResponse: 0,
      averageResponse: 0,
      p95Response: 0,
      p99Response: 0,
      totalSamples: 0,
    },
    v5Metrics: {
      sdkVersion: '5.0.0',
      modelVersion: 'claude-3-5-sonnet-20241022',
      errorRates: {
        timeouts: 0,
        rateLimit: 0,
        networkErrors: 0,
        apiErrors: 0,
        total: 0,
      },
      retryMetrics: {
        totalRetries: 0,
        successfulRetries: 0,
        maxRetriesReached: 0,
      },
      tokenEfficiency: {
        tokensPerSecond: 0,
        averagePromptLength: 0,
        averageResponseLength: 0,
        compressionRatio: 0, // response tokens / prompt tokens
      }
    },
    performanceAlerts: [] as Array<{
      timestamp: Date,
      alertType: 'slow_response' | 'high_cost' | 'error_spike' | 'efficiency_drop',
      message: string,
      severity: 'low' | 'medium' | 'high',
      metrics: any
    }>,
    responseTimes: [] as number[] // Keep last 100 response times for percentile calculation
  };

  // AI SDK v5 Optimized Timeout Configuration
  private readonly timeoutConfig = {
    // Base timeouts for different operation types
    baseTimeouts: {
      quickAnalysis: 15000,    // 15s for fast operations (executive summary)
      standardAnalysis: 30000, // 30s for standard analysis (conversion, UX, SEO)
      complexAnalysis: 45000,  // 45s for complex operations (comprehensive analysis)
      connectionTest: 5000,    // 5s for health checks
    },
    // Dynamic timeout scaling based on content size
    dynamicScaling: {
      enabled: true,
      baseContentSize: 2000,   // 2KB baseline
      scalingFactor: 0.005,    // 5ms per additional byte
      maxMultiplier: 2.0,      // Max 2x base timeout
    },
    // Retry configuration for v5
    retryConfig: {
      maxRetries: 3,
      baseDelay: 1000,         // 1s base delay
      backoffMultiplier: 2,    // Exponential backoff
      timeoutMultiplier: 1.5,  // Increase timeout on retry
    }
  };

  /**
   * AI SDK v5 Enhanced Error Handling Methods
   */
  
  private handleAISDKError(error: unknown, operation: string, context?: any): Error {
    // Enhanced error handling for AI SDK v5 specific error types
    console.error(`🚨 AI SDK v5 Error in ${operation}:`, {
      errorType: error?.constructor?.name,
      message: error instanceof Error ? error.message : 'Unknown error',
      context,
      timestamp: new Date().toISOString()
    });

    // Handle specific AI SDK v5 error types with targeted responses
    if (APICallError.isInstance(error)) {
      const apiError = error as any;
      console.error('API Call Error Details:', {
        statusCode: apiError.statusCode,
        statusText: apiError.statusText,
        isRetryable: apiError.isRetryable,
        url: apiError.url,
        cause: apiError.cause?.message
      });
      
      if (apiError.statusCode === 429) {
        // Handle rate limiting
        this.performanceMonitor.v5Metrics.errorRates.rateLimit += 1;
        this.performanceMonitor.v5Metrics.errorRates.total += 1;
        return new Error(`Rate limit exceeded for ${operation}. Please try again later.`);
      } else if (apiError.statusCode >= 500) {
        // Server errors
        this.performanceMonitor.v5Metrics.errorRates.apiErrors += 1;
        this.performanceMonitor.v5Metrics.errorRates.total += 1;
        return new Error(`Server error during ${operation}. This is likely temporary.`);
      } else {
        // Other API errors
        this.performanceMonitor.v5Metrics.errorRates.apiErrors += 1;
        this.performanceMonitor.v5Metrics.errorRates.total += 1;
        return new Error(`API error during ${operation}: ${apiError.statusText || 'Unknown API error'}`);
      }
    }

    if (NoObjectGeneratedError.isInstance(error)) {
      const objError = error as any;
      console.error('No Object Generated Error:', {
        text: objError.text,
        finishReason: objError.finishReason,
        usage: objError.usage
      });
      
      return new Error(`Failed to generate structured response for ${operation}. The AI model did not produce valid JSON.`);
    }

    if (JSONParseError.isInstance(error)) {
      const jsonError = error as any;
      console.error('JSON Parse Error:', {
        text: jsonError.text,
        cause: jsonError.cause?.message
      });
      
      return new Error(`Invalid JSON response during ${operation}. The AI response could not be parsed.`);
    }

    if (TypeValidationError.isInstance(error)) {
      const validationError = error as any;
      console.error('Type Validation Error:', {
        value: validationError.value,
        cause: validationError.cause?.message
      });
      
      return new Error(`Response validation failed for ${operation}. The AI response does not match the expected format.`);
    }

    if (InvalidResponseDataError.isInstance(error)) {
      return new Error(`Invalid response data during ${operation}. The AI service returned unexpected data format.`);
    }

    if (InvalidArgumentError.isInstance(error)) {
      return new Error(`Invalid arguments provided to ${operation}. Please check the request parameters.`);
    }

    if (RetryError.isInstance(error)) {
      this.performanceMonitor.v5Metrics.retryMetrics.maxRetriesReached += 1;
      return new Error(`Maximum retries exceeded for ${operation}. The operation failed after multiple attempts.`);
    }

    if (UnsupportedFunctionalityError.isInstance(error)) {
      return new Error(`Unsupported functionality requested in ${operation}. This feature is not available with the current model.`);
    }

    // Handle timeout errors (from our optimized timeout system)
    if (error instanceof Error && error.message.includes('timeout')) {
      this.performanceMonitor.v5Metrics.errorRates.timeouts += 1;
      this.performanceMonitor.v5Metrics.errorRates.total += 1;
      return new Error(`Operation ${operation} timed out. Please try again or reduce content size.`);
    }

    // Handle network errors
    if (error instanceof Error && (
      error.message.includes('ECONNRESET') || 
      error.message.includes('ETIMEDOUT') ||
      error.message.includes('network') ||
      error.message.includes('fetch')
    )) {
      this.performanceMonitor.v5Metrics.errorRates.networkErrors += 1;
      this.performanceMonitor.v5Metrics.errorRates.total += 1;
      return new Error(`Network error during ${operation}. Please check your connection and try again.`);
    }

    // Generic error fallback
    this.performanceMonitor.v5Metrics.errorRates.apiErrors += 1;
    this.performanceMonitor.v5Metrics.errorRates.total += 1;
    
    const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
    return new Error(`${operation} failed: ${errorMessage}`);
  }
  
  private logEnhancedError(operation: string, error: Error, additionalContext?: any): void {
    const errorLog = {
      timestamp: new Date().toISOString(),
      operation,
      errorType: error.constructor.name,
      message: error.message,
      aiSDKVersion: '5.0.0',
      context: additionalContext,
      performance: {
        totalCalls: this.tokenUsageMonitor.sessionStats.totalCalls,
        successRate: this.calculateSuccessRate(),
        avgResponseTime: this.performanceMonitor.responseTimings.averageResponse
      }
    };

    console.error('🔍 Enhanced AI SDK v5 Error Log:', errorLog);
  }

  private shouldRetryError(error: unknown): boolean {
    // Enhanced retry logic for AI SDK v5 errors
    if (APICallError.isInstance(error)) {
      const apiError = error as any;
      // Rate limits (429) are retryable, and server errors (5xx) are retryable
      return apiError.isRetryable === true || apiError.statusCode === 429 || apiError.statusCode >= 500;
    }

    if (RetryError.isInstance(error)) {
      return false; // Already exhausted retries
    }

    if (EmptyResponseBodyError.isInstance(error)) {
      return true; // Empty responses can be retried
    }

    // Network errors are generally retryable
    if (error instanceof Error && (
      error.message.includes('ECONNRESET') || 
      error.message.includes('ETIMEDOUT') ||
      error.message.includes('network') ||
      error.message.includes('fetch')
    )) {
      return true;
    }

    // Timeout errors are retryable
    if (error instanceof Error && error.message.includes('timeout')) {
      return true;
    }

    // Default to not retryable for unknown errors
    return false;
  }

  /**
   * AI SDK v5 Optimized Timeout Methods
   */
  
  private calculateDynamicTimeout(operationType: keyof typeof this.timeoutConfig.baseTimeouts, contentSize?: number): number {
    let baseTimeout = this.timeoutConfig.baseTimeouts[operationType];
    
    if (!this.timeoutConfig.dynamicScaling.enabled || !contentSize) {
      return baseTimeout;
    }
    
    const { baseContentSize, scalingFactor, maxMultiplier } = this.timeoutConfig.dynamicScaling;
    
    if (contentSize > baseContentSize) {
      const additionalSize = contentSize - baseContentSize;
      const multiplier = Math.min(1 + (additionalSize * scalingFactor), maxMultiplier);
      baseTimeout = Math.floor(baseTimeout * multiplier);
    }
    
    return baseTimeout;
  }
  
  private createOptimizedTimeout(timeoutMs: number, operationType: string): Promise<never> {
    return new Promise((_, reject) => {
      const timeoutId = setTimeout(() => {
        // Update timeout metrics
        this.performanceMonitor.v5Metrics.errorRates.timeouts += 1;
        this.performanceMonitor.v5Metrics.errorRates.total += 1;
        
        reject(new Error(`AI SDK v5 timeout: ${operationType} exceeded ${timeoutMs}ms limit`));
      }, timeoutMs);
      
      // Ensure timeout is cleared if promise resolves first
      timeoutId.unref?.(); // Node.js specific: don't keep process alive
    });
  }
  
  private async executeWithOptimizedTimeout<T>(
    operationType: keyof typeof this.timeoutConfig.baseTimeouts,
    operation: () => Promise<T>,
    contentSize?: number,
    retryAttempt: number = 0
  ): Promise<T> {
    const baseTimeout = this.calculateDynamicTimeout(operationType, contentSize);
    const adjustedTimeout = retryAttempt > 0 
      ? Math.floor(baseTimeout * Math.pow(this.timeoutConfig.retryConfig.timeoutMultiplier, retryAttempt))
      : baseTimeout;
    
    const operationName = `${operationType}${retryAttempt > 0 ? ` (retry ${retryAttempt})` : ''}`;
    
    return Promise.race([
      operation(),
      this.createOptimizedTimeout(adjustedTimeout, operationName)
    ]);
  }

  async analyzeConversionPsychology(crawlData: CrawlResult): Promise<any> {
    const startTime = Date.now();

    try {
      console.log('🤖 Generating conversion psychology analysis...');
      
      // Calculate content size for dynamic timeout
      const contentSize = JSON.stringify(crawlData).length;
      
      const result = await this.executeWithOptimizedTimeout(
        'standardAnalysis',
        () => generateObject({
          model: this.model,
          system: CONVERSION_PSYCHOLOGY_SYSTEM_PROMPT,
          prompt: generateConversionAnalysisPrompt(crawlData),
          schema: conversionPsychologyAnalysisSchema,
          temperature: 0.3, // Lower temperature for more consistent analysis
        }),
        contentSize
      ) as any;

      const processingTime = Date.now() - startTime;

      // Record token usage for monitoring
      this.recordTokenUsage('Conversion Psychology Analysis', result.usage, processingTime, true);

      // Handle the case where AI wraps response in conversionPsychologyAnalysis
      let analysis = result.object;
      if (analysis.conversionPsychologyAnalysis) {
        analysis = {
          type: 'conversion_psychology',
          ...analysis.conversionPsychologyAnalysis,
          // Add missing legacy fields for backward compatibility
          overallScore: analysis.conversionPsychologyAnalysis.websiteOverview?.overallScore || 5,
          keyFindings: analysis.conversionPsychologyAnalysis.topRecommendations?.map((r: any) => r.title) || [],
          priorityRecommendations: analysis.conversionPsychologyAnalysis.immediateActions ? 
            [analysis.conversionPsychologyAnalysis.immediateActions.priority1,
             analysis.conversionPsychologyAnalysis.immediateActions.priority2,
             analysis.conversionPsychologyAnalysis.immediateActions.priority3].filter(Boolean) : [],
        };
      }
      
      // Ensure type field is always present
      if (!analysis.type) {
        analysis.type = 'conversion_psychology';
      }

      return {
        analysis,
        metadata: {
          processingTime,
          modelUsed: 'claude-3-5-sonnet-20241022',
          promptVersion: CONVERSION_ANALYSIS_VERSION,
          confidence: 0.9, // High confidence for structured analysis
          tokensUsed: result.usage?.totalTokens || 0,
          costEstimate: this.calculateCostEstimate(result.usage),
        },
      };
    } catch (error) {
      const processingTime = Date.now() - startTime;
      
      // Enhanced AI SDK v5 error handling
      const enhancedError = this.handleAISDKError(error, 'Conversion Psychology Analysis', {
        crawlUrl: crawlData.url,
        contentSize: contentSize
      });
      
      // Log enhanced error details
      this.logEnhancedError('Conversion Psychology Analysis', enhancedError, {
        crawlUrl: crawlData.url,
        processingTime
      });
      
      // Record failed token usage with error type information
      const errorType = error?.constructor?.name || 'UnknownError';
      this.recordTokenUsage('Conversion Psychology Analysis', {}, processingTime, false, errorType);
      
      throw enhancedError;
    }
  }

  async analyzeUX(crawlData: CrawlResult): Promise<any> {
    const startTime = Date.now();

    try {
      console.log('🎨 Generating UX analysis...');
      
      // Calculate content size for dynamic timeout
      const contentSize = JSON.stringify(crawlData).length;
      
      const result = await this.executeWithOptimizedTimeout(
        'standardAnalysis',
        () => generateObject({
          model: this.model,
          system: UX_ANALYSIS_SYSTEM_PROMPT,
          prompt: generateUxAnalysisPrompt(crawlData),
          schema: uxAnalysisSchema,
          temperature: 0.3,
        }),
        contentSize
      ) as any;

      const processingTime = Date.now() - startTime;

      // Record token usage for monitoring
      this.recordTokenUsage('UX Analysis', result.usage, processingTime, true);

      // Handle the case where AI wraps response in uxAnalysis
      let analysis = result.object;
      if (analysis.uxAnalysis) {
        analysis = {
          type: 'ux_ui_analysis',
          ...analysis.uxAnalysis,
        };
      }
      
      // Ensure type field is always present
      if (!analysis.type) {
        analysis.type = 'ux_ui_analysis';
      }

      return {
        analysis,
        metadata: {
          processingTime,
          modelUsed: 'claude-3-5-sonnet-20241022',
          promptVersion: UX_ANALYSIS_VERSION,
          confidence: 0.9,
          tokensUsed: result.usage?.totalTokens || 0,
          costEstimate: this.calculateCostEstimate(result.usage),
        },
      };
    } catch (error) {
      const processingTime = Date.now() - startTime;
      
      // Enhanced AI SDK v5 error handling
      const enhancedError = this.handleAISDKError(error, 'UX Analysis', {
        crawlUrl: crawlData.url,
        contentSize: contentSize
      });
      
      // Log enhanced error details
      this.logEnhancedError('UX Analysis', enhancedError, {
        crawlUrl: crawlData.url,
        processingTime
      });
      
      // Record failed token usage with error type information
      const errorType = error?.constructor?.name || 'UnknownError';
      this.recordTokenUsage('UX Analysis', {}, processingTime, false, errorType);
      
      throw enhancedError;
    }
  }

  async analyzeTechnicalSEO(crawlData: CrawlResult): Promise<any> {
    const startTime = Date.now();

    try {
      const result = await Promise.race([
        generateObject({
          model: this.model,
          system: TECHNICAL_SEO_SYSTEM_PROMPT,
          prompt: generateSeoAnalysisPrompt(crawlData),
          schema: technicalSeoAnalysisSchema,
          temperature: 0.3,
        }),
        new Promise((_, reject) => 
          setTimeout(() => reject(new Error('SEO analysis timeout after 35s')), 35000)
        )
      ]) as any;

      const processingTime = Date.now() - startTime;

      // Record token usage for monitoring
      this.recordTokenUsage('Technical SEO Analysis', result.usage, processingTime, true);

      // Handle the case where AI wraps response in technicalSeoAnalysis
      let analysis = result.object;
      if (analysis.technicalSeoAnalysis) {
        analysis = {
          type: 'technical_seo',
          ...analysis.technicalSeoAnalysis,
        };
      }
      
      // Ensure type field is always present
      if (!analysis.type) {
        analysis.type = 'technical_seo';
      }

      return {
        analysis,
        metadata: {
          processingTime,
          modelUsed: 'claude-3-5-sonnet-20241022',
          promptVersion: SEO_ANALYSIS_VERSION,
          confidence: 0.9,
          tokensUsed: result.usage?.totalTokens || 0,
          costEstimate: this.calculateCostEstimate(result.usage),
        },
      };
    } catch (error) {
      const processingTime = Date.now() - startTime;
      // Record failed token usage attempt
      this.recordTokenUsage('Technical SEO Analysis', {}, processingTime, false);
      
      console.error('Technical SEO analysis failed:', error);
      throw new Error(`SEO analysis failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  async analyzeContent(crawlData: CrawlResult): Promise<any> {
    // TODO: Implement content analysis when content-analysis prompts are created
    throw new Error('Content analysis not yet implemented');
  }

  /**
   * Enhanced conversion analysis using Firecrawl v2 structured data
   */
  async analyzeConversionPsychologyEnhanced(
    crawlData: CrawlResult, 
    extractionResults: ExtractionResults
  ): Promise<any> {
    const startTime = Date.now();

    try {
      console.log('🤖 Generating enhanced conversion psychology analysis with structured data...');
      
      const enhancedPrompt = this.generateEnhancedConversionPrompt(crawlData, extractionResults);
      
      const result = await Promise.race([
        generateObject({
          model: this.model,
          system: CONVERSION_PSYCHOLOGY_SYSTEM_PROMPT + `

ENHANCED ANALYSIS MODE:
You have access to structured data extracted from the website, including:
- Business information and context
- Identified calls-to-action with prominence levels
- Social proof elements (testimonials, reviews, statistics)
- Psychology triggers already present
- Product/service information

Use this structured data to provide more accurate and specific recommendations.
Focus on gaps and opportunities based on what was actually extracted vs. best practices.`,
          prompt: enhancedPrompt,
          schema: conversionPsychologyAnalysisSchema,
          temperature: 0.3,
        }),
        new Promise((_, reject) => 
          setTimeout(() => reject(new Error('Enhanced conversion analysis timeout after 35s')), 35000)
        )
      ]) as any;

      const processingTime = Date.now() - startTime;

      // Process result similar to regular analysis but with enhanced metadata
      let analysis = result.object;
      if (analysis.conversionPsychologyAnalysis) {
        analysis = {
          type: 'conversion_psychology_enhanced',
          ...analysis.conversionPsychologyAnalysis,
          overallScore: analysis.conversionPsychologyAnalysis.websiteOverview?.overallScore || 5,
          keyFindings: analysis.conversionPsychologyAnalysis.topRecommendations?.map((r: any) => r.title) || [],
          priorityRecommendations: analysis.conversionPsychologyAnalysis.immediateActions ? 
            [analysis.conversionPsychologyAnalysis.immediateActions.priority1,
             analysis.conversionPsychologyAnalysis.immediateActions.priority2,
             analysis.conversionPsychologyAnalysis.immediateActions.priority3].filter(Boolean) : [],
        };
      }
      
      if (!analysis.type) {
        analysis.type = 'conversion_psychology_enhanced';
      }

      // Add structured data insights to the analysis
      analysis.structuredDataInsights = this.generateStructuredDataInsights(extractionResults);

      return {
        analysis,
        metadata: {
          processingTime,
          modelUsed: 'claude-3-5-sonnet-20241022',
          promptVersion: CONVERSION_ANALYSIS_VERSION + '-enhanced',
          confidence: 0.95, // Higher confidence with structured data
          isEnhanced: true,
          extractionDataUsed: true,
        },
      };
    } catch (error) {
      console.error('❌ Enhanced conversion psychology analysis failed:', {
        error: error instanceof Error ? error.message : 'Unknown error',
        crawlUrl: crawlData.url,
      });
      throw new Error(`Enhanced analysis failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Generate comprehensive analysis using both raw crawl data and structured extraction results
   */
  async generateComprehensiveAnalysisEnhanced(
    crawlData: CrawlResult, 
    extractionResults: ExtractionResults
  ): Promise<any> {
    const startTime = Date.now();
    
    try {
      console.log('🤖 Starting enhanced comprehensive analysis with Firecrawl v2 data...');
      
      // Run enhanced analyses that leverage structured data
      const analysisPromises = [
        this.analyzeConversionPsychologyEnhanced(crawlData, extractionResults).catch(error => {
          console.warn('Enhanced conversion analysis failed, falling back to regular:', error.message);
          return this.analyzeConversionPsychology(crawlData);
        }),
        this.analyzeUXEnhanced(crawlData, extractionResults).catch(error => {
          console.warn('Enhanced UX analysis failed, falling back to regular:', error.message);
          return this.analyzeUX(crawlData);
        }),
        this.analyzeTechnicalSEOEnhanced(crawlData, extractionResults).catch(error => {
          console.warn('Enhanced SEO analysis failed, falling back to regular:', error.message);
          return this.analyzeTechnicalSEO(crawlData);
        }),
      ];

      const analysisResults = await Promise.allSettled(analysisPromises);
      
      // Process results
      const conversionResult = analysisResults[0].status === 'fulfilled' ? analysisResults[0].value : null;
      const uxResult = analysisResults[1].status === 'fulfilled' ? analysisResults[1].value : null;
      const seoResult = analysisResults[2].status === 'fulfilled' ? analysisResults[2].value : null;

      // Calculate overall score from valid results
      const validScores = [
        conversionResult?.analysis?.overallScore,
        uxResult?.analysis?.overallScore,
        seoResult?.analysis?.overallScore
      ].filter(score => typeof score === 'number' && score > 0);
      
      const overallScore = validScores.length > 0 ? Math.round(validScores.reduce((a, b) => a + b, 0) / validScores.length) : 5;
      
      // Generate enhanced executive summary
      const overallAnalysis = await this.generateEnhancedExecutiveSummary(
        crawlData,
        extractionResults,
        conversionResult?.analysis,
        uxResult?.analysis,
        seoResult?.analysis,
        overallScore
      );

      const totalProcessingTime = Date.now() - startTime;

      return {
        conversionPsychology: conversionResult?.analysis || null,
        uxAnalysis: uxResult?.analysis || null,
        technicalSeo: seoResult?.analysis || null,
        overallInsights: overallAnalysis,
        extractionSummary: this.generateExtractionSummary(extractionResults),
        metadata: {
          processingTime: totalProcessingTime,
          modelUsed: 'claude-3-5-sonnet-20241022',
          promptVersion: 'comprehensive-2.0.0-firecrawl-v2-enhanced',
          confidence: 0.92,
          isEnhanced: true,
          firecrawlVersion: 'v2',
          structuredDataUsed: true,
        },
      };
    } catch (error) {
      console.error('Enhanced comprehensive analysis failed:', error);
      // Fallback to regular comprehensive analysis
      console.log('Falling back to regular comprehensive analysis...');
      return this.generateComprehensiveAnalysis(crawlData);
    }
  }

  async generateComprehensiveAnalysis(crawlData: CrawlResult): Promise<any> {
    const startTime = Date.now();
    const TOTAL_TIMEOUT = 90000; // 90 seconds - increased for better success rate
    
    // Enhanced timeout monitoring
    const timeoutMonitor = {
      totalStartTime: startTime,
      totalTimeout: TOTAL_TIMEOUT,
      url: crawlData.url,
      sectionTimeouts: [] as Array<{section: string, startTime: number, endTime?: number, timedOut: boolean}>
    };

    try {
      console.log('🤖 Starting comprehensive analysis with enhanced timeout monitoring...');
      console.log(`⏱️ Total timeout increased to ${TOTAL_TIMEOUT}ms for URL: ${crawlData.url}`);
      console.log(`📊 Content size: ${JSON.stringify(crawlData).length} characters`);
      
      // Create a promise that will timeout the entire analysis if it takes too long
      const analysisPromise = this.performComprehensiveAnalysisInternal(crawlData, startTime, TOTAL_TIMEOUT, timeoutMonitor);
      const timeoutPromise = new Promise((_, reject) => 
        setTimeout(() => {
          console.error(`❌ TOTAL TIMEOUT: Analysis exceeded ${TOTAL_TIMEOUT}ms for ${crawlData.url}`);
          this.logTimeoutAnalysis(timeoutMonitor);
          reject(new Error(`Total comprehensive analysis timeout after ${TOTAL_TIMEOUT/1000}s`));
        }, TOTAL_TIMEOUT)
      );
      
      const result = await Promise.race([analysisPromise, timeoutPromise]);
      
      // Log successful completion
      const totalTime = Date.now() - startTime;
      console.log(`✅ Analysis completed successfully in ${totalTime}ms for ${crawlData.url}`);
      this.logSuccessfulAnalysis(timeoutMonitor, totalTime);
      
      return result;
    } catch (error) {
      const totalTime = Date.now() - startTime;
      console.error(`💥 Comprehensive analysis failed after ${totalTime}ms:`, error);
      this.logFailedAnalysis(timeoutMonitor, totalTime, error);
      throw new Error(`Comprehensive analysis failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  private async performComprehensiveAnalysisInternal(crawlData: CrawlResult, startTime: number, totalTimeout: number, timeoutMonitor: any): Promise<any> {
    try {
      // Calculate individual timeout based on total timeout - leave time for summary generation
      const individualTimeout = Math.min(30000, Math.floor((totalTimeout - 10000) / 3)); // Max 30s each, or 1/3 of remaining time
      console.log(`⏱️ Individual analysis timeout increased to ${individualTimeout}ms`);
      
      // Run all analyses in parallel with enhanced monitoring and timeout handling
      const analysisPromises = [
        this.createMonitoredAnalysisPromise(
          'Conversion Psychology',
          () => this.analyzeConversionPsychology(crawlData),
          () => this.createFallbackConversionAnalysis(),
          individualTimeout,
          timeoutMonitor
        ),
        this.createMonitoredAnalysisPromise(
          'UX Analysis',
          () => this.analyzeUX(crawlData),
          () => this.createFallbackUXAnalysis(),
          individualTimeout,
          timeoutMonitor
        ),
        this.createMonitoredAnalysisPromise(
          'Technical SEO',
          () => this.analyzeTechnicalSEO(crawlData),
          () => this.createFallbackSEOAnalysis(),
          individualTimeout,
          timeoutMonitor
        ),
      ];

      const analysisResults = await Promise.allSettled(analysisPromises);
      console.log(`⏱️ Individual analyses completed in ${Date.now() - startTime}ms`);

      // Extract results, handling both successful and fallback cases
      const conversionResult = analysisResults[0].status === 'fulfilled' ? analysisResults[0].value : analysisResults[0].reason;
      const uxResult = analysisResults[1].status === 'fulfilled' ? analysisResults[1].value : analysisResults[1].reason;
      const seoResult = analysisResults[2].status === 'fulfilled' ? analysisResults[2].value : analysisResults[2].reason;

      // Calculate scores and failure metrics
      const validScores = [
        conversionResult?.analysis?.overallScore,
        uxResult?.analysis?.overallScore,
        seoResult?.analysis?.overallScore
      ].filter(score => typeof score === 'number' && score > 0);
      
      const overallScore = validScores.length > 0 ? Math.round(validScores.reduce((a, b) => a + b, 0) / validScores.length) : 5;
      
      const failures = analysisResults.filter(result => result.status === 'rejected').length;
      const partialWarning = failures > 0 ? `\n\n⚠️ **Note**: ${failures} analysis sections used fallback data due to processing timeouts. This is a temporary issue that will be resolved in future scans.` : '';
      
      // Generate detailed overall insights with optimized AI call
      let overallAnalysis;
      
      // Only generate detailed insights if we have successful analyses (not all fallbacks)
      if (failures < 3) {
        try {
          const summaryStartTime = Date.now();
          console.log('🧠 Generating detailed executive summary...');
          console.log(`⏱️ Time remaining: ${totalTimeout - (summaryStartTime - startTime)}ms`);
          overallAnalysis = await this.generateOptimizedOverallInsights(
            crawlData,
            conversionResult?.analysis,
            uxResult?.analysis,
            seoResult?.analysis,
            overallScore,
            failures
          );
          console.log(`⏱️ Executive summary completed in ${Date.now() - summaryStartTime}ms`);
        } catch (error) {
          console.warn('Executive summary generation failed, using simple summary:', error.message);
          overallAnalysis = this.createSimpleSummary(crawlData, overallScore, conversionResult, uxResult, seoResult, failures, partialWarning);
        }
      } else {
        // All analyses failed, use simple summary
        overallAnalysis = this.createSimpleSummary(crawlData, overallScore, conversionResult, uxResult, seoResult, failures, partialWarning);
      }

      const totalProcessingTime = Date.now() - startTime;

      return {
        conversionPsychology: conversionResult?.analysis || null,
        uxAnalysis: uxResult?.analysis || null,
        technicalSeo: seoResult?.analysis || null,
        overallInsights: overallAnalysis,
        metadata: {
          processingTime: totalProcessingTime,
          modelUsed: 'claude-3-5-sonnet-20241022',
          promptVersion: 'comprehensive-1.2.0-graceful-degradation',
          confidence: failures === 0 ? 0.85 : Math.max(0.4, 0.85 - (failures * 0.15)), // Lower confidence for partial results
          isPartial: failures > 0,
          failedSections: failures,
        },
      };
    } catch (error) {
      console.error('Comprehensive analysis failed completely:', error);
      throw new Error(`Comprehensive analysis failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }


  private identifyPriorityAreas(conversionAnalysis: any, uxAnalysis: any, seoAnalysis: any): string[] {
    const areas = [
      { name: 'Conversion Psychology', score: conversionAnalysis.overallScore },
      { name: 'User Experience', score: uxAnalysis.overallScore },
      { name: 'Technical SEO', score: seoAnalysis.overallScore },
    ];

    // Sort by lowest score (highest priority for improvement)
    return areas
      .sort((a, b) => a.score - b.score)
      .map(area => area.name);
  }

  private identifyPriorityAreasWithFallback(conversionAnalysis: any, uxAnalysis: any, seoAnalysis: any): string[] {
    const areas = [
      { name: 'Conversion Psychology', score: conversionAnalysis?.overallScore || 5 },
      { name: 'User Experience', score: uxAnalysis?.overallScore || 5 },
      { name: 'Technical SEO', score: seoAnalysis?.overallScore || 5 },
    ].filter(area => area.score > 0);

    // Sort by lowest score (highest priority for improvement)
    return areas
      .sort((a, b) => a.score - b.score)
      .map(area => area.name);
  }

  private createFallbackConversionAnalysis(): any {
    return {
      analysis: {
        overallScore: 5,
        keyFindings: [
          'Conversion analysis temporarily unavailable due to high server load',
          'Basic website structure detected - detailed psychology analysis pending',
          'Call-to-action elements present but require detailed evaluation'
        ],
        priorityRecommendations: [
          'Try scanning again in a few minutes for detailed conversion psychology analysis',
          'Focus on clear value propositions and prominent call-to-action buttons',
          'Ensure your website loads quickly and is mobile-friendly',
          'Consider adding social proof elements like testimonials or reviews'
        ],
        categories: {
          trustSignals: { score: 5, recommendations: ['Add testimonials and reviews', 'Display security badges', 'Include contact information'] },
          callsToAction: { score: 5, recommendations: ['Make CTA buttons more prominent', 'Use action-oriented text', 'Test different button colors'] },
          valueProposition: { score: 5, recommendations: ['Clarify your unique selling points', 'Lead with benefits, not features', 'Use compelling headlines'] }
        }
      },
      metadata: {
        processingTime: 0,
        modelUsed: 'fallback',
        promptVersion: 'fallback-1.0.0',
        confidence: 0.3,
        isFallback: true,
      },
    };
  }

  private createFallbackUXAnalysis(): any {
    return {
      analysis: {
        overallScore: 5,
        keyFindings: [
          'UX analysis temporarily unavailable due to high server load',
          'Basic user interface elements detected - detailed UX evaluation pending',
          'Mobile responsiveness check requires full analysis'
        ],
        priorityRecommendations: [
          'Try scanning again in a few minutes for detailed UX/UI analysis',
          'Ensure your website is mobile-responsive and loads quickly',
          'Simplify navigation and make important content easy to find',
          'Use clear, readable fonts and appropriate color contrast'
        ],
        categories: {
          mobileOptimization: { score: 5, recommendations: ['Test on mobile devices', 'Optimize touch targets', 'Ensure readable text size'] },
          navigation: { score: 5, recommendations: ['Simplify menu structure', 'Add search functionality', 'Include breadcrumbs'] },
          pageSpeed: { score: 5, recommendations: ['Optimize images', 'Minimize HTTP requests', 'Enable compression'] }
        }
      },
      metadata: {
        processingTime: 0,
        modelUsed: 'fallback',
        promptVersion: 'fallback-1.0.0',
        confidence: 0.3,
        isFallback: true,
      },
    };
  }

  private createFallbackSEOAnalysis(): any {
    return {
      analysis: {
        overallScore: 5,
        keyFindings: [
          'SEO analysis temporarily unavailable due to high server load',
          'Basic meta tags detected - detailed SEO evaluation pending',
          'Content structure assessment requires full analysis'
        ],
        priorityRecommendations: [
          'Try scanning again in a few minutes for detailed SEO analysis',
          'Ensure your page titles and meta descriptions are optimized',
          'Use proper heading structure (H1, H2, H3) throughout your content',
          'Add alt text to all images for better accessibility and SEO'
        ],
        categories: {
          metaTags: { score: 5, recommendations: ['Optimize title tags', 'Write compelling meta descriptions', 'Use relevant keywords naturally'] },
          contentStructure: { score: 5, recommendations: ['Use proper heading hierarchy', 'Create quality, original content', 'Improve internal linking'] },
          technicalSEO: { score: 5, recommendations: ['Optimize page load speed', 'Ensure mobile-friendliness', 'Add schema markup'] }
        }
      },
      metadata: {
        processingTime: 0,
        modelUsed: 'fallback',
        promptVersion: 'fallback-1.0.0',
        confidence: 0.3,
        isFallback: true,
      },
    };
  }

  private createSimpleSummary(crawlData: CrawlResult, overallScore: number, conversionResult: any, uxResult: any, seoResult: any, failures: number, partialWarning: string): any {
    return {
      summary: `# ${crawlData.url} Analysis Summary\n\n**Overall Score: ${overallScore}/10**\n\n**Conversion Score:** ${conversionResult?.analysis?.overallScore || 'N/A'}/10\n**UX Score:** ${uxResult?.analysis?.overallScore || 'N/A'}/10\n**SEO Score:** ${seoResult?.analysis?.overallScore || 'N/A'}/10${partialWarning}\n\nDetailed recommendations are available in each analysis section below.`,
      overallScore,
      priorityAreas: this.identifyPriorityAreasWithFallback(conversionResult?.analysis, uxResult?.analysis, seoResult?.analysis),
      isPartial: failures > 0,
      failedSections: failures,
    };
  }

  private async generateOptimizedOverallInsights(
    crawlData: CrawlResult,
    conversionAnalysis: any,
    uxAnalysis: any,
    seoAnalysis: any,
    overallScore: number,
    failures: number
  ): Promise<any> {
    const startTime = Date.now();
    
    // Create a shorter, more focused prompt for faster processing
    const optimizedPrompt = `Analyze ${crawlData.url} and provide a concise executive summary in markdown:

SCORES:
- Conversion: ${conversionAnalysis?.overallScore || 'N/A'}/10
- UX: ${uxAnalysis?.overallScore || 'N/A'}/10  
- SEO: ${seoAnalysis?.overallScore || 'N/A'}/10
- Overall: ${overallScore}/10

KEY ISSUES:
- Conversion: ${conversionAnalysis?.keyFindings?.slice(0, 3)?.join(', ') || 'N/A'}
- UX: ${uxAnalysis?.keyFindings?.slice(0, 3)?.join(', ') || 'N/A'}
- SEO: ${seoAnalysis?.keyFindings?.slice(0, 3)?.join(', ') || 'N/A'}

Format response as:

# EXECUTIVE SUMMARY - ${crawlData.url.replace(/^https?:\/\//, '').toUpperCase()}

## Overall Score: ${overallScore}/10
[Brief assessment in 1-2 sentences]

### TOP 4 PRIORITY RECOMMENDATIONS:
1. **[High-Impact Action]**
   - [Specific step 1]
   - [Specific step 2]
   - Impact: [X-Y% improvement estimate]

2. **[Medium-High Impact Action]**
   - [Specific step 1] 
   - [Specific step 2]
   - Impact: [X-Y% improvement estimate]

3. **[Medium Impact Action]**
   - [Specific step 1]
   - [Specific step 2] 
   - Impact: [X-Y% improvement estimate]

4. **[Quick Win Action]**
   - [Specific step 1]
   - [Specific step 2]
   - Impact: [X-Y% improvement estimate]

### QUICK WINS (2 weeks):
• [Action 1]
• [Action 2] 
• [Action 3]

### REVENUE IMPACT POTENTIAL:
- Conservative: [X-Y% increase]
- Optimistic: [X-Y% increase]
- Key drivers: [Driver 1], [Driver 2]

Keep recommendations specific and actionable for small business owners.`;

    try {
      const result = await Promise.race([
        generateText({
          model: this.model,
          system: 'You are ConvertIQ AI providing concise executive summary insights. Use proper markdown formatting with headers, bullet points, and bold text. Focus on actionable recommendations with specific impact estimates.',
          prompt: optimizedPrompt,
          temperature: 0.4,
          maxTokens: 1200, // Limit tokens for faster processing
        }),
        new Promise((_, reject) => 
          setTimeout(() => reject(new Error('Executive summary timeout after 12s')), 12000)
        )
      ]) as any;

      const processingTime = Date.now() - startTime;
      console.log(`🧠 Executive summary generated in ${processingTime}ms`);

      return {
        summary: result.text,
        overallScore,
        priorityAreas: this.identifyPriorityAreasWithFallback(conversionAnalysis, uxAnalysis, seoAnalysis),
        isPartial: failures > 0,
        failedSections: failures,
        executiveSummaryTime: processingTime,
      };
    } catch (error) {
      console.error('Optimized executive summary failed:', error);
      throw error;
    }
  }

  // Enhanced monitoring methods
  private createMonitoredAnalysisPromise(
    sectionName: string,
    analysisFunction: () => Promise<any>,
    fallbackFunction: () => any,
    timeout: number,
    timeoutMonitor: any
  ): Promise<any> {
    const sectionStartTime = Date.now();
    
    timeoutMonitor.sectionTimeouts.push({
      section: sectionName,
      startTime: sectionStartTime,
      timedOut: false,
      retryAttempts: 0
    });

    return this.retryAnalysisWithBackoff(
      sectionName,
      analysisFunction,
      fallbackFunction,
      timeout,
      timeoutMonitor,
      sectionStartTime,
      3 // maxRetries
    );
  }

  private async retryAnalysisWithBackoff(
    sectionName: string,
    analysisFunction: () => Promise<any>,
    fallbackFunction: () => any,
    timeout: number,
    timeoutMonitor: any,
    originalStartTime: number,
    maxRetries: number,
    currentAttempt: number = 1
  ): Promise<any> {
    const attemptStartTime = Date.now();
    
    // Update section info
    const sectionIndex = timeoutMonitor.sectionTimeouts.findIndex(s => s.section === sectionName);
    if (sectionIndex >= 0) {
      timeoutMonitor.sectionTimeouts[sectionIndex].retryAttempts = currentAttempt - 1;
    }

    console.log(`🔄 ${sectionName} attempt ${currentAttempt}/${maxRetries + 1} starting...`);

    try {
      const result = await Promise.race([
        analysisFunction().then(result => {
          if (sectionIndex >= 0) {
            timeoutMonitor.sectionTimeouts[sectionIndex].endTime = Date.now();
          }
          
          const totalDuration = Date.now() - originalStartTime;
          const attemptDuration = Date.now() - attemptStartTime;
          console.log(`✅ ${sectionName} completed on attempt ${currentAttempt} in ${attemptDuration}ms (total: ${totalDuration}ms)`);
          
          // Mark successful retry in metadata
          if (result.metadata) {
            result.metadata.retryAttempt = currentAttempt;
            result.metadata.totalAttempts = currentAttempt;
          }
          
          return result;
        }),
        new Promise((_, reject) => 
          setTimeout(() => {
            console.error(`⏰ ${sectionName} attempt ${currentAttempt} timeout after ${timeout}ms`);
            reject(new Error(`${sectionName} timeout after ${timeout}ms on attempt ${currentAttempt}`));
          }, timeout)
        )
      ]);

      return result;
    } catch (error) {
      const attemptDuration = Date.now() - attemptStartTime;
      const totalDuration = Date.now() - originalStartTime;
      
      console.warn(`⚠️ ${sectionName} attempt ${currentAttempt} failed after ${attemptDuration}ms:`, error.message);

      // Check if we should retry
      if (currentAttempt <= maxRetries && this.shouldRetryError(error)) {
        const backoffDelay = this.calculateBackoffDelay(currentAttempt);
        console.log(`🔄 ${sectionName} retrying in ${backoffDelay}ms (attempt ${currentAttempt + 1}/${maxRetries + 1})`);
        
        // Wait before retry
        await new Promise(resolve => setTimeout(resolve, backoffDelay));
        
        // Retry with exponential backoff
        return this.retryAnalysisWithBackoff(
          sectionName,
          analysisFunction,
          fallbackFunction,
          timeout,
          timeoutMonitor,
          originalStartTime,
          maxRetries,
          currentAttempt + 1
        );
      }

      // All retries exhausted, use fallback
      console.error(`💥 ${sectionName} failed after ${maxRetries + 1} attempts (total: ${totalDuration}ms), using fallback`);
      
      if (sectionIndex >= 0) {
        timeoutMonitor.sectionTimeouts[sectionIndex].timedOut = true;
        timeoutMonitor.sectionTimeouts[sectionIndex].endTime = Date.now();
        timeoutMonitor.sectionTimeouts[sectionIndex].retryAttempts = currentAttempt - 1;
      }
      
      // Create enhanced fallback with retry information
      const fallbackResult = fallbackFunction();
      fallbackResult.metadata = fallbackResult.metadata || {};
      fallbackResult.metadata.fallbackReason = error.message;
      fallbackResult.metadata.totalAttempts = currentAttempt;
      fallbackResult.metadata.totalDuration = totalDuration;
      fallbackResult.metadata.retriesExhausted = true;
      
      return fallbackResult;
    }
  }

  private shouldRetryError(error: Error): boolean {
    const retryableErrors = [
      'timeout',
      'network',
      'rate limit',
      'server error',
      'internal error',
      'service unavailable',
      'connection',
      'ECONNRESET',
      'ETIMEDOUT'
    ];

    const errorMessage = error.message.toLowerCase();
    return retryableErrors.some(retryableError => 
      errorMessage.includes(retryableError)
    );
  }

  private calculateBackoffDelay(attempt: number): number {
    // Exponential backoff with jitter: base * 2^attempt + random(0, 1000)
    const baseDelay = 1000; // 1 second
    const exponentialDelay = baseDelay * Math.pow(2, attempt - 1);
    const jitter = Math.random() * 1000; // Add randomness to prevent thundering herd
    
    return Math.min(exponentialDelay + jitter, 10000); // Cap at 10 seconds
  }

  private logTimeoutAnalysis(timeoutMonitor: any): void {
    console.error('🔍 TIMEOUT ANALYSIS REPORT:');
    console.error(`📋 URL: ${timeoutMonitor.url}`);
    console.error(`⏱️ Total timeout: ${timeoutMonitor.totalTimeout}ms`);
    console.error(`🔄 Section breakdown:`);
    
    timeoutMonitor.sectionTimeouts.forEach((section: any) => {
      const duration = section.endTime ? section.endTime - section.startTime : Date.now() - section.startTime;
      const retryInfo = section.retryAttempts > 0 ? ` (${section.retryAttempts} retries)` : '';
      console.error(`  • ${section.section}: ${duration}ms ${section.timedOut ? '❌ TIMED OUT' : '✅ COMPLETED'}${retryInfo}`);
    });
  }

  private logSuccessfulAnalysis(timeoutMonitor: any, totalTime: number): void {
    console.log('📊 SUCCESSFUL ANALYSIS REPORT:');
    console.log(`📋 URL: ${timeoutMonitor.url}`);
    console.log(`⏱️ Total time: ${totalTime}ms`);
    console.log(`🔄 Section breakdown:`);
    
    timeoutMonitor.sectionTimeouts.forEach((section: any) => {
      const duration = section.endTime ? section.endTime - section.startTime : totalTime;
      const retryInfo = section.retryAttempts > 0 ? ` (succeeded after ${section.retryAttempts} retries)` : '';
      console.log(`  • ${section.section}: ${duration}ms${retryInfo}`);
    });
  }

  private logFailedAnalysis(timeoutMonitor: any, totalTime: number, error: any): void {
    console.error('💥 FAILED ANALYSIS REPORT:');
    console.error(`📋 URL: ${timeoutMonitor.url}`);
    console.error(`⏱️ Total time: ${totalTime}ms`);
    console.error(`❌ Error: ${error.message}`);
    console.error(`🔄 Section breakdown:`);
    
    timeoutMonitor.sectionTimeouts.forEach((section: any) => {
      const duration = section.endTime ? section.endTime - section.startTime : totalTime;
      const status = section.timedOut ? '❌ TIMED OUT' : section.endTime ? '✅ COMPLETED' : '🔄 IN PROGRESS';
      const retryInfo = section.retryAttempts > 0 ? ` (${section.retryAttempts} retries)` : '';
      console.error(`  • ${section.section}: ${duration}ms ${status}${retryInfo}`);
    });
  }

  /**
   * Enhanced UX analysis using structured data
   */
  private async analyzeUXEnhanced(crawlData: CrawlResult, extractionResults: ExtractionResults): Promise<any> {
    const enhancedPrompt = this.generateEnhancedUXPrompt(crawlData, extractionResults);
    
    const result = await Promise.race([
      generateObject({
        model: this.model,
        system: UX_ANALYSIS_SYSTEM_PROMPT + `

ENHANCED ANALYSIS MODE:
You have structured data about the website's CTAs, navigation elements, and content structure.
Focus on UX gaps and opportunities based on the extracted data.`,
        prompt: enhancedPrompt,
        schema: uxAnalysisSchema,
        temperature: 0.3,
      }),
      new Promise((_, reject) => 
        setTimeout(() => reject(new Error('Enhanced UX analysis timeout after 35s')), 35000)
      )
    ]) as any;

    let analysis = result.object;
    if (analysis.uxAnalysis) {
      analysis = {
        type: 'ux_ui_analysis_enhanced',
        ...analysis.uxAnalysis,
      };
    }
    
    if (!analysis.type) {
      analysis.type = 'ux_ui_analysis_enhanced';
    }

    return {
      analysis,
      metadata: {
        processingTime: Date.now(),
        modelUsed: 'claude-3-5-sonnet-20241022',
        promptVersion: UX_ANALYSIS_VERSION + '-enhanced',
        confidence: 0.95,
        isEnhanced: true,
      },
    };
  }

  /**
   * Enhanced Technical SEO analysis using structured data
   */
  private async analyzeTechnicalSEOEnhanced(crawlData: CrawlResult, extractionResults: ExtractionResults): Promise<any> {
    const enhancedPrompt = this.generateEnhancedSEOPrompt(crawlData, extractionResults);
    
    const result = await Promise.race([
      generateObject({
        model: this.model,
        system: TECHNICAL_SEO_SYSTEM_PROMPT + `

ENHANCED ANALYSIS MODE:
You have access to structured technical SEO data including meta tags, headings, and content structure.
Provide more specific recommendations based on the actual extracted SEO elements.`,
        prompt: enhancedPrompt,
        schema: technicalSeoAnalysisSchema,
        temperature: 0.3,
      }),
      new Promise((_, reject) => 
        setTimeout(() => reject(new Error('Enhanced SEO analysis timeout after 35s')), 35000)
      )
    ]) as any;

    let analysis = result.object;
    if (analysis.technicalSeoAnalysis) {
      analysis = {
        type: 'technical_seo_enhanced',
        ...analysis.technicalSeoAnalysis,
      };
    }
    
    if (!analysis.type) {
      analysis.type = 'technical_seo_enhanced';
    }

    return {
      analysis,
      metadata: {
        processingTime: Date.now(),
        modelUsed: 'claude-3-5-sonnet-20241022',
        promptVersion: SEO_ANALYSIS_VERSION + '-enhanced',
        confidence: 0.95,
        isEnhanced: true,
      },
    };
  }

  /**
   * Generate enhanced prompts that include structured extraction data
   */
  private generateEnhancedConversionPrompt(crawlData: CrawlResult, extractionResults: ExtractionResults): string {
    const basePrompt = generateConversionAnalysisPrompt(crawlData);
    
    const structuredDataSection = `

STRUCTURED DATA EXTRACTED FROM ${crawlData.url}:

BUSINESS INFORMATION:
${JSON.stringify(extractionResults.businessInfo, null, 2)}

CALLS TO ACTION FOUND (${extractionResults.callsToAction?.length || 0}):
${extractionResults.callsToAction?.map((cta, index) => 
  `${index + 1}. "${cta.text}" (${cta.prominence}) - ${cta.position}`
).join('\n') || 'None identified'}

SOCIAL PROOF ELEMENTS:
- Testimonials: ${extractionResults.socialProof?.testimonials?.length || 0} found
- Reviews: ${extractionResults.socialProof?.reviews?.length || 0} found  
- Statistics: ${extractionResults.socialProof?.statistics?.length || 0} found
- Certifications: ${extractionResults.socialProof?.certifications?.length || 0} found

PSYCHOLOGY TRIGGERS DETECTED:
- Scarcity: ${extractionResults.psychologyTriggers?.scarcity?.length || 0} instances
- Urgency: ${extractionResults.psychologyTriggers?.urgency?.length || 0} instances
- Authority: ${extractionResults.psychologyTriggers?.authority?.length || 0} instances
- Reciprocity: ${extractionResults.psychologyTriggers?.reciprocity?.length || 0} instances

PRODUCTS/SERVICES (${extractionResults.products?.length || 0}):
${extractionResults.products?.map((product, index) => 
  `${index + 1}. ${product.name}${product.price ? ` - ${product.price}` : ''}`
).join('\n') || 'None clearly identified'}

Based on this structured analysis, provide specific recommendations for improving conversion rates.
Focus particularly on gaps where best practices are missing or could be enhanced.`;

    return basePrompt + structuredDataSection;
  }

  private generateEnhancedUXPrompt(crawlData: CrawlResult, extractionResults: ExtractionResults): string {
    const basePrompt = generateUxAnalysisPrompt(crawlData);
    
    const ctaAnalysis = extractionResults.callsToAction?.length 
      ? `CTAs identified: ${extractionResults.callsToAction.map(cta => 
          `"${cta.text}" (${cta.prominence} in ${cta.position})`
        ).join(', ')}`
      : 'No clear CTAs identified - major UX concern';

    const structuredDataSection = `

UX-RELEVANT STRUCTURED DATA:

NAVIGATION & CTA ANALYSIS:
${ctaAnalysis}

CONTENT STRUCTURE:
${extractionResults.technicalSeo?.headings?.length 
  ? `Heading structure: ${extractionResults.technicalSeo.headings.map(h => h.level).join(', ')}`
  : 'Heading structure unclear'
}

Based on this structural analysis, focus on specific UX improvements.`;

    return basePrompt + structuredDataSection;
  }

  private generateEnhancedSEOPrompt(crawlData: CrawlResult, extractionResults: ExtractionResults): string {
    const basePrompt = generateSeoAnalysisPrompt(crawlData);
    
    const seoDataSection = `

TECHNICAL SEO STRUCTURED DATA:

PAGE TITLE: ${extractionResults.technicalSeo?.pageTitle || 'Not extracted'}
META DESCRIPTION: ${extractionResults.technicalSeo?.metaDescription || 'Not extracted'}

HEADING STRUCTURE:
${extractionResults.technicalSeo?.headings?.map(h => `${h.level}: ${h.text}`).join('\n') || 'Not extracted'}

KEYWORDS IDENTIFIED: ${extractionResults.technicalSeo?.keywords?.join(', ') || 'None identified'}

CONTENT METRICS:
- Word Count: ${extractionResults.technicalSeo?.wordCount || 'Unknown'}
- Content Types: ${extractionResults.technicalSeo?.contentTypes?.join(', ') || 'Not analyzed'}

Provide specific SEO recommendations based on this extracted technical data.`;

    return basePrompt + seoDataSection;
  }

  private generateStructuredDataInsights(extractionResults: ExtractionResults): any {
    return {
      ctaAnalysis: {
        total: extractionResults.callsToAction?.length || 0,
        primary: extractionResults.callsToAction?.filter(cta => cta.prominence === 'primary').length || 0,
        secondary: extractionResults.callsToAction?.filter(cta => cta.prominence === 'secondary').length || 0,
        gaps: extractionResults.callsToAction?.length === 0 ? ['No CTAs detected - critical conversion issue'] : [],
      },
      socialProofScore: this.calculateSocialProofScore(extractionResults.socialProof),
      psychologyTriggerCoverage: this.assessPsychologyTriggers(extractionResults.psychologyTriggers),
      businessContext: extractionResults.businessInfo,
    };
  }

  private calculateSocialProofScore(socialProof: any): number {
    if (!socialProof) return 0;
    
    let score = 0;
    if (socialProof.testimonials?.length) score += 25;
    if (socialProof.reviews?.length) score += 25;  
    if (socialProof.statistics?.length) score += 25;
    if (socialProof.certifications?.length) score += 25;
    
    return score;
  }

  private assessPsychologyTriggers(triggers: any): any {
    if (!triggers) return { coverage: 0, missing: ['scarcity', 'urgency', 'authority', 'reciprocity'] };
    
    const present = [];
    const missing = [];
    
    const triggerTypes = ['scarcity', 'urgency', 'authority', 'reciprocity'];
    triggerTypes.forEach(type => {
      if (triggers[type]?.length > 0) {
        present.push(type);
      } else {
        missing.push(type);
      }
    });
    
    return {
      coverage: (present.length / triggerTypes.length) * 100,
      present,
      missing,
    };
  }

  private generateExtractionSummary(extractionResults: ExtractionResults): any {
    return {
      businessDetected: !!extractionResults.businessInfo?.name,
      ctasFound: extractionResults.callsToAction?.length || 0,
      socialProofElements: Object.values(extractionResults.socialProof || {})
        .reduce((total: number, arr: any) => total + (Array.isArray(arr) ? arr.length : 0), 0),
      psychologyTriggersDetected: Object.values(extractionResults.psychologyTriggers || {})
        .reduce((total: number, arr: any) => total + (Array.isArray(arr) ? arr.length : 0), 0),
      productsIdentified: extractionResults.products?.length || 0,
      technicalSeoDataAvailable: !!extractionResults.technicalSeo,
    };
  }

  private async generateEnhancedExecutiveSummary(
    crawlData: CrawlResult,
    extractionResults: ExtractionResults, 
    conversionAnalysis: any,
    uxAnalysis: any,
    seoAnalysis: any,
    overallScore: number
  ): Promise<any> {
    const extractionSummary = this.generateExtractionSummary(extractionResults);
    
    const enhancedPrompt = `Generate executive summary for ${crawlData.url} using both analysis results and structured extraction data:

ANALYSIS SCORES:
- Conversion: ${conversionAnalysis?.overallScore || 'N/A'}/10
- UX: ${uxAnalysis?.overallScore || 'N/A'}/10  
- SEO: ${seoAnalysis?.overallScore || 'N/A'}/10
- Overall: ${overallScore}/10

STRUCTURED DATA INSIGHTS:
- Business: ${extractionSummary.businessDetected ? extractionResults.businessInfo?.name : 'Not clearly identified'}
- CTAs Found: ${extractionSummary.ctasFound}
- Social Proof Elements: ${extractionSummary.socialProofElements}
- Psychology Triggers: ${extractionSummary.psychologyTriggersDetected}
- Products/Services: ${extractionSummary.productsIdentified}

KEY CONVERSION GAPS IDENTIFIED:
${extractionSummary.ctasFound === 0 ? '- CRITICAL: No clear calls-to-action detected' : ''}
${extractionSummary.socialProofElements === 0 ? '- No social proof elements found' : ''}
${extractionSummary.psychologyTriggersDetected === 0 ? '- Missing persuasion psychology triggers' : ''}

Provide a comprehensive executive summary focusing on data-driven insights and specific recommendations.`;

    try {
      const result = await Promise.race([
        generateText({
          model: this.model,
          system: 'You are ConvertIQ AI providing enhanced executive summary with structured data insights. Focus on specific, data-driven recommendations.',
          prompt: enhancedPrompt,
          temperature: 0.4,
          maxTokens: 1500,
        }),
        new Promise((_, reject) => 
          setTimeout(() => reject(new Error('Enhanced executive summary timeout after 15s')), 15000)
        )
      ]) as any;

      return {
        summary: result.text,
        overallScore,
        priorityAreas: this.identifyPriorityAreasWithFallback(conversionAnalysis, uxAnalysis, seoAnalysis),
        structuredDataInsights: this.generateStructuredDataInsights(extractionResults),
        isEnhanced: true,
        dataQuality: this.assessDataQuality(extractionResults),
      };
    } catch (error) {
      console.error('Enhanced executive summary failed:', error);
      throw error;
    }
  }

  private assessDataQuality(extractionResults: ExtractionResults): any {
    let score = 0;
    let maxScore = 0;
    
    // Business info quality (20 points)
    maxScore += 20;
    if (extractionResults.businessInfo?.name) score += 10;
    if (extractionResults.businessInfo?.description) score += 5;
    if (extractionResults.businessInfo?.industry) score += 5;
    
    // CTA quality (20 points)
    maxScore += 20;
    score += Math.min((extractionResults.callsToAction?.length || 0) * 5, 20);
    
    // Social proof quality (20 points)
    maxScore += 20;
    const socialProofTypes = ['testimonials', 'reviews', 'statistics', 'certifications'];
    socialProofTypes.forEach(type => {
      if (extractionResults.socialProof?.[type as keyof typeof extractionResults.socialProof]?.length) {
        score += 5;
      }
    });
    
    // Psychology triggers (20 points)
    maxScore += 20;
    const triggerTypes = ['scarcity', 'urgency', 'authority', 'reciprocity'];
    triggerTypes.forEach(type => {
      if (extractionResults.psychologyTriggers?.[type as keyof typeof extractionResults.psychologyTriggers]?.length) {
        score += 5;
      }
    });
    
    // Technical SEO (20 points)
    maxScore += 20;
    if (extractionResults.technicalSeo?.pageTitle) score += 5;
    if (extractionResults.technicalSeo?.metaDescription) score += 5;
    if (extractionResults.technicalSeo?.headings?.length) score += 5;
    if (extractionResults.technicalSeo?.keywords?.length) score += 5;
    
    return {
      score: Math.round((score / maxScore) * 100),
      completeness: score / maxScore,
      strengths: this.identifyDataStrengths(extractionResults),
      gaps: this.identifyDataGaps(extractionResults),
    };
  }

  private identifyDataStrengths(extractionResults: ExtractionResults): string[] {
    const strengths = [];
    
    if (extractionResults.businessInfo?.name) strengths.push('Business clearly identified');
    if (extractionResults.callsToAction?.length && extractionResults.callsToAction.length > 0) {
      strengths.push(`${extractionResults.callsToAction.length} CTAs detected`);
    }
    if (extractionResults.socialProof?.testimonials?.length) strengths.push('Customer testimonials found');
    if (extractionResults.socialProof?.statistics?.length) strengths.push('Performance statistics available');
    if (extractionResults.technicalSeo?.headings?.length) strengths.push('Structured content hierarchy');
    
    return strengths;
  }

  private identifyDataGaps(extractionResults: ExtractionResults): string[] {
    const gaps = [];
    
    if (!extractionResults.businessInfo?.name) gaps.push('Business identity unclear');
    if (!extractionResults.callsToAction?.length) gaps.push('No clear calls-to-action');
    if (!extractionResults.socialProof?.testimonials?.length) gaps.push('Missing customer testimonials');
    if (!extractionResults.socialProof?.statistics?.length) gaps.push('No performance statistics');
    if (!extractionResults.psychologyTriggers?.scarcity?.length) gaps.push('No scarcity triggers');
    if (!extractionResults.technicalSeo?.metaDescription) gaps.push('Meta description missing');
    
    return gaps;
  }

  /**
   * Enhanced conversion psychology analysis with structured data
   */
  async analyzeConversionPsychologyEnhanced(
    crawlData: CrawlResult, 
    extractionResults: ExtractionResults
  ): Promise<any> {
    const enhancedPrompt = this.generateEnhancedConversionPrompt(crawlData, extractionResults);
    
    const result = await Promise.race([
      generateObject({
        model: this.model,
        system: CONVERSION_PSYCHOLOGY_SYSTEM_PROMPT + `

ENHANCED ANALYSIS MODE:
You have detailed structured data about the website including business info, CTAs, social proof, and psychology triggers.
Provide specific recommendations based on the actual extracted elements and identify gaps in conversion optimization.`,
        prompt: enhancedPrompt,
        schema: conversionPsychologyAnalysisSchema,
        temperature: 0.3,
      }),
      new Promise((_, reject) => 
        setTimeout(() => reject(new Error('Enhanced conversion analysis timeout after 35s')), 35000)
      )
    ]) as any;

    let analysis = result.object;
    if (analysis.conversionAnalysis) {
      analysis = {
        type: 'conversion_psychology_enhanced',
        ...analysis.conversionAnalysis,
      };
    }
    
    if (!analysis.type) {
      analysis.type = 'conversion_psychology_enhanced';
    }

    return {
      analysis,
      metadata: {
        processingTime: Date.now(),
        modelUsed: 'claude-3-5-sonnet-20241022',
        promptVersion: CONVERSION_ANALYSIS_VERSION + '-enhanced',
        confidence: 0.95,
        isEnhanced: true,
        dataQuality: this.assessDataQuality(extractionResults),
        structuredDataInsights: this.generateStructuredDataInsights(extractionResults),
      },
    };
  }

  /**
   * Generate comprehensive analysis using enhanced structured data
   */
  async generateComprehensiveAnalysisEnhanced(
    url: string,
    crawlData: CrawlResult,
    extractionResults: ExtractionResults
  ): Promise<any> {
    const startTime = Date.now();

    try {
      console.log('🚀 Starting Enhanced Comprehensive Analysis with v2 data...');

      // Run enhanced analyses in parallel
      const [conversionResult, uxResult, seoResult] = await Promise.allSettled([
        this.analyzeConversionPsychologyEnhanced(crawlData, extractionResults),
        this.analyzeUXEnhanced(crawlData, extractionResults),
        this.analyzeTechnicalSEOEnhanced(crawlData, extractionResults),
      ]);

      const conversionAnalysis = conversionResult.status === 'fulfilled' ? conversionResult.value.analysis : null;
      const uxAnalysis = uxResult.status === 'fulfilled' ? uxResult.value.analysis : null; 
      const seoAnalysis = seoResult.status === 'fulfilled' ? seoResult.value.analysis : null;

      // Calculate enhanced overall score
      const overallScore = this.calculateEnhancedOverallScore(
        conversionAnalysis, 
        uxAnalysis, 
        seoAnalysis,
        extractionResults
      );

      // Generate enhanced executive summary
      const executiveSummary = await this.generateEnhancedExecutiveSummary(
        crawlData,
        extractionResults,
        conversionAnalysis,
        uxAnalysis, 
        seoAnalysis,
        overallScore
      );

      const totalTime = Date.now() - startTime;
      console.log(`🎉 Enhanced comprehensive analysis completed in ${totalTime}ms`);

      return {
        conversionAnalysis,
        uxAnalysis,
        seoAnalysis,
        executiveSummary,
        overallScore,
        metadata: {
          processingTime: totalTime,
          isEnhanced: true,
          firecrawlVersion: 'v2',
          dataQuality: this.assessDataQuality(extractionResults),
          extractionSummary: this.generateExtractionSummary(extractionResults),
        }
      };

    } catch (error) {
      console.error('Enhanced comprehensive analysis failed:', error);
      throw error;
    }
  }

  /**
   * Calculate enhanced overall score incorporating extraction data quality
   */
  private calculateEnhancedOverallScore(
    conversionAnalysis: any,
    uxAnalysis: any, 
    seoAnalysis: any,
    extractionResults: ExtractionResults
  ): number {
    const baseScore = this.calculateOverallScore(conversionAnalysis, uxAnalysis, seoAnalysis);
    const dataQuality = this.assessDataQuality(extractionResults);
    
    // Boost score based on data quality and richness
    const dataBonus = (dataQuality.score / 100) * 0.5; // Up to 0.5 point bonus
    
    return Math.min(baseScore + dataBonus, 10);
  }

  /**
   * Assess data quality of extraction results
   */
  assessDataQuality(extractionResults: ExtractionResults): any {
    let score = 0;
    let maxScore = 100;
    const missingFields = [];
    const dataRichness = [];

    // Business info quality (25 points)
    if (extractionResults.businessInfo?.name) {
      score += 10;
      dataRichness.push('Business name identified');
    } else {
      missingFields.push('business name');
    }
    
    if (extractionResults.businessInfo?.description) {
      score += 8;
      dataRichness.push('Business description');
    } else {
      missingFields.push('business description');
    }
    
    if (extractionResults.businessInfo?.industry) {
      score += 7;
      dataRichness.push('Industry classification');
    } else {
      missingFields.push('industry');
    }

    // CTA quality (20 points)
    const ctaCount = extractionResults.callsToAction?.length || 0;
    if (ctaCount > 0) {
      score += Math.min(ctaCount * 5, 20);
      dataRichness.push(`${ctaCount} CTAs found`);
    } else {
      missingFields.push('calls-to-action');
    }

    // Social proof quality (20 points)
    let socialProofScore = 0;
    if (extractionResults.socialProof?.testimonials?.length) {
      socialProofScore += 5;
      dataRichness.push('Testimonials');
    }
    if (extractionResults.socialProof?.reviews?.length) {
      socialProofScore += 5;
      dataRichness.push('Reviews');
    }
    if (extractionResults.socialProof?.statistics?.length) {
      socialProofScore += 5;
      dataRichness.push('Statistics');
    }
    if (extractionResults.socialProof?.certifications?.length) {
      socialProofScore += 5;
      dataRichness.push('Certifications');
    }
    
    score += socialProofScore;
    if (socialProofScore === 0) {
      missingFields.push('social proof');
    }

    // Psychology triggers (20 points)
    let triggerScore = 0;
    const triggerTypes = ['scarcity', 'urgency', 'authority', 'reciprocity'];
    triggerTypes.forEach(type => {
      if (extractionResults.psychologyTriggers?.[type as keyof typeof extractionResults.psychologyTriggers]?.length) {
        triggerScore += 5;
        dataRichness.push(`${type} triggers`);
      }
    });
    
    score += triggerScore;
    if (triggerScore === 0) {
      missingFields.push('psychology triggers');
    }

    // Technical SEO (15 points)
    let seoScore = 0;
    if (extractionResults.technicalSeo?.pageTitle) {
      seoScore += 4;
      dataRichness.push('Page title');
    }
    if (extractionResults.technicalSeo?.metaDescription) {
      seoScore += 4;
      dataRichness.push('Meta description');
    }
    if (extractionResults.technicalSeo?.headings?.length) {
      seoScore += 4;
      dataRichness.push('Heading structure');
    }
    if (extractionResults.technicalSeo?.keywords?.length) {
      seoScore += 3;
      dataRichness.push('Keywords');
    }
    
    score += seoScore;
    if (seoScore === 0) {
      missingFields.push('technical SEO data');
    }

    return {
      overallScore: Math.round(score),
      completeness: (score / maxScore) * 100,
      dataRichness: (dataRichness.length / 15) * 100, // 15 possible data points
      strengths: dataRichness.slice(0, 5),
      missingFields,
      recommendations: this.generateDataQualityRecommendations(missingFields),
    };
  }

  /**
   * Generate structured data insights for analysis enhancement
   */
  generateStructuredDataInsights(extractionResults: ExtractionResults): any {
    const businessInsights = [];
    const ctaInsights = [];
    const socialProofInsights = [];
    const psychologyInsights = [];

    // Business insights
    if (extractionResults.businessInfo?.name) {
      businessInsights.push(`Business identified: ${extractionResults.businessInfo.name}`);
    }
    if (extractionResults.businessInfo?.industry) {
      businessInsights.push(`Industry: ${extractionResults.businessInfo.industry}`);
    }

    // CTA insights
    const ctaCount = extractionResults.callsToAction?.length || 0;
    if (ctaCount > 0) {
      const primaryCTAs = extractionResults.callsToAction?.filter(cta => cta.prominence === 'primary').length || 0;
      ctaInsights.push(`${ctaCount} CTAs found (${primaryCTAs} primary)`);
      
      if (ctaCount > 3) {
        ctaInsights.push('High CTA density - may cause decision paralysis');
      } else if (ctaCount === 1) {
        ctaInsights.push('Single CTA focus - good for clarity');
      }
    } else {
      ctaInsights.push('No clear CTAs detected - critical conversion issue');
    }

    // Social proof insights
    const socialProof = extractionResults.socialProof;
    if (socialProof) {
      const proofElements = [
        ...(socialProof.testimonials || []),
        ...(socialProof.reviews || []),
        ...(socialProof.statistics || []),
        ...(socialProof.certifications || [])
      ];
      
      if (proofElements.length > 0) {
        socialProofInsights.push(`${proofElements.length} social proof elements found`);
      } else {
        socialProofInsights.push('No social proof elements detected');
      }
    }

    // Psychology insights
    if (extractionResults.psychologyTriggers) {
      const triggerCount = Object.values(extractionResults.psychologyTriggers)
        .reduce((total: number, arr: any) => total + (Array.isArray(arr) ? arr.length : 0), 0);
      
      if (triggerCount > 0) {
        psychologyInsights.push(`${triggerCount} psychology triggers detected`);
      } else {
        psychologyInsights.push('No persuasion psychology triggers found');
      }
    }

    return {
      businessInsights,
      ctaInsights,
      socialProofInsights,
      psychologyInsights,
    };
  }

  private generateDataQualityRecommendations(missingFields: string[]): string[] {
    const recommendations = [];
    
    if (missingFields.includes('business name')) {
      recommendations.push('Ensure clear business branding in header/logo');
    }
    if (missingFields.includes('calls-to-action')) {
      recommendations.push('Add prominent call-to-action buttons');
    }
    if (missingFields.includes('social proof')) {
      recommendations.push('Add customer testimonials and reviews');
    }
    if (missingFields.includes('psychology triggers')) {
      recommendations.push('Incorporate scarcity, urgency, or authority signals');
    }
    
    return recommendations;
  }

  // Health check method
  async testConnection(): Promise<boolean> {
    try {
      const result = await this.executeWithOptimizedTimeout(
        'connectionTest',
        () => generateText({
          model: this.model,
          prompt: 'Respond with "OK" if you are working correctly.',
          maxTokens: 10,
        })
      ) as any;
      
      return result.text.trim().toLowerCase().includes('ok');
    } catch (error) {
      // Enhanced connection test error handling
      const enhancedError = this.handleAISDKError(error, 'Connection Test');
      this.logEnhancedError('Connection Test', enhancedError);
      
      console.error('🔌 Anthropic connection test failed with enhanced error handling:', {
        originalError: error instanceof Error ? error.message : 'Unknown',
        enhancedError: enhancedError.message,
        timestamp: new Date().toISOString()
      });
      
      return false;
    }
  }

  /**
   * AI SDK v5 Token Usage Monitoring Methods
   */
  
  private calculateCostEstimate(usage?: { promptTokens?: number; completionTokens?: number }): number {
    if (!usage) return 0;
    
    const PROMPT_TOKEN_COST = 0.000003; // $0.003 per 1K tokens
    const COMPLETION_TOKEN_COST = 0.000015; // $0.015 per 1K tokens
    
    const promptCost = (usage.promptTokens || 0) * PROMPT_TOKEN_COST;
    const completionCost = (usage.completionTokens || 0) * COMPLETION_TOKEN_COST;
    
    return promptCost + completionCost;
  }
  
  private recordTokenUsage(
    operation: string,
    usage: { promptTokens?: number; completionTokens?: number; totalTokens?: number },
    processingTime: number,
    success: boolean = true,
    errorType?: string
  ): void {
    const promptTokens = usage?.promptTokens || 0;
    const completionTokens = usage?.completionTokens || 0;
    const totalTokens = usage?.totalTokens || promptTokens + completionTokens;
    
    // Calculate cost estimate (Claude 3.5 Sonnet pricing as of 2024)
    const PROMPT_TOKEN_COST = 0.000003; // $0.003 per 1K tokens
    const COMPLETION_TOKEN_COST = 0.000015; // $0.015 per 1K tokens
    const costEstimate = (promptTokens * PROMPT_TOKEN_COST) + (completionTokens * COMPLETION_TOKEN_COST);
    
    // Update session stats
    this.tokenUsageMonitor.sessionStats.totalPromptTokens += promptTokens;
    this.tokenUsageMonitor.sessionStats.totalCompletionTokens += completionTokens;
    this.tokenUsageMonitor.sessionStats.totalTokens += totalTokens;
    this.tokenUsageMonitor.sessionStats.totalCalls += 1;
    this.tokenUsageMonitor.sessionStats.costEstimate += costEstimate;
    
    // Calculate averages
    this.tokenUsageMonitor.sessionStats.averagePromptTokens = 
      this.tokenUsageMonitor.sessionStats.totalPromptTokens / this.tokenUsageMonitor.sessionStats.totalCalls;
    this.tokenUsageMonitor.sessionStats.averageCompletionTokens = 
      this.tokenUsageMonitor.sessionStats.totalCompletionTokens / this.tokenUsageMonitor.sessionStats.totalCalls;
    
    // Phase 4: Enhanced performance monitoring
    this.updatePerformanceMetrics(processingTime, success, errorType, promptTokens, completionTokens);
    
    // Record individual call
    this.tokenUsageMonitor.callHistory.push({
      timestamp: new Date(),
      operation,
      promptTokens,
      completionTokens,
      totalTokens,
      costEstimate,
      processingTime,
      success
    });
    
    // Keep only last 100 calls to prevent memory issues
    if (this.tokenUsageMonitor.callHistory.length > 100) {
      this.tokenUsageMonitor.callHistory = this.tokenUsageMonitor.callHistory.slice(-100);
    }
    
    // Enhanced v5-specific logging
    this.logV5Metrics(operation, {
      promptTokens,
      completionTokens,
      totalTokens,
      costEstimate,
      processingTime,
      success,
      errorType
    });
  }
  
  /**
   * Get current session token usage statistics
   */
  getTokenUsageStats(): any {
    return {
      session: { ...this.tokenUsageMonitor.sessionStats },
      recentCalls: this.tokenUsageMonitor.callHistory.slice(-10), // Last 10 calls
      efficiency: {
        averageTokensPerSecond: this.calculateTokensPerSecond(),
        costPerCall: this.tokenUsageMonitor.sessionStats.costEstimate / Math.max(this.tokenUsageMonitor.sessionStats.totalCalls, 1),
        successRate: this.calculateSuccessRate(),
      },
      recommendations: this.generateUsageRecommendations()
    };
  }
  
  /**
   * Reset token usage monitoring
   */
  resetTokenUsageStats(): void {
    this.tokenUsageMonitor.sessionStats = {
      totalPromptTokens: 0,
      totalCompletionTokens: 0,
      totalTokens: 0,
      totalCalls: 0,
      averagePromptTokens: 0,
      averageCompletionTokens: 0,
      costEstimate: 0,
    };
    this.tokenUsageMonitor.callHistory = [];
    console.log('🔄 Token usage statistics reset');
  }
  
  /**
   * Generate token usage report
   */
  generateTokenUsageReport(): string {
    const stats = this.getTokenUsageStats();
    
    return `# AI SDK v5 Token Usage Report
    
## Session Overview
- **Total API Calls**: ${stats.session.totalCalls}
- **Total Tokens Used**: ${stats.session.totalTokens.toLocaleString()}
- **Total Cost Estimate**: $${stats.session.costEstimate.toFixed(4)}
- **Success Rate**: ${(stats.efficiency.successRate * 100).toFixed(1)}%

## Token Breakdown
- **Prompt Tokens**: ${stats.session.totalPromptTokens.toLocaleString()} (avg: ${Math.round(stats.session.averagePromptTokens)})
- **Completion Tokens**: ${stats.session.totalCompletionTokens.toLocaleString()} (avg: ${Math.round(stats.session.averageCompletionTokens)})
- **Cost per Call**: $${stats.efficiency.costPerCall.toFixed(6)}

## Performance Metrics
- **Tokens per Second**: ${stats.efficiency.averageTokensPerSecond.toFixed(1)}
- **Recent Call Success Rate**: ${(stats.efficiency.successRate * 100).toFixed(1)}%

## Recent Operations
${stats.recentCalls.map((call: any) => 
  `- **${call.operation}** (${call.timestamp.toISOString()}): ${call.totalTokens} tokens, $${call.costEstimate.toFixed(6)}, ${call.processingTime}ms ${call.success ? '✅' : '❌'}`
).join('\n')}

## Recommendations
${stats.recommendations.map((rec: string) => `- ${rec}`).join('\n')}
`;
  }
  
  private calculateTokensPerSecond(): number {
    if (this.tokenUsageMonitor.callHistory.length === 0) return 0;
    
    const totalTokens = this.tokenUsageMonitor.callHistory.reduce((sum, call) => sum + call.totalTokens, 0);
    const totalTime = this.tokenUsageMonitor.callHistory.reduce((sum, call) => sum + call.processingTime, 0);
    
    return totalTime > 0 ? (totalTokens / totalTime) * 1000 : 0; // tokens per second
  }
  
  private calculateSuccessRate(): number {
    if (this.tokenUsageMonitor.callHistory.length === 0) return 1.0;
    
    const successfulCalls = this.tokenUsageMonitor.callHistory.filter(call => call.success).length;
    return successfulCalls / this.tokenUsageMonitor.callHistory.length;
  }
  
  private generateUsageRecommendations(): string[] {
    const stats = this.tokenUsageMonitor.sessionStats;
    const recommendations = [];
    
    // Cost optimization recommendations
    if (stats.costEstimate > 1.0) {
      recommendations.push('High cost detected - consider optimizing prompt length or using temperature controls');
    }
    
    if (stats.averagePromptTokens > 2000) {
      recommendations.push('Large prompt sizes detected - consider chunking or summarizing input data');
    }
    
    if (stats.averageCompletionTokens > 1500) {
      recommendations.push('Large completion sizes - consider using maxTokens parameter to control output length');
    }
    
    // Performance recommendations
    const successRate = this.calculateSuccessRate();
    if (successRate < 0.9) {
      recommendations.push('Low success rate detected - review timeout settings and error handling');
    }
    
    const tokensPerSecond = this.calculateTokensPerSecond();
    if (tokensPerSecond < 50) {
      recommendations.push('Low processing speed - consider parallel processing or shorter prompts');
    }
    
    // Efficiency recommendations
    if (stats.totalCalls > 10 && stats.averagePromptTokens < 200) {
      recommendations.push('Consider batching small requests to improve efficiency');
    }
    
    if (recommendations.length === 0) {
      recommendations.push('Token usage is within optimal ranges - good job!');
    }
    
    return recommendations;
  }

  /**
   * Phase 4: AI SDK v5 Performance Monitoring Methods
   */
  
  private updatePerformanceMetrics(
    processingTime: number, 
    success: boolean, 
    errorType?: string, 
    promptTokens?: number, 
    completionTokens?: number
  ): void {
    // Update response timings
    this.performanceMonitor.responseTimes.push(processingTime);
    
    // Keep only last 100 response times for percentile calculation
    if (this.performanceMonitor.responseTimes.length > 100) {
      this.performanceMonitor.responseTimes = this.performanceMonitor.responseTimes.slice(-100);
    }
    
    // Update timing statistics
    this.performanceMonitor.responseTimings.totalSamples += 1;
    this.performanceMonitor.responseTimings.fastestResponse = Math.min(
      this.performanceMonitor.responseTimings.fastestResponse, 
      processingTime
    );
    this.performanceMonitor.responseTimings.slowestResponse = Math.max(
      this.performanceMonitor.responseTimings.slowestResponse, 
      processingTime
    );
    
    // Calculate average response time
    const totalTime = this.performanceMonitor.responseTimes.reduce((sum, time) => sum + time, 0);
    this.performanceMonitor.responseTimings.averageResponse = totalTime / this.performanceMonitor.responseTimes.length;
    
    // Calculate percentiles
    const sortedTimes = [...this.performanceMonitor.responseTimes].sort((a, b) => a - b);
    const p95Index = Math.floor(sortedTimes.length * 0.95);
    const p99Index = Math.floor(sortedTimes.length * 0.99);
    
    this.performanceMonitor.responseTimings.p95Response = sortedTimes[p95Index] || 0;
    this.performanceMonitor.responseTimings.p99Response = sortedTimes[p99Index] || 0;
    
    // Update error rates
    if (!success && errorType) {
      this.performanceMonitor.v5Metrics.errorRates.total += 1;
      
      switch (errorType.toLowerCase()) {
        case 'timeout':
          this.performanceMonitor.v5Metrics.errorRates.timeouts += 1;
          break;
        case 'rate_limit':
        case 'ratelimit':
          this.performanceMonitor.v5Metrics.errorRates.rateLimit += 1;
          break;
        case 'network':
        case 'econnreset':
        case 'etimedout':
          this.performanceMonitor.v5Metrics.errorRates.networkErrors += 1;
          break;
        default:
          this.performanceMonitor.v5Metrics.errorRates.apiErrors += 1;
      }
    }
    
    // Update token efficiency metrics
    if (success && promptTokens && completionTokens) {
      const samples = this.performanceMonitor.responseTimings.totalSamples;
      const currentAvgPrompt = this.performanceMonitor.v5Metrics.tokenEfficiency.averagePromptLength;
      const currentAvgResponse = this.performanceMonitor.v5Metrics.tokenEfficiency.averageResponseLength;
      
      // Running average calculation
      this.performanceMonitor.v5Metrics.tokenEfficiency.averagePromptLength = 
        (currentAvgPrompt * (samples - 1) + promptTokens) / samples;
      this.performanceMonitor.v5Metrics.tokenEfficiency.averageResponseLength = 
        (currentAvgResponse * (samples - 1) + completionTokens) / samples;
      
      // Calculate compression ratio (response tokens / prompt tokens)
      if (promptTokens > 0) {
        this.performanceMonitor.v5Metrics.tokenEfficiency.compressionRatio = 
          completionTokens / promptTokens;
      }
      
      // Calculate tokens per second
      if (processingTime > 0) {
        const tokensPerSecond = ((promptTokens + completionTokens) / processingTime) * 1000;
        const currentTPS = this.performanceMonitor.v5Metrics.tokenEfficiency.tokensPerSecond;
        this.performanceMonitor.v5Metrics.tokenEfficiency.tokensPerSecond = 
          (currentTPS * (samples - 1) + tokensPerSecond) / samples;
      }
    }
    
    // Check for performance alerts
    this.checkPerformanceAlerts(processingTime, success, errorType);
  }
  
  private logV5Metrics(operation: string, metrics: any): void {
    const timestamp = new Date().toISOString();
    
    // Enhanced logging for AI SDK v5
    console.log(`🔍 AI SDK v5 Metrics [${timestamp}] - ${operation}:`, {
      sdkVersion: this.performanceMonitor.v5Metrics.sdkVersion,
      modelVersion: this.performanceMonitor.v5Metrics.modelVersion,
      tokens: {
        prompt: metrics.promptTokens,
        completion: metrics.completionTokens,
        total: metrics.totalTokens,
        cost: `$${metrics.costEstimate.toFixed(6)}`
      },
      performance: {
        processingTime: `${metrics.processingTime}ms`,
        tokensPerSecond: this.performanceMonitor.v5Metrics.tokenEfficiency.tokensPerSecond.toFixed(1),
        success: metrics.success,
        errorType: metrics.errorType || null
      },
      session: {
        totalCalls: this.tokenUsageMonitor.sessionStats.totalCalls,
        totalCost: `$${this.tokenUsageMonitor.sessionStats.costEstimate.toFixed(4)}`,
        averageResponseTime: `${this.performanceMonitor.responseTimings.averageResponse.toFixed(0)}ms`,
        successRate: `${(this.calculateSuccessRate() * 100).toFixed(1)}%`
      }
    });
    
    // Log performance alerts separately for visibility
    const recentAlerts = this.performanceMonitor.performanceAlerts
      .filter(alert => Date.now() - alert.timestamp.getTime() < 60000) // Last minute
      .filter(alert => alert.severity === 'high' || alert.severity === 'medium');
    
    if (recentAlerts.length > 0) {
      console.warn(`⚠️ Performance Alerts (${recentAlerts.length} in last minute):`, 
        recentAlerts.map(alert => ({
          type: alert.alertType,
          severity: alert.severity,
          message: alert.message
        }))
      );
    }
  }
  
  private checkPerformanceAlerts(processingTime: number, success: boolean, errorType?: string): void {
    const now = new Date();
    
    // Alert for slow response times (>30 seconds)
    if (processingTime > 30000) {
      this.performanceMonitor.performanceAlerts.push({
        timestamp: now,
        alertType: 'slow_response',
        severity: processingTime > 45000 ? 'high' : 'medium',
        message: `Slow response detected: ${processingTime}ms (threshold: 30s)`,
        metrics: { processingTime, success, errorType }
      });
    }
    
    // Alert for high costs (>$0.10 per call)
    const recentCalls = this.tokenUsageMonitor.callHistory.slice(-10);
    const averageCostRecent = recentCalls.reduce((sum, call) => sum + call.costEstimate, 0) / Math.max(recentCalls.length, 1);
    
    if (averageCostRecent > 0.1) {
      this.performanceMonitor.performanceAlerts.push({
        timestamp: now,
        alertType: 'high_cost',
        severity: averageCostRecent > 0.2 ? 'high' : 'medium',
        message: `High cost detected: $${averageCostRecent.toFixed(4)} average per call (threshold: $0.10)`,
        metrics: { averageCostRecent, recentCallCount: recentCalls.length }
      });
    }
    
    // Alert for error spikes (>20% error rate in last 10 calls)
    const recentFailures = recentCalls.filter(call => !call.success).length;
    const recentErrorRate = recentFailures / Math.max(recentCalls.length, 1);
    
    if (recentErrorRate > 0.2 && recentCalls.length >= 5) {
      this.performanceMonitor.performanceAlerts.push({
        timestamp: now,
        alertType: 'error_spike',
        severity: recentErrorRate > 0.5 ? 'high' : 'medium',
        message: `Error spike detected: ${(recentErrorRate * 100).toFixed(1)}% failure rate in recent calls`,
        metrics: { recentErrorRate, recentFailures, totalRecent: recentCalls.length }
      });
    }
    
    // Alert for efficiency drops (tokens/second < 50)
    const currentTPS = this.performanceMonitor.v5Metrics.tokenEfficiency.tokensPerSecond;
    if (currentTPS > 0 && currentTPS < 50) {
      this.performanceMonitor.performanceAlerts.push({
        timestamp: now,
        alertType: 'efficiency_drop',
        severity: currentTPS < 25 ? 'high' : 'low',
        message: `Low processing efficiency: ${currentTPS.toFixed(1)} tokens/second (threshold: 50)`,
        metrics: { tokensPerSecond: currentTPS }
      });
    }
    
    // Keep only last 50 alerts to prevent memory issues
    if (this.performanceMonitor.performanceAlerts.length > 50) {
      this.performanceMonitor.performanceAlerts = this.performanceMonitor.performanceAlerts.slice(-50);
    }
  }
  
  /**
   * Get comprehensive performance metrics for AI SDK v5
   */
  getV5PerformanceMetrics(): any {
    return {
      responseTimings: { ...this.performanceMonitor.responseTimings },
      v5Metrics: { ...this.performanceMonitor.v5Metrics },
      recentAlerts: this.performanceMonitor.performanceAlerts.slice(-10),
      systemHealth: this.calculateSystemHealth(),
      recommendations: this.generatePerformanceRecommendations()
    };
  }
  
  private calculateSystemHealth(): any {
    const errorRate = this.performanceMonitor.v5Metrics.errorRates.total / 
                     Math.max(this.performanceMonitor.responseTimings.totalSamples, 1);
    const avgResponseTime = this.performanceMonitor.responseTimings.averageResponse;
    const tokensPerSecond = this.performanceMonitor.v5Metrics.tokenEfficiency.tokensPerSecond;
    
    // Calculate health score (0-100)
    let healthScore = 100;
    
    // Penalize high error rates
    healthScore -= errorRate * 100; // 1% error rate = 1 point deduction
    
    // Penalize slow response times (over 10 seconds)
    if (avgResponseTime > 10000) {
      healthScore -= Math.min(30, (avgResponseTime - 10000) / 1000); // 1 second over = 1 point deduction
    }
    
    // Penalize low efficiency
    if (tokensPerSecond > 0 && tokensPerSecond < 50) {
      healthScore -= Math.min(20, (50 - tokensPerSecond) / 2); // Low efficiency penalty
    }
    
    // High cost penalty
    const avgCost = this.tokenUsageMonitor.sessionStats.costEstimate / 
                   Math.max(this.tokenUsageMonitor.sessionStats.totalCalls, 1);
    if (avgCost > 0.05) {
      healthScore -= Math.min(15, (avgCost - 0.05) * 200); // Cost over $0.05 per call
    }
    
    const clampedScore = Math.max(0, Math.min(100, healthScore));
    
    return {
      score: Math.round(clampedScore),
      status: clampedScore >= 90 ? 'excellent' : 
              clampedScore >= 75 ? 'good' : 
              clampedScore >= 50 ? 'fair' : 'poor',
      factors: {
        errorRate: `${(errorRate * 100).toFixed(2)}%`,
        avgResponseTime: `${avgResponseTime.toFixed(0)}ms`,
        tokensPerSecond: tokensPerSecond.toFixed(1),
        avgCostPerCall: `$${avgCost.toFixed(4)}`
      }
    };
  }
  
  private generatePerformanceRecommendations(): string[] {
    const recommendations = [];
    const metrics = this.performanceMonitor.v5Metrics;
    const timings = this.performanceMonitor.responseTimings;
    
    // Response time recommendations
    if (timings.averageResponse > 20000) {
      recommendations.push('Consider reducing prompt complexity or using parallel processing for better response times');
    }
    
    // Error rate recommendations
    const errorRate = metrics.errorRates.total / Math.max(timings.totalSamples, 1);
    if (errorRate > 0.1) {
      recommendations.push('High error rate detected - review timeout settings and implement better retry logic');
    }
    
    if (metrics.errorRates.timeouts > metrics.errorRates.total * 0.5) {
      recommendations.push('Many timeout errors - consider increasing timeout values or optimizing prompts');
    }
    
    // Token efficiency recommendations
    if (metrics.tokenEfficiency.tokensPerSecond > 0 && metrics.tokenEfficiency.tokensPerSecond < 30) {
      recommendations.push('Low processing speed - consider shorter prompts or parallel processing');
    }
    
    if (metrics.tokenEfficiency.compressionRatio > 3) {
      recommendations.push('High response-to-prompt ratio - consider using maxTokens to control output length');
    }
    
    if (metrics.tokenEfficiency.averagePromptLength > 5000) {
      recommendations.push('Large prompts detected - consider chunking or summarizing input data');
    }
    
    // Cost recommendations
    const avgCost = this.tokenUsageMonitor.sessionStats.costEstimate / 
                   Math.max(this.tokenUsageMonitor.sessionStats.totalCalls, 1);
    if (avgCost > 0.08) {
      recommendations.push('High average cost per call - optimize prompt length and use temperature controls');
    }
    
    // Performance alerts recommendations
    const recentHighAlerts = this.performanceMonitor.performanceAlerts
      .filter(alert => alert.severity === 'high' && Date.now() - alert.timestamp.getTime() < 300000) // Last 5 minutes
      .length;
    
    if (recentHighAlerts > 0) {
      recommendations.push('Multiple high-severity performance alerts - investigate system issues');
    }
    
    if (recommendations.length === 0) {
      recommendations.push('Performance metrics are within acceptable ranges - system operating efficiently');
    }
    
    return recommendations;
  }

  /**
   * Reset performance monitoring data
   */
  resetPerformanceMonitoring(): void {
    this.performanceMonitor.responseTimings = {
      fastestResponse: Infinity,
      slowestResponse: 0,
      averageResponse: 0,
      p95Response: 0,
      p99Response: 0,
      totalSamples: 0,
    };
    
    this.performanceMonitor.v5Metrics.errorRates = {
      timeouts: 0,
      rateLimit: 0,
      networkErrors: 0,
      apiErrors: 0,
      total: 0,
    };
    
    this.performanceMonitor.v5Metrics.retryMetrics = {
      totalRetries: 0,
      successfulRetries: 0,
      maxRetriesReached: 0,
    };
    
    this.performanceMonitor.performanceAlerts = [];
    this.performanceMonitor.responseTimes = [];
    
    console.log('🔄 AI SDK v5 performance monitoring reset');
  }
}

// Export singleton instance
export const anthropic = new AnthropicAnalysisProvider();