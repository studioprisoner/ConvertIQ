import { v4 as uuidv4 } from 'uuid';
import type { CrawlResult } from '../crawler/types';
import type { AIAnalysisResult, AnalysisType } from './types';
import { AnthropicAnalysisProvider } from './providers/anthropic';
import { withSentryTracing, addBreadcrumb, captureErrorWithContext } from '../sentry-utils';

export class AIAnalysisEngine {
  private provider: AnthropicAnalysisProvider;

  constructor() {
    this.provider = new AnthropicAnalysisProvider();
  }

  /**
   * Perform AI analysis on crawl data (supports both v1 and enhanced v2 data)
   */
  async analyze(
    crawlData: CrawlResult,
    websiteId: string,
    analysisType: AnalysisType = 'comprehensive',
    extractedData?: any // Enhanced extraction data for v2 compatibility
  ): Promise<AIAnalysisResult> {
    return withSentryTracing(
      this._performAnalysis.bind(this),
      'ai.analysis',
      `Analyzing website ${websiteId} with type ${analysisType}`
    )(crawlData, websiteId, analysisType, extractedData);
  }

  private async _performAnalysis(
    crawlData: CrawlResult,
    websiteId: string,
    analysisType: AnalysisType = 'comprehensive',
    extractedData?: any // Enhanced extraction data for v2 compatibility
  ): Promise<AIAnalysisResult> {
    const analysisId = uuidv4();
    const timestamp = new Date().toISOString();

    try {
      addBreadcrumb(
        `AI analysis started for ${crawlData.url}`,
        'ai.analysis.start',
        { websiteId, analysisType, url: crawlData.url }
      );

      // Debug crawl data structure
      console.log('🔍 Debug crawl data keys:', Object.keys(crawlData));
      console.log('🔍 Debug htmlAnalysis exists:', !!crawlData.htmlAnalysis);
      if (crawlData.htmlAnalysis) {
        console.log('🔍 Debug htmlAnalysis keys:', Object.keys(crawlData.htmlAnalysis));
        console.log('🔍 Debug meta exists:', !!crawlData.htmlAnalysis.meta);
      }

      // Validate input data
      this.validateCrawlData(crawlData);

      // Create enhanced input if v2 extraction data is available
      const analysisInput = extractedData ? this.createEnhancedCrawlInput(crawlData, extractedData) : crawlData;
      const isEnhancedAnalysis = !!extractedData;

      console.log(`📊 Analysis mode: ${isEnhancedAnalysis ? 'Enhanced (v2)' : 'Standard (v1)'}`);
      if (isEnhancedAnalysis) {
        console.log(`📈 Page type: ${extractedData.structuredData?.pageType}, Quality: ${extractedData.extractionMetrics?.dataQualityScore}`);
      }

      const analysisResult: Partial<AIAnalysisResult> = {
        id: analysisId,
        websiteId,
        analysisType,
        timestamp,
        recommendations: [],
        overallScore: 0,
        summary: '',
        keyInsights: [],
        ethicalCompliance: {
          noDarkPatterns: true,
          transparentRecommendations: true,
          userFocused: true,
          notes: [],
        },
      };

      // Perform analysis based on type using enhanced input when available
      switch (analysisType) {
        case 'conversion_psychology':
          const conversionResult = await this.provider.analyzeConversionPsychology(analysisInput);
          analysisResult.conversionPsychology = conversionResult.analysis;
          analysisResult.metadata = conversionResult.metadata;
          analysisResult.overallScore = conversionResult.analysis.overallScore;
          analysisResult.summary = isEnhancedAnalysis 
            ? this.generateEnhancedSummary(conversionResult.analysis, 'conversion', extractedData)
            : this.generateSummary(conversionResult.analysis, 'conversion');
          analysisResult.keyInsights = conversionResult.analysis.keyFindings || [];
          analysisResult.recommendations = isEnhancedAnalysis
            ? this.generateEnhancedRecommendations(conversionResult.analysis, 'conversion', extractedData)
            : this.generateRecommendations(conversionResult.analysis, 'conversion');
          break;

        case 'ux_ui_analysis':
          const uxResult = await this.provider.analyzeUX(analysisInput);
          analysisResult.uxAnalysis = uxResult.analysis;
          analysisResult.metadata = uxResult.metadata;
          analysisResult.overallScore = uxResult.analysis.overallScore;
          analysisResult.summary = isEnhancedAnalysis
            ? this.generateEnhancedSummary(uxResult.analysis, 'ux', extractedData)
            : this.generateSummary(uxResult.analysis, 'ux');
          analysisResult.keyInsights = uxResult.analysis.keyFindings || [];
          analysisResult.recommendations = isEnhancedAnalysis
            ? this.generateEnhancedRecommendations(uxResult.analysis, 'ux', extractedData)
            : this.generateRecommendations(uxResult.analysis, 'ux');
          break;

        case 'technical_seo':
          const seoResult = await this.provider.analyzeTechnicalSEO(analysisInput);
          analysisResult.technicalSeo = seoResult.analysis;
          analysisResult.metadata = seoResult.metadata;
          analysisResult.overallScore = seoResult.analysis.overallScore;
          analysisResult.summary = isEnhancedAnalysis
            ? this.generateEnhancedSummary(seoResult.analysis, 'seo', extractedData)
            : this.generateSummary(seoResult.analysis, 'seo');
          analysisResult.keyInsights = seoResult.analysis.keyFindings || [];
          analysisResult.recommendations = isEnhancedAnalysis
            ? this.generateEnhancedRecommendations(seoResult.analysis, 'seo', extractedData)
            : this.generateRecommendations(seoResult.analysis, 'seo');
          break;

        case 'comprehensive':
          // Additional validation for comprehensive analysis
          if (!analysisInput.htmlAnalysis || !analysisInput.htmlAnalysis.meta) {
            throw new Error('Comprehensive analysis requires valid htmlAnalysis with meta tags');
          }
          console.log('🔍 Comprehensive analysis input validation passed');
          const comprehensiveResult = await this.provider.generateComprehensiveAnalysis(analysisInput);
          analysisResult.conversionPsychology = comprehensiveResult.conversionPsychology;
          analysisResult.uxAnalysis = comprehensiveResult.uxAnalysis;
          analysisResult.technicalSeo = comprehensiveResult.technicalSeo;
          analysisResult.metadata = comprehensiveResult.metadata;
          analysisResult.overallScore = comprehensiveResult.overallInsights.overallScore;
          analysisResult.summary = comprehensiveResult.overallInsights.summary;
          analysisResult.keyInsights = this.combineKeyInsights([
            comprehensiveResult.conversionPsychology,
            comprehensiveResult.uxAnalysis,
            comprehensiveResult.technicalSeo,
          ]);
          analysisResult.recommendations = isEnhancedAnalysis
            ? this.combineEnhancedRecommendations([
                comprehensiveResult.conversionPsychology,
                comprehensiveResult.uxAnalysis,
                comprehensiveResult.technicalSeo,
              ], extractedData)
            : this.combineRecommendations([
                comprehensiveResult.conversionPsychology,
                comprehensiveResult.uxAnalysis,
                comprehensiveResult.technicalSeo,
              ]);
          break;

        default:
          throw new Error(`Unsupported analysis type: ${analysisType}`);
      }

      // Validate ethical compliance
      this.validateEthicalCompliance(analysisResult);

      // Sort recommendations by priority
      analysisResult.recommendations = this.prioritizeRecommendations(analysisResult.recommendations || []);

      addBreadcrumb(
        `AI analysis completed for ${crawlData.url}`,
        'ai.analysis.success',
        { 
          websiteId, 
          analysisType, 
          score: analysisResult.overallScore,
          recommendationCount: analysisResult.recommendations?.length || 0
        }
      );

      return analysisResult as AIAnalysisResult;
    } catch (error) {
      console.error('AI Analysis failed:', error);
      console.error('Error details:', {
        message: error instanceof Error ? error.message : 'Unknown error',
        stack: error instanceof Error ? error.stack : undefined,
        type: typeof error,
        stringified: JSON.stringify(error),
        keys: error && typeof error === 'object' ? Object.keys(error) : [],
      });
      
      captureErrorWithContext(
        error instanceof Error ? error : new Error(String(error)),
        {
          component: 'ai-analysis-engine',
          action: 'analyze',
          url: crawlData.url,
          additionalData: { 
            websiteId, 
            analysisType,
            errorType: typeof error,
            errorStringified: JSON.stringify(error),
          }
        }
      );
      
      throw new Error(`Analysis failed for ${crawlData.url}: ${error instanceof Error ? error.message : JSON.stringify(error)}`);
    }
  }

