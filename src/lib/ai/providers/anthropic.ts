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
          setTimeout(() => reject(new Error('Conversion analysis timeout after 15s')), 15000)
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
          setTimeout(() => reject(new Error('UX analysis timeout after 15s')), 15000)
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
          setTimeout(() => reject(new Error('SEO analysis timeout after 15s')), 15000)
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
      // Run all analyses in parallel for efficiency with timeout
      const analysisPromise = Promise.all([
        this.analyzeConversionPsychology(crawlData),
        this.analyzeUX(crawlData),
        this.analyzeTechnicalSEO(crawlData),
      ]);

      const timeoutPromise = new Promise((_, reject) => 
        setTimeout(() => reject(new Error('Comprehensive analysis timeout after 45s')), 45000)
      );

      const [conversionResult, uxResult, seoResult] = await Promise.race([
        analysisPromise,
        timeoutPromise
      ]) as any[];

      // Generate simple overall insights without additional AI call
      const overallScore = Math.round((conversionResult.analysis.overallScore + uxResult.analysis.overallScore + seoResult.analysis.overallScore) / 3);
      
      const overallAnalysis = {
        summary: `# ${crawlData.url} Analysis Summary\n\n**Overall Score: ${overallScore}/10**\n\n**Conversion Score:** ${conversionResult.analysis.overallScore}/10\n**UX Score:** ${uxResult.analysis.overallScore}/10\n**SEO Score:** ${seoResult.analysis.overallScore}/10\n\nDetailed recommendations are available in each analysis section below.`,
        overallScore,
        priorityAreas: this.identifyPriorityAreas(conversionResult.analysis, uxResult.analysis, seoResult.analysis),
      };

      const totalProcessingTime = Date.now() - startTime;

      return {
        conversionPsychology: conversionResult.analysis,
        uxAnalysis: uxResult.analysis,
        technicalSeo: seoResult.analysis,
        overallInsights: overallAnalysis,
        metadata: {
          processingTime: totalProcessingTime,
          modelUsed: 'claude-3-5-sonnet-20241022',
          promptVersion: 'comprehensive-1.1.0-optimized',
          confidence: 0.85, // Slightly lower for comprehensive analysis
        },
      };
    } catch (error) {
      console.error('Comprehensive analysis failed:', error);
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