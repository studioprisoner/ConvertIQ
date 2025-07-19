import { z } from 'zod';

// Core crawler result schema
export const crawlResultSchema = z.object({
  url: z.string().url(),
  timestamp: z.string().datetime(),
  statusCode: z.number(),
  redirectUrl: z.string().url().optional(),
  contentType: z.string().optional(),
  
  // HTML structure analysis
  htmlAnalysis: z.object({
    // Meta tags
    meta: z.object({
      title: z.string().optional(),
      description: z.string().optional(),
      keywords: z.string().optional(),
      viewport: z.string().optional(),
      charset: z.string().optional(),
      robots: z.string().optional(),
      ogTitle: z.string().optional(),
      ogDescription: z.string().optional(),
      ogImage: z.string().optional(),
      twitterCard: z.string().optional(),
    }),
    
    // Heading structure
    headings: z.array(z.object({
      level: z.number().min(1).max(6), // H1-H6
      text: z.string(),
      id: z.string().optional(),
      class: z.string().optional(),
    })),
    
    // Images analysis
    images: z.array(z.object({
      src: z.string(),
      alt: z.string().optional(),
      title: z.string().optional(),
      width: z.number().optional(),
      height: z.number().optional(),
      loading: z.string().optional(), // lazy, eager
      isLogo: z.boolean().default(false),
      isHero: z.boolean().default(false),
    })),
    
    // Links and navigation
    links: z.array(z.object({
      href: z.string(),
      text: z.string(),
      title: z.string().optional(),
      target: z.string().optional(),
      rel: z.string().optional(),
      isInternal: z.boolean(),
      isNavigation: z.boolean().default(false),
      isCTA: z.boolean().default(false),
    })),
    
    // Forms analysis
    forms: z.array(z.object({
      action: z.string().optional(),
      method: z.string().optional(),
      id: z.string().optional(),
      class: z.string().optional(),
      fields: z.array(z.object({
        type: z.string(),
        name: z.string().optional(),
        placeholder: z.string().optional(),
        required: z.boolean().default(false),
        label: z.string().optional(),
      })),
      submitButton: z.object({
        text: z.string().optional(),
        type: z.string().optional(),
      }).optional(),
    })),
    
    // Call-to-action buttons
    ctas: z.array(z.object({
      text: z.string(),
      href: z.string().optional(),
      type: z.enum(['button', 'link', 'form-submit']),
      class: z.string().optional(),
      position: z.string().optional(), // above-fold, below-fold
      prominence: z.enum(['primary', 'secondary', 'tertiary']).optional(),
    })),
    
    // Page structure
    structure: z.object({
      hasHeader: z.boolean(),
      hasNavigation: z.boolean(),
      hasFooter: z.boolean(),
      hasSidebar: z.boolean(),
      hasHeroSection: z.boolean(),
      sectionsCount: z.number(),
      wordCount: z.number(),
    }),
  }),
  
  // CSS analysis
  cssAnalysis: z.object({
    // External stylesheets
    externalStylesheets: z.array(z.string()),
    
    // Inline styles detection
    hasInlineStyles: z.boolean(),
    
    // Framework detection
    frameworks: z.array(z.string()), // bootstrap, tailwind, etc.
    
    // Performance indicators
    cssSize: z.number().optional(), // in bytes
    
    // Mobile responsiveness indicators
    responsive: z.object({
      hasViewportMeta: z.boolean(),
      hasMediaQueries: z.boolean(),
      hasMobileFirst: z.boolean().optional(),
    }),
  }),
  
  // Performance metrics
  performance: z.object({
    loadTime: z.number(), // in milliseconds
    htmlSize: z.number(), // in bytes
    totalResourcesCount: z.number(),
    
    // Core Web Vitals indicators
    imagesWithoutAlt: z.number(),
    imagesWithoutSize: z.number(),
    externalResourcesCount: z.number(),
  }),
  
  // Error information
  errors: z.array(z.object({
    type: z.enum(['redirect', 'timeout', 'parse-error', 'network-error']),
    message: z.string(),
    details: z.string().optional(),
  })),
  
  // Raw data for debugging
  rawHtml: z.string().optional(), // Only stored if needed for debugging
});

export type CrawlResult = z.infer<typeof crawlResultSchema>;

// Crawler options
export const crawlerOptionsSchema = z.object({
  timeout: z.number().default(30000), // 30 seconds
  followRedirects: z.boolean().default(true),
  maxRedirects: z.number().default(5),
  userAgent: z.string().default('ConvertIQ-Crawler/1.0'),
  respectRobots: z.boolean().default(true),
  includeRawHtml: z.boolean().default(false),
  maxHtmlSize: z.number().default(5 * 1024 * 1024), // 5MB
});

export type CrawlerOptions = z.infer<typeof crawlerOptionsSchema>;

// Database schema for storing crawl results
export const crawlJobSchema = z.object({
  id: z.string().uuid(),
  websiteId: z.string().uuid(),
  status: z.enum(['pending', 'crawling', 'completed', 'failed']),
  result: crawlResultSchema.optional(),
  error: z.string().optional(),
  startedAt: z.string().datetime(),
  completedAt: z.string().datetime().optional(),
  options: crawlerOptionsSchema,
});

export type CrawlJob = z.infer<typeof crawlJobSchema>;