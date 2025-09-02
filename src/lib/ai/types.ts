import { z } from 'zod';

// AI Analysis Types
export const analysisTypeSchema = z.enum([
  'conversion_psychology',
  'ux_ui_analysis', 
  'technical_seo',
  'content_messaging',
  'comprehensive'
]);

export type AnalysisType = z.infer<typeof analysisTypeSchema>;

// CovertIQ Revenue Impact Scoring
export const revenueImpactSchema = z.object({
  conversionRateIncrease: z.string().describe("Estimated percentage point improvement (e.g., '+2.3% conversion rate')"),
  monthlyRevenueImpact: z.string().describe("Dollar amount projection based on typical traffic"),
  aovImpact: z.string().describe("Average Order Value improvement potential"),
  implementationROI: z.string().describe("Payback period and cost-benefit analysis"),
  timeframe: z.enum(['immediate', 'short-term', 'medium-term', 'long-term']),
});

// Enhanced Impact and Effort Scoring with Revenue Focus
export const impactScoreSchema = z.object({
  score: z.number().min(1).max(10), // 1-10 scale (legacy support)
  reasoning: z.string(),
  category: z.enum(['high', 'medium', 'low']),
  revenueImpact: revenueImpactSchema.optional(), // CovertIQ enhancement
});

export const effortScoreSchema = z.object({
  score: z.number().min(1).max(10), // 1-10 scale  
  reasoning: z.string(),
  category: z.enum(['low', 'medium', 'high']),
  estimatedHours: z.number().optional(),
  resourceRequirements: z.array(z.string()).optional(), // CovertIQ enhancement
  technicalComplexity: z.enum(['basic', 'intermediate', 'advanced']).optional(),
});

// Conversion Psychology Analysis with CovertIQ Enhancement
export const conversionPsychologyAnalysisSchema = z.object({
  type: z.literal('conversion_psychology'),
  
  // Enhanced Website overview with business intelligence
  websiteOverview: z.object({
    businessType: z.string(),
    businessModel: z.string().optional(), // B2C, B2B, marketplace, etc.
    targetAudience: z.string(),
    overallScore: z.number().min(1).max(10), // legacy support
    summary: z.string(),
    revenueModel: z.string().optional(), // subscription, one-time, freemium, etc.
    competitivePositioning: z.string().optional(),
  }),
  
  // Revenue projections (CovertIQ enhancement)
  revenueProjections: z.object({
    conversionRateIncrease: z.string(),
    monthlyRevenueImpact: z.string(),
    aovImpact: z.string(),
    implementationROI: z.string(),
  }).optional(),
  
  // Mobile-first revenue opportunities
  mobileRevenueOpportunities: z.array(z.object({
    opportunity: z.string(),
    impact: z.string(),
    implementation: z.string(),
  })).optional(),
  
  // Platform-specific intelligence
  platformIntelligence: z.object({
    platform: z.enum(['shopify', 'woocommerce', 'custom', 'squarespace', 'webflow', 'other']).optional(),
    recommendations: z.array(z.string()),
    optimizations: z.array(z.string()),
  }).optional(),
  
  // Enhanced psychological triggers analysis with authenticity assessment
  psychologicalTriggers: z.object({
    scarcity: z.object({
      score: z.number().min(1).max(10), // legacy support
      currentImplementation: z.string(),
      opportunities: z.string(),
      authenticity: z.enum(['authentic', 'questionable', 'fake']).optional(),
      revenueImpact: z.string().optional(), // CovertIQ enhancement
    }),
    socialProof: z.object({
      score: z.number().min(1).max(10),
      currentImplementation: z.string(),
      opportunities: z.string(),
      credibility: z.enum(['high', 'medium', 'low']).optional(),
      impactOnConversion: z.string().optional(),
    }),
    authority: z.object({
      score: z.number().min(1).max(10),
      currentImplementation: z.string(),
      opportunities: z.string(),
      credibilitySignals: z.array(z.string()).optional(),
      purchaseConfidenceImpact: z.string().optional(),
    }),
    reciprocity: z.object({
      score: z.number().min(1).max(10),
      currentImplementation: z.string(),
      opportunities: z.string(),
      valueProvided: z.string().optional(),
      purchaseObligationLevel: z.enum(['strong', 'moderate', 'weak']).optional(),
    }),
    commitment: z.object({
      score: z.number().min(1).max(10),
      currentImplementation: z.string(),
      opportunities: z.string(),
      riskReversalStrength: z.string().optional(),
      barrierRemovalImpact: z.string().optional(),
    }),
  }),
  
  // Trust indicators
  trustIndicators: z.object({
    score: z.number().min(1).max(10),
    strengths: z.array(z.string()),
    weaknesses: z.array(z.string()),
  }),
  
  // Top recommendations
  topRecommendations: z.array(z.object({
    title: z.string(),
    description: z.string(),
    implementation: z.array(z.string()),
    impact: z.number().min(1).max(10),
    effort: z.number().min(1).max(10),
    priority: z.number().min(1).max(10),
    whyItMatters: z.string(),
  })),
  
  // Ethical compliance
  ethicalCompliance: z.object({
    status: z.string(),
    concerns: z.string(),
    recommendations: z.array(z.string()),
  }),
  
  // Immediate actions
  immediateActions: z.object({
    priority1: z.string(),
    priority2: z.string(),
    priority3: z.string(),
  }),
  
  // CovertIQ Strategic Enhancement Fields
  quickWins: z.array(z.object({
    title: z.string(),
    description: z.string(),
    revenueImpact: z.string(),
    implementationTime: z.string(),
  })).optional(),
  
  strategicInitiatives: z.array(z.object({
    title: z.string(),
    description: z.string(),
    revenueUpside: z.string(),
    timeframe: z.string(),
  })).optional(),
  
  competitiveAdvantage: z.array(z.object({
    opportunity: z.string(),
    differentiator: z.string(),
    implementation: z.string(),
  })).optional(),
  
  implementationPriority: z.object({
    phase1: z.array(z.string()).describe("Immediate revenue opportunities (0-30 days)"),
    phase2: z.array(z.string()).describe("Strategic improvements (1-3 months)"),
    phase3: z.array(z.string()).describe("Competitive advantage initiatives (3-6 months)"),
  }).optional(),
  
  // Legacy fields for backward compatibility
  overallScore: z.number().min(1).max(10),
  keyFindings: z.array(z.string()),
  priorityRecommendations: z.array(z.string()),
});

