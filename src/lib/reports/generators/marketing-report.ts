import { v4 as uuidv4 } from 'uuid';
import type { AIAnalysisResult } from '../../ai/types';
import type { 
  MarketingReportContent, 
  ReportRecommendation, 
  ReportGenerationInput,
  ImplementationGuide 
} from '../types';

export class MarketingReportGenerator {
  /**
   * Generate comprehensive Marketing Improvement Report
   */
  async generateMarketingReport(
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
        timeToSeeResults: this.calculateTimeToResults(overallScore),
      },
      
      seoAnalysis: {
        score: seoAnalysis?.overallScore || overallScore,
        keyIssues: this.identifyKeyIssues(aiAnalysis),
        opportunities: this.identifyOpportunities(aiAnalysis),
        technicalSeoScore: this.calculateTechnicalSeoScore(aiAnalysis),
        contentSeoScore: this.calculateContentSeoScore(aiAnalysis),
        localSeoScore: this.calculateLocalSeoScore(aiAnalysis),
      },
      
      visibilityAnalysis: {
        score: this.calculateVisibilityScore(aiAnalysis),
        searchVisibility: this.assessSearchVisibility(aiAnalysis),
        socialPresence: this.assessSocialPresence(aiAnalysis),
        brandMentions: this.assessBrandMentions(aiAnalysis),
        competitivePosition: this.assessCompetitivePosition(aiAnalysis),
      },
      
      trafficAcquisition: {
        score: this.calculateTrafficAcquisitionScore(aiAnalysis),
        organicPotential: this.assessOrganicPotential(aiAnalysis),
        socialMediaOpportunities: this.identifySocialOpportunities(aiAnalysis),
        contentMarketingPotential: this.assessContentMarketingPotential(aiAnalysis),
        localSearchOpportunities: this.identifyLocalSearchOpportunities(aiAnalysis),
      },
      
      recommendations: this.generateMarketingRecommendations(aiAnalysis),
      
      quickWins: this.identifyMarketingQuickWins(aiAnalysis),
      
