import { createAnthropic } from '@ai-sdk/anthropic';
import { generateObject, generateText } from 'ai';
import type { CrawlResult } from '../../crawler/types';
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
const anthropic = createAnthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

export class AnthropicAnalysisProvider {
  private model = anthropic('claude-3-5-sonnet-20241022');

  async analyzeConversionPsychology(crawlData: CrawlResult): Promise<any> {
    const startTime = Date.now();

    try {
      console.log('🤖 Generating conversion psychology analysis...');
      const result = await Promise.race([
        generateObject({
          model: this.model,
          system: CONVERSION_PSYCHOLOGY_SYSTEM_PROMPT,
          prompt: generateConversionAnalysisPrompt(crawlData),
          schema: conversionPsychologyAnalysisSchema,
          temperature: 0.3, // Lower temperature for more consistent analysis
        }),
        new Promise((_, reject) => 
          setTimeout(() => reject(new Error('Conversion analysis timeout after 35s')), 35000)
        )
      ]) as any;

      const processingTime = Date.now() - startTime;

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
        },
      };
    } catch (error) {
      console.error('❌ Conversion psychology analysis failed:', {
        error: error instanceof Error ? error.message : 'Unknown error',
        errorStack: error instanceof Error ? error.stack : undefined,
        crawlUrl: crawlData.url,
      });
      throw new Error(`Analysis failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  async analyzeUX(crawlData: CrawlResult): Promise<any> {
    const startTime = Date.now();

    try {
      const result = await Promise.race([
        generateObject({
          model: this.model,
          system: UX_ANALYSIS_SYSTEM_PROMPT,
          prompt: generateUxAnalysisPrompt(crawlData),
          schema: uxAnalysisSchema,
          temperature: 0.3,
        }),
        new Promise((_, reject) => 
          setTimeout(() => reject(new Error('UX analysis timeout after 35s')), 35000)
        )
      ]) as any;

      const processingTime = Date.now() - startTime;

      return {
        analysis: result.object,
        metadata: {
          processingTime,
          modelUsed: 'claude-3-5-sonnet-20241022',
          promptVersion: UX_ANALYSIS_VERSION,
          confidence: 0.9,
        },
      };
    } catch (error) {
      console.error('UX analysis failed:', error);
      throw new Error(`UX analysis failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
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

      return {
        analysis: result.object,
        metadata: {
          processingTime,
          modelUsed: 'claude-3-5-sonnet-20241022',
          promptVersion: SEO_ANALYSIS_VERSION,
          confidence: 0.9,
        },
      };
    } catch (error) {
      console.error('Technical SEO analysis failed:', error);
      throw new Error(`SEO analysis failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  async analyzeContent(crawlData: CrawlResult): Promise<any> {
    // TODO: Implement content analysis when content-analysis prompts are created
    throw new Error('Content analysis not yet implemented');
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

  // Health check method
  async testConnection(): Promise<boolean> {
    try {
      const result = await Promise.race([
        generateText({
          model: this.model,
          prompt: 'Respond with "OK" if you are working correctly.',
          maxTokens: 10,
        }),
        new Promise((_, reject) => 
          setTimeout(() => reject(new Error('Connection test timeout after 5s')), 5000)
        )
      ]) as any;
      
      return result.text.trim().toLowerCase().includes('ok');
    } catch (error) {
      console.error('Anthropic connection test failed:', error);
      return false;
    }
  }
}