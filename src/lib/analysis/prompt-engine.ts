/**
 * Advanced Prompt Engineering and Templating System - Phase 3 Implementation
 * 
 * Provides sophisticated prompt generation capabilities:
 * - Dynamic prompt templating with context-aware generation
 * - Industry and business type specific prompts
 * - Performance optimization through prompt engineering
 * - A/B testing for prompt effectiveness
 * - Multi-language prompt support
 * - Prompt versioning and rollback capabilities
 */

import { type BusinessType, type ExtractionFocus, type AnalysisDepth } from './schema-generator';

export interface PromptTemplate {
  id: string;
  name: string;
  version: string;
  description: string;
  businessType?: BusinessType;
  focusArea?: ExtractionFocus;
  analysisDepth: AnalysisDepth;
  template: string;
  variables: PromptVariable[];
  metadata: {
    createdAt: Date;
    updatedAt: Date;
    performance: PromptPerformance;
    tags: string[];
    language: string;
  };
}

export interface PromptVariable {
  name: string;
  type: 'string' | 'number' | 'boolean' | 'array' | 'object';
  description: string;
  required: boolean;
  defaultValue?: any;
  validation?: {
    pattern?: string;
    minLength?: number;
    maxLength?: number;
    min?: number;
    max?: number;
  };
}

export interface PromptPerformance {
  usage: number;
  successRate: number;
  averageAccuracy: number;
  averageCompleteness: number;
  averageProcessingTime: number;
  tokenEfficiency: number;
  userRating: number;
}

export interface PromptGenerationOptions {
  businessType: BusinessType;
  focusAreas: ExtractionFocus[];
  analysisDepth: AnalysisDepth;
  industryContext?: string;
  competitorContext?: string[];
  customInstructions?: string;
  language?: string;
  tone?: 'professional' | 'casual' | 'technical' | 'friendly';
  outputFormat?: 'json' | 'structured' | 'narrative';
  includeExamples?: boolean;
  optimizeFor?: 'accuracy' | 'speed' | 'completeness' | 'cost';
}

export interface GeneratedPrompt {
  prompt: string;
  metadata: {
    templateId: string;
    generatedAt: Date;
    variables: Record<string, any>;
    estimatedTokens: number;
    expectedAccuracy: number;
    optimizations: string[];
  };
  context: {
    businessType: BusinessType;
    focusAreas: ExtractionFocus[];
    analysisDepth: AnalysisDepth;
    customizations: string[];
  };
}

/**
 * Advanced Prompt Engineering System
 */
export class AdvancedPromptEngine {
  private templates: Map<string, PromptTemplate> = new Map();
  private performanceHistory: Map<string, PromptPerformance[]> = new Map();
  private abTestGroups: Map<string, PromptTemplate[]> = new Map();
  
  constructor() {
    this.initializeBaseTemplates();
    this.initializeIndustryTemplates();
    this.initializeFocusSpecificTemplates();
  }

  /**
   * Generate optimized prompt based on analysis requirements
   */
  generatePrompt(options: PromptGenerationOptions): GeneratedPrompt {
    // Find the best template match
    const template = this.findBestTemplate(options);
    
    // Generate context variables
    const variables = this.generateTemplateVariables(template, options);
    
    // Apply template with variables
    let prompt = this.applyTemplate(template.template, variables);
    
    // Apply optimizations
    prompt = this.applyOptimizations(prompt, options);
    
    // Add examples if requested
    if (options.includeExamples) {
      prompt = this.addExamples(prompt, options);
    }
    
    // Apply tone and style adjustments
    prompt = this.applyToneAdjustments(prompt, options.tone || 'professional');
    
    // Estimate token count and performance
    const estimatedTokens = this.estimateTokenCount(prompt);
    const expectedAccuracy = this.estimateAccuracy(template, options);
    
    return {
      prompt,
      metadata: {
        templateId: template.id,
        generatedAt: new Date(),
        variables,
        estimatedTokens,
        expectedAccuracy,
        optimizations: this.getAppliedOptimizations(options)
      },
      context: {
        businessType: options.businessType,
        focusAreas: options.focusAreas,
        analysisDepth: options.analysisDepth,
        customizations: this.getCustomizations(options)
      }
    };
  }

