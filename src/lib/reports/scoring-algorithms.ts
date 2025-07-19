import type { 
  AIAnalysisResult, 
  ReportRecommendation, 
  ImpactScore, 
  EffortScore 
} from './types';

export class ScoringAlgorithms {
  /**
   * Calculate impact score based on multiple factors
   */
  calculateImpactScore(
    recommendationType: string,
    websiteScore: number,
    businessType?: string,
    targetAudience?: string
  ): ImpactScore {
    let baseImpact = 5; // Default medium impact
    let reasoning = '';
    
    // Adjust based on recommendation type
    switch (recommendationType.toLowerCase()) {
      case 'title_optimization':
      case 'meta_description':
        baseImpact = this.calculateSeoImpact(websiteScore);
        reasoning = 'Meta tag optimization directly affects search rankings and click-through rates';
        break;
        
      case 'mobile_optimization':
        baseImpact = this.calculateMobileImpact(websiteScore);
        reasoning = 'Mobile optimization impacts 60%+ of website visitors';
        break;
        
      case 'trust_badges':
      case 'security_indicators':
        baseImpact = this.calculateTrustImpact(websiteScore);
        reasoning = 'Trust signals directly influence conversion rates and user confidence';
        break;
        
      case 'social_proof':
      case 'testimonials':
        baseImpact = this.calculateSocialProofImpact(websiteScore);
        reasoning = 'Social proof significantly influences purchase decisions and reduces anxiety';
        break;
        
      case 'cta_optimization':
        baseImpact = this.calculateCtaImpact(websiteScore);
        reasoning = 'Call-to-action optimization directly affects conversion funnel performance';
        break;
        
      case 'page_speed':
      case 'performance':
        baseImpact = this.calculatePerformanceImpact(websiteScore);
        reasoning = 'Page speed affects both user experience and search rankings';
        break;
        
      case 'schema_markup':
        baseImpact = this.calculateSchemaImpact(websiteScore);
        reasoning = 'Structured data improves search visibility and rich snippet opportunities';
        break;
        
      default:
        baseImpact = Math.max(8 - websiteScore, 3); // Lower scores = higher impact potential
        reasoning = 'General optimization recommendation with measurable business impact';
    }
    
    // Adjust for business context
    if (businessType) {
      baseImpact = this.adjustForBusinessType(baseImpact, recommendationType, businessType);
    }
    
    // Ensure score is within valid range
    baseImpact = Math.max(1, Math.min(10, Math.round(baseImpact)));
    
    return {
      score: baseImpact,
      category: this.categorizeImpact(baseImpact),
      reasoning,
      businessImpact: this.generateBusinessImpactExplanation(recommendationType, baseImpact)
    };
  }

  /**
   * Calculate effort score based on implementation complexity
   */
  calculateEffortScore(
    recommendationType: string,
    technicalComplexity: 'low' | 'medium' | 'high',
    skillLevel: 'beginner' | 'intermediate' | 'advanced'
  ): EffortScore {
    let baseEffort = 5; // Default medium effort
    let timeEstimate = '1-2 weeks';
    let reasoning = '';
    
    // Base effort by recommendation type
    switch (recommendationType.toLowerCase()) {
      case 'title_optimization':
      case 'meta_description':
      case 'alt_text':
        baseEffort = 2;
        timeEstimate = '2-4 hours';
        reasoning = 'Simple HTML/CMS changes requiring minimal technical skills';
        break;
        
      case 'trust_badges':
      case 'contact_info':
        baseEffort = 2;
        timeEstimate = '1-2 hours';
        reasoning = 'Basic content addition with minimal design work';
        break;
        
      case 'social_proof':
      case 'testimonials':
        baseEffort = 4;
        timeEstimate = '1-2 weeks';
        reasoning = 'Content collection and design work required';
        break;
        
      case 'mobile_optimization':
        baseEffort = 7;
        timeEstimate = '2-4 weeks';
        reasoning = 'Comprehensive responsive design changes needed';
        break;
        
      case 'page_speed':
      case 'performance':
        baseEffort = 6;
        timeEstimate = '1-3 weeks';
        reasoning = 'Technical optimization requiring development skills';
        break;
        
      case 'schema_markup':
        baseEffort = 5;
        timeEstimate = '1-2 weeks';
        reasoning = 'Technical implementation with structured data knowledge';
        break;
        
      case 'navigation_redesign':
        baseEffort = 8;
        timeEstimate = '3-6 weeks';
        reasoning = 'Major UX changes requiring design and development';
        break;
        
      case 'content_strategy':
        baseEffort = 6;
        timeEstimate = '2-4 weeks';
        reasoning = 'Content planning, creation, and implementation';
        break;
        
      default:
        baseEffort = 5;
        timeEstimate = '1-2 weeks';
        reasoning = 'Standard implementation requiring moderate effort';
    }
    
    // Adjust for technical complexity
    switch (technicalComplexity) {
      case 'low':
        baseEffort = Math.max(baseEffort - 1, 1);
        break;
      case 'high':
        baseEffort = Math.min(baseEffort + 2, 10);
        break;
    }
    
    // Adjust for skill level
    switch (skillLevel) {
      case 'beginner':
        baseEffort = Math.min(baseEffort + 1, 10);
        break;
      case 'advanced':
        baseEffort = Math.max(baseEffort - 1, 1);
        break;
    }
    
    // Ensure score is within valid range
    baseEffort = Math.max(1, Math.min(10, Math.round(baseEffort)));
    
    return {
      score: baseEffort,
      category: this.categorizeEffort(baseEffort),
      reasoning,
      timeEstimate: this.adjustTimeEstimate(timeEstimate, baseEffort),
      skillLevel: this.determineRequiredSkillLevel(baseEffort, recommendationType)
    };
  }

