import { pgTable, uuid, varchar, timestamp, text, boolean } from 'drizzle-orm/pg-core';
import { relations } from 'drizzle-orm';
import { createInsertSchema, createSelectSchema } from 'drizzle-zod';
import { z } from 'zod';
import { user } from './auth';

export const websites = pgTable('websites', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: text('user_id').notNull().references(() => user.id, { onDelete: 'cascade' }),
  url: varchar('url', { length: 500 }).notNull(),
  name: varchar('name', { length: 255 }),
  description: text('description'),
  pageType: varchar('page_type', { length: 50 }), // homepage, product, service, landing
  isValidated: boolean('is_validated').default(false),
  validationStatus: varchar('validation_status', { length: 50 }), // pending, valid, invalid, error
  validationMessage: text('validation_message'),
  lastValidatedAt: timestamp('last_validated_at'),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),
});

// Relations
export const websitesRelations = relations(websites, ({ one, many }) => ({
  user: one(user, {
    fields: [websites.userId],
    references: [user.id],
  }),
}));

// Zod schemas
export const insertWebsiteSchema = createInsertSchema(websites);
export const selectWebsiteSchema = createSelectSchema(websites);

export type Website = z.infer<typeof selectWebsiteSchema>;
export type InsertWebsite = z.infer<typeof insertWebsiteSchema>;