// UX/UI Analysis  
export const uxAnalysisSchema = z.object({
  type: z.literal('ux_ui_analysis'),
  
  // Mobile responsiveness
  mobileOptimization: z.object({
    hasViewportMeta: z.boolean(),
    mobileFirstDesign: z.boolean(),
    touchFriendly: z.boolean(),
    readableText: z.boolean(),
    appropriateImageSizes: z.boolean(),
    score: z.number().min(1).max(10),
    recommendations: z.array(z.string()),
  }),
  
  // Navigation analysis
  navigation: z.object({
    clear: z.boolean(),
    consistent: z.boolean(),
    mobileMenu: z.boolean(),
    breadcrumbs: z.boolean(),
    searchFunction: z.boolean(),
    score: z.number().min(1).max(10),
    recommendations: z.array(z.string()),
  }),
  
  // Page speed indicators
  performance: z.object({
    loadTimeEstimate: z.string(),
    imageOptimization: z.boolean(),
    externalResourcesOptimized: z.boolean(),
    score: z.number().min(1).max(10),
    recommendations: z.array(z.string()),
  }),
  
  // Layout and design
  layout: z.object({
    visualHierarchy: z.number().min(1).max(10),
    whitespace: z.number().min(1).max(10),
    colorContrast: z.number().min(1).max(10),
    consistency: z.number().min(1).max(10),
    recommendations: z.array(z.string()),
  }),
  
  // Overall UX score
  overallScore: z.number().min(1).max(10),
  keyFindings: z.array(z.string()),
  priorityRecommendations: z.array(z.string()),
});

// Technical SEO Analysis
export const technicalSeoAnalysisSchema = z.object({
  type: z.literal('technical_seo'),
  
  // Meta tags analysis
  metaTags: z.object({
    titleTag: z.object({
      present: z.boolean(),
      length: z.number().optional(),
      optimized: z.boolean(),
      recommendations: z.array(z.string()),
    }),
    metaDescription: z.object({
      present: z.boolean(),
      length: z.number().optional(),
      optimized: z.boolean(),
      recommendations: z.array(z.string()),
    }),
    headingStructure: z.object({
      hasH1: z.boolean(),
      properHierarchy: z.boolean(),
      keywordOptimized: z.boolean(),
      recommendations: z.array(z.string()),
    }),
  }),
  
  // Schema markup
  schemaMarkup: z.object({
    present: z.boolean(),
    types: z.array(z.string()),
    recommendations: z.array(z.string()),
  }),
  
  // Images SEO
  imageSeo: z.object({
    altTextPresent: z.number(), // percentage
    optimizedFilenames: z.boolean(),
    appropriateSizes: z.boolean(),
    recommendations: z.array(z.string()),
  }),
  
  // Overall SEO score
  overallScore: z.number().min(1).max(10),
  keyFindings: z.array(z.string()),
  priorityRecommendations: z.array(z.string()),
});

