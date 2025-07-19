// Main report generation
export { marketingReportGenerator } from './generators/marketing-report';
export { conversionReportGenerator } from './generators/conversion-report';

// Scoring and prioritization
export { scoringAlgorithms } from './scoring-algorithms';

// Implementation guides
export { implementationGuideGenerator } from './implementation-guides';

// PDF export
export { pdfExportService } from './pdf-export';

// Progress tracking and monitoring
export { recommendationTracker } from './recommendation-tracker';
export { databaseTrackingService } from './database-tracking';
export { progressDashboardService } from './progress-dashboard';

// Types
export type {
  Report,
  ReportType,
  ReportRecommendation,
  ReportGenerationInput,
  MarketingReportContent,
  ConversionReportContent,
  ImplementationGuide,
  ImplementationStep,
  ImpactScore,
  EffortScore,
  // Progress tracking types
  RecommendationStatus,
  RecommendationProgress,
  RecommendationMilestone,
  RecommendationMeasurement,
  RecommendationBlocker
} from './types';