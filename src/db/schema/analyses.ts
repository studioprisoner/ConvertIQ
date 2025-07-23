import { pgTable, uuid, varchar, timestamp, text, pgEnum } from 'drizzle-orm/pg-core';
import { relations } from 'drizzle-orm';
import { createInsertSchema, createSelectSchema } from 'drizzle-zod';
import { z } from 'zod';
import { websites } from './websites';

export const analysisStatusEnum = pgEnum('analysis_status', ['pending', 'processing', 'completed', 'failed', 'archived']);
export const analysisActionsEnum = pgEnum('analysis_actions', ['none', 'rescan', 'retry']);

export const analyses = pgTable('analyses', {
  id: uuid('id').primaryKey().defaultRandom(),
  websiteId: uuid('website_id').notNull().references(() => websites.id, { onDelete: 'cascade' }),
  status: analysisStatusEnum('status').default('pending'),
  actions: analysisActionsEnum('actions').default('none'),
  rawData: text('raw_data'), // Store scraped HTML/data
  aiAnalysis: text('ai_analysis'), // Store AI analysis results
  errorMessage: text('error_message'),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),
});

// Relations
export const analysesRelations = relations(analyses, ({ one, many }) => ({
  website: one(websites, {
    fields: [analyses.websiteId],
    references: [websites.id],
  }),
}));

// Zod schemas
export const insertAnalysisSchema = createInsertSchema(analyses);
export const selectAnalysisSchema = createSelectSchema(analyses);

export type Analysis = z.infer<typeof selectAnalysisSchema>;
export type InsertAnalysis = z.infer<typeof insertAnalysisSchema>;