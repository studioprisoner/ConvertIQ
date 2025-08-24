import { pgTable, uuid, varchar, timestamp, text, jsonb, decimal, boolean, integer, date, index } from 'drizzle-orm/pg-core';
import { relations } from 'drizzle-orm';
import { createInsertSchema, createSelectSchema } from 'drizzle-zod';
import { z } from 'zod';
import { analyses } from './analyses';

// Core extraction metadata
export const extractionMetadata = pgTable('extraction_metadata', {
  id: uuid('id').primaryKey().defaultRandom(),
  analysisId: uuid('analysis_id').notNull().references(() => analyses.id, { onDelete: 'cascade' }),
  extractionType: varchar('extraction_type', { length: 50 }).notNull(), // 'business_info', 'products', 'social_proof', etc.
  confidenceScore: decimal('confidence_score', { precision: 3, scale: 2 }),
  processingTime: integer('processing_time'), // milliseconds
  promptUsed: text('prompt_used'),
  schemaVersion: varchar('schema_version', { length: 20 }).default('1.0.0'),
  
  // Enhanced metadata fields
  aiModel: varchar('ai_model', { length: 100 }), // model used for extraction
  tokensUsed: integer('tokens_used'),
  costUsd: decimal('cost_usd', { precision: 8, scale: 6 }), // cost in USD
  
  createdAt: timestamp('created_at').defaultNow(),
}, (table) => [
  index('extraction_metadata_analysis_idx').on(table.analysisId),
  index('extraction_metadata_type_idx').on(table.extractionType),
]);

// Business information extractions
export const extractedBusinessInfo = pgTable('extracted_business_info', {
  id: uuid('id').primaryKey().defaultRandom(),
  analysisId: uuid('analysis_id').notNull().references(() => analyses.id, { onDelete: 'cascade' }),
  businessName: varchar('business_name', { length: 255 }),
  industry: varchar('industry', { length: 100 }),
  description: text('description'),
  missionStatement: text('mission_statement'),
  valueProposition: text('value_proposition'),
  foundedYear: integer('founded_year'),
  sizeIndicator: varchar('size_indicator', { length: 50 }),
  location: jsonb('location'), // {address, city, state, country, coordinates}
  contactInfo: jsonb('contact_info'), // {phone, email, social_media}
  businessHours: jsonb('business_hours'),
  servicesOffered: jsonb('services_offered'), // array of services
  targetAudience: text('target_audience'),
  createdAt: timestamp('created_at').defaultNow(),
}, (table) => [
  index('extracted_business_info_analysis_idx').on(table.analysisId),
]);

// Product/Service extractions
export const extractedProductsServices = pgTable('extracted_products_services', {
  id: uuid('id').primaryKey().defaultRandom(),
  analysisId: uuid('analysis_id').notNull().references(() => analyses.id, { onDelete: 'cascade' }),
  type: varchar('type', { length: 20 }).notNull(), // 'product' or 'service'
  name: varchar('name', { length: 255 }).notNull(),
  description: text('description'),
  priceInfo: jsonb('price_info'), // {current, original, currency, discount}
  features: jsonb('features'), // array of features
  specifications: jsonb('specifications'),
  benefits: jsonb('benefits'), // array of benefits
  images: jsonb('images'), // array of image URLs
  category: varchar('category', { length: 100 }),
  availabilityStatus: varchar('availability_status', { length: 50 }),
  sku: varchar('sku', { length: 100 }),
  ratingInfo: jsonb('rating_info'), // {score, count, distribution}
  createdAt: timestamp('created_at').defaultNow(),
}, (table) => [
  index('extracted_products_analysis_idx').on(table.analysisId),
  index('extracted_products_type_idx').on(table.type),
]);

// Call-to-action extractions
export const extractedCtas = pgTable('extracted_ctas', {
  id: uuid('id').primaryKey().defaultRandom(),
  analysisId: uuid('analysis_id').notNull().references(() => analyses.id, { onDelete: 'cascade' }),
  text: varchar('text', { length: 255 }).notNull(),
  ctaType: varchar('cta_type', { length: 50 }), // 'buy', 'signup', 'contact', 'download', etc.
  prominence: varchar('prominence', { length: 20 }), // 'primary', 'secondary', 'tertiary'
  positionOnPage: varchar('position_on_page', { length: 50 }), // 'header', 'hero', 'sidebar', 'footer', etc.
  urgencyLevel: varchar('urgency_level', { length: 20 }), // 'high', 'medium', 'low', 'none'
  targetUrl: text('target_url'),
  visualStyle: jsonb('visual_style'), // {color, size, style_classes}
  psychologyTriggers: jsonb('psychology_triggers'), // array of triggers like 'scarcity', 'urgency'
  conversionContext: text('conversion_context'), // surrounding content context
  createdAt: timestamp('created_at').defaultNow(),
}, (table) => [
  index('extracted_ctas_analysis_idx').on(table.analysisId),
  index('extracted_ctas_type_idx').on(table.ctaType),
  index('extracted_ctas_prominence_type_idx').on(table.prominence, table.ctaType),
]);

