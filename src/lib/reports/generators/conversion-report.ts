import { v4 as uuidv4 } from 'uuid';
import type { AIAnalysisResult } from '../../ai/types';
import type { 
  ConversionReportContent, 
  ReportRecommendation, 
  ReportGenerationInput,
  ImplementationGuide 
} from '../types';

export class ConversionReportGenerator {
  /**
   * Generate comprehensive Conversion Rate Improvement Report
   */
  async generateConversionReport(
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
        timeToSeeResults: this.calculateTimeToResults(overallScore),
      },
      
      uxAnalysis: {
        score: uxAnalysis?.overallScore || overallScore,
        mobileExperience: this.calculateMobileScore(aiAnalysis),
        navigationClarity: this.calculateNavigationScore(aiAnalysis),
        pageSpeed: this.calculatePageSpeedScore(aiAnalysis),
        usabilityIssues: this.identifyUsabilityIssues(aiAnalysis),
      },
      
      conversionPsychology: {
        score: conversionAnalysis?.overallScore || overallScore,
        trustSignals: this.calculateTrustSignalsScore(aiAnalysis),
        socialProof: this.calculateSocialProofScore(aiAnalysis),
        valueProposition: this.calculateValuePropositionScore(aiAnalysis),
        psychologicalTriggers: this.identifyPsychologicalTriggers(aiAnalysis),
      },
      
      salesOptimization: {
        score: this.calculateSalesOptimizationScore(aiAnalysis),
        ctaEffectiveness: this.calculateCtaEffectiveness(aiAnalysis),
        checkoutProcess: this.calculateCheckoutScore(aiAnalysis),
        leadCapture: this.calculateLeadCaptureScore(aiAnalysis),
        objectionHandling: this.calculateObjectionHandlingScore(aiAnalysis),
      },
      
      recommendations: this.generateConversionRecommendations(aiAnalysis),
      
      quickWins: this.identifyConversionQuickWins(aiAnalysis),
      