// Content and Messaging Analysis
export const contentAnalysisSchema = z.object({
  type: z.literal('content_messaging'),
  
  // Call-to-action analysis
  ctaAnalysis: z.object({
    count: z.number(),
    clarity: z.number().min(1).max(10),
    prominence: z.number().min(1).max(10),
    actionOriented: z.boolean(),
    urgency: z.boolean(),
    recommendations: z.array(z.string()),
  }),
  
  // Content clarity and persuasiveness
  messaging: z.object({
    clarity: z.number().min(1).max(10),
    valueProposition: z.number().min(1).max(10),
    benefitsFocused: z.boolean(),
    emotionalConnection: z.number().min(1).max(10),
    readability: z.number().min(1).max(10),
    recommendations: z.array(z.string()),
  }),
  
  // Content structure
  structure: z.object({
    scannable: z.boolean(),
    logicalFlow: z.boolean(),
    appropriateLength: z.boolean(),
    headingsUsed: z.boolean(),
    recommendations: z.array(z.string()),
  }),
  
  // Overall content score
  overallScore: z.number().min(1).max(10),
  keyFindings: z.array(z.string()),
  priorityRecommendations: z.array(z.string()),
});

// Complete AI Analysis Result
export const aiAnalysisResultSchema = z.object({
  id: z.string().uuid(),
  websiteId: z.string().uuid(),
  analysisType: analysisTypeSchema,
  timestamp: z.string().datetime(),
  
  // Analysis results (one will be present based on type)
  conversionPsychology: conversionPsychologyAnalysisSchema.optional(),
  uxAnalysis: uxAnalysisSchema.optional(),
  technicalSeo: technicalSeoAnalysisSchema.optional(),
  contentAnalysis: contentAnalysisSchema.optional(),
  
  // Recommendations with impact/effort scoring
  recommendations: z.array(z.object({
    id: z.string().uuid(),
    title: z.string(),
    description: z.string(),
    category: z.enum(['conversion', 'ux', 'seo', 'content', 'technical']),
    impact: impactScoreSchema,
    effort: effortScoreSchema,
    implementation: z.object({
      steps: z.array(z.string()),
      codeSnippets: z.array(z.object({
        language: z.string(),
        code: z.string(),
        description: z.string(),
      })).optional(),
      resources: z.array(z.object({
        title: z.string(),
        url: z.string(),
        type: z.enum(['documentation', 'tool', 'guide', 'article']),
      })).optional(),
    }),
    whyItMatters: z.string(),
    priority: z.enum(['high', 'medium', 'low']),
  })),
  
  // Overall assessment
  overallScore: z.number().min(1).max(10),
  summary: z.string(),
  keyInsights: z.array(z.string()),
  
  // Ethical compliance
  ethicalCompliance: z.object({
    noDarkPatterns: z.boolean(),
    transparentRecommendations: z.boolean(),
    userFocused: z.boolean(),
    notes: z.array(z.string()),
  }),
  
  // Analysis metadata
  metadata: z.object({
    processingTime: z.number(), // in milliseconds
    modelUsed: z.string(),
    promptVersion: z.string(),
    confidence: z.number().min(0).max(1),
  }),
});

export type ConversionPsychologyAnalysis = z.infer<typeof conversionPsychologyAnalysisSchema>;
export type UxAnalysis = z.infer<typeof uxAnalysisSchema>;
export type TechnicalSeoAnalysis = z.infer<typeof technicalSeoAnalysisSchema>;
export type ContentAnalysis = z.infer<typeof contentAnalysisSchema>;
export type AIAnalysisResult = z.infer<typeof aiAnalysisResultSchema>;
export type ImpactScore = z.infer<typeof impactScoreSchema>;
export type EffortScore = z.infer<typeof effortScoreSchema>;
export type RevenueImpact = z.infer<typeof revenueImpactSchema>;