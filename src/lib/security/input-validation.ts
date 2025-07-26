import { z } from 'zod';
import DOMPurify from 'isomorphic-dompurify';

/**
 * Comprehensive input validation and sanitization utilities
 */

// URL validation with security checks
export const urlSchema = z.string()
  .url('Invalid URL format')
  .refine((url) => {
    const parsed = new URL(url);
    // Block dangerous protocols
    const allowedProtocols = ['http:', 'https:'];
    return allowedProtocols.includes(parsed.protocol);
  }, 'Only HTTP/HTTPS URLs are allowed')
  .refine((url) => {
    const parsed = new URL(url);
    // Block localhost and private IPs in production
    if (process.env.NODE_ENV === 'production') {
      const hostname = parsed.hostname.toLowerCase();
      const privateRanges = [
        'localhost',
        '127.',
        '10.',
        '172.16.',
        '172.17.',
        '172.18.',
        '172.19.',
        '172.20.',
        '172.21.',
        '172.22.',
        '172.23.',
        '172.24.',
        '172.25.',
        '172.26.',
        '172.27.',
        '172.28.',
        '172.29.',
        '172.30.',
        '172.31.',
        '192.168.'
      ];
      return !privateRanges.some(range => hostname.includes(range));
    }
    return true;
  }, 'Private/local URLs not allowed in production');

// Email validation
export const emailSchema = z.string()
  .email('Invalid email format')
  .min(5, 'Email too short')
  .max(254, 'Email too long') // RFC 5321 limit
  .refine((email) => {
    // Additional security checks
    const parts = email.split('@');
    if (parts.length !== 2) return false;
    
    const [local, domain] = parts;
    
    // Check for dangerous characters
    const dangerousChars = ['<', '>', '"', '\\', '\0', '\n', '\r', '\t'];
    return !dangerousChars.some(char => email.includes(char));
  }, 'Email contains invalid characters');

// Domain validation
export const domainSchema = z.string()
  .min(1, 'Domain required')
  .max(253, 'Domain too long') // RFC 1035 limit
  .refine((domain) => {
    // Basic domain format validation
    const domainRegex = /^[a-zA-Z0-9]([a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(\.[a-zA-Z0-9]([a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)*$/;
    return domainRegex.test(domain);
  }, 'Invalid domain format')
  .refine((domain) => {
    // Block localhost and private domains in production
    if (process.env.NODE_ENV === 'production') {
      const blockedDomains = ['localhost', '127.0.0.1', '0.0.0.0'];
      return !blockedDomains.includes(domain.toLowerCase());
    }
    return true;
  }, 'Local domains not allowed in production');

// Text input sanitization
export const textSchema = z.string()
  .max(10000, 'Text too long')
  .transform((text) => {
    // Remove null bytes and control characters except newlines/tabs
    return text.replace(/[\0\x01-\x08\x0B\x0C\x0E-\x1F\x7F]/g, '');
  });

// HTML content sanitization
export const htmlSchema = z.string()
  .max(50000, 'HTML content too long')
  .transform((html) => {
    // Sanitize HTML to prevent XSS
    return DOMPurify.sanitize(html, {
      ALLOWED_TAGS: ['b', 'i', 'em', 'strong', 'p', 'br', 'ul', 'ol', 'li', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6'],
      ALLOWED_ATTR: ['href', 'title'],
      ALLOW_DATA_ATTR: false,
    });
  });

// File name validation
export const fileNameSchema = z.string()
  .min(1, 'Filename required')
  .max(255, 'Filename too long')
  .refine((filename) => {
    // Block dangerous file names
    const dangerousPatterns = [
      /\.\./,  // Directory traversal
      /[<>:"|?*\0]/,  // Windows invalid chars
      /^\./,   // Hidden files
      /\.(exe|bat|cmd|com|pif|scr|vbs|js|jar|php|asp|aspx|jsp)$/i,  // Executable extensions
    ];
    return !dangerousPatterns.some(pattern => pattern.test(filename));
  }, 'Invalid or dangerous filename');

// API request validation schemas
export const websiteScanRequestSchema = z.object({
  url: urlSchema,
  userId: z.string().uuid('Invalid user ID'),
  domain: domainSchema.optional(),
});

export const reportRequestSchema = z.object({
  reportId: z.string().uuid('Invalid report ID'),
  userId: z.string().uuid('Invalid user ID'),
});

export const supportTicketSchema = z.object({
  subject: textSchema.min(5, 'Subject too short').max(200, 'Subject too long'),
  description: textSchema.min(10, 'Description too short').max(2000, 'Description too long'),
  priority: z.enum(['low', 'medium', 'high', 'urgent']).default('medium'),
  userId: z.string().uuid('Invalid user ID'),
});

// Rate limiting validation
export const rateLimitSchema = z.object({
  identifier: z.string().min(1, 'Identifier required').max(100, 'Identifier too long'),
  maxRequests: z.number().int().min(1).max(10000).default(100),
  windowMs: z.number().int().min(1000).max(3600000).default(60000), // 1 second to 1 hour
});

/**
 * Generic validation helper
 */
export async function validateInput<T>(
  schema: z.ZodSchema<T>,
  input: unknown,
  errorMessage?: string
): Promise<T> {
  try {
    return await schema.parseAsync(input);
  } catch (error) {
    if (error instanceof z.ZodError) {
      const formattedErrors = error.errors.map(err => 
        `${err.path.join('.')}: ${err.message}`
      ).join(', ');
      
      throw new Error(errorMessage || `Validation failed: ${formattedErrors}`);
    }
    throw error;
  }
}

/**
 * SQL injection protection
 */
export function sanitizeSqlInput(input: string): string {
  if (typeof input !== 'string') {
    throw new Error('SQL input must be a string');
  }
  
  // Remove dangerous SQL keywords and characters
  const dangerous = [
    /--/g,           // SQL comments
    /\/\*/g,         // Multi-line comments start
    /\*\//g,         // Multi-line comments end
    /;/g,            // Statement separator
    /\bUNION\b/gi,   // Union attacks
    /\bSELECT\b/gi,  // Select statements
    /\bINSERT\b/gi,  // Insert statements
    /\bUPDATE\b/gi,  // Update statements
    /\bDELETE\b/gi,  // Delete statements
    /\bDROP\b/gi,    // Drop statements
    /\bEXEC\b/gi,    // Execute statements
    /\bSCRIPT\b/gi,  // Script tags
    /'/g,            // Single quotes
    /"/g,            // Double quotes
  ];
  
  let sanitized = input;
  dangerous.forEach(pattern => {
    sanitized = sanitized.replace(pattern, '');
  });
  
  return sanitized.trim();
}

/**
 * XSS protection for user content
 */
export function sanitizeUserContent(content: string): string {
  return DOMPurify.sanitize(content, {
    ALLOWED_TAGS: [],
    ALLOWED_ATTR: [],
    KEEP_CONTENT: true,
  });
}

/**
 * Path traversal protection
 */
export function sanitizePath(path: string): string {
  return path
    .replace(/\.\./g, '')  // Remove directory traversal
    .replace(/[<>:"|?*\0]/g, '')  // Remove invalid chars
    .replace(/^\//g, '')   // Remove leading slash
    .trim();
}

/**
 * Validate and sanitize object properties
 */
export function sanitizeObject<T extends Record<string, any>>(
  obj: T,
  allowedKeys: (keyof T)[]
): Partial<T> {
  const sanitized: Partial<T> = {};
  
  for (const key of allowedKeys) {
    if (key in obj && obj[key] !== undefined) {
      const value = obj[key];
      
      if (typeof value === 'string') {
        sanitized[key] = sanitizeUserContent(value) as T[keyof T];
      } else if (typeof value === 'number' || typeof value === 'boolean') {
        sanitized[key] = value;
      } else if (Array.isArray(value)) {
        sanitized[key] = value.map(item => 
          typeof item === 'string' ? sanitizeUserContent(item) : item
        ) as T[keyof T];
      }
    }
  }
  
  return sanitized;
}