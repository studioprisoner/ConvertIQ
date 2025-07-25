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
      const result = await generateObject({
        model: this.model,
        system: CONVERSION_PSYCHOLOGY_SYSTEM_PROMPT,
        prompt: generateConversionAnalysisPrompt(crawlData),
        schema: conversionPsychologyAnalysisSchema,
        temperature: 0.3, // Lower temperature for more consistent analysis
      });

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
      const result = await generateObject({
        model: this.model,
        system: UX_ANALYSIS_SYSTEM_PROMPT,
        prompt: generateUxAnalysisPrompt(crawlData),
        schema: uxAnalysisSchema,
        temperature: 0.3,
      });

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
      const result = await generateObject({
        model: this.model,
        system: TECHNICAL_SEO_SYSTEM_PROMPT,
        prompt: generateSeoAnalysisPrompt(crawlData),
        schema: technicalSeoAnalysisSchema,
        temperature: 0.3,
      });

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
      // Run all analyses in parallel for efficiency
      const [conversionResult, uxResult, seoResult] = await Promise.all([
        this.analyzeConversionPsychology(crawlData),
        this.analyzeUX(crawlData),
        this.analyzeTechnicalSEO(crawlData),
      ]);

      // Combine results and generate overall insights
      const overallAnalysis = await this.generateOverallInsights(
        crawlData,
        conversionResult.analysis,
        uxResult.analysis,
        seoResult.analysis
      );

      const totalProcessingTime = Date.now() - startTime;

      return {
        conversionPsychology: conversionResult.analysis,
        uxAnalysis: uxResult.analysis,
        technicalSeo: seoResult.analysis,
        overallInsights: overallAnalysis,
        metadata: {
          processingTime: totalProcessingTime,
          modelUsed: 'claude-3-5-sonnet-20241022',
          promptVersion: 'comprehensive-1.0.0',
          confidence: 0.85, // Slightly lower for comprehensive analysis
        },
      };
    } catch (error) {
      console.error('Comprehensive analysis failed:', error);
      throw new Error(`Comprehensive analysis failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  private async generateOverallInsights(
    crawlData: CrawlResult,
    conversionAnalysis: any,
    uxAnalysis: any,
    seoAnalysis: any
  ): Promise<any> {
    const overallPrompt = `
Based on the comprehensive analysis of ${crawlData.url}, provide overall insights and prioritized recommendations in markdown format:

CONVERSION PSYCHOLOGY SCORE: ${conversionAnalysis.overallScore}/10
Key Conversion Issues: ${conversionAnalysis.keyFindings?.join(', ')}

UX/UI SCORE: ${uxAnalysis.overallScore}/10  
Key UX Issues: ${uxAnalysis.keyFindings?.join(', ')}

TECHNICAL SEO SCORE: ${seoAnalysis.overallScore}/10
Key SEO Issues: ${seoAnalysis.keyFindings?.join(', ')}

IMPORTANT: Format your response using this EXACT markdown structure:

# EXECUTIVE SUMMARY - [WEBSITE NAME] WEBSITE ANALYSIS

## Overall Website Score: [X.X]/10
[One sentence describing the overall state and opportunities]

### TOP 5 PRIORITY RECOMMENDATIONS:
1. [Recommendation Title]
- [Specific action item 1]
- [Specific action item 2]
- Estimated Impact: [X-Y% increase in specific metric]

2. [Recommendation Title]
- [Specific action item 1]
- [Specific action item 2]
- Estimated Impact: [X-Y% increase in specific metric]

3. [Recommendation Title]
- [Specific action item 1]
- [Specific action item 2]
- Estimated Impact: [X-Y% increase in specific metric]

4. [Recommendation Title]
- [Specific action item 1]
- [Specific action item 2]
- Estimated Impact: [X-Y% increase in specific metric]

5. [Recommendation Title]
- [Specific action item 1]
- [Specific action item 2]
- Estimated Impact: [X-Y% increase in specific metric]

### QUICK WINS (Implementation within 2 weeks)
• [Quick win 1]
• [Quick win 2]
• [Quick win 3]
• [Quick win 4]
• [Quick win 5]

### LONG-TERM ROADMAP (3-6 months)
1. Phase 1: [Phase Name]
- [Task 1]
- [Task 2]
- [Task 3]

2. Phase 2: [Phase Name]
- [Task 1]
- [Task 2]
- [Task 3]

3. Phase 3: [Phase Name]
- [Task 1]
- [Task 2]
- [Task 3]

### POTENTIAL REVENUE IMPACT
• Conservative Estimate: [X-Y% increase]
• Aggressive Estimate: [X-Y% increase]
• Primary Growth Drivers:
- [Driver 1]
- [Driver 2]
- [Driver 3]

### Implementation Notes
- [Priority guidance]
- [Resource management advice]
- [Measurement recommendations]

[Concluding paragraph about growth potential and highest ROI opportunities]

Focus on actionable insights for small business owners. Use specific percentages, clear action items, and prioritize based on impact vs effort. Be concise but comprehensive.
`;

    const result = await generateText({
      model: this.model,
      system: 'You are ConvertIQ AI providing executive summary insights for comprehensive website analysis. ALWAYS format your response using proper markdown syntax with headers, bullet points, numbered lists, and bold text for emphasis. Your output will be rendered using Tailwind CSS prose classes.',
      prompt: overallPrompt,
      temperature: 0.4,
    });

    return {
      summary: result.text,
      overallScore: Math.round((conversionAnalysis.overallScore + uxAnalysis.overallScore + seoAnalysis.overallScore) / 3),
      priorityAreas: this.identifyPriorityAreas(conversionAnalysis, uxAnalysis, seoAnalysis),
    };
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
      const result = await generateText({
        model: this.model,
        prompt: 'Respond with "OK" if you are working correctly.',
        maxTokens: 10,
      });
      
      return result.text.trim().toLowerCase().includes('ok');
    } catch (error) {
      console.error('Anthropic connection test failed:', error);
      return false;
    }
  }
}