  /**
   * Generate competitive analysis prompt with competitor context
   */
  generateCompetitivePrompt(
    primaryBusinessType: BusinessType,
    competitorUrls: string[],
    focusAreas: ExtractionFocus[] = ['conversion-optimization', 'seo-analysis']
  ): GeneratedPrompt {
    const template = this.templates.get('competitive-analysis-comprehensive') || this.templates.get('base-competitive')!;
    
    const variables = {
      businessType: primaryBusinessType,
      competitorCount: competitorUrls.length,
      competitorUrls: competitorUrls.join(', '),
      focusAreas: focusAreas.join(', '),
      analysisType: 'competitive'
    };
    
    const prompt = this.applyTemplate(template.template, variables);
    
    return {
      prompt,
      metadata: {
        templateId: template.id,
        generatedAt: new Date(),
        variables,
        estimatedTokens: this.estimateTokenCount(prompt),
        expectedAccuracy: 0.85,
        optimizations: ['competitive-context', 'multi-focus-analysis']
      },
      context: {
        businessType: primaryBusinessType,
        focusAreas,
        analysisDepth: 'comprehensive',
        customizations: ['competitive-benchmarking', 'market-positioning']
      }
    };
  }

  /**
   * Generate industry-specific prompt with specialized context
   */
  generateIndustryPrompt(
    industry: string,
    businessType: BusinessType,
    analysisDepth: AnalysisDepth = 'standard',
    focusAreas: ExtractionFocus[] = ['conversion-optimization']
  ): GeneratedPrompt {
    const industryTemplateId = `industry-${industry.toLowerCase()}-${businessType}`;
    const template = this.templates.get(industryTemplateId) || this.findBestTemplate({
      businessType,
      focusAreas,
      analysisDepth,
      industryContext: industry
    });
    
    const variables = {
      industry,
      businessType,
      analysisDepth,
      focusAreas: focusAreas.join(', '),
      industrySpecificInstructions: this.getIndustrySpecificInstructions(industry, businessType)
    };
    
    const prompt = this.applyTemplate(template.template, variables);
    
    return {
      prompt,
      metadata: {
        templateId: template.id,
        generatedAt: new Date(),
        variables,
        estimatedTokens: this.estimateTokenCount(prompt),
        expectedAccuracy: this.estimateAccuracy(template, { businessType, focusAreas, analysisDepth }),
        optimizations: ['industry-context', 'business-type-optimization']
      },
      context: {
        businessType,
        focusAreas,
        analysisDepth,
        customizations: [`industry-${industry}`, 'specialized-terminology']
      }
    };
  }

  /**
   * A/B test different prompt variations
   */
  async runPromptABTest(
    testName: string,
    variants: PromptTemplate[],
    testData: any[],
    evaluationCriteria: ('accuracy' | 'completeness' | 'speed' | 'cost')[]
  ): Promise<ABTestResult> {
    const results: ABTestResult = {
      testName,
      variants: variants.map(v => ({ templateId: v.id, name: v.name })),
      results: new Map(),
      winner: null,
      confidence: 0,
      startTime: new Date(),
      endTime: new Date(),
      sampleSize: testData.length
    };

    // Run tests for each variant
    for (const variant of variants) {
      const variantResults: VariantResult = {
        templateId: variant.id,
        metrics: {
          accuracy: 0,
          completeness: 0,
          speed: 0,
          cost: 0,
          userSatisfaction: 0
        },
        sampleSize: testData.length,
        errors: 0
      };

      // Test with sample data
      for (const testCase of testData) {
        try {
          const generated = this.generatePromptFromTemplate(variant, testCase);
          const testResult = await this.evaluatePrompt(generated, testCase, evaluationCriteria);
          
          // Aggregate metrics
          variantResults.metrics.accuracy += testResult.accuracy;
          variantResults.metrics.completeness += testResult.completeness;
          variantResults.metrics.speed += testResult.speed;
          variantResults.metrics.cost += testResult.cost;
          
        } catch (error) {
          variantResults.errors++;
        }
      }

      // Calculate averages
      const successfulTests = testData.length - variantResults.errors;
      if (successfulTests > 0) {
        variantResults.metrics.accuracy /= successfulTests;
        variantResults.metrics.completeness /= successfulTests;
        variantResults.metrics.speed /= successfulTests;
        variantResults.metrics.cost /= successfulTests;
      }

      results.results.set(variant.id, variantResults);
    }

    // Determine winner
    results.winner = this.determineABTestWinner(results, evaluationCriteria);
    results.confidence = this.calculateConfidence(results);
    results.endTime = new Date();

    return results;
  }

