import { pgTable, uuid, varchar, timestamp, text } from 'drizzle-orm/pg-core';
import { relations } from 'drizzle-orm';
import { createInsertSchema, createSelectSchema } from 'drizzle-zod';
import { z } from 'zod';
import { users } from './users';

export const websites = pgTable('websites', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: uuid('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  url: varchar('url', { length: 500 }).notNull(),
  name: varchar('name', { length: 255 }),
  description: text('description'),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),
});

// Relations
export const websitesRelations = relations(websites, ({ one, many }) => ({
  user: one(users, {
    fields: [websites.userId],
    references: [users.id],
  }),
}));

// Zod schemas
export const insertWebsiteSchema = createInsertSchema(websites);
export const selectWebsiteSchema = createSelectSchema(websites);

export type Website = z.infer<typeof selectWebsiteSchema>;
export type InsertWebsite = z.infer<typeof insertWebsiteSchema>;