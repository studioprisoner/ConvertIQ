import { v4 as uuidv4 } from 'uuid';
import type { AIAnalysisResult } from '../ai/types';
import type { 
  Report, 
  ReportType, 
  ReportGenerationInput,
  MarketingReportContent,
  ConversionReportContent,
  ReportRecommendation,
  ImpactScore,
  EffortScore,
  ImplementationGuide
} from './types';

export class ReportGenerationEngine {
  /**
   * Generate a comprehensive report from AI analysis results
   */
  async generateReport(
    aiAnalysis: AIAnalysisResult,
    input: ReportGenerationInput
  ): Promise<Report> {
    const reportId = uuidv4();
    const timestamp = new Date().toISOString();
    const startTime = Date.now();

    try {
      // Validate input
      this.validateInput(aiAnalysis, input);

      let content;
      let recommendations: ReportRecommendation[] = [];

      // Generate report based on type
      switch (input.reportType) {
        case 'marketing':
          content = await this.generateMarketingReport(aiAnalysis, input);
          recommendations = this.extractMarketingRecommendations(aiAnalysis, content);
          break;
          
        case 'conversion':
          content = await this.generateConversionReport(aiAnalysis, input);
          recommendations = this.extractConversionRecommendations(aiAnalysis, content);
          break;
          
        case 'comprehensive':
          // Generate both reports and combine
          const marketingContent = await this.generateMarketingReport(aiAnalysis, input);
          const conversionContent = await this.generateConversionReport(aiAnalysis, input);
          content = this.combineReports(marketingContent, conversionContent);
          recommendations = [
            ...this.extractMarketingRecommendations(aiAnalysis, marketingContent),
            ...this.extractConversionRecommendations(aiAnalysis, conversionContent)
          ];
          break;
          
        default:
          throw new Error(`Unsupported report type: ${input.reportType}`);
      }

      // Prioritize and filter recommendations
      recommendations = this.prioritizeRecommendations(recommendations);

      const generationTime = Date.now() - startTime;

      return {
        id: reportId,
        analysisId: input.analysisId,
        type: input.reportType,
        title: this.generateReportTitle(input.reportType, aiAnalysis.overallScore),
        summary: this.generateReportSummary(content, recommendations),
        content,
        recommendations,
        createdAt: timestamp,
        updatedAt: timestamp,
        metadata: {
          websiteUrl: input.websiteUrl,
          analysisDate: aiAnalysis.timestamp,
          reportVersion: '1.0.0',
          generationTime,
          confidence: 0.9,
        },
      };

    } catch (error) {
      console.error('Report generation failed:', error);
      throw new Error(`Failed to generate ${input.reportType} report: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Generate Marketing Improvement Report
   */
  private async generateMarketingReport(
    aiAnalysis: AIAnalysisResult,
    input: ReportGenerationInput
  ): Promise<MarketingReportContent> {
    const seoAnalysis = aiAnalysis.technicalSeo;
    const overallScore = aiAnalysis.overallScore;

    return {
      type: 'marketing',
      
      executiveSummary: {
        overallScore,
        keyFindings: this.extractSeoFindings(aiAnalysis),
        topPriorities: this.extractSeoTopPriorities(aiAnalysis),
        estimatedTrafficIncrease: this.calculateTrafficIncrease(overallScore),
        timeToSeeResults: '3-6 months',
      },
      
      seoAnalysis: {
        score: seoAnalysis?.overallScore || overallScore,
        keyIssues: seoAnalysis?.keyFindings || [],
        opportunities: seoAnalysis?.priorityRecommendations || [],
        technicalSeoScore: this.calculateTechnicalSeoScore(aiAnalysis),
        contentSeoScore: this.calculateContentSeoScore(aiAnalysis),
        localSeoScore: this.calculateLocalSeoScore(aiAnalysis),
      },
      
      visibilityAnalysis: {
        score: this.calculateVisibilityScore(aiAnalysis),
        searchVisibility: this.assessSearchVisibility(aiAnalysis),
        socialPresence: this.assessSocialPresence(aiAnalysis),
        brandMentions: 'Limited analysis available - requires external tools',
        competitivePosition: this.assessCompetitivePosition(aiAnalysis),
      },
      
      trafficAcquisition: {
        score: this.calculateTrafficAcquisitionScore(aiAnalysis),
        organicPotential: this.assessOrganicPotential(aiAnalysis),
        socialMediaOpportunities: this.identifySocialOpportunities(aiAnalysis),
        contentMarketingPotential: this.assessContentMarketingPotential(aiAnalysis),
        localSearchOpportunities: this.identifyLocalSearchOpportunities(aiAnalysis),
      },
      
      recommendations: [], // Will be populated by extractMarketingRecommendations
      
      quickWins: this.identifyMarketingQuickWins(aiAnalysis),
      
      longTermStrategy: {
        month1to3: [
          'Implement basic technical SEO fixes',
          'Optimize title tags and meta descriptions',
          'Set up Google Business Profile (if local business)',
          'Create content calendar for regular updates'
        ],
        month4to6: [
          'Develop comprehensive content marketing strategy',
          'Build quality backlinks through outreach',
          'Optimize for local search queries',
          'Implement structured data markup'
        ],
        month7to12: [
          'Scale content production and distribution',
          'Develop industry authority through thought leadership',
          'Expand to additional search markets',
          'Implement advanced SEO strategies'
        ],
      },
    };
  }

  /**
   * Generate Conversion Rate Improvement Report
   */
  private async generateConversionReport(
    aiAnalysis: AIAnalysisResult,
    input: ReportGenerationInput
  ): Promise<ConversionReportContent> {
    const conversionAnalysis = aiAnalysis.conversionPsychology;
    const uxAnalysis = aiAnalysis.uxAnalysis;
    const overallScore = aiAnalysis.overallScore;

    return {
      type: 'conversion',
      
      executiveSummary: {
        overallScore,
        keyFindings: this.extractConversionFindings(aiAnalysis),
        topPriorities: this.extractConversionTopPriorities(aiAnalysis),
        estimatedConversionIncrease: this.calculateConversionIncrease(overallScore),
        timeToSeeResults: '2-4 weeks',
      },
      
      uxAnalysis: {
        score: uxAnalysis?.overallScore || overallScore,
        mobileExperience: uxAnalysis?.mobileOptimization?.score || 5,
        navigationClarity: uxAnalysis?.navigation?.score || 5,
        pageSpeed: uxAnalysis?.performance?.score || 5,
        usabilityIssues: uxAnalysis?.keyFindings || [],
      },
      
      conversionPsychology: {
        score: conversionAnalysis?.overallScore || overallScore,
        trustSignals: conversionAnalysis?.trustIndicators?.professionalDesign || 5,
        socialProof: this.calculateSocialProofScore(conversionAnalysis),
        valueProposition: this.calculateValuePropositionScore(aiAnalysis),
        psychologicalTriggers: this.identifyPsychologicalTriggers(conversionAnalysis),
      },
      
      salesOptimization: {
        score: this.calculateSalesOptimizationScore(aiAnalysis),
        ctaEffectiveness: this.calculateCtaEffectiveness(aiAnalysis),
        checkoutProcess: this.calculateCheckoutScore(aiAnalysis),
        leadCapture: this.calculateLeadCaptureScore(aiAnalysis),
        objectionHandling: this.calculateObjectionHandlingScore(aiAnalysis),
      },
      
      recommendations: [], // Will be populated by extractConversionRecommendations
      
      quickWins: this.identifyConversionQuickWins(aiAnalysis),
      
      conversionFunnel: {
        awarenessStage: [
          'Optimize landing pages for first impressions',
          'Improve page loading speed',
          'Enhance mobile experience'
        ],
        considerationStage: [
          'Add social proof and testimonials',
          'Clarify value proposition',
          'Provide detailed product/service information'
        ],
        decisionStage: [
          'Optimize call-to-action buttons',
          'Reduce friction in conversion process',
          'Add trust signals and guarantees'
        ],
        retentionStage: [
          'Implement follow-up email sequences',
          'Create customer loyalty programs',
          'Gather and display customer reviews'
        ],
      },
    };
  }

  // Helper methods for scoring and analysis
  private calculateTrafficIncrease(score: number): string {
    if (score <= 3) return '30-50%';
    if (score <= 6) return '15-30%';
    return '5-15%';
  }

  private calculateConversionIncrease(score: number): string {
    if (score <= 3) return '40-80%';
    if (score <= 6) return '20-40%';
    return '10-20%';
  }

  private calculateTechnicalSeoScore(aiAnalysis: AIAnalysisResult): number {
    return aiAnalysis.technicalSeo?.overallScore || aiAnalysis.overallScore;
  }

  private calculateContentSeoScore(aiAnalysis: AIAnalysisResult): number {
    // Base on content analysis and technical SEO
    const baseScore = aiAnalysis.overallScore;
    const hasGoodContent = aiAnalysis.keyInsights.some(insight => 
      insight.toLowerCase().includes('content') && 
      !insight.toLowerCase().includes('missing')
    );
    return hasGoodContent ? Math.min(baseScore + 1, 10) : Math.max(baseScore - 1, 1);
  }

  private calculateLocalSeoScore(aiAnalysis: AIAnalysisResult): number {
    // Check for local business indicators
    const hasLocalIndicators = aiAnalysis.keyInsights.some(insight => 
      insight.toLowerCase().includes('local') || 
      insight.toLowerCase().includes('location') ||
      insight.toLowerCase().includes('address')
    );
    return hasLocalIndicators ? aiAnalysis.overallScore : Math.max(aiAnalysis.overallScore - 2, 1);
  }

  private extractSeoFindings(aiAnalysis: AIAnalysisResult): string[] {
    return aiAnalysis.technicalSeo?.keyFindings || aiAnalysis.keyInsights.slice(0, 5);
  }

  private extractSeoTopPriorities(aiAnalysis: AIAnalysisResult): string[] {
    return aiAnalysis.technicalSeo?.priorityRecommendations?.slice(0, 3) || 
           aiAnalysis.recommendations.slice(0, 3).map(r => r.title);
  }

  private extractConversionFindings(aiAnalysis: AIAnalysisResult): string[] {
    return aiAnalysis.conversionPsychology?.keyFindings || aiAnalysis.keyInsights.slice(0, 5);
  }

  private extractConversionTopPriorities(aiAnalysis: AIAnalysisResult): string[] {
    return aiAnalysis.conversionPsychology?.priorityRecommendations?.slice(0, 3) || 
           aiAnalysis.recommendations.slice(0, 3).map(r => r.title);
  }

  // Additional helper methods would continue here...
  // (truncated for brevity, but would include all the scoring and analysis methods)

  private validateInput(aiAnalysis: AIAnalysisResult, input: ReportGenerationInput): void {
    if (!aiAnalysis.id) throw new Error('Invalid AI analysis - missing ID');
    if (!input.websiteUrl) throw new Error('Website URL is required');
    if (aiAnalysis.overallScore < 1 || aiAnalysis.overallScore > 10) {
      throw new Error('Invalid analysis score');
    }
  }

  private generateReportTitle(type: ReportType, score: number): string {
    const titles = {
      marketing: `Marketing Improvement Report - Score: ${score}/10`,
      conversion: `Conversion Rate Optimization Report - Score: ${score}/10`,
      comprehensive: `Comprehensive Website Analysis Report - Score: ${score}/10`,
      performance: `Performance Analysis Report - Score: ${score}/10`,
    };
    return titles[type];
  }

  private generateReportSummary(content: any, recommendations: ReportRecommendation[]): string {
    return `Website analysis complete with ${recommendations.length} actionable recommendations. ` +
           `Focus areas identified for immediate improvement with estimated impact on business results.`;
  }

  // Placeholder methods for complex calculations
  private calculateVisibilityScore(aiAnalysis: AIAnalysisResult): number { return aiAnalysis.overallScore; }
  private assessSearchVisibility(aiAnalysis: AIAnalysisResult): string { return 'Moderate visibility with optimization opportunities'; }
  private assessSocialPresence(aiAnalysis: AIAnalysisResult): string { return 'Limited social media integration detected'; }
  private assessCompetitivePosition(aiAnalysis: AIAnalysisResult): string { return 'Competitive analysis requires additional data'; }
  private calculateTrafficAcquisitionScore(aiAnalysis: AIAnalysisResult): number { return aiAnalysis.overallScore; }
  private assessOrganicPotential(aiAnalysis: AIAnalysisResult): string { return 'Good potential with proper optimization'; }
  private identifySocialOpportunities(aiAnalysis: AIAnalysisResult): string[] { return ['Instagram integration', 'Facebook pixel', 'Social sharing buttons']; }
  private assessContentMarketingPotential(aiAnalysis: AIAnalysisResult): string { return 'Strong potential for content-driven growth'; }
  private identifyLocalSearchOpportunities(aiAnalysis: AIAnalysisResult): string[] { return ['Google Business Profile', 'Local schema markup', 'Location pages']; }
  
  private identifyMarketingQuickWins(aiAnalysis: AIAnalysisResult): Array<{title: string; description: string; timeToComplete: string; expectedImpact: string}> {
    return [
      {
        title: 'Optimize Title Tags',
        description: 'Update page titles with target keywords and location',
        timeToComplete: '2-4 hours',
        expectedImpact: '5-15% increase in organic clicks'
      }
    ];
  }

  private calculateSocialProofScore(conversionAnalysis: any): number { return 5; }
  private calculateValuePropositionScore(aiAnalysis: AIAnalysisResult): number { return aiAnalysis.overallScore; }
  private identifyPsychologicalTriggers(conversionAnalysis: any): string[] { return ['Social proof', 'Authority', 'Scarcity']; }
  private calculateSalesOptimizationScore(aiAnalysis: AIAnalysisResult): number { return aiAnalysis.overallScore; }
  private calculateCtaEffectiveness(aiAnalysis: AIAnalysisResult): number { return aiAnalysis.overallScore; }
  private calculateCheckoutScore(aiAnalysis: AIAnalysisResult): number { return aiAnalysis.overallScore; }
  private calculateLeadCaptureScore(aiAnalysis: AIAnalysisResult): number { return aiAnalysis.overallScore; }
  private calculateObjectionHandlingScore(aiAnalysis: AIAnalysisResult): number { return aiAnalysis.overallScore; }
  
  private identifyConversionQuickWins(aiAnalysis: AIAnalysisResult): Array<{title: string; description: string; timeToComplete: string; expectedImpact: string}> {
    return [
      {
        title: 'Add Trust Badges',
        description: 'Display security certificates and payment badges',
        timeToComplete: '1-2 hours',
        expectedImpact: '5-10% conversion rate increase'
      }
    ];
  }

  private extractMarketingRecommendations(aiAnalysis: AIAnalysisResult, content: MarketingReportContent): ReportRecommendation[] {
    // Implementation would extract and format recommendations
    return [];
  }

  private extractConversionRecommendations(aiAnalysis: AIAnalysisResult, content: ConversionReportContent): ReportRecommendation[] {
    // Implementation would extract and format recommendations
    return [];
  }

  private combineReports(marketing: MarketingReportContent, conversion: ConversionReportContent): any {
    // Implementation would combine both report types
    return marketing;
  }

  private prioritizeRecommendations(recommendations: ReportRecommendation[]): ReportRecommendation[] {
    return recommendations.sort((a, b) => {
      // Sort by impact score descending, then effort score ascending
      const impactDiff = b.impact.score - a.impact.score;
      if (impactDiff !== 0) return impactDiff;
      return a.effort.score - b.effort.score;
    });
  }
}

// Export singleton instance
export const reportEngine = new ReportGenerationEngine();