// Social proof extractions
export const extractedSocialProof = pgTable('extracted_social_proof', {
  id: uuid('id').primaryKey().defaultRandom(),
  analysisId: uuid('analysis_id').notNull().references(() => analyses.id, { onDelete: 'cascade' }),
  proofType: varchar('proof_type', { length: 50 }), // 'review', 'testimonial', 'trust_badge', 'client_logo', etc.
  content: text('content'),
  source: varchar('source', { length: 255 }), // author name, review platform, etc.
  rating: decimal('rating', { precision: 2, scale: 1 }), // for reviews
  dateMentioned: date('date_mentioned'),
  verificationStatus: boolean('verification_status').default(false),
  prominence: varchar('prominence', { length: 20 }), // how prominently displayed
  credibilityIndicators: jsonb('credibility_indicators'), // verified purchase, real photo, etc.
  createdAt: timestamp('created_at').defaultNow(),
}, (table) => [
  index('extracted_social_proof_analysis_idx').on(table.analysisId),
  index('extracted_social_proof_type_idx').on(table.proofType),
]);

// Psychology and conversion elements
export const extractedPsychologyElements = pgTable('extracted_psychology_elements', {
  id: uuid('id').primaryKey().defaultRandom(),
  analysisId: uuid('analysis_id').notNull().references(() => analyses.id, { onDelete: 'cascade' }),
  triggerType: varchar('trigger_type', { length: 50 }), // 'scarcity', 'urgency', 'social_proof', 'authority', etc.
  elementText: text('element_text'),
  positionOnPage: varchar('position_on_page', { length: 50 }),
  effectivenessScore: decimal('effectiveness_score', { precision: 3, scale: 2 }), // AI-estimated effectiveness
  context: text('context'), // surrounding content
  recommendation: text('recommendation'), // AI suggestion for improvement
  createdAt: timestamp('created_at').defaultNow(),
}, (table) => [
  index('extracted_psychology_analysis_idx').on(table.analysisId),
  index('extracted_psychology_type_idx').on(table.triggerType),
]);

// SEO-specific extractions
export const extractedSeoElements = pgTable('extracted_seo_elements', {
  id: uuid('id').primaryKey().defaultRandom(),
  analysisId: uuid('analysis_id').notNull().references(() => analyses.id, { onDelete: 'cascade' }),
  elementType: varchar('element_type', { length: 50 }), // 'title', 'meta_description', 'heading', 'schema', etc.
  content: text('content').notNull(),
  htmlTag: varchar('html_tag', { length: 20 }), // 'h1', 'h2', 'title', 'meta', etc.
  position: integer('position'), // order on page for headings
  characterCount: integer('character_count'),
  keywordDensity: jsonb('keyword_density'), // estimated keyword analysis
  optimizationScore: decimal('optimization_score', { precision: 3, scale: 2 }), // AI-scored optimization level
  recommendations: text('recommendations'),
  createdAt: timestamp('created_at').defaultNow(),
}, (table) => [
  index('extracted_seo_analysis_idx').on(table.analysisId),
  index('extracted_seo_type_idx').on(table.elementType),
]);

// Phase 3: Analysis Quality Metrics
export const analysisQualityMetrics = pgTable('analysis_quality_metrics', {
  id: uuid('id').primaryKey().defaultRandom(),
  analysisId: uuid('analysis_id').notNull().references(() => analyses.id, { onDelete: 'cascade' }),
  
  // Quality metrics
  recommendationSpecificity: decimal('recommendation_specificity', { precision: 3, scale: 2 }), // how specific recommendations are
  dataCoverage: decimal('data_coverage', { precision: 3, scale: 2 }), // what % of page elements were analyzed
  accuracyConfidence: decimal('accuracy_confidence', { precision: 3, scale: 2 }), // AI confidence in analysis
  
  // Comparison with non-structured analysis
  improvementOverBasic: jsonb('improvement_over_basic'), // metrics comparing structured vs basic analysis
  
  // Processing efficiency
  processingTime: integer('processing_time'), // milliseconds
  tokenEfficiency: decimal('token_efficiency', { precision: 5, scale: 2 }), // recommendations per token used
  
  // Additional quality scoring fields from Phase 3
  completenessScore: decimal('completeness_score', { precision: 3, scale: 2 }), // how complete the analysis is
  actionabilityScore: decimal('actionability_score', { precision: 3, scale: 2 }), // how actionable recommendations are
  businessImpactPotential: decimal('business_impact_potential', { precision: 3, scale: 2 }), // potential business impact
  implementationDifficulty: decimal('implementation_difficulty', { precision: 3, scale: 2 }), // difficulty of implementation
  
  createdAt: timestamp('created_at').defaultNow(),
}, (table) => [
  index('analysis_quality_metrics_analysis_idx').on(table.analysisId),
  index('analysis_quality_metrics_coverage_idx').on(table.dataCoverage),
  index('analysis_quality_metrics_confidence_idx').on(table.accuracyConfidence),
]);