  /**
   * Test AI provider connection
   */
  async testConnection(): Promise<boolean> {
    return this.provider.testConnection();
  }

  private validateCrawlData(crawlData: CrawlResult): void {
    if (!crawlData.url) {
      throw new Error('Crawl data missing URL');
    }

    if (!crawlData.htmlAnalysis) {
      throw new Error('Crawl data missing HTML analysis');
    }

    if (!crawlData.htmlAnalysis.meta) {
      throw new Error('Crawl data missing HTML analysis meta tags');
    }

    if (crawlData.statusCode >= 400) {
      throw new Error(`Cannot analyze website with status code ${crawlData.statusCode}`);
    }

    console.log('✅ Crawl data validation passed for:', crawlData.url);
  }

  private validateEthicalCompliance(analysisResult: Partial<AIAnalysisResult>): void {
    // Check for potentially manipulative recommendations
    const recommendations = analysisResult.recommendations || [];
    
    const manipulativePatterns = [
      'fake scarcity',
      'false urgency', 
      'hidden costs',
      'dark pattern',
      'misleading',
      'deceptive',
      'trick users',
      'manipulate',
    ];

    const ethicalIssues: string[] = [];

    recommendations.forEach(rec => {
      const content = (rec.title + ' ' + rec.description + ' ' + rec.implementation.steps.join(' ')).toLowerCase();
      
      manipulativePatterns.forEach(pattern => {
        if (content.includes(pattern)) {
          ethicalIssues.push(`Potentially manipulative recommendation detected: ${pattern}`);
        }
      });
    });

    if (ethicalIssues.length > 0) {
      analysisResult.ethicalCompliance = {
        noDarkPatterns: false,
        transparentRecommendations: false,
        userFocused: true,
        notes: ethicalIssues,
      };
    }
  }