      conversionFunnel: this.analyzeConversionFunnel(aiAnalysis),
    };
  }

  private extractConversionFindings(aiAnalysis: AIAnalysisResult): string[] {
    const findings = [];
    
    // Extract from conversion psychology analysis
    if (aiAnalysis.conversionPsychology?.keyFindings) {
      findings.push(...aiAnalysis.conversionPsychology.keyFindings);
    }
    
    // Extract from UX analysis
    if (aiAnalysis.uxAnalysis?.keyFindings) {
      findings.push(...aiAnalysis.uxAnalysis.keyFindings);
    }
    
    // Extract general findings related to conversion
    findings.push(...aiAnalysis.keyInsights.filter(insight => 
      insight.toLowerCase().includes('conversion') ||
      insight.toLowerCase().includes('trust') ||
      insight.toLowerCase().includes('mobile') ||
      insight.toLowerCase().includes('cta') ||
      insight.toLowerCase().includes('user')
    ).slice(0, 3));
    
    // Add specific conversion-focused findings
    if (aiAnalysis.overallScore < 5) {
      findings.push('Significant conversion optimization opportunities identified');
    }
    
    if (aiAnalysis.conversionPsychology?.trustIndicators?.securityBadges === false) {
      findings.push('Missing trust signals affecting user confidence and conversions');
    }
    
    if (aiAnalysis.uxAnalysis?.mobileOptimization?.score < 6) {
      findings.push('Mobile experience issues limiting mobile conversions');
    }
    
    return findings.slice(0, 5);
  }

  private extractConversionTopPriorities(aiAnalysis: AIAnalysisResult): string[] {
    const priorities = [];
    
    // From conversion psychology priorities
    if (aiAnalysis.conversionPsychology?.priorityRecommendations) {
      priorities.push(...aiAnalysis.conversionPsychology.priorityRecommendations.slice(0, 2));
    }
    
    // High-impact conversion priorities based on score
    if (aiAnalysis.overallScore < 5) {
      priorities.push('Build trust and credibility foundation');
      priorities.push('Optimize mobile user experience');
      priorities.push('Implement clear call-to-action strategy');
    } else if (aiAnalysis.overallScore < 7) {
      priorities.push('Enhance psychological triggers and social proof');
      priorities.push('Optimize conversion funnel and reduce friction');
      priorities.push('Improve value proposition clarity');
    } else {
      priorities.push('Fine-tune high-performing conversion elements');
      priorities.push('Test advanced psychological strategies');
      priorities.push('Optimize for micro-conversions and retention');
    }
    
    return priorities.slice(0, 3);
  }

  private calculateConversionIncrease(score: number): string {
    if (score <= 3) return '50-100%';
    if (score <= 5) return '30-60%';
    if (score <= 7) return '15-35%';
    return '5-20%';
  }

  private calculateTimeToResults(score: number): string {
    if (score <= 3) return '1-2 weeks';
    if (score <= 6) return '2-4 weeks';
    return '4-8 weeks';
  }

  private calculateMobileScore(aiAnalysis: AIAnalysisResult): number {
    const uxAnalysis = aiAnalysis.uxAnalysis;
    if (uxAnalysis?.mobileOptimization?.score) {
      return uxAnalysis.mobileOptimization.score;
    }
    
    // Check for mobile indicators in insights
    const hasMobileIssues = aiAnalysis.keyInsights.some(insight => 
      insight.toLowerCase().includes('mobile') && 
      (insight.toLowerCase().includes('issue') || insight.toLowerCase().includes('problem'))
    );
    
    return hasMobileIssues ? Math.max(aiAnalysis.overallScore - 2, 1) : aiAnalysis.overallScore;
  }

  private calculateNavigationScore(aiAnalysis: AIAnalysisResult): number {
    const uxAnalysis = aiAnalysis.uxAnalysis;
    if (uxAnalysis?.navigation?.score) {
      return uxAnalysis.navigation.score;
    }
    
    // Check for navigation clarity indicators
    const hasNavigationIssues = aiAnalysis.keyInsights.some(insight => 
      insight.toLowerCase().includes('navigation') ||
      insight.toLowerCase().includes('menu') ||
      insight.toLowerCase().includes('wayfinding')
    );
    
    return hasNavigationIssues ? Math.max(aiAnalysis.overallScore - 1, 1) : aiAnalysis.overallScore;
  }

  private calculatePageSpeedScore(aiAnalysis: AIAnalysisResult): number {
    const uxAnalysis = aiAnalysis.uxAnalysis;
    if (uxAnalysis?.performance?.score) {
      return uxAnalysis.performance.score;
    }
    
    // Check for performance indicators in insights
    const hasPerformanceIssues = aiAnalysis.keyInsights.some(insight => 
      insight.toLowerCase().includes('speed') ||
      insight.toLowerCase().includes('performance') ||
      insight.toLowerCase().includes('loading')
    );
    
    return hasPerformanceIssues ? Math.max(aiAnalysis.overallScore - 1, 1) : aiAnalysis.overallScore;
  }

  private identifyUsabilityIssues(aiAnalysis: AIAnalysisResult): string[] {
    const issues = [];
    
    // Extract from UX analysis
    if (aiAnalysis.uxAnalysis?.keyFindings) {
      issues.push(...aiAnalysis.uxAnalysis.keyFindings);
    }
    
    // Common usability issues based on analysis
    if (aiAnalysis.uxAnalysis?.mobileOptimization?.score < 6) {
      issues.push('Mobile interface not optimized for touch interactions');
    }
    
    if (aiAnalysis.uxAnalysis?.navigation?.score < 6) {
      issues.push('Navigation structure causes user confusion');
    }
    
    if (aiAnalysis.uxAnalysis?.performance?.score < 6) {
      issues.push('Slow loading times frustrating users');
    }
    
    // General usability issues
    issues.push('Form design may be causing abandonment');
    issues.push('Information architecture needs improvement');
    
    return issues.slice(0, 5);
  }

  private calculateTrustSignalsScore(aiAnalysis: AIAnalysisResult): number {
    const trustIndicators = aiAnalysis.conversionPsychology?.trustIndicators;
    if (!trustIndicators) return Math.max(aiAnalysis.overallScore - 1, 1);
    
    let score = 0;
    let factors = 0;
    
    if (trustIndicators.securityBadges !== undefined) {
      score += trustIndicators.securityBadges ? 10 : 2;
      factors++;
    }
    
    if (trustIndicators.contactInformation !== undefined) {
      score += trustIndicators.contactInformation ? 8 : 3;
      factors++;
    }
    
    if (trustIndicators.aboutSection !== undefined) {
      score += trustIndicators.aboutSection ? 8 : 3;
      factors++;
    }
    
    if (trustIndicators.professionalDesign !== undefined) {
      score += trustIndicators.professionalDesign;
      factors++;
    }
    
    return factors > 0 ? Math.round(score / factors) : aiAnalysis.overallScore;
  }

  private calculateSocialProofScore(aiAnalysis: AIAnalysisResult): number {
    const psychologyAnalysis = aiAnalysis.conversionPsychology;
    if (psychologyAnalysis?.psychologicalTriggers?.socialProof?.effectiveness) {
      return psychologyAnalysis.psychologicalTriggers.socialProof.effectiveness;
    }
    
    // Check for social proof indicators
    const hasSocialProof = aiAnalysis.keyInsights.some(insight => 
      insight.toLowerCase().includes('testimonial') ||
      insight.toLowerCase().includes('review') ||
      insight.toLowerCase().includes('social proof')
    );
    
    return hasSocialProof ? Math.min(aiAnalysis.overallScore + 1, 10) : Math.max(aiAnalysis.overallScore - 2, 1);
  }

  private calculateValuePropositionScore(aiAnalysis: AIAnalysisResult): number {
    // Check for value proposition clarity indicators
    const hasValueProp = aiAnalysis.keyInsights.some(insight => 
      insight.toLowerCase().includes('value') ||
      insight.toLowerCase().includes('benefit') ||
      insight.toLowerCase().includes('proposition')
    );
    
    const hasClearMessaging = aiAnalysis.summary.toLowerCase().includes('clear') ||
                             aiAnalysis.summary.toLowerCase().includes('compelling');
    
    let score = aiAnalysis.overallScore;
    if (hasValueProp && hasClearMessaging) score = Math.min(score + 1, 10);
    if (!hasValueProp || !hasClearMessaging) score = Math.max(score - 1, 1);
    
    return score;
  }

  private identifyPsychologicalTriggers(aiAnalysis: AIAnalysisResult): string[] {
    const triggers = [];
    
    const psychology = aiAnalysis.conversionPsychology?.psychologicalTriggers;
    
    if (psychology?.scarcity?.present) {
      triggers.push('Scarcity - Limited availability messaging');
    }
    
    if (psychology?.socialProof?.present) {
      triggers.push('Social Proof - Customer testimonials and reviews');
    }
    
    if (psychology?.authority?.present) {
      triggers.push('Authority - Expert credentials and certifications');
    }
    
    if (psychology?.reciprocity?.present) {
      triggers.push('Reciprocity - Free resources and value-first approach');
    }
    
    if (psychology?.commitment?.present) {
      triggers.push('Commitment - Clear guarantees and expectations');
    }
    
    // If no specific triggers identified, provide general ones
    if (triggers.length === 0) {
      triggers.push('Social validation opportunities');
      triggers.push('Trust and credibility building');
      triggers.push('Clear value demonstration');
    }
    
    return triggers;
  }

  private calculateSalesOptimizationScore(aiAnalysis: AIAnalysisResult): number {
    // Average of various sales-related scores
    const ctaScore = this.calculateCtaEffectiveness(aiAnalysis);
    const trustScore = this.calculateTrustSignalsScore(aiAnalysis);
    const valueScore = this.calculateValuePropositionScore(aiAnalysis);
    
    return Math.round((ctaScore + trustScore + valueScore) / 3);
  }

  private calculateCtaEffectiveness(aiAnalysis: AIAnalysisResult): number {
    // Check for CTA-related insights
    const hasCtaIssues = aiAnalysis.keyInsights.some(insight => 
      insight.toLowerCase().includes('cta') ||
      insight.toLowerCase().includes('call to action') ||
      insight.toLowerCase().includes('button')
    );
    
    if (hasCtaIssues) {
      return Math.max(aiAnalysis.overallScore - 1, 1);
    }
    
    return aiAnalysis.overallScore;
  }

  private calculateCheckoutScore(aiAnalysis: AIAnalysisResult): number {
    // Check for e-commerce indicators
    const hasEcommerce = aiAnalysis.keyInsights.some(insight => 
      insight.toLowerCase().includes('checkout') ||
      insight.toLowerCase().includes('cart') ||
      insight.toLowerCase().includes('purchase')
    );
    
    return hasEcommerce ? aiAnalysis.overallScore : Math.max(aiAnalysis.overallScore - 1, 1);
  }

  private calculateLeadCaptureScore(aiAnalysis: AIAnalysisResult): number {
    // Check for lead capture forms
    const hasLeadCapture = aiAnalysis.keyInsights.some(insight => 
      insight.toLowerCase().includes('form') ||
      insight.toLowerCase().includes('email') ||
      insight.toLowerCase().includes('contact')
    );
    
    return hasLeadCapture ? aiAnalysis.overallScore : Math.max(aiAnalysis.overallScore - 1, 1);
  }

  private calculateObjectionHandlingScore(aiAnalysis: AIAnalysisResult): number {
    // Check for objection handling elements
    const hasFaq = aiAnalysis.keyInsights.some(insight => 
      insight.toLowerCase().includes('faq') ||
      insight.toLowerCase().includes('guarantee') ||
      insight.toLowerCase().includes('policy')
    );
    
    return hasFaq ? Math.min(aiAnalysis.overallScore + 1, 10) : Math.max(aiAnalysis.overallScore - 1, 1);
  }

  private generateConversionRecommendations(aiAnalysis: AIAnalysisResult): ReportRecommendation[] {
    const recommendations: ReportRecommendation[] = [];
    
    // Trust signals recommendation
    if (aiAnalysis.conversionPsychology?.trustIndicators?.securityBadges === false) {
      recommendations.push(this.createConversionRecommendation(
        'Add Security Trust Badges',
        'Display SSL certificates, payment security badges, and privacy certifications to increase user trust and confidence',
        'conversion',
        'high',
        { score: 8, category: 'high', reasoning: 'Trust signals directly impact conversion rates', businessImpact: 'Increases user confidence leading to higher conversion rates' },
        { score: 2, category: 'low', reasoning: 'Simple addition of badge images', timeEstimate: '1-2 hours', skillLevel: 'beginner' },
        this.createTrustBadgesGuide()
      ));
    }
    
    // Mobile optimization recommendation
    if (aiAnalysis.uxAnalysis?.mobileOptimization?.score < 6) {
      recommendations.push(this.createConversionRecommendation(
        'Optimize Mobile User Experience',
        'Improve mobile interface design, touch targets, and navigation for better mobile conversions',
        'ux',
        'high',
        { score: 9, category: 'high', reasoning: 'Mobile traffic represents 60%+ of users', businessImpact: 'Significantly improves mobile conversion rates' },
        { score: 7, category: 'medium', reasoning: 'Requires responsive design changes', timeEstimate: '2-4 weeks', skillLevel: 'intermediate' },
        this.createMobileOptimizationGuide()
      ));
    }
    
    // Social proof recommendation
    if (aiAnalysis.conversionPsychology?.psychologicalTriggers?.socialProof?.present === false) {
      recommendations.push(this.createConversionRecommendation(
        'Implement Social Proof Elements',
        'Add customer testimonials, reviews, and trust indicators to build credibility and encourage conversions',
        'conversion',
        'medium',
        { score: 7, category: 'medium', reasoning: 'Social proof significantly influences purchase decisions', businessImpact: 'Builds trust and encourages user action' },
        { score: 5, category: 'medium', reasoning: 'Requires content creation and design work', timeEstimate: '1-2 weeks', skillLevel: 'intermediate' },
        this.createSocialProofGuide()
      ));
    }
    
    return recommendations.slice(0, 6); // Limit to top recommendations
  }

  private createConversionRecommendation(
    title: string,
    description: string,
    category: 'conversion' | 'ux' | 'design',
    priority: 'low' | 'medium' | 'high',
    impact: { score: number; category: string; reasoning: string; businessImpact: string },
    effort: { score: number; category: string; reasoning: string; timeEstimate: string; skillLevel: string },
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
      expectedOutcome: `Improved conversion rate within ${effort.timeEstimate}`,
      measurementStrategy: 'Track conversion rate, user engagement, and goal completions before and after implementation'
    };
  }

  private createTrustBadgesGuide(): ImplementationGuide {
    return {
      overview: 'Add security and trust badges to increase user confidence and reduce conversion anxiety.',
      prerequisites: ['SSL certificate installed', 'Access to website design/HTML'],
      steps: [
        {
          step: 1,
          title: 'Obtain Trust Badges',
          description: 'Gather appropriate security and trust certifications',
          details: [
            'SSL certificate badge from your provider',
            'Payment processor security badges (PayPal, Stripe)',
            'Privacy compliance badges (if applicable)',
            'Industry certification badges'
          ],
          tips: ['Only display badges you actually have certifications for']
        },
        {
          step: 2,
          title: 'Strategic Placement',
          description: 'Position trust badges in high-visibility, decision-making areas',
          details: [
            'Near checkout buttons and forms',
            'In website footer for general trust',
            'On payment and contact pages',
            'Next to pricing information'
          ],
          warnings: ['Avoid cluttering the design with too many badges']
        }
      ],
      successMetrics: [
        'Increased form completion rates',
        'Reduced checkout abandonment',
        'Higher overall conversion rate'
      ],
      timeline: '1-2 hours for implementation, immediate impact on user confidence',
      difficulty: 'beginner'
    };
  }

  private createMobileOptimizationGuide(): ImplementationGuide {
    return {
      overview: 'Optimize website for mobile users to improve mobile conversion rates and user experience.',
      prerequisites: ['Responsive design framework', 'Mobile testing tools', 'Basic CSS knowledge'],
      steps: [
        {
          step: 1,
          title: 'Audit Mobile Experience',
          description: 'Test website on various mobile devices and screen sizes',
          details: [
            'Test on actual mobile devices',
            'Use browser developer tools for simulation',
            'Check touch target sizes (minimum 44px)',
            'Verify text readability without zooming'
          ]
        },
        {
          step: 2,
          title: 'Optimize Touch Interactions',
          description: 'Ensure all interactive elements are touch-friendly',
          details: [
            'Increase button and link sizes',
            'Add adequate spacing between elements',
            'Optimize form field sizes for mobile',
            'Implement mobile-friendly navigation'
          ]
        },
        {
          step: 3,
          title: 'Improve Page Speed',
          description: 'Optimize loading performance for mobile networks',
          details: [
            'Compress and optimize images',
            'Minimize CSS and JavaScript',
            'Implement lazy loading',
            'Use responsive images'
          ]
        }
      ],
      successMetrics: [
        'Improved mobile conversion rate',
        'Reduced mobile bounce rate',
        'Faster mobile page load times',
        'Better mobile usability scores'
      ],
      timeline: '2-4 weeks for comprehensive mobile optimization',
      difficulty: 'intermediate'
    };
  }

  private createSocialProofGuide(): ImplementationGuide {
    return {
      overview: 'Implement social proof elements to build trust and credibility with potential customers.',
      prerequisites: ['Customer feedback/testimonials', 'Design tools or templates'],
      steps: [
        {
          step: 1,
          title: 'Collect Social Proof',
          description: 'Gather authentic customer testimonials and reviews',
          details: [
            'Request testimonials from satisfied customers',
            'Screenshot positive social media mentions',
            'Collect case studies and success stories',
            'Document customer logos (with permission)'
          ],
          tips: ['Focus on specific, detailed testimonials over generic praise']
        },
        {
          step: 2,
          title: 'Design Social Proof Elements',
          description: 'Create visually appealing social proof displays',
          details: [
            'Design testimonial cards with customer photos',
            'Create review displays with star ratings',
            'Design customer logo sections',
            'Create trust indicator sections'
          ]
        },
        {
          step: 3,
          title: 'Strategic Placement',
          description: 'Position social proof where it will have maximum impact',
          details: [
            'Homepage hero section or nearby',
            'Product/service pages before CTAs',
            'Checkout pages to reduce abandonment',
            'Landing pages for paid traffic'
          ]
        }
      ],
      successMetrics: [
        'Increased conversion rates',
        'Improved time on page',
        'Higher click-through rates on CTAs',
        'Reduced bounce rates'
      ],
      timeline: '1-2 weeks for collection and implementation',
      difficulty: 'intermediate'
    };
  }

  private identifyConversionQuickWins(aiAnalysis: AIAnalysisResult): Array<{
    title: string;
    description: string;
    timeToComplete: string;
    expectedImpact: string;
  }> {
    const quickWins = [];
    
    // Trust badges quick win
    if (aiAnalysis.conversionPsychology?.trustIndicators?.securityBadges === false) {
      quickWins.push({
        title: 'Add Security Trust Badges',
        description: 'Display SSL and payment security badges',
        timeToComplete: '1-2 hours',
        expectedImpact: '5-15% increase in conversion rate'
      });
    }
    
    // CTA optimization quick win
    quickWins.push({
      title: 'Optimize Call-to-Action Buttons',
      description: 'Make CTAs more prominent and action-oriented',
      timeToComplete: '2-4 hours',
      expectedImpact: '10-25% increase in click-through rate'
    });
    
    // Contact information quick win
    if (aiAnalysis.conversionPsychology?.trustIndicators?.contactInformation === false) {
      quickWins.push({
        title: 'Add Clear Contact Information',
        description: 'Display phone, email, and address prominently',
        timeToComplete: '30 minutes',
        expectedImpact: '5-10% improvement in trust and conversions'
      });
    }
    
    // Form optimization quick win
    quickWins.push({
      title: 'Simplify Contact Forms',
      description: 'Reduce form fields and improve design',
      timeToComplete: '1-3 hours',
      expectedImpact: '15-30% increase in form completions'
    });
    
    return quickWins.slice(0, 4);
  }

  private analyzeConversionFunnel(aiAnalysis: AIAnalysisResult): {
    awarenessStage: string[];
    considerationStage: string[];
    decisionStage: string[];
    retentionStage: string[];
  } {
    const score = aiAnalysis.overallScore;
    
    return {
      awarenessStage: [
        'Optimize landing pages for first impressions',
        'Improve page loading speed for better user experience',
        'Enhance mobile experience for mobile visitors',
        'Create compelling value proposition messaging'
      ],
      considerationStage: [
        'Add social proof and customer testimonials',
        'Provide detailed product/service information',
        'Implement educational content and resources',
        'Address common objections and concerns'
      ],
      decisionStage: [
        'Optimize call-to-action buttons and placement',
        'Add trust signals and security badges',
        'Simplify checkout or contact process',
        'Provide clear pricing and guarantee information'
      ],
      retentionStage: [
        'Implement follow-up email sequences',
        'Create customer onboarding process',
        'Develop loyalty programs and incentives',
        'Gather and showcase customer success stories'
      ]
    };
  }
}

// Export singleton instance
export const conversionReportGenerator = new ConversionReportGenerator();