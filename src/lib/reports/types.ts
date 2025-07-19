import { z } from 'zod';

// Progress Tracking Types
export const recommendationStatusSchema = z.enum(['pending', 'in_progress', 'completed', 'dismissed']);
export type RecommendationStatus = z.infer<typeof recommendationStatusSchema>;

export const milestoneSchema = z.object({
  id: z.string(),
  title: z.string(),
  description: z.string(),
  isCompleted: z.boolean(),
  completedAt: z.date().optional(),
  targetDate: z.date().optional(),
  order: z.number(),
});

export const measurementSchema = z.object({
  id: z.string(),
  metric: z.string(),
  baselineValue: z.number(),
  currentValue: z.number(),
  targetValue: z.number(),
  measurementDate: z.date(),
  notes: z.string().optional(),
});

export const blockerSchema = z.object({
  id: z.string(),
  title: z.string(),
  description: z.string(),
  severity: z.enum(['low', 'medium', 'high']),
  isResolved: z.boolean(),
  resolvedAt: z.date().optional(),
  createdAt: z.date(),
});

export const progressSchema = z.object({
  id: z.string(),
  status: recommendationStatusSchema,
  startedAt: z.date().optional(),
  completedAt: z.date().optional(),
  progressNotes: z.array(z.string()),
  milestones: z.array(milestoneSchema),
  measurements: z.array(measurementSchema),
  estimatedCompletionDate: z.date().optional(),
  actualEffort: z.number().optional(),
  blockers: z.array(blockerSchema),
});

export type RecommendationMilestone = z.infer<typeof milestoneSchema>;
export type RecommendationMeasurement = z.infer<typeof measurementSchema>;
export type RecommendationBlocker = z.infer<typeof blockerSchema>;
export type RecommendationProgress = z.infer<typeof progressSchema>;

// Report Types
export const reportTypeSchema = z.enum(['marketing', 'conversion', 'performance', 'comprehensive']);
export type ReportType = z.infer<typeof reportTypeSchema>;

// Impact and Effort Scoring
export const impactScoreSchema = z.object({
  score: z.number().min(1).max(10),
  category: z.enum(['low', 'medium', 'high', 'critical']),
  reasoning: z.string(),
  businessImpact: z.string(), // Business-focused explanation
});

export const effortScoreSchema = z.object({
  score: z.number().min(1).max(10),
  category: z.enum(['low', 'medium', 'high']),
  reasoning: z.string(),
  timeEstimate: z.string(), // e.g., "2-4 hours", "1 week", "1 month"
  skillLevel: z.enum(['beginner', 'intermediate', 'advanced']),
});

// Implementation Guide
export const implementationStepSchema = z.object({
  step: z.number(),
  title: z.string(),
  description: z.string(),
  details: z.array(z.string()),
  tips: z.array(z.string()).optional(),
  warnings: z.array(z.string()).optional(),
  resources: z.array(z.object({
    title: z.string(),
    url: z.string(),
    type: z.enum(['documentation', 'tool', 'guide', 'article', 'video']),
  })).optional(),
});

export const implementationGuideSchema = z.object({
  overview: z.string(),
  prerequisites: z.array(z.string()).optional(),
  steps: z.array(implementationStepSchema),
  successMetrics: z.array(z.string()),
  timeline: z.string(),
  difficulty: z.enum(['beginner', 'intermediate', 'advanced']),
});

// Recommendation Schema
export const reportRecommendationSchema = z.object({
  id: z.string().uuid(),
  title: z.string(),
  description: z.string(),
  category: z.enum(['seo', 'ux', 'performance', 'content', 'conversion', 'technical', 'design']),
  priority: z.enum(['low', 'medium', 'high', 'critical']),
  impact: impactScoreSchema,
  effort: effortScoreSchema,
  implementationGuide: implementationGuideSchema,
  whyItMatters: z.string(), // Business-focused explanation
  expectedOutcome: z.string(),
  measurementStrategy: z.string(),
});