  private generateSummary(analysis: unknown, type: string): string {
    switch (type) {
      case 'conversion':
        return `Conversion psychology analysis reveals an overall score of ${analysis.overallScore}/10. ${analysis.keyFindings?.length || 0} key optimization opportunities identified.`;
      case 'ux':
        return `UX analysis shows an overall score of ${analysis.overallScore}/10. Mobile optimization and user experience improvements recommended.`;
      case 'seo':
        return `Technical SEO analysis indicates a score of ${analysis.overallScore}/10. Focus on meta tags, schema markup, and image optimization.`;
      default:
        return `Analysis completed with overall score of ${analysis.overallScore}/10.`;
    }
  }

  private generateRecommendations(analysis: Record<string, unknown>, category: string): Array<Record<string, unknown>> {
    const recommendations: any[] = [];
    const categoryMap = {
      conversion: 'conversion',
      ux: 'ux',
      seo: 'seo',
    };

    // Extract priority recommendations from analysis
    if (analysis.priorityRecommendations) {
      analysis.priorityRecommendations.forEach((rec: string, index: number) => {
        recommendations.push({
          id: uuidv4(),
          title: `${category.toUpperCase()} Optimization ${index + 1}`,
          description: rec,
          category: categoryMap[category as keyof typeof categoryMap] || 'technical',
          impact: {
            score: 8, // Default high impact
            reasoning: 'Priority recommendation from AI analysis',
            category: 'high',
          },
          effort: {
            score: 4, // Default low-medium effort
            reasoning: 'Standard implementation for small business',
            category: 'medium',
          },
          implementation: {
            steps: [
              'Review current implementation',
              'Apply recommended changes',
              'Test and validate improvements',
              'Monitor results',
            ],
            codeSnippets: [],
            resources: [],
          },
          whyItMatters: `This ${category} improvement directly impacts user experience and conversion rates.`,
          priority: 'high' as const,
        });
      });
    }

    return recommendations;
  }

  private combineKeyInsights(analyses: Array<Record<string, unknown>>): string[] {
    const insights: string[] = [];
    
    analyses.forEach(analysis => {
      if (analysis?.keyFindings) {
        insights.push(...analysis.keyFindings);
      }
    });

    // Remove duplicates and limit to top insights
    return Array.from(new Set(insights)).slice(0, 10);
  }

