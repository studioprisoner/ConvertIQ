import { pgTable, uuid, varchar, timestamp, text, boolean, pgEnum, index, uniqueIndex } from 'drizzle-orm/pg-core';
import { relations } from 'drizzle-orm';
import { createInsertSchema, createSelectSchema } from 'drizzle-zod';
import { z } from 'zod';
import { user } from './auth';

export const domains = pgTable('domains', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: text('user_id').notNull(),
  rootDomain: varchar('root_domain', { length: 253 }).notNull(),
  displayName: varchar('display_name', { length: 255 }),
  description: text('description'),
  isValidated: boolean('is_validated').default(false).notNull(),
  validationStatus: varchar('validation_status', { length: 50 }).default('unverified'),
  validationMessage: text('validation_message'),
  verificationToken: varchar('verification_token', { length: 64 }),
  lastValidatedAt: timestamp('last_validated_at'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
}, (table) => [
  uniqueIndex('domains_user_root_domain_idx').on(table.userId, table.rootDomain),
  index('domains_user_id_idx').on(table.userId),
]);

export const pageTypeEnum = pgEnum('page_type_enum', [
  'homepage', 'about', 'contact', 'pricing', 'blog-post', 'blog-category',
  'ecommerce-product', 'ecommerce-category', 'ecommerce-cart', 'ecommerce-checkout',
  'service-landing', 'service-detail', 'case-study', 'testimonials', 'portfolio',
  'landing-page', 'lead-magnet', 'thank-you', '404-error', 'legal', 'faq',
  'search-results', 'unknown'
]);

export const websites = pgTable('websites', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: text('user_id').notNull(), // Temporarily removed foreign key constraint for testing
  domainId: uuid('domain_id').references(() => domains.id, { onDelete: 'cascade' }),
  url: varchar('url', { length: 500 }).notNull(),
  name: varchar('name', { length: 255 }),
  description: text('description'),
  pageType: pageTypeEnum('page_type'),
  isValidated: boolean('is_validated').default(false),
  validationStatus: varchar('validation_status', { length: 50 }), // unverified, pending, valid, invalid, error
  validationMessage: text('validation_message'),
  verificationToken: varchar('verification_token', { length: 64 }), // meta-tag ownership verification token (cleared on success)
  lastValidatedAt: timestamp('last_validated_at'),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),
}, (table) => [
  // Website page type index
  index('websites_page_type_idx').on(table.pageType),
  // FK queried on every dashboard load and website list
  index('websites_user_id_idx').on(table.userId),
]);

// Relations
export const domainsRelations = relations(domains, ({ one, many }) => ({
  user: one(user, {
    fields: [domains.userId],
    references: [user.id],
  }),
  websites: many(websites),
}));

export const websitesRelations = relations(websites, ({ one }) => ({
  user: one(user, {
    fields: [websites.userId],
    references: [user.id],
  }),
  domain: one(domains, {
    fields: [websites.domainId],
    references: [domains.id],
  }),
}));

// Zod schemas
export const insertWebsiteSchema = createInsertSchema(websites);
export const selectWebsiteSchema = createSelectSchema(websites);

export type Website = z.infer<typeof selectWebsiteSchema>;
export type InsertWebsite = z.infer<typeof insertWebsiteSchema>;

export type Domain = typeof domains.$inferSelect;
export type InsertDomain = typeof domains.$inferInsert;