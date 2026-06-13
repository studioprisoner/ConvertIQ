import { pgTable, uuid, varchar, timestamp, text, pgEnum, json, index } from 'drizzle-orm/pg-core';
import { relations } from 'drizzle-orm';
import { createInsertSchema, createSelectSchema } from 'drizzle-zod';
import { z } from 'zod';
import { analyses } from './analyses';

export const reportTypeEnum = pgEnum('report_type', ['marketing', 'conversion', 'performance', 'comprehensive']);

export const reports = pgTable('reports', {
  id: uuid('id').primaryKey().defaultRandom(),
  analysisId: uuid('analysis_id').notNull().references(() => analyses.id, { onDelete: 'cascade' }),
  type: reportTypeEnum('type').notNull(),
  title: varchar('title', { length: 255 }).notNull(),
  summary: text('summary'),
  content: json('content'), // Store structured report data
  recommendations: json('recommendations'), // Store recommendations array
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),
}, (table) => [
  // FK joined in dashboard and reports routers
  index('reports_analysis_id_idx').on(table.analysisId),
]);

// Relations
export const reportsRelations = relations(reports, ({ one, many }) => ({
  analysis: one(analyses, {
    fields: [reports.analysisId],
    references: [analyses.id],
  }),
}));

// Zod schemas
export const insertReportSchema = createInsertSchema(reports);
export const selectReportSchema = createSelectSchema(reports);

export type Report = z.infer<typeof selectReportSchema>;
export type InsertReport = z.infer<typeof insertReportSchema>;