  private combineRecommendations(analyses: Array<Record<string, unknown>>): Array<Record<string, unknown>> {
    const recommendations: any[] = [];
    
    analyses.forEach((analysis, index) => {
      const categoryNames = ['conversion', 'ux', 'seo'];
      const category = categoryNames[index] || 'technical';
      
      if (analysis?.priorityRecommendations) {
        recommendations.push(...this.generateRecommendations(analysis, category));
      }
    });

    return this.prioritizeRecommendations(recommendations);
  }

  private prioritizeRecommendations(recommendations: Array<Record<string, unknown>>): Array<Record<string, unknown>> {
    return recommendations.sort((a, b) => {
      // Sort by impact score descending, then by effort score ascending
      const impactDiff = b.impact.score - a.impact.score;
      if (impactDiff !== 0) return impactDiff;
      
      return a.effort.score - b.effort.score;
    });
  }

  // Enhanced methods for v2 compatibility
  private createEnhancedCrawlInput(crawlData: CrawlResult, extractedData: any): any {
    return {
      ...crawlData,
      enhancedData: {
        structuredData: extractedData.structuredData || {},
        extractionMetrics: extractedData.extractionMetrics || {},
        pageAnalysis: extractedData.pageAnalysis || {},
        extractionVersion: 'v2',
      },
    };
  }

  private generateEnhancedSummary(analysis: any, type: string, extractedData: any): string {
    const baseScore = analysis.overallScore || 0;
    const pageType = extractedData.structuredData?.pageType || 'unknown';
    const qualityScore = Math.round((extractedData.extractionMetrics?.dataQualityScore || 0) * 100);
    
    switch (type) {
      case 'conversion':
        // CovertIQ Revenue-Focused Summary
        if (analysis.revenueProjections) {
          const revenueIncrease = analysis.revenueProjections.monthlyRevenueImpact || 'significant revenue potential';
          const conversionIncrease = analysis.revenueProjections.conversionRateIncrease || '+2-4% conversion rate';
          const quickWinsCount = analysis.quickWins?.length || 0;
          const strategicCount = analysis.strategicInitiatives?.length || 0;
          const platform = analysis.platformIntelligence?.platform || 'custom';
          
          return `CovertIQ Analysis: ${revenueIncrease} revenue opportunity identified with ${conversionIncrease} improvement potential. Platform: ${platform}. ${quickWinsCount} quick wins + ${strategicCount} strategic initiatives for ${pageType} optimization (${qualityScore}% confidence).`;
        }
        return `CovertIQ conversion analysis (${pageType}) identified ${analysis.keyFindings?.length || 0} revenue optimization opportunities with ${baseScore}/10 baseline score (${qualityScore}% confidence).`;
      case 'ux':
        return `Enhanced UX analysis (${pageType} page) shows score ${baseScore}/10 with ${qualityScore}% extraction confidence. Mobile-first revenue optimizations identified following CovertIQ methodology.`;
      case 'seo':
        return `Enhanced SEO analysis (${pageType} page) indicates score ${baseScore}/10 with ${qualityScore}% data quality. Technical SEO recommendations focused on commercial keyword revenue impact.`;
      default:
        return `Enhanced analysis (${pageType} page) completed with score ${baseScore}/10 and ${qualityScore}% data confidence.`;
    }
  }

  private generateEnhancedRecommendations(analysis: any, category: string, extractedData: any): Array<Record<string, unknown>> {
    const baseRecommendations = this.generateRecommendations(analysis, category);
    const pageType = extractedData.structuredData?.pageType || 'unknown';
    const structuredData = extractedData.structuredData || {};
    
    // Generate CovertIQ revenue-focused recommendations
    const revenueRecommendations = this.generateCovertIQRecommendations(analysis, category, structuredData, pageType);
    
    // Generate platform-specific recommendations
    const platform = this.detectPlatform(structuredData);
    const platformRecommendations = this.generatePlatformSpecificRecommendations(platform, pageType, structuredData);
    
    // Enhance base recommendations with revenue context
    const enhancedBase = baseRecommendations.map((rec: any) => ({
      ...rec,
      enhancedContext: {
        pageType,
        platform,
        dataConfidence: extractedData.extractionMetrics?.dataQualityScore || 0,
        structuredInsights: this.getStructuredInsights(structuredData, category),
      },
      implementation: {
        ...rec.implementation,
        enhancedSteps: this.getEnhancedImplementationSteps(rec, structuredData, pageType),
      },
      revenueImpact: this.estimateRevenueImpact(rec, pageType, structuredData),
    }));
    
    // Combine all recommendations and prioritize by revenue potential
    return [...enhancedBase, ...revenueRecommendations, ...platformRecommendations]
      .sort((a: any, b: any) => this.compareRevenueImpact(a, b));
  }