  /**
   * Prioritize recommendations based on impact/effort matrix
   */
  prioritizeRecommendations(recommendations: ReportRecommendation[]): ReportRecommendation[] {
    return recommendations
      .map(rec => ({
        ...rec,
        priorityScore: this.calculatePriorityScore(rec.impact.score, rec.effort.score)
      }))
      .sort((a, b) => {
        // Sort by priority score descending
        if (b.priorityScore !== a.priorityScore) {
          return b.priorityScore - a.priorityScore;
        }
        
        // Secondary sort by impact score descending
        if (b.impact.score !== a.impact.score) {
          return b.impact.score - a.impact.score;
        }
        
        // Tertiary sort by effort score ascending (lower effort preferred)
        return a.effort.score - b.effort.score;
      })
      .map(({ priorityScore, ...rec }) => rec); // Remove priorityScore from final result
  }

  /**
   * Calculate priority score using impact/effort matrix
   */
  private calculatePriorityScore(impact: number, effort: number): number {
    // Quick wins: High impact, low effort (best priority)
    if (impact >= 7 && effort <= 4) return 100;
    
    // Major projects: High impact, high effort (second priority)
    if (impact >= 7 && effort >= 7) return 80;
    
    // Fill-ins: Low impact, low effort (third priority)
    if (impact <= 5 && effort <= 4) return 60;
    
    // Thank-less tasks: Low impact, high effort (lowest priority)
    if (impact <= 5 && effort >= 7) return 20;
    
    // Everything else: Calculate weighted score
    // Formula: (impact^2 / effort) * 10
    return Math.round((Math.pow(impact, 2) / effort) * 10);
  }

  // Impact calculation methods
  private calculateSeoImpact(websiteScore: number): number {
    // SEO improvements have higher impact on lower-performing sites
    if (websiteScore <= 3) return 9; // Huge opportunity
    if (websiteScore <= 5) return 7; // Good opportunity
    if (websiteScore <= 7) return 5; // Moderate opportunity
    return 3; // Limited opportunity
  }

  private calculateMobileImpact(websiteScore: number): number {
    // Mobile optimization is always high impact due to traffic volume
    if (websiteScore <= 4) return 9;
    if (websiteScore <= 6) return 8;
    return 6;
  }

  private calculateTrustImpact(websiteScore: number): number {
    // Trust improvements have high impact on conversion
    if (websiteScore <= 4) return 8;
    if (websiteScore <= 6) return 7;
    return 5;
  }

  private calculateSocialProofImpact(websiteScore: number): number {
    // Social proof impact varies by current state
    if (websiteScore <= 3) return 8;
    if (websiteScore <= 6) return 6;
    return 4;
  }

  private calculateCtaImpact(websiteScore: number): number {
    // CTA optimization directly affects conversion funnel
    if (websiteScore <= 4) return 8;
    if (websiteScore <= 6) return 7;
    return 5;
  }

  private calculatePerformanceImpact(websiteScore: number): number {
    // Performance affects both UX and SEO
    if (websiteScore <= 3) return 7;
    if (websiteScore <= 6) return 6;
    return 4;
  }