      longTermStrategy: this.createLongTermStrategy(aiAnalysis),
    };
  }

  private extractSeoFindings(aiAnalysis: AIAnalysisResult): string[] {
    const findings = [];
    
    // Extract from technical SEO analysis
    if (aiAnalysis.technicalSeo?.keyFindings) {
      findings.push(...aiAnalysis.technicalSeo.keyFindings);
    }
    
    // Extract general findings (with safety check)
    if (aiAnalysis.keyInsights && Array.isArray(aiAnalysis.keyInsights)) {
      findings.push(...aiAnalysis.keyInsights.slice(0, 3));
    }
    
    // Add specific SEO-focused findings
    if (aiAnalysis.technicalSeo?.metaTags?.titleTag?.present === false) {
      findings.push('Missing or poorly optimized title tags affecting search visibility');
    }
    
    if (aiAnalysis.technicalSeo?.schemaMarkup?.present === false) {
      findings.push('No structured data markup limiting rich snippet opportunities');
    }
    
    if ((aiAnalysis.technicalSeo?.imageSeo?.altTextPresent ?? 100) < 80) {
      findings.push('Poor image SEO with missing alt text affecting accessibility and rankings');
    }
    
    return findings.slice(0, 5);
  }

  private extractSeoTopPriorities(aiAnalysis: AIAnalysisResult): string[] {
    const priorities = [];
    
    // From technical SEO priorities
    if (aiAnalysis.technicalSeo?.priorityRecommendations) {
      priorities.push(...aiAnalysis.technicalSeo.priorityRecommendations.slice(0, 2));
    }
    
    // High-impact SEO priorities based on analysis
    if (aiAnalysis.overallScore < 5) {
      priorities.push('Implement basic technical SEO foundation');
      priorities.push('Optimize for local search visibility');
      priorities.push('Create content marketing strategy');
    } else if (aiAnalysis.overallScore < 7) {
      priorities.push('Enhance existing SEO with advanced techniques');
      priorities.push('Build authority through content and backlinks');
      priorities.push('Optimize for mobile-first indexing');
    } else {
      priorities.push('Fine-tune existing high-performing elements');
      priorities.push('Expand to new keyword opportunities');
      priorities.push('Implement advanced schema markup');
    }
    
    return priorities.slice(0, 3);
  }

  private calculateTrafficIncrease(score: number): string {
    if (score <= 3) return '40-70%';
    if (score <= 5) return '25-45%';
    if (score <= 7) return '15-30%';
    return '5-15%';
  }

  private calculateTimeToResults(score: number): string {
    if (score <= 3) return '2-4 months';
    if (score <= 6) return '3-6 months';
    return '6-12 months';
  }

  private identifyKeyIssues(aiAnalysis: AIAnalysisResult): string[] {
    const issues = [];
    
    const seo = aiAnalysis.technicalSeo;
    if (!seo) return ['Limited technical SEO data available for analysis'];
    
    // Title tag issues
    if (seo.metaTags?.titleTag?.optimized === false) {
      issues.push('Title tags are not optimized for target keywords');
    }
    
    // Meta description issues
    if (seo.metaTags?.metaDescription?.optimized === false) {
      issues.push('Meta descriptions missing or not compelling for click-through');
    }
    
    // Heading structure issues
    if (seo.metaTags?.headingStructure?.properHierarchy === false) {
      issues.push('Heading structure lacks proper SEO hierarchy');
    }
    
    // Schema markup issues
    if (seo.schemaMarkup?.present === false) {
      issues.push('Missing structured data markup for rich snippets');
    }
    
    // Image SEO issues
    if (seo.imageSeo?.altTextPresent < 70) {
      issues.push('Poor image optimization affecting search visibility');
    }
    
    return issues.slice(0, 6);
  }

  private identifyOpportunities(aiAnalysis: AIAnalysisResult): string[] {
    const opportunities = [];
    
    // Based on current performance gaps
    if (aiAnalysis.overallScore < 6) {
      opportunities.push('Significant organic traffic growth potential through basic SEO');
      opportunities.push('Local search optimization for immediate visibility gains');
      opportunities.push('Content marketing to establish authority and rankings');
    }
    
    if (aiAnalysis.technicalSeo?.schemaMarkup?.present === false) {
      opportunities.push('Implement schema markup for enhanced search appearances');
    }
    
    if (aiAnalysis.technicalSeo?.imageSeo?.optimizedFilenames === false) {
      opportunities.push('Optimize image SEO for additional ranking opportunities');
    }
    
    opportunities.push('Build topic authority through comprehensive content strategy');
    opportunities.push('Leverage social media integration for broader reach');
    
    return opportunities.slice(0, 5);
  }

  private calculateTechnicalSeoScore(aiAnalysis: AIAnalysisResult): number {
    const seo = aiAnalysis.technicalSeo;
    if (!seo) return Math.max(aiAnalysis.overallScore - 1, 1);
    
    let score = 0;
    let factors = 0;
    
    // Title tag optimization
    if (seo.metaTags?.titleTag?.optimized !== undefined) {
      score += seo.metaTags.titleTag.optimized ? 10 : 3;
      factors++;
    }
    
    // Meta description optimization
    if (seo.metaTags?.metaDescription?.optimized !== undefined) {
      score += seo.metaTags.metaDescription.optimized ? 10 : 3;
      factors++;
    }
    
    // Schema markup
    if (seo.schemaMarkup?.present !== undefined) {
      score += seo.schemaMarkup.present ? 10 : 2;
      factors++;
    }
    
    // Image SEO
    if (seo.imageSeo?.altTextPresent !== undefined) {
      const imageScore = (seo.imageSeo.altTextPresent / 100) * 10;
      score += imageScore;
      factors++;
    }
    
    return factors > 0 ? Math.round(score / factors) : aiAnalysis.overallScore;
  }

  private calculateContentSeoScore(aiAnalysis: AIAnalysisResult): number {
    // Base score on overall analysis and content indicators
    let score = aiAnalysis.overallScore;
    
    // Check for content quality indicators
    const hasGoodContent = aiAnalysis.keyInsights && Array.isArray(aiAnalysis.keyInsights) && 
      aiAnalysis.keyInsights.some(insight => 
        insight.toLowerCase().includes('content') && 
        !insight.toLowerCase().includes('missing') &&
        !insight.toLowerCase().includes('poor')
      );
    
    if (hasGoodContent) {
      score = Math.min(score + 1, 10);
    }
    
    // Check word count and content depth
    if (aiAnalysis.summary.toLowerCase().includes('comprehensive') || 
        aiAnalysis.summary.toLowerCase().includes('detailed')) {
      score = Math.min(score + 1, 10);
    }
    
    return Math.max(score - 1, 1); // Slightly lower than overall as content SEO is complex
  }

  private calculateLocalSeoScore(aiAnalysis: AIAnalysisResult): number {
    // Check for local business indicators
    const hasLocalIndicators = aiAnalysis.keyInsights && Array.isArray(aiAnalysis.keyInsights) &&
      aiAnalysis.keyInsights.some(insight => 
        insight.toLowerCase().includes('local') || 
        insight.toLowerCase().includes('location') ||
        insight.toLowerCase().includes('address') ||
        insight.toLowerCase().includes('business')
      );
    
    if (hasLocalIndicators) {
      return Math.min(aiAnalysis.overallScore + 1, 10);
    }
    
    // Check for location-based content
    const hasLocationContent = aiAnalysis.summary.toLowerCase().includes('melbourne') ||
                              aiAnalysis.summary.toLowerCase().includes('australia') ||
                              /\b\w+,\s*\w+\b/.test(aiAnalysis.summary); // City, State pattern
    
    return hasLocationContent ? aiAnalysis.overallScore : Math.max(aiAnalysis.overallScore - 2, 1);
  }

  private calculateVisibilityScore(aiAnalysis: AIAnalysisResult): number {
    // Base on SEO and overall performance
    const seoScore = this.calculateTechnicalSeoScore(aiAnalysis);
    const contentScore = this.calculateContentSeoScore(aiAnalysis);
    return Math.round((seoScore + contentScore + aiAnalysis.overallScore) / 3);
  }

  private assessSearchVisibility(aiAnalysis: AIAnalysisResult): string {
    const score = this.calculateVisibilityScore(aiAnalysis);
    
    if (score <= 3) return 'Poor search visibility with significant improvement opportunities';
    if (score <= 5) return 'Limited search visibility requiring optimization';
    if (score <= 7) return 'Moderate search visibility with growth potential';
    return 'Good search visibility with fine-tuning opportunities';
  }

  private assessSocialPresence(aiAnalysis: AIAnalysisResult): string {
    // Check for social media integration indicators
    const hasSocial = aiAnalysis.keyInsights && Array.isArray(aiAnalysis.keyInsights) &&
      aiAnalysis.keyInsights.some(insight => 
        insight.toLowerCase().includes('social') ||
        insight.toLowerCase().includes('facebook') ||
        insight.toLowerCase().includes('instagram') ||
        insight.toLowerCase().includes('twitter')
      );
    
    if (hasSocial) {
      return 'Social media integration present but may need optimization';
    }
    
    return 'Limited social media integration - significant opportunity for improvement';
  }

  private assessBrandMentions(aiAnalysis: AIAnalysisResult): string {
    return 'Brand mention analysis requires external monitoring tools';
  }

  private assessCompetitivePosition(aiAnalysis: AIAnalysisResult): string {
    const score = aiAnalysis.overallScore;
    
    if (score <= 3) return 'Below industry average - significant competitive disadvantage';
    if (score <= 5) return 'Meeting basic standards but behind leading competitors';
    if (score <= 7) return 'Competitive with industry standards';
    return 'Above average performance with competitive advantages';
  }

  private calculateTrafficAcquisitionScore(aiAnalysis: AIAnalysisResult): number {
    // Combine SEO potential with current performance
    const seoScore = this.calculateTechnicalSeoScore(aiAnalysis);
    const contentScore = this.calculateContentSeoScore(aiAnalysis);
    return Math.round((seoScore + contentScore) / 2);
  }

  private assessOrganicPotential(aiAnalysis: AIAnalysisResult): string {
    const score = this.calculateTrafficAcquisitionScore(aiAnalysis);
    
    if (score <= 3) return 'High organic growth potential with proper SEO implementation';
    if (score <= 6) return 'Moderate organic growth potential through optimization';
    return 'Incremental organic growth opportunities available';
  }

  private identifySocialOpportunities(aiAnalysis: AIAnalysisResult): string[] {
    return [
      'Instagram integration for visual content marketing',
      'Facebook Business integration for local reach',
      'LinkedIn presence for B2B networking',
      'Social sharing optimization for viral potential',
      'YouTube channel for video content marketing'
    ];
  }

  private assessContentMarketingPotential(aiAnalysis: AIAnalysisResult): string {
    const score = aiAnalysis.overallScore;
    
    if (score <= 4) return 'Excellent content marketing potential - clean slate for strategy development';
    if (score <= 7) return 'Good content marketing potential building on existing foundation';
    return 'Refinement opportunities in existing content strategy';
  }

  private identifyLocalSearchOpportunities(aiAnalysis: AIAnalysisResult): string[] {
    return [
      'Google Business Profile optimization',
      'Local directory listings and citations',
      'Location-specific landing pages',
      'Local schema markup implementation',
      'Community engagement and local partnerships'
    ];
  }

  private generateMarketingRecommendations(aiAnalysis: AIAnalysisResult): ReportRecommendation[] {
    const recommendations: ReportRecommendation[] = [];
    
    // High-priority SEO recommendations
    if (aiAnalysis.technicalSeo?.metaTags?.titleTag?.optimized === false) {
      recommendations.push(this.createSeoRecommendation(
        'Optimize Title Tags for Target Keywords',
        'Update page titles to include primary keywords and location information for better search rankings',
        'seo',
        'high',
        { score: 8, category: 'high', reasoning: 'Title tags are crucial ranking factors', businessImpact: 'Direct impact on search rankings and click-through rates' },
        { score: 3, category: 'low', reasoning: 'Simple HTML changes required', timeEstimate: '2-4 hours', skillLevel: 'beginner' },
        this.createTitleOptimizationGuide()
      ));
    }
    
    if (aiAnalysis.technicalSeo?.schemaMarkup?.present === false) {
      recommendations.push(this.createSeoRecommendation(
        'Implement Schema Markup for Rich Snippets',
        'Add structured data to enhance search result appearances and improve click-through rates',
        'technical',
        'medium',
        { score: 7, category: 'medium', reasoning: 'Schema markup improves search visibility', businessImpact: 'Enhanced search result appearance increases organic traffic' },
        { score: 6, category: 'medium', reasoning: 'Requires technical implementation', timeEstimate: '1-2 weeks', skillLevel: 'intermediate' },
        this.createSchemaImplementationGuide()
      ));
    }
    
    return recommendations.slice(0, 8); // Limit to top recommendations
  }

  private createSeoRecommendation(
    title: string,
    description: string,
    category: 'seo' | 'content' | 'technical',
    priority: 'low' | 'medium' | 'high',
    impact: { score: number; category: 'low' | 'medium' | 'high' | 'critical'; reasoning: string; businessImpact: string },
    effort: { score: number; category: 'low' | 'medium' | 'high'; reasoning: string; timeEstimate: string; skillLevel: 'beginner' | 'intermediate' | 'advanced' },
    implementationGuide: ImplementationGuide
  ): ReportRecommendation {
    return {
      id: uuidv4(),
      title,
      description,
      category,
      priority,
      impact,
      effort,
      implementationGuide,
      whyItMatters: impact.businessImpact,
      expectedOutcome: `Improved search rankings and organic traffic within ${effort.timeEstimate}`,
      measurementStrategy: 'Monitor search console impressions, clicks, and average position'
    };
  }

  private createTitleOptimizationGuide(): ImplementationGuide {
    return {
      overview: 'Optimize page titles to include target keywords while maintaining readability and staying within character limits.',
      prerequisites: ['Access to website HTML or CMS', 'Keyword research completed'],
      steps: [
        {
          step: 1,
          title: 'Identify Target Keywords',
          description: 'Research and select primary keywords for each page',
          details: [
            'Use Google Keyword Planner or similar tools',
            'Focus on keywords with good search volume and low competition',
            'Consider local keywords if applicable'
          ],
          tips: ['Include location in keywords for local businesses']
        },
        {
          step: 2,
          title: 'Update Title Tags',
          description: 'Modify existing title tags to include target keywords',
          details: [
            'Keep titles under 60 characters',
            'Place most important keywords at the beginning',
            'Make titles compelling for users to click'
          ],
          warnings: ['Avoid keyword stuffing which can harm rankings']
        }
      ],
      successMetrics: [
        'Increased search console impressions',
        'Improved click-through rates',
        'Higher average search position'
      ],
      timeline: '2-4 hours for implementation, 2-4 weeks to see results',
      difficulty: 'beginner'
    };
  }

  private createSchemaImplementationGuide(): ImplementationGuide {
    return {
      overview: 'Implement structured data markup to help search engines understand your content and display rich snippets.',
      prerequisites: ['Basic HTML knowledge', 'Access to website code'],
      steps: [
        {
          step: 1,
          title: 'Choose Schema Types',
          description: 'Select appropriate schema markup for your business',
          details: [
            'LocalBusiness for local companies',
            'Product for e-commerce items',
            'Organization for company information'
          ]
        },
        {
          step: 2,
          title: 'Generate Schema Code',
          description: 'Create structured data markup',
          details: [
            'Use Google\'s Structured Data Markup Helper',
            'Validate with Google\'s Rich Results Test',
            'Add to website HTML'
          ]
        }
      ],
      successMetrics: [
        'Rich snippets appearing in search results',
        'Improved click-through rates',
        'Enhanced search result appearance'
      ],
      timeline: '1-2 weeks for implementation, 4-8 weeks to see rich snippets',
      difficulty: 'intermediate'
    };
  }

  private identifyMarketingQuickWins(aiAnalysis: AIAnalysisResult): Array<{
    title: string;
    description: string;
    timeToComplete: string;
    expectedImpact: string;
  }> {
    return [
      {
        title: 'Update Page Titles',
        description: 'Add target keywords to existing page titles',
        timeToComplete: '2-4 hours',
        expectedImpact: '10-20% increase in organic clicks'
      },
      {
        title: 'Add Alt Text to Images',
        description: 'Include descriptive alt text for all images',
        timeToComplete: '3-6 hours',
        expectedImpact: '5-10% improvement in image search visibility'
      },
      {
        title: 'Create Google Business Profile',
        description: 'Set up and optimize Google Business listing',
        timeToComplete: '1-2 hours',
        expectedImpact: '20-40% increase in local search visibility'
      },
      {
        title: 'Add Social Media Links',
        description: 'Include links to social media profiles',
        timeToComplete: '30 minutes',
        expectedImpact: 'Improved brand consistency and social traffic'
      }
    ];
  }

  private createLongTermStrategy(aiAnalysis: AIAnalysisResult): {
    month1to3: string[];
    month4to6: string[];
    month7to12: string[];
  } {
    const score = aiAnalysis.overallScore;
    
    if (score <= 4) {
      return {
        month1to3: [
          'Implement all basic technical SEO fixes',
          'Optimize all page titles and meta descriptions', 
          'Set up Google Analytics and Search Console',
          'Create Google Business Profile and optimize'
        ],
        month4to6: [
          'Develop content calendar and publishing schedule',
          'Build initial backlink profile through outreach',
          'Implement local SEO strategy',
          'Add schema markup for rich snippets'
        ],
        month7to12: [
          'Scale content production to 2-4 pieces per week',
          'Develop industry partnerships for link building',
          'Expand to additional local markets',
          'Implement advanced SEO techniques'
        ]
      };
    } else if (score <= 7) {
      return {
        month1to3: [
          'Fine-tune existing SEO implementations',
          'Expand keyword targeting to long-tail terms',
          'Improve content depth and quality',
          'Optimize for featured snippets'
        ],
        month4to6: [
          'Build authority through thought leadership content',
          'Develop strategic partnerships for backlinks',
          'Implement advanced schema markup',
          'Optimize for voice search queries'
        ],
        month7to12: [
          'Expand content to new formats (video, podcasts)',
          'Develop industry expertise and E-A-T signals',
          'Target competitive keywords',
          'Implement international SEO if applicable'
        ]
      };
    } else {
      return {
        month1to3: [
          'Analyze and improve top-performing content',
          'Target competitive high-value keywords',
          'Implement advanced technical optimizations',
          'Develop content for different funnel stages'
        ],
        month4to6: [
          'Create comprehensive topic clusters',
          'Build industry authority through PR and mentions',
          'Optimize for emerging search features',
          'Develop content partnerships'
        ],
        month7to12: [
          'Expand to new content formats and channels',
          'Develop proprietary research and studies',
          'Target international markets',
          'Implement cutting-edge SEO techniques'
        ]
      };
    }
  }
}

// Export singleton instance
export const marketingReportGenerator = new MarketingReportGenerator();