  private generateCovertIQRecommendations(analysis: any, category: string, structuredData: any, pageType: string): Array<Record<string, unknown>> {
    const recommendations: any[] = [];
    
    // CovertIQ Quick Wins - High Revenue Impact, Low Effort
    if (analysis.quickWins) {
      analysis.quickWins.forEach((win: any) => {
        recommendations.push({
          id: uuidv4(),
          title: win.title,
          description: win.description,
          category: 'conversion',
          impact: {
            score: 9, // High impact
            reasoning: `CovertIQ Quick Win: ${win.revenueImpact}`,
            category: 'high',
            revenueImpact: {
              conversionRateIncrease: win.revenueImpact.includes('%') ? win.revenueImpact : '+1.5-3.0% conversion rate',
              monthlyRevenueImpact: this.estimateMonthlyRevenue(win.revenueImpact, pageType),
              aovImpact: 'Minimal direct AOV impact',
              implementationROI: `Payback in ${win.implementationTime}`,
              timeframe: 'immediate',
            }
          },
          effort: {
            score: 2, // Low effort
            reasoning: `Quick implementation: ${win.implementationTime}`,
            category: 'low',
            resourceRequirements: ['Marketing team', 'Basic web editing'],
            technicalComplexity: 'basic',
          },
          implementation: {
            steps: [`Implement ${win.title} following CovertIQ methodology`],
            codeSnippets: [],
            resources: [
              {
                title: 'CovertIQ Revenue Optimization Guide',
                url: '#',
                type: 'guide',
              },
            ],
          },
          whyItMatters: `Revenue Impact: ${win.revenueImpact}. This optimization follows CovertIQ's "Mobile-First Revenue" and "Speed Equals Sales" principles.`,
          priority: 'high',
        });
      });
    }
    
    // CovertIQ Strategic Initiatives - Substantial Revenue Upside
    if (analysis.strategicInitiatives) {
      analysis.strategicInitiatives.forEach((initiative: any) => {
        recommendations.push({
          id: uuidv4(),
          title: initiative.title,
          description: initiative.description,
          category: 'conversion',
          impact: {
            score: 8, // High impact
            reasoning: `CovertIQ Strategic Initiative: ${initiative.revenueUpside}`,
            category: 'high',
            revenueImpact: {
              conversionRateIncrease: '+3.0-5.0% conversion rate',
              monthlyRevenueImpact: this.estimateMonthlyRevenue(initiative.revenueUpside, pageType),
              aovImpact: '+10-25% Average Order Value',
              implementationROI: `Payback in ${initiative.timeframe}`,
              timeframe: 'medium-term',
            }
          },
          effort: {
            score: 6, // Medium effort
            reasoning: `Strategic implementation: ${initiative.timeframe}`,
            category: 'medium',
            resourceRequirements: ['Development team', 'Marketing team', 'Design resources'],
            technicalComplexity: 'intermediate',
          },
          implementation: {
            steps: [`Execute ${initiative.title} following CovertIQ strategic framework`],
            codeSnippets: [],
            resources: [],
          },
          whyItMatters: `Strategic Revenue Growth: ${initiative.revenueUpside}. This optimization creates competitive advantage through advanced conversion psychology.`,
          priority: 'medium',
        });
      });
    }
    
    return recommendations;
  }

