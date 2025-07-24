import { z } from 'zod';
import { validateDomainAccess } from './domain-validation';

// URL validation schema
export const urlValidationSchema = z.object({
  url: z.string()
    .url('Please enter a valid URL')
    .refine(
      (url) => {
        try {
          const parsedUrl = new URL(url);
          return ['http:', 'https:'].includes(parsedUrl.protocol);
        } catch {
          return false;
        }
      },
      'URL must use HTTP or HTTPS protocol'
    )
    .refine(
      (url) => {
        try {
          const parsedUrl = new URL(url);
          return !['localhost', '127.0.0.1', '0.0.0.0'].includes(parsedUrl.hostname);
        } catch {
          return false;
        }
      },
      'Cannot scan localhost or local IP addresses'
    ),
  pageType: z.enum(['homepage', 'product', 'service', 'landing', 'other']).optional(),
});

export type UrlValidationInput = z.infer<typeof urlValidationSchema>;

// Page type detection based on URL patterns
export function detectPageType(url: string): string {
  const pathname = new URL(url).pathname.toLowerCase();
  
  // Homepage patterns
  if (pathname === '/' || pathname === '' || pathname === '/index.html') {
    return 'homepage';
  }
  
  // Product page patterns
  if (pathname.includes('/product') || pathname.includes('/shop') || pathname.includes('/store')) {
    return 'product';
  }
  
  // Service page patterns
  if (pathname.includes('/service') || pathname.includes('/services') || pathname.includes('/solutions')) {
    return 'service';
  }
  
  // Landing page patterns
  if (pathname.includes('/landing') || pathname.includes('/lp/') || pathname.includes('/campaign')) {
    return 'landing';
  }
  
  return 'other';
}

// URL accessibility check
export async function checkUrlAccessibility(url: string): Promise<{
  isAccessible: boolean;
  statusCode?: number;
  error?: string;
}> {
  try {
    console.log('🌐 Checking URL accessibility:', url);
    
    // Create an AbortController for timeout
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 10000); // 10 second timeout
    
    const response = await fetch(url, {
      method: 'HEAD',
      headers: {
        'User-Agent': 'ConvertIQ-Scanner/1.0',
      },
      // Don't follow redirects for now - we want to know about them
      redirect: 'manual',
      signal: controller.signal,
    });
    
    clearTimeout(timeoutId);
    console.log('✅ URL accessibility check completed:', response.status);

    return {
      isAccessible: response.status < 400,
      statusCode: response.status,
    };
  } catch (error) {
    console.log('❌ URL accessibility check failed:', error);
    
    // Handle timeout specifically
    if (error instanceof Error && error.name === 'AbortError') {
      return {
        isAccessible: false,
        error: 'Request timed out after 10 seconds',
      };
    }
    
    return {
      isAccessible: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

// Validation result type
export interface ValidationResult {
  isValid: boolean;
  pageType: string;
  statusCode?: number;
  error?: string;
  message?: string;
  suggestedDomain?: string;
  requiresPrimaryDomain?: boolean;
}

// Main validation function
export async function validateUrl(
  url: string, 
  userPageType?: string,
  userPlan?: 'basic' | 'pro' | 'enterprise',
  userPrimaryDomain?: string | null,
  skipAccessibilityCheck?: boolean
): Promise<ValidationResult> {
  // First validate the URL format
  const urlValidation = urlValidationSchema.safeParse({ url, pageType: userPageType });
  
  if (!urlValidation.success) {
    return {
      isValid: false,
      pageType: 'unknown',
      error: urlValidation.error.errors[0].message,
    };
  }

  // Detect page type if not provided
  const detectedPageType = userPageType || detectPageType(url);

  // Check domain access for basic plan users
  if (userPlan === 'basic') {
    const domainValidation = validateDomainAccess(url, userPrimaryDomain, userPlan);
    
    if (!domainValidation.allowed) {
      return {
        isValid: false,
        pageType: detectedPageType,
        error: domainValidation.reason,
        suggestedDomain: domainValidation.suggestedDomain,
        requiresPrimaryDomain: !userPrimaryDomain,
      };
    }
  }

  // Check if URL is accessible (skip if requested)
  let accessibilityCheck = null;
  if (!skipAccessibilityCheck) {
    accessibilityCheck = await checkUrlAccessibility(url);
    
    if (!accessibilityCheck.isAccessible) {
      return {
        isValid: false,
        pageType: detectedPageType,
        statusCode: accessibilityCheck.statusCode,
        error: accessibilityCheck.error || 'URL is not accessible',
        message: `Failed to access URL: ${accessibilityCheck.error || 'HTTP ' + accessibilityCheck.statusCode}`,
      };
    }
  } else {
    console.log('⏭️ Skipping URL accessibility check as requested');
  }

  return {
    isValid: true,
    pageType: detectedPageType,
    statusCode: accessibilityCheck?.statusCode,
    message: skipAccessibilityCheck ? 'URL is valid (accessibility check skipped)' : 'URL is valid and accessible',
  };
}