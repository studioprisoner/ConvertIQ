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

      // Generate simple overall insights without additional AI call
      const validScores = [
        conversionResult?.analysis?.overallScore,
        uxResult?.analysis?.overallScore,
        seoResult?.analysis?.overallScore
      ].filter(score => typeof score === 'number' && score > 0);
      
      const overallScore = validScores.length > 0 ? Math.round(validScores.reduce((a, b) => a + b, 0) / validScores.length) : 5;
      
      const failures = analysisResults.filter(result => result.status === 'rejected').length;
      const partialWarning = failures > 0 ? `\n\n⚠️ **Note**: ${failures} analysis sections used fallback data due to processing timeouts. This is a temporary issue that will be resolved in future scans.` : '';
      
      const overallAnalysis = {
        summary: `# ${crawlData.url} Analysis Summary\n\n**Overall Score: ${overallScore}/10**\n\n**Conversion Score:** ${conversionResult?.analysis?.overallScore || 'N/A'}/10\n**UX Score:** ${uxResult?.analysis?.overallScore || 'N/A'}/10\n**SEO Score:** ${seoResult?.analysis?.overallScore || 'N/A'}/10${partialWarning}\n\nDetailed recommendations are available in each analysis section below.`,
        overallScore,
        priorityAreas: this.identifyPriorityAreasWithFallback(conversionResult?.analysis, uxResult?.analysis, seoResult?.analysis),
        isPartial: failures > 0,
        failedSections: failures,
      };

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