  private estimateRevenueImpact(recommendation: any, pageType: string, structuredData: any): any {
    // CovertIQ revenue impact estimation based on page type and optimization
    const baseImpact = {
      conversionRateIncrease: '+1.0-2.0% conversion rate',
      monthlyRevenueImpact: '$500-2,000 estimated increase',
      aovImpact: 'No direct AOV impact',
      implementationROI: 'Payback within 30-60 days',
      timeframe: 'short-term',
    };
    
    // Adjust based on page type and optimization category
    if (pageType === 'product' && recommendation.category === 'conversion') {
      baseImpact.conversionRateIncrease = '+2.0-4.0% conversion rate';
      baseImpact.monthlyRevenueImpact = '$1,000-5,000 estimated increase';
      baseImpact.aovImpact = '+5-15% Average Order Value';
    } else if (pageType === 'homepage' && recommendation.title?.toLowerCase().includes('trust')) {
      baseImpact.conversionRateIncrease = '+1.5-3.0% conversion rate';
      baseImpact.monthlyRevenueImpact = '$750-3,000 estimated increase';
    }
    
    return baseImpact;
  }

  private estimateMonthlyRevenue(impact: string, pageType: string): string {
    // Extract revenue indicators from impact string or estimate based on page type
    if (impact.includes('$')) {
      return impact;
    }
    
    // Default estimates based on page type
    switch (pageType) {
      case 'product':
        return '$1,000-5,000 estimated monthly increase';
      case 'homepage':
        return '$750-3,000 estimated monthly increase';
      case 'category':
        return '$500-2,500 estimated monthly increase';
      default:
        return '$300-1,500 estimated monthly increase';
    }
  }

  private compareRevenueImpact(a: any, b: any): number {
    // Prioritize by revenue impact, then by implementation ease
    const aRevenue = this.parseRevenueImpact(a.revenueImpact?.monthlyRevenueImpact || a.impact?.revenueImpact?.monthlyRevenueImpact);
    const bRevenue = this.parseRevenueImpact(b.revenueImpact?.monthlyRevenueImpact || b.impact?.revenueImpact?.monthlyRevenueImpact);
    
    if (bRevenue !== aRevenue) {
      return bRevenue - aRevenue; // Higher revenue first
    }
    
    // If revenue is equal, prioritize by lower effort
    const aEffort = a.effort?.score || 5;
    const bEffort = b.effort?.score || 5;
    return aEffort - bEffort; // Lower effort first
  }

  private parseRevenueImpact(revenueString: string | undefined): number {
    if (!revenueString) return 0;
    
    // Extract numeric value from revenue string (e.g., "$1,000-5,000" -> 3000)
    const matches = revenueString.match(/\$([0-9,]+)(?:-([0-9,]+))?/);
    if (matches) {
      const low = parseInt(matches[1].replace(',', ''));
      const high = matches[2] ? parseInt(matches[2].replace(',', '')) : low;
      return (low + high) / 2; // Return average
    }
    
    return 0;
  }

  private combineEnhancedRecommendations(analyses: Array<Record<string, unknown>>, extractedData: any): Array<Record<string, unknown>> {
    const recommendations: any[] = [];
    
    analyses.forEach((analysis, index) => {
      const categoryNames = ['conversion', 'ux', 'seo'];
      const category = categoryNames[index] || 'technical';
      
      if (analysis?.priorityRecommendations) {
        recommendations.push(...this.generateEnhancedRecommendations(analysis, category, extractedData));
      }
    });

    return this.prioritizeRecommendations(recommendations);
  }

  private getStructuredInsights(structuredData: any, category: string): Array<string> {
    const insights: string[] = [];
    
    // Add platform detection insights
    const platform = this.detectPlatform(structuredData);
    if (platform !== 'custom') {
      insights.push(`Platform detected: ${platform} - specific optimization opportunities available`);
    }
    
    switch (category) {
      case 'conversion':
        if (structuredData.ctaElements?.length) {
          insights.push(`Found ${structuredData.ctaElements.length} call-to-action elements`);
        }
        if (structuredData.trustSignals?.length) {
          insights.push(`Identified ${structuredData.trustSignals.length} trust signals`);
        }
        // Add platform-specific conversion insights
        if (platform === 'shopify') {
          insights.push('Shopify checkout optimization opportunities identified');
        } else if (platform === 'woocommerce') {
          insights.push('WooCommerce cart abandonment reduction strategies available');
        }
        break;
      case 'ux':
        if (structuredData.navigation) {
          insights.push('Navigation structure analyzed for UX optimization');
        }
        if (structuredData.forms?.length) {
          insights.push(`Found ${structuredData.forms.length} forms for UX enhancement`);
        }
        break;
      case 'seo':
        if (structuredData.seoElements) {
          insights.push('Technical SEO elements extracted and analyzed');
        }
        if (structuredData.schema?.length) {
          insights.push(`Found ${structuredData.schema.length} schema markup elements`);
        }
        break;
    }
    
    return insights;
  }