  private calculateSchemaImpact(websiteScore: number): number {
    // Schema markup has moderate but consistent impact
    return Math.max(6 - Math.floor(websiteScore / 2), 3);
  }

  // Business type adjustments
  private adjustForBusinessType(
    baseImpact: number, 
    recommendationType: string, 
    businessType: string
  ): number {
    const adjustments: Record<string, Record<string, number>> = {
      'local_service': {
        'local_seo': 2,
        'trust_badges': 1,
        'contact_info': 2,
        'mobile_optimization': 1
      },
      'ecommerce': {
        'trust_badges': 2,
        'page_speed': 1,
        'mobile_optimization': 2,
        'social_proof': 1
      },
      'b2b': {
        'social_proof': 1,
        'content_strategy': 1,
        'trust_badges': 1
      }
    };

    const typeAdjustments = adjustments[businessType.toLowerCase()] || {};
    const adjustment = typeAdjustments[recommendationType.toLowerCase()] || 0;
    
    return Math.min(baseImpact + adjustment, 10);
  }

  // Categorization methods
  private categorizeImpact(score: number): 'low' | 'medium' | 'high' | 'critical' {
    if (score >= 8) return 'critical';
    if (score >= 6) return 'high';
    if (score >= 4) return 'medium';
    return 'low';
  }

  private categorizeEffort(score: number): 'low' | 'medium' | 'high' {
    if (score <= 3) return 'low';
    if (score <= 6) return 'medium';
    return 'high';
  }

  private adjustTimeEstimate(baseEstimate: string, effortScore: number): string {
    // Adjust time estimates based on effort score
    const timeMap: Record<string, string[]> = {
      '1-2 hours': ['30 minutes', '1-2 hours', '2-4 hours'],
      '2-4 hours': ['1-2 hours', '2-4 hours', '4-8 hours'],
      '1-2 weeks': ['3-5 days', '1-2 weeks', '2-3 weeks'],
      '2-4 weeks': ['1-2 weeks', '2-4 weeks', '4-6 weeks'],
      '3-6 weeks': ['2-4 weeks', '3-6 weeks', '6-8 weeks']
    };
    
    const options = timeMap[baseEstimate];
    if (!options) return baseEstimate;
    
    if (effortScore <= 3) return options[0];
    if (effortScore <= 6) return options[1];
    return options[2];
  }

  private determineRequiredSkillLevel(
    effortScore: number, 
    recommendationType: string
  ): 'beginner' | 'intermediate' | 'advanced' {
    // Technical recommendations require higher skill levels
    const technicalTypes = [
      'schema_markup', 'performance', 'mobile_optimization', 
      'navigation_redesign', 'custom_development'
    ];
    
    const isTechnical = technicalTypes.some(type => 
      recommendationType.toLowerCase().includes(type.toLowerCase())
    );
    
    if (effortScore <= 3) {
      return isTechnical ? 'intermediate' : 'beginner';
    } else if (effortScore <= 6) {
      return isTechnical ? 'advanced' : 'intermediate';
    } else {
      return 'advanced';
    }
  }

  private generateBusinessImpactExplanation(
    recommendationType: string, 
    impactScore: number
  ): string {
    const impactTemplates: Record<string, string> = {
      'title_optimization': 'Improved search rankings lead to more organic traffic and potential customers',
      'mobile_optimization': 'Better mobile experience increases conversions from 60%+ of mobile visitors',
      'trust_badges': 'Enhanced trust signals reduce conversion anxiety and increase purchase confidence',
      'social_proof': 'Customer testimonials influence purchase decisions and build credibility',
      'cta_optimization': 'Clear call-to-actions guide users toward desired actions and increase conversions',
      'page_speed': 'Faster loading times reduce bounce rates and improve user satisfaction',
      'schema_markup': 'Rich snippets in search results increase click-through rates and visibility'
    };
    
    const baseExplanation = impactTemplates[recommendationType] || 
                           'This optimization improves user experience and business performance';
    
    if (impactScore >= 8) {
      return `High Priority: ${baseExplanation}. Significant positive impact expected on revenue.`;
    } else if (impactScore >= 6) {
      return `Medium Priority: ${baseExplanation}. Noticeable improvement in business metrics expected.`;
    } else {
      return `Low Priority: ${baseExplanation}. Incremental improvement with long-term benefits.`;
    }
  }
}

// Export singleton instance
export const scoringAlgorithms = new ScoringAlgorithms();