// Relations
export const extractionMetadataRelations = relations(extractionMetadata, ({ one }) => ({
  analysis: one(analyses, {
    fields: [extractionMetadata.analysisId],
    references: [analyses.id],
  }),
}));

export const extractedBusinessInfoRelations = relations(extractedBusinessInfo, ({ one }) => ({
  analysis: one(analyses, {
    fields: [extractedBusinessInfo.analysisId],
    references: [analyses.id],
  }),
}));

export const extractedProductsServicesRelations = relations(extractedProductsServices, ({ one }) => ({
  analysis: one(analyses, {
    fields: [extractedProductsServices.analysisId],
    references: [analyses.id],
  }),
}));

export const extractedCtasRelations = relations(extractedCtas, ({ one }) => ({
  analysis: one(analyses, {
    fields: [extractedCtas.analysisId],
    references: [analyses.id],
  }),
}));

export const extractedSocialProofRelations = relations(extractedSocialProof, ({ one }) => ({
  analysis: one(analyses, {
    fields: [extractedSocialProof.analysisId],
    references: [analyses.id],
  }),
}));

export const extractedPsychologyElementsRelations = relations(extractedPsychologyElements, ({ one }) => ({
  analysis: one(analyses, {
    fields: [extractedPsychologyElements.analysisId],
    references: [analyses.id],
  }),
}));

export const extractedSeoElementsRelations = relations(extractedSeoElements, ({ one }) => ({
  analysis: one(analyses, {
    fields: [extractedSeoElements.analysisId],
    references: [analyses.id],
  }),
}));

export const analysisQualityMetricsRelations = relations(analysisQualityMetrics, ({ one }) => ({
  analysis: one(analyses, {
    fields: [analysisQualityMetrics.analysisId],
    references: [analyses.id],
  }),
}));

// Zod schemas for extraction metadata
export const insertExtractionMetadataSchema = createInsertSchema(extractionMetadata);
export const selectExtractionMetadataSchema = createSelectSchema(extractionMetadata);

// Zod schemas for business info
export const insertExtractedBusinessInfoSchema = createInsertSchema(extractedBusinessInfo);
export const selectExtractedBusinessInfoSchema = createSelectSchema(extractedBusinessInfo);

// Zod schemas for products/services
export const insertExtractedProductsServicesSchema = createInsertSchema(extractedProductsServices);
export const selectExtractedProductsServicesSchema = createSelectSchema(extractedProductsServices);

// Zod schemas for CTAs
export const insertExtractedCtasSchema = createInsertSchema(extractedCtas);
export const selectExtractedCtasSchema = createSelectSchema(extractedCtas);

// Zod schemas for social proof
export const insertExtractedSocialProofSchema = createInsertSchema(extractedSocialProof);
export const selectExtractedSocialProofSchema = createSelectSchema(extractedSocialProof);

// Zod schemas for psychology elements
export const insertExtractedPsychologyElementsSchema = createInsertSchema(extractedPsychologyElements);
export const selectExtractedPsychologyElementsSchema = createSelectSchema(extractedPsychologyElements);

// Zod schemas for SEO elements
export const insertExtractedSeoElementsSchema = createInsertSchema(extractedSeoElements);
export const selectExtractedSeoElementsSchema = createSelectSchema(extractedSeoElements);

// Zod schemas for analysis quality metrics
export const insertAnalysisQualityMetricsSchema = createInsertSchema(analysisQualityMetrics);
export const selectAnalysisQualityMetricsSchema = createSelectSchema(analysisQualityMetrics);

// TypeScript types
export type ExtractionMetadata = z.infer<typeof selectExtractionMetadataSchema>;
export type InsertExtractionMetadata = z.infer<typeof insertExtractionMetadataSchema>;

export type ExtractedBusinessInfo = z.infer<typeof selectExtractedBusinessInfoSchema>;
export type InsertExtractedBusinessInfo = z.infer<typeof insertExtractedBusinessInfoSchema>;

export type ExtractedProductsServices = z.infer<typeof selectExtractedProductsServicesSchema>;
export type InsertExtractedProductsServices = z.infer<typeof insertExtractedProductsServicesSchema>;

export type ExtractedCtas = z.infer<typeof selectExtractedCtasSchema>;
export type InsertExtractedCtas = z.infer<typeof insertExtractedCtasSchema>;

export type ExtractedSocialProof = z.infer<typeof selectExtractedSocialProofSchema>;
export type InsertExtractedSocialProof = z.infer<typeof insertExtractedSocialProofSchema>;

export type ExtractedPsychologyElements = z.infer<typeof selectExtractedPsychologyElementsSchema>;
export type InsertExtractedPsychologyElements = z.infer<typeof insertExtractedPsychologyElementsSchema>;

export type ExtractedSeoElements = z.infer<typeof selectExtractedSeoElementsSchema>;
export type InsertExtractedSeoElements = z.infer<typeof insertExtractedSeoElementsSchema>;

export type AnalysisQualityMetrics = z.infer<typeof selectAnalysisQualityMetricsSchema>;
export type InsertAnalysisQualityMetrics = z.infer<typeof insertAnalysisQualityMetricsSchema>;