// Marketing Improvement Report
export const marketingReportContentSchema = z.object({
  type: z.literal('marketing'),
  
  executiveSummary: z.object({
    overallScore: z.number().min(1).max(10),
    keyFindings: z.array(z.string()),
    topPriorities: z.array(z.string()),
    estimatedTrafficIncrease: z.string(), // e.g., "15-25%"
    timeToSeeResults: z.string(), // e.g., "3-6 months"
  }),
  
  seoAnalysis: z.object({
    score: z.number().min(1).max(10),
    keyIssues: z.array(z.string()),
    opportunities: z.array(z.string()),
    technicalSeoScore: z.number().min(1).max(10),
    contentSeoScore: z.number().min(1).max(10),
    localSeoScore: z.number().min(1).max(10).optional(),
  }),
  
  visibilityAnalysis: z.object({
    score: z.number().min(1).max(10),
    searchVisibility: z.string(),
    socialPresence: z.string(),
    brandMentions: z.string(),
    competitivePosition: z.string(),
  }),
  
  trafficAcquisition: z.object({
    score: z.number().min(1).max(10),
    organicPotential: z.string(),
    socialMediaOpportunities: z.array(z.string()),
    contentMarketingPotential: z.string(),
    localSearchOpportunities: z.array(z.string()).optional(),
  }),
  
  recommendations: z.array(reportRecommendationSchema),
  
  quickWins: z.array(z.object({
    title: z.string(),
    description: z.string(),
    timeToComplete: z.string(),
    expectedImpact: z.string(),
  })),
  
  longTermStrategy: z.object({
    month1to3: z.array(z.string()),
    month4to6: z.array(z.string()),
    month7to12: z.array(z.string()),
  }),
});

// Conversion Rate Improvement Report
export const conversionReportContentSchema = z.object({
  type: z.literal('conversion'),
  
  executiveSummary: z.object({
    overallScore: z.number().min(1).max(10),
    keyFindings: z.array(z.string()),
    topPriorities: z.array(z.string()),
    estimatedConversionIncrease: z.string(), // e.g., "20-40%"
    timeToSeeResults: z.string(), // e.g., "2-4 weeks"
  }),
  
  uxAnalysis: z.object({
    score: z.number().min(1).max(10),
    mobileExperience: z.number().min(1).max(10),
    navigationClarity: z.number().min(1).max(10),
    pageSpeed: z.number().min(1).max(10),
    usabilityIssues: z.array(z.string()),
  }),
  
  conversionPsychology: z.object({
    score: z.number().min(1).max(10),
    trustSignals: z.number().min(1).max(10),
    socialProof: z.number().min(1).max(10),
    valueProposition: z.number().min(1).max(10),
    psychologicalTriggers: z.array(z.string()),
  }),
  
  salesOptimization: z.object({
    score: z.number().min(1).max(10),
    ctaEffectiveness: z.number().min(1).max(10),
    checkoutProcess: z.number().min(1).max(10).optional(),
    leadCapture: z.number().min(1).max(10),
    objectionHandling: z.number().min(1).max(10),
  }),
  
  recommendations: z.array(reportRecommendationSchema),
  
  quickWins: z.array(z.object({
    title: z.string(),
    description: z.string(),
    timeToComplete: z.string(),
    expectedImpact: z.string(),
  })),
  
  conversionFunnel: z.object({
    awarenessStage: z.array(z.string()),
    considerationStage: z.array(z.string()),
    decisionStage: z.array(z.string()),
    retentionStage: z.array(z.string()),
  }),
});

// Combined Report Schema
export const reportContentSchema = z.union([
  marketingReportContentSchema,
  conversionReportContentSchema,
]);

// Full Report Schema
export const reportSchema = z.object({
  id: z.string().uuid(),
  analysisId: z.string().uuid(),
  type: reportTypeSchema,
  title: z.string(),
  summary: z.string(),
  content: reportContentSchema,
  recommendations: z.array(reportRecommendationSchema),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
  
  // Additional metadata
  metadata: z.object({
    websiteUrl: z.string().url(),
    analysisDate: z.string().datetime(),
    reportVersion: z.string(),
    generationTime: z.number(), // milliseconds
    confidence: z.number().min(0).max(1),
  }),
});

// Report Generation Input
export const reportGenerationInputSchema = z.object({
  analysisId: z.string().uuid(),
  reportType: reportTypeSchema,
  websiteUrl: z.string().url(),
  businessType: z.string().optional(),
  targetAudience: z.string().optional(),
  goals: z.array(z.string()).optional(),
});

// Export types
export type ImpactScore = z.infer<typeof impactScoreSchema>;
export type EffortScore = z.infer<typeof effortScoreSchema>;
export type ImplementationStep = z.infer<typeof implementationStepSchema>;
export type ImplementationGuide = z.infer<typeof implementationGuideSchema>;
export type ReportRecommendation = z.infer<typeof reportRecommendationSchema>;
export type MarketingReportContent = z.infer<typeof marketingReportContentSchema>;
export type ConversionReportContent = z.infer<typeof conversionReportContentSchema>;
export type ReportContent = z.infer<typeof reportContentSchema>;
export type Report = z.infer<typeof reportSchema>;
export type ReportGenerationInput = z.infer<typeof reportGenerationInputSchema>;