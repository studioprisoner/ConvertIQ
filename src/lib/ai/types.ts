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

// Impact and Effort Scoring
export const impactScoreSchema = z.object({
  score: z.number().min(1).max(10), // 1-10 scale
  reasoning: z.string(),
  category: z.enum(['high', 'medium', 'low']),
});

export const effortScoreSchema = z.object({
  score: z.number().min(1).max(10), // 1-10 scale  
  reasoning: z.string(),
  category: z.enum(['low', 'medium', 'high']),
  estimatedHours: z.number().optional(),
});

// Conversion Psychology Analysis
export const conversionPsychologyAnalysisSchema = z.object({
  type: z.literal('conversion_psychology'),
  
  // Psychological triggers analysis
  psychologicalTriggers: z.object({
    scarcity: z.object({
      present: z.boolean(),
      effectiveness: z.number().min(1).max(10).optional(),
      recommendations: z.array(z.string()),
    }),
    socialProof: z.object({
      present: z.boolean(),
      types: z.array(z.enum(['testimonials', 'reviews', 'trust_badges', 'user_counts', 'social_media'])),
      effectiveness: z.number().min(1).max(10).optional(),
      recommendations: z.array(z.string()),
    }),
    authority: z.object({
      present: z.boolean(),
      indicators: z.array(z.enum(['credentials', 'awards', 'certifications', 'expert_content', 'media_mentions'])),
      effectiveness: z.number().min(1).max(10).optional(),
      recommendations: z.array(z.string()),
    }),
    reciprocity: z.object({
      present: z.boolean(),
      methods: z.array(z.enum(['free_content', 'trials', 'samples', 'helpful_resources'])),
      effectiveness: z.number().min(1).max(10).optional(),
      recommendations: z.array(z.string()),
    }),
    commitment: z.object({
      present: z.boolean(),
      methods: z.array(z.enum(['guarantees', 'warranties', 'return_policies', 'clear_expectations'])),
      effectiveness: z.number().min(1).max(10).optional(),
      recommendations: z.array(z.string()),
    }),
  }),
  
  // Trust indicators
  trustIndicators: z.object({
    securityBadges: z.boolean(),
    contactInformation: z.boolean(),
    aboutSection: z.boolean(),
    privacyPolicy: z.boolean(),
    termsOfService: z.boolean(),
    professionalDesign: z.number().min(1).max(10),
    recommendations: z.array(z.string()),
  }),
  
  // Overall analysis
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