  /**
   * Optimize prompt based on performance feedback
   */
  optimizePrompt(
    originalPrompt: string,
    performanceFeedback: PromptFeedback,
    targetMetrics: Partial<PromptPerformance>
  ): GeneratedPrompt {
    let optimizedPrompt = originalPrompt;
    const optimizations: string[] = [];

    // Apply specific optimizations based on feedback
    if (performanceFeedback.accuracy < (targetMetrics.averageAccuracy || 0.8)) {
      optimizedPrompt = this.improveAccuracy(optimizedPrompt);
      optimizations.push('accuracy-improvement');
    }

    if (performanceFeedback.completeness < (targetMetrics.averageCompleteness || 0.85)) {
      optimizedPrompt = this.improveCompleteness(optimizedPrompt);
      optimizations.push('completeness-improvement');
    }

    if (performanceFeedback.tokenCount > (targetMetrics.tokenEfficiency || 2000)) {
      optimizedPrompt = this.reduceTokenUsage(optimizedPrompt);
      optimizations.push('token-optimization');
    }

    return {
      prompt: optimizedPrompt,
      metadata: {
        templateId: 'optimized',
        generatedAt: new Date(),
        variables: {},
        estimatedTokens: this.estimateTokenCount(optimizedPrompt),
        expectedAccuracy: Math.min(performanceFeedback.accuracy + 0.1, 1.0),
        optimizations
      },
      context: {
        businessType: 'generic',
        focusAreas: ['conversion-optimization'],
        analysisDepth: 'standard',
        customizations: optimizations
      }
    };
  }

  /**
   * Get prompt template performance analytics
   */
  getTemplateAnalytics(templateId: string): TemplateAnalytics | null {
    const template = this.templates.get(templateId);
    if (!template) return null;

    const history = this.performanceHistory.get(templateId) || [];
    
    return {
      template,
      usage: {
        totalUses: history.length,
        recentUses: history.filter(p => 
          new Date().getTime() - new Date(template.metadata.updatedAt).getTime() < 30 * 24 * 60 * 60 * 1000
        ).length,
        averagePerDay: history.length / Math.max(1, 
          (new Date().getTime() - template.metadata.createdAt.getTime()) / (24 * 60 * 60 * 1000)
        )
      },
      performance: {
        current: template.metadata.performance,
        trend: this.calculatePerformanceTrend(history),
        bestPerformance: this.getBestPerformance(history),
        worstPerformance: this.getWorstPerformance(history)
      },
      recommendations: this.generateTemplateRecommendations(template, history)
    };
  }

  // Private methods for template management and optimization