  private detectPlatform(structuredData: any): string {
    // CovertIQ Platform Intelligence - detect ecommerce platforms for specific optimization
    if (!structuredData) return 'custom';
    
    // Check for platform-specific indicators in the content
    const content = JSON.stringify(structuredData).toLowerCase();
    
    // Shopify detection
    if (content.includes('shopify') || 
        content.includes('shop-js') || 
        content.includes('myshopify.com') ||
        content.includes('shopify-section')) {
      return 'shopify';
    }
    
    // WooCommerce detection
    if (content.includes('woocommerce') ||
        content.includes('wc-') ||
        content.includes('wp-content') ||
        content.includes('wordpress')) {
      return 'woocommerce';
    }
    
    // Squarespace detection
    if (content.includes('squarespace') ||
        content.includes('static1.squarespace.com') ||
        content.includes('sqs-')) {
      return 'squarespace';
    }
    
    // Webflow detection
    if (content.includes('webflow') ||
        content.includes('uploads-ssl.webflow.com') ||
        content.includes('w-')) {
      return 'webflow';
    }
    
    // BigCommerce detection
    if (content.includes('bigcommerce') ||
        content.includes('mybigcommerce.com')) {
      return 'bigcommerce';
    }
    
    return 'custom';
  }

  private generatePlatformSpecificRecommendations(platform: string, pageType: string, structuredData: any): Array<Record<string, unknown>> {
    const recommendations: any[] = [];
    
    switch (platform) {
      case 'shopify':
        recommendations.push({
          id: uuidv4(),
          title: 'Shopify Theme Conversion Optimization',
          description: 'Optimize Shopify theme for higher conversion rates using platform-specific features',
          category: 'conversion',
          impact: {
            score: 8,
            reasoning: 'Shopify-specific optimizations can significantly improve conversion rates',
            category: 'high',
            revenueImpact: {
              conversionRateIncrease: '+2.5-4.0% conversion rate',
              monthlyRevenueImpact: '$1,500-6,000 estimated increase',
              aovImpact: '+10-20% Average Order Value',
              implementationROI: 'Payback within 30-45 days',
              timeframe: 'short-term',
            }
          },
          effort: {
            score: 4,
            reasoning: 'Moderate effort using Shopify admin and theme customization',
            category: 'medium',
            resourceRequirements: ['Shopify admin access', 'Theme customization knowledge'],
            technicalComplexity: 'intermediate',
          },
          implementation: {
            steps: [
              'Access Shopify admin theme editor',
              'Implement trust badges in checkout flow',
              'Add urgency elements to product pages',
              'Optimize mobile cart experience',
              'Enable abandoned cart recovery apps'
            ],
            resources: [
              {
                title: 'Shopify Conversion Optimization Guide',
                url: 'https://shopify.dev/themes/best-practices/conversion-optimization',
                type: 'documentation',
              },
            ],
          },
          whyItMatters: 'Shopify stores with optimized themes see 15-35% higher conversion rates. Platform-specific features like one-click checkout and integrated payment options create competitive advantages.',
          priority: 'high',
        });
        
        if (pageType === 'product') {
          recommendations.push({
            id: uuidv4(),
            title: 'Shopify Product Page Revenue Enhancement',
            description: 'Leverage Shopify product features for maximum revenue per visitor',
            category: 'conversion',
            impact: {
              score: 9,
              reasoning: 'Product page optimization directly impacts AOV and conversion rate',
              category: 'high',
              revenueImpact: {
                conversionRateIncrease: '+3.0-5.5% conversion rate',
                monthlyRevenueImpact: '$2,000-8,000 estimated increase',
                aovImpact: '+15-30% Average Order Value',
                implementationROI: 'Payback within 20-30 days',
                timeframe: 'immediate',
              }
            },
            effort: {
              score: 3,
              reasoning: 'Easy implementation using Shopify apps and theme settings',
              category: 'low',
              resourceRequirements: ['Shopify app installation', 'Basic product data entry'],
              technicalComplexity: 'basic',
            },
            implementation: {
              steps: [
                'Install product reviews app (Judge.me or Loox)',
                'Add product bundles and upsells',
                'Implement inventory scarcity indicators',
                'Enable product recommendations',
                'Add size guides and comparison tables'
              ],
            },
            whyItMatters: 'Shopify product pages with social proof and scarcity elements convert 40-60% better than basic configurations.',
            priority: 'high',
          });
        }
        break;
        
      case 'woocommerce':
        recommendations.push({
          id: uuidv4(),
          title: 'WooCommerce Cart Abandonment Prevention',
          description: 'Reduce cart abandonment using WordPress/WooCommerce specific optimization plugins',
          category: 'conversion',
          impact: {
            score: 7,
            reasoning: 'WooCommerce cart abandonment solutions can recover 15-25% of lost sales',
            category: 'high',
            revenueImpact: {
              conversionRateIncrease: '+2.0-3.5% conversion rate',
              monthlyRevenueImpact: '$1,000-4,500 estimated increase',
              aovImpact: '+5-15% Average Order Value',
              implementationROI: 'Payback within 45-60 days',
              timeframe: 'short-term',
            }
          },
          effort: {
            score: 5,
            reasoning: 'Requires WooCommerce plugin configuration and email setup',
            category: 'medium',
            resourceRequirements: ['WordPress admin access', 'Email marketing setup'],
            technicalComplexity: 'intermediate',
          },
          implementation: {
            steps: [
              'Install WooCommerce cart abandonment plugin',
              'Configure automated email sequences',
              'Add exit-intent popups with offers',
              'Implement guest checkout optimization',
              'Add multiple payment gateway options'
            ],
          },
          whyItMatters: 'WooCommerce stores lose 70% of potential sales to cart abandonment. Platform-specific recovery tools can recapture significant revenue.',
          priority: 'high',
        });
        break;
        
      default:
        // Custom platform recommendations
        recommendations.push({
          id: uuidv4(),
          title: 'Custom Platform Conversion Optimization',
          description: 'Implement conversion optimization best practices for custom-built website',
          category: 'conversion',
          impact: {
            score: 6,
            reasoning: 'Custom implementations require more effort but offer flexibility',
            category: 'medium',
            revenueImpact: {
              conversionRateIncrease: '+1.5-3.0% conversion rate',
              monthlyRevenueImpact: '$750-3,500 estimated increase',
              aovImpact: '+3-12% Average Order Value',
              implementationROI: 'Payback within 60-90 days',
              timeframe: 'medium-term',
            }
          },
          effort: {
            score: 7,
            reasoning: 'Custom development required for implementation',
            category: 'high',
            resourceRequirements: ['Development team', 'UX/UI design', 'Analytics setup'],
            technicalComplexity: 'advanced',
          },
          implementation: {
            steps: [
              'Implement custom trust signal components',
              'Add dynamic scarcity indicators',
              'Create personalized product recommendations',
              'Build custom checkout optimization',
              'Implement A/B testing framework'
            ],
          },
          whyItMatters: 'Custom platforms offer maximum flexibility but require strategic implementation of proven conversion principles.',
          priority: 'medium',
        });
    }
    
    return recommendations;
  }

  private getEnhancedImplementationSteps(recommendation: any, structuredData: any, pageType: string): Array<string> {
    const baseSteps = recommendation.implementation?.steps || [];
    const enhancedSteps = [...baseSteps];
    
    // Add page-type specific implementation guidance
    if (pageType === 'product' && structuredData.productInfo) {
      enhancedSteps.push('Leverage existing product data structure for optimization');
    } else if (pageType === 'homepage' && structuredData.heroSection) {
      enhancedSteps.push('Optimize hero section based on identified elements');
    } else if (pageType === 'landing' && structuredData.conversionElements) {
      enhancedSteps.push('Enhance conversion elements using structured insights');
    }
    
    return enhancedSteps;
  }
}

// Export singleton instance
export const aiAnalysisEngine = new AIAnalysisEngine();