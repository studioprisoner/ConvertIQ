import { createAnthropic } from '@ai-sdk/anthropic';
import { generateObject, generateText } from 'ai';
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

// Export singleton instance
export const anthropic = new AnthropicAnalysisProvider();