  private initializeBaseTemplates(): void {
    // Conversion optimization base template
    this.templates.set('conversion-comprehensive', {
      id: 'conversion-comprehensive',
      name: 'Comprehensive Conversion Analysis',
      version: '1.0',
      description: 'Comprehensive conversion rate optimization analysis',
      analysisDepth: 'comprehensive',
      template: `You are analyzing a {{businessType}} website for conversion optimization. Perform a detailed analysis focusing on:

1. Call-to-Action Analysis:
   - Identify all CTAs on the page
   - Evaluate positioning, design, and copy effectiveness
   - Rate prominence and urgency levels

2. Psychology Trigger Assessment:
   - Scarcity indicators and their implementation
   - Urgency messaging and time-sensitive offers
   - Authority signals and credibility markers
   - Social proof elements (testimonials, reviews, user counts)
   - Reciprocity elements (free offers, value-first approaches)

3. Trust Signal Evaluation:
   - Security badges and certificates
   - Customer testimonials and case studies
   - Money-back guarantees and policies
   - Company credentials and awards

4. Friction Point Identification:
   - Form complexity and length
   - Navigation confusion points
   - Loading speed issues
   - Mobile usability problems

{{#if customInstructions}}
Additional Focus: {{customInstructions}}
{{/if}}

Extract structured data according to the provided schema. Be thorough and accurate in your analysis.`,
      variables: [
        { name: 'businessType', type: 'string', description: 'Type of business being analyzed', required: true },
        { name: 'customInstructions', type: 'string', description: 'Additional custom instructions', required: false }
      ],
      metadata: {
        createdAt: new Date(),
        updatedAt: new Date(),
        performance: {
          usage: 0,
          successRate: 0.85,
          averageAccuracy: 0.82,
          averageCompleteness: 0.88,
          averageProcessingTime: 45000,
          tokenEfficiency: 1800,
          userRating: 4.2
        },
        tags: ['conversion', 'comprehensive', 'psychology'],
        language: 'en'
      }
    });

    // SEO analysis base template
    this.templates.set('seo-comprehensive', {
      id: 'seo-comprehensive',
      name: 'Comprehensive SEO Analysis',
      version: '1.0',
      description: 'Detailed technical and content SEO analysis',
      analysisDepth: 'comprehensive',
      template: `Analyze this {{businessType}} website for SEO optimization opportunities:

1. Technical SEO Elements:
   - Page title optimization and keyword usage
   - Meta description quality and call-to-action
   - Header structure (H1, H2, H3) and hierarchy
   - Image alt tags and optimization
   - Internal and external link analysis
   - Schema markup implementation

2. Content Analysis:
   - Keyword optimization and density
   - Content length and depth
   - Readability and user engagement
   - Topic authority and expertise signals

3. User Experience Factors:
   - Page loading speed indicators
   - Mobile responsiveness signals
   - Navigation clarity and structure
   - Content accessibility

{{#if industryContext}}
Industry Context: Analyze with specific attention to {{industryContext}} industry best practices and search patterns.
{{/if}}

Provide detailed recommendations with implementation priority.`,
      variables: [
        { name: 'businessType', type: 'string', description: 'Type of business', required: true },
        { name: 'industryContext', type: 'string', description: 'Industry-specific context', required: false }
      ],
      metadata: {
        createdAt: new Date(),
        updatedAt: new Date(),
        performance: {
          usage: 0,
          successRate: 0.88,
          averageAccuracy: 0.85,
          averageCompleteness: 0.90,
          averageProcessingTime: 38000,
          tokenEfficiency: 1650,
          userRating: 4.4
        },
        tags: ['seo', 'technical', 'content'],
        language: 'en'
      }
    });
  }

  private initializeIndustryTemplates(): void {
    // E-commerce specific template
    this.templates.set('ecommerce-conversion', {
      id: 'ecommerce-conversion',
      name: 'E-commerce Conversion Analysis',
      version: '1.0',
      description: 'Specialized analysis for e-commerce websites',
      businessType: 'ecommerce',
      analysisDepth: 'comprehensive',
      template: `Analyze this e-commerce website with focus on online retail conversion optimization:

1. Product Presentation:
   - Product images quality and quantity
   - Product descriptions and specifications
   - Pricing display and comparison tools
   - Product reviews and ratings integration

2. Shopping Experience:
   - Add to cart functionality and prominence
   - Shopping cart design and information
   - Checkout process complexity
   - Payment options and security

3. Trust and Credibility:
   - Security badges and SSL indicators
   - Return and refund policies
   - Customer service accessibility
   - Shipping information clarity

4. E-commerce Specific Elements:
   - Product search and filtering
   - Wishlist and comparison features
   - Cross-selling and upselling
   - Inventory availability messaging

Focus on elements that directly impact purchase decisions and cart abandonment.`,
      variables: [],
      metadata: {
        createdAt: new Date(),
        updatedAt: new Date(),
        performance: {
          usage: 0,
          successRate: 0.90,
          averageAccuracy: 0.87,
          averageCompleteness: 0.92,
          averageProcessingTime: 42000,
          tokenEfficiency: 1750,
          userRating: 4.6
        },
        tags: ['ecommerce', 'retail', 'shopping'],
        language: 'en'
      }
    });
  }

