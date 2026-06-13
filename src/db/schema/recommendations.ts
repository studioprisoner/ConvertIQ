import { pgTable, uuid, varchar, timestamp, text, pgEnum, integer, boolean, index } from 'drizzle-orm/pg-core';
import { relations } from 'drizzle-orm';
import { createInsertSchema, createSelectSchema } from 'drizzle-zod';
import { z } from 'zod';
import { reports } from './reports';

export const recommendationPriorityEnum = pgEnum('recommendation_priority', ['low', 'medium', 'high', 'critical']);
export const recommendationStatusEnum = pgEnum('recommendation_status', ['pending', 'in_progress', 'completed', 'dismissed']);

export const recommendations = pgTable('recommendations', {
  id: uuid('id').primaryKey().defaultRandom(),
  reportId: uuid('report_id').notNull().references(() => reports.id, { onDelete: 'cascade' }),
  title: varchar('title', { length: 255 }).notNull(),
  description: text('description').notNull(),
  priority: recommendationPriorityEnum('priority').default('medium'),
  status: recommendationStatusEnum('status').default('pending'),
  estimatedImpact: integer('estimated_impact'), // 1-10 scale
  estimatedEffort: integer('estimated_effort'), // 1-10 scale
  category: varchar('category', { length: 100 }), // e.g., 'UX', 'Performance', 'Content'
  implementationGuide: text('implementation_guide'),
  isCompleted: boolean('is_completed').default(false),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),
}, (table) => [
  // FK joined in all recommendation mutations
  index('recommendations_report_id_idx').on(table.reportId),
  // Common filter: recommendations for a report by status
  index('recommendations_report_status_idx').on(table.reportId, table.status),
]);

// Relations
export const recommendationsRelations = relations(recommendations, ({ one }) => ({
  report: one(reports, {
    fields: [recommendations.reportId],
    references: [reports.id],
  }),
}));

// Zod schemas
export const insertRecommendationSchema = createInsertSchema(recommendations);
export const selectRecommendationSchema = createSelectSchema(recommendations);

export type Recommendation = z.infer<typeof selectRecommendationSchema>;
export type InsertRecommendation = z.infer<typeof insertRecommendationSchema>;