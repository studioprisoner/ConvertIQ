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
      const result = await Promise.race([
        generateObject({
          model: this.model,
          system: CONVERSION_PSYCHOLOGY_SYSTEM_PROMPT,
          prompt: generateConversionAnalysisPrompt(crawlData),
          schema: conversionPsychologyAnalysisSchema,
          temperature: 0.3, // Lower temperature for more consistent analysis
        }),
        new Promise((_, reject) => 
          setTimeout(() => reject(new Error('Conversion analysis timeout after 25s')), 25000)
        )
      ]) as any;

      const processingTime = Date.now() - startTime;

      return {
        analysis: result.object,
        metadata: {
          processingTime,
          modelUsed: 'claude-3-5-sonnet-20241022',
          promptVersion: CONVERSION_ANALYSIS_VERSION,
          confidence: 0.9, // High confidence for structured analysis
        },
      };
    } catch (error) {
      console.error('Conversion psychology analysis failed:', error);
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
          setTimeout(() => reject(new Error('UX analysis timeout after 25s')), 25000)
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
          setTimeout(() => reject(new Error('SEO analysis timeout after 25s')), 25000)
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

    try {
      console.log('🤖 Starting comprehensive analysis with graceful degradation...');
      
      // Run all analyses in parallel with individual error handling
      const analysisResults = await Promise.allSettled([
        this.analyzeConversionPsychology(crawlData).catch(error => {
          console.warn('Conversion analysis failed, using fallback:', error.message);
          return this.createFallbackConversionAnalysis();
        }),
        this.analyzeUX(crawlData).catch(error => {
          console.warn('UX analysis failed, using fallback:', error.message);
          return this.createFallbackUXAnalysis();
        }),
        this.analyzeTechnicalSEO(crawlData).catch(error => {
          console.warn('SEO analysis failed, using fallback:', error.message);
          return this.createFallbackSEOAnalysis();
        }),
      ]);

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
          console.log('🧠 Generating detailed executive summary...');
          overallAnalysis = await this.generateOptimizedOverallInsights(
            crawlData,
            conversionResult?.analysis,
            uxResult?.analysis,
            seoResult?.analysis,
            overallScore,
            failures
          );
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
        keyFindings: ['Analysis temporarily unavailable due to processing timeout'],
        priorityRecommendations: ['Re-scan your website when our servers are less busy for detailed conversion analysis'],
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
        keyFindings: ['Analysis temporarily unavailable due to processing timeout'],
        priorityRecommendations: ['Re-scan your website when our servers are less busy for detailed UX analysis'],
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
        keyFindings: ['Analysis temporarily unavailable due to processing timeout'],
        priorityRecommendations: ['Re-scan your website when our servers are less busy for detailed SEO analysis'],
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
          maxTokens: 1500, // Limit tokens for faster processing
        }),
        new Promise((_, reject) => 
          setTimeout(() => reject(new Error('Executive summary timeout after 20s')), 20000)
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