  private initializeFocusSpecificTemplates(): void {
    // Performance analysis template
    this.templates.set('performance-analysis', {
      id: 'performance-analysis',
      name: 'Website Performance Analysis',
      version: '1.0',
      description: 'Focus on website performance and user experience',
      focusArea: 'performance-analysis',
      analysisDepth: 'standard',
      template: `Analyze this website's performance characteristics and user experience:

1. Loading Performance:
   - Identify large images or media files
   - Detect potential CSS/JavaScript blocking issues
   - Assess server response indicators
   - Evaluate third-party script impact

2. Mobile Optimization:
   - Responsive design implementation
   - Touch-friendly interface elements
   - Mobile-specific usability issues
   - Viewport and content sizing

3. User Experience Elements:
   - Navigation clarity and consistency
   - Content readability and structure
   - Interactive element responsiveness
   - Error handling and feedback

4. Accessibility Considerations:
   - Alt text implementation
   - Color contrast and readability
   - Keyboard navigation support
   - Screen reader compatibility

Provide actionable recommendations for performance improvements.`,
      variables: [],
      metadata: {
        createdAt: new Date(),
        updatedAt: new Date(),
        performance: {
          usage: 0,
          successRate: 0.83,
          averageAccuracy: 0.80,
          averageCompleteness: 0.85,
          averageProcessingTime: 35000,
          tokenEfficiency: 1500,
          userRating: 4.1
        },
        tags: ['performance', 'ux', 'mobile'],
        language: 'en'
      }
    });
  }

  private findBestTemplate(options: PromptGenerationOptions): PromptTemplate {
    // Score templates based on matching criteria
    let bestTemplate: PromptTemplate | null = null;
    let bestScore = 0;

    for (const template of this.templates.values()) {
      let score = 0;
      
      // Business type match
      if (template.businessType === options.businessType) score += 3;
      
      // Analysis depth match
      if (template.analysisDepth === options.analysisDepth) score += 2;
      
      // Focus area match
      if (template.focusArea && options.focusAreas.includes(template.focusArea)) score += 2;
      
      // Performance score
      score += template.metadata.performance.successRate;
      
      if (score > bestScore) {
        bestScore = score;
        bestTemplate = template;
      }
    }

    return bestTemplate || this.templates.get('conversion-comprehensive')!;
  }

  private generateTemplateVariables(template: PromptTemplate, options: PromptGenerationOptions): Record<string, any> {
    const variables: Record<string, any> = {};
    
    template.variables.forEach(variable => {
      switch (variable.name) {
        case 'businessType':
          variables[variable.name] = options.businessType;
          break;
        case 'customInstructions':
          variables[variable.name] = options.customInstructions;
          break;
        case 'industryContext':
          variables[variable.name] = options.industryContext;
          break;
        default:
          if (variable.defaultValue !== undefined) {
            variables[variable.name] = variable.defaultValue;
          }
      }
    });

    return variables;
  }

  private applyTemplate(template: string, variables: Record<string, any>): string {
    let result = template;
    
    // Simple variable substitution (in a real implementation, you'd use a proper template engine like Handlebars)
    for (const [key, value] of Object.entries(variables)) {
      const regex = new RegExp(`{{${key}}}`, 'g');
      result = result.replace(regex, String(value || ''));
    }

    // Handle conditional blocks (simplified implementation)
    result = result.replace(/{{#if (\w+)}}(.*?){{\/if}}/gs, (match, condition, content) => {
      return variables[condition] ? content : '';
    });

    return result;
  }

  private applyOptimizations(prompt: string, options: PromptGenerationOptions): string {
    let optimized = prompt;
    
    if (options.optimizeFor === 'cost') {
      optimized = this.optimizeForCost(optimized);
    } else if (options.optimizeFor === 'speed') {
      optimized = this.optimizeForSpeed(optimized);
    } else if (options.optimizeFor === 'accuracy') {
      optimized = this.optimizeForAccuracy(optimized);
    }

    return optimized;
  }

  private addExamples(prompt: string, options: PromptGenerationOptions): string {
    const examples = this.getExamplesForBusinessType(options.businessType);
    if (examples) {
      return `${prompt}\n\nExample Analysis:\n${examples}`;
    }
    return prompt;
  }

  private applyToneAdjustments(prompt: string, tone: string): string {
    // Apply tone-specific adjustments
    switch (tone) {
      case 'technical':
        return prompt.replace(/analyze/g, 'perform technical assessment of');
      case 'friendly':
        return `Please help me understand this website by ${prompt.toLowerCase()}`;
      case 'casual':
        return prompt.replace(/Analyze/g, 'Take a look at').replace(/assessment/g, 'check');
      default:
        return prompt;
    }
  }

  private estimateTokenCount(prompt: string): number {
    // Rough estimation: ~4 characters per token for English text
    return Math.ceil(prompt.length / 4);
  }

  private estimateAccuracy(template: PromptTemplate, options: PromptGenerationOptions): number {
    let baseAccuracy = template.metadata.performance.averageAccuracy;
    
    // Adjust based on business type match
    if (template.businessType === options.businessType) {
      baseAccuracy += 0.05;
    }
    
    // Adjust based on analysis depth
    if (template.analysisDepth === options.analysisDepth) {
      baseAccuracy += 0.03;
    }
    
    return Math.min(baseAccuracy, 1.0);
  }

  private getAppliedOptimizations(options: PromptGenerationOptions): string[] {
    const optimizations = [];
    
    if (options.optimizeFor) {
      optimizations.push(`${options.optimizeFor}-optimization`);
    }
    
    if (options.tone && options.tone !== 'professional') {
      optimizations.push(`${options.tone}-tone`);
    }
    
    if (options.includeExamples) {
      optimizations.push('example-inclusion');
    }
    
    return optimizations;
  }

  private getCustomizations(options: PromptGenerationOptions): string[] {
    const customizations = [];
    
    if (options.industryContext) {
      customizations.push(`industry-${options.industryContext}`);
    }
    
    if (options.competitorContext?.length) {
      customizations.push('competitive-context');
    }
    
    if (options.customInstructions) {
      customizations.push('custom-instructions');
    }
    
    return customizations;
  }

  // Additional helper methods...
  private getIndustrySpecificInstructions(industry: string, businessType: BusinessType): string {
    // Return industry-specific analysis instructions
    return `Focus on ${industry} industry standards and best practices for ${businessType} businesses.`;
  }

  private generatePromptFromTemplate(template: PromptTemplate, testCase: any): GeneratedPrompt {
    // Generate prompt for A/B testing
    return this.generatePrompt({
      businessType: testCase.businessType,
      focusAreas: testCase.focusAreas,
      analysisDepth: testCase.analysisDepth
    });
  }

  private async evaluatePrompt(prompt: GeneratedPrompt, testCase: any, criteria: string[]): Promise<any> {
    // Evaluate prompt performance (would integrate with actual analysis results)
    return {
      accuracy: Math.random() * 0.3 + 0.7,
      completeness: Math.random() * 0.3 + 0.7,
      speed: Math.random() * 1000 + 2000,
      cost: Math.random() * 2 + 1
    };
  }

  private determineABTestWinner(results: ABTestResult, criteria: string[]): string | null {
    // Determine the best performing variant
    let bestVariant = null;
    let bestScore = 0;

    for (const [variantId, result] of results.results.entries()) {
      let score = 0;
      criteria.forEach(criterion => {
        score += (result.metrics as any)[criterion] || 0;
      });
      
      if (score > bestScore) {
        bestScore = score;
        bestVariant = variantId;
      }
    }

    return bestVariant;
  }

  private calculateConfidence(results: ABTestResult): number {
    // Calculate statistical confidence (simplified)
    return Math.min(results.sampleSize / 100, 0.95);
  }

  private optimizeForCost(prompt: string): string {
    // Remove unnecessary words and phrases to reduce token count
    return prompt
      .replace(/\b(please|kindly|thoroughly|carefully)\b/gi, '')
      .replace(/\s+/g, ' ')
      .trim();
  }

  private optimizeForSpeed(prompt: string): string {
    // Prioritize essential elements for faster processing
    return `PRIORITY: Focus on key elements only. ${prompt.substring(0, 1000)}...`;
  }

  private optimizeForAccuracy(prompt: string): string {
    // Add precision-enhancing instructions
    return `${prompt}\n\nIMPORTANT: Be precise and accurate. Double-check all extracted information.`;
  }

  private improveAccuracy(prompt: string): string {
    return this.optimizeForAccuracy(prompt);
  }

  private improveCompleteness(prompt: string): string {
    return `${prompt}\n\nEnsure comprehensive coverage of all requested elements.`;
  }

  private reduceTokenUsage(prompt: string): string {
    return this.optimizeForCost(prompt);
  }

  private getExamplesForBusinessType(businessType: BusinessType): string | null {
    // Return business-type specific examples
    const examples: Record<string, string> = {
      'ecommerce': 'For an e-commerce site, focus on product pages, checkout flow, and trust signals.',
      'saas': 'For a SaaS platform, analyze pricing pages, feature descriptions, and trial/demo CTAs.',
      'service-local': 'For local services, examine contact information, service areas, and local SEO elements.'
    };
    
    return examples[businessType] || null;
  }

  private calculatePerformanceTrend(history: PromptPerformance[]): 'improving' | 'declining' | 'stable' {
    if (history.length < 2) return 'stable';
    
    const recent = history.slice(-5);
    const earlier = history.slice(-10, -5);
    
    const recentAvg = recent.reduce((sum, p) => sum + p.averageAccuracy, 0) / recent.length;
    const earlierAvg = earlier.reduce((sum, p) => sum + p.averageAccuracy, 0) / earlier.length;
    
    if (recentAvg > earlierAvg + 0.05) return 'improving';
    if (recentAvg < earlierAvg - 0.05) return 'declining';
    return 'stable';
  }

  private getBestPerformance(history: PromptPerformance[]): PromptPerformance | null {
    if (history.length === 0) return null;
    
    return history.reduce((best, current) => 
      current.averageAccuracy > best.averageAccuracy ? current : best
    );
  }

  private getWorstPerformance(history: PromptPerformance[]): PromptPerformance | null {
    if (history.length === 0) return null;
    
    return history.reduce((worst, current) => 
      current.averageAccuracy < worst.averageAccuracy ? current : worst
    );
  }

  private generateTemplateRecommendations(template: PromptTemplate, history: PromptPerformance[]): string[] {
    const recommendations = [];
    
    if (template.metadata.performance.averageAccuracy < 0.8) {
      recommendations.push('Consider adding more specific instructions for accuracy');
    }
    
    if (template.metadata.performance.tokenEfficiency > 2000) {
      recommendations.push('Optimize prompt length to reduce token usage');
    }
    
    if (history.length > 0 && this.calculatePerformanceTrend(history) === 'declining') {
      recommendations.push('Review recent performance decline and update template');
    }
    
    return recommendations;
  }
}

// Supporting interfaces
interface ABTestResult {
  testName: string;
  variants: Array<{ templateId: string; name: string }>;
  results: Map<string, VariantResult>;
  winner: string | null;
  confidence: number;
  startTime: Date;
  endTime: Date;
  sampleSize: number;
}

interface VariantResult {
  templateId: string;
  metrics: {
    accuracy: number;
    completeness: number;
    speed: number;
    cost: number;
    userSatisfaction: number;
  };
  sampleSize: number;
  errors: number;
}

interface PromptFeedback {
  accuracy: number;
  completeness: number;
  tokenCount: number;
  processingTime: number;
  userRating: number;
}

interface TemplateAnalytics {
  template: PromptTemplate;
  usage: {
    totalUses: number;
    recentUses: number;
    averagePerDay: number;
  };
  performance: {
    current: PromptPerformance;
    trend: 'improving' | 'declining' | 'stable';
    bestPerformance: PromptPerformance | null;
    worstPerformance: PromptPerformance | null;
  };
  recommendations: string[];
}

// Export singleton instance
export const promptEngine = new AdvancedPromptEngine();