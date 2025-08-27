# Code Patterns & Conventions - ConvertIQ

## Development Reset Patterns ✅

### Branch Reset Pattern

**Established Pattern**: Clean development environment restoration

```bash
# Pattern: Reset dev branch to main state
git fetch origin main           # Get latest main
git reset --hard origin/main    # Reset branch pointer and working tree
git clean -fd                   # Remove all untracked files
git status                      # Verify clean state
```

**Usage Guidelines**:
- Use when experimental work isn't functioning
- Preserves stable architecture patterns
- Prevents technical debt accumulation
- Maintains proven security and performance implementations

**Post-Reset Checklist**:
```bash
# Verify environment
bun install                     # Restore dependencies
bun run dev                     # Test development server
bun run build                   # Verify build works
git status                      # Confirm clean working tree
```

## Security Implementation Patterns ✅

### Input Validation Pattern

**Established Pattern**: Multi-layered validation with Zod + sanitization

```typescript
// Pattern: src/lib/security/input-validation.ts
import { z } from 'zod';
import DOMPurify from 'isomorphic-dompurify';

// 1. Schema validation
export const urlSchema = z.string()
  .url('Invalid URL format')
  .refine((url) => {
    const parsed = new URL(url);
    const allowedProtocols = ['http:', 'https:'];
    return allowedProtocols.includes(parsed.protocol);
  }, 'Only HTTP/HTTPS URLs are allowed');

// 2. Generic validation helper
export async function validateInput<T>(
  schema: z.ZodSchema<T>,
  input: unknown,
  errorMessage?: string
): Promise<T> {
  try {
    return await schema.parseAsync(input);
  } catch (error) {
    // Handle validation errors
  }
}

// 3. Sanitization utilities
export function sanitizeUserContent(content: string): string {
  return DOMPurify.sanitize(content, {
    ALLOWED_TAGS: [],
    ALLOWED_ATTR: [],
    KEEP_CONTENT: true,
  });
}
```

**Usage Pattern**:
```typescript
// In API routes or components
const validatedUrl = await validateInput(urlSchema, userInput);
const cleanContent = sanitizeUserContent(userContent);
```

### Environment Validation Pattern

**Established Pattern**: Startup validation with Zod schema

```typescript
// Pattern: src/lib/env-validation.ts
import { z } from 'zod';

const envSchema = z.object({
  DATABASE_URL: z.string().url('Invalid database URL'),
  BETTER_AUTH_SECRET: z.string().min(32, 'Auth secret must be at least 32 characters'),
  // ... other validations
});

export function validateEnv(): EnvVars {
  try {
    const validatedEnv = envSchema.parse(process.env);
    // Additional security checks for production
    if (validatedEnv.NODE_ENV === 'production') {
      if (!validatedEnv.NEXT_PUBLIC_APP_URL.startsWith('https://')) {
        throw new Error('Production app URL must use HTTPS');
      }
    }
    return validatedEnv;
  } catch (error) {
    // Handle validation errors with detailed messaging
  }
}

// Pattern: instrumentation.ts integration
export async function register() {
  try {
    validateEnv();
  } catch (error) {
    if (process.env.NODE_ENV === 'production') {
      process.exit(1); // Fail fast in production
    }
  }
}
```

### Edge Runtime Compatible Pattern

**Established Pattern**: Dual runtime architecture

```typescript
// Pattern: Edge Runtime module (src/lib/edge-rate-limit.ts)
// ✅ Pure JavaScript, no Node.js dependencies
const rateLimitMap = new Map<string, {
  requests: number[];
  lastCleanup: number;
}>();

export function rateLimit(
  identifier: string,
  maxRequests: number = 100,
  windowMs: number = 60000
): boolean {
  // Implementation using only Web APIs
  const now = Date.now();
  // ... edge-compatible logic
}

// Pattern: Node.js Runtime module (src/lib/api-middleware.ts)
// ✅ Full Node.js functionality for API routes
import { auth } from '@/lib/auth'; // Database dependencies OK here
export { rateLimit } from './edge-rate-limit'; // Re-export edge functions

// Pattern: Middleware (src/middleware.ts)
// ✅ Import only edge-compatible modules
import { rateLimit } from './lib/edge-rate-limit'; // NOT from api-middleware
```

### Security Middleware Pattern

**Established Pattern**: Layered security in middleware

```typescript
// Pattern: src/middleware.ts
export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const response = NextResponse.next();

  // 1. Security headers
  response.headers.set('X-Robots-Tag', 'noindex, nofollow, nosnippet, noarchive');
  
  // 2. Rate limiting with context-aware limits
  if (pathname.startsWith('/api/')) {
    let maxRequests = 100;
    let windowMs = 60000;
    
    if (pathname.startsWith('/api/auth/')) {
      maxRequests = 10; // Stricter for auth
    } else if (pathname.includes('scan')) {
      maxRequests = 5;   // Very strict for expensive ops
      windowMs = 300000;
    }
    
    if (!rateLimit(ip, maxRequests, windowMs)) {
      return NextResponse.json({ error: 'Rate limit exceeded' }, { 
        status: 429,
        headers: { /* rate limit headers */ }
      });
    }
  }

  // 3. Bot protection
  const userAgent = request.headers.get('user-agent') || '';
  const suspiciousBots = ['curl', 'wget', 'scrapy'];
  
  // 4. Pattern blocking
  const suspiciousPatterns = [/\.\./, /<script/i, /union.*select/i];
  
  // 5. CORS handling
  if (request.method === 'OPTIONS') {
    // Handle preflight requests
  }
  
  return response;
}
```

## API Security Patterns ✅

### API Route Security Pattern

**Established Pattern**: Wrapper functions for consistent security

```typescript
// Pattern: src/lib/api-middleware.ts
export function withAuthHandler(
  handler: (request: NextRequest, user: any) => Promise<NextResponse>
) {
  return async (request: NextRequest): Promise<NextResponse> => {
    const { user, error } = await withAuth(request);
    if (error) return error;
    return handler(request, user);
  };
}

export function withFeatureHandler(
  featureKey: FeatureKey,
  handler: (request: NextRequest, user: any) => Promise<NextResponse>
) {
  return async (request: NextRequest): Promise<NextResponse> => {
    const { user, hasAccess, error } = await withAuthAndFeature(request, featureKey);
    if (error) return error;
    
    const response = await handler(request, user);
    
    // Track usage after successful execution
    if (response.status >= 200 && response.status < 300) {
      await trackApiFeatureUsage(user.id, featureKey);
    }
    
    return response;
  };
}

// Usage pattern in API routes
export const POST = withFeatureHandler(
  'website_scan',
  async (request: NextRequest, user: any) => {
    // Secure handler implementation
  }
);
```

### Rate Limiting Pattern

**Established Pattern**: Context-aware rate limiting

```typescript
// Pattern: Different limits per endpoint type
const rateLimitConfig = {
  auth: { maxRequests: 10, window: 60000 },      // Strict for auth
  api: { maxRequests: 50, window: 60000 },       // Moderate for general API
  scan: { maxRequests: 5, window: 300000 },      // Very strict for expensive ops
  default: { maxRequests: 100, window: 60000 }   // Default limits
};

// Pattern: Enhanced rate limit responses
if (!rateLimit(identifier, maxRequests, windowMs)) {
  return NextResponse.json(
    { 
      error: 'Rate limit exceeded',
      message: 'Too many requests. Please try again later.',
      retryAfter: Math.ceil(windowMs / 1000)
    },
    { 
      status: 429,
      headers: {
        'Retry-After': Math.ceil(windowMs / 1000).toString(),
        'X-RateLimit-Limit': maxRequests.toString(),
        'X-RateLimit-Remaining': '0',
        'X-RateLimit-Reset': new Date(Date.now() + windowMs).toISOString(),
      }
    }
  );
}
```

## Testing Patterns ✅

### Security Testing Pattern

**Established Pattern**: Comprehensive security feature testing

```typescript
// Pattern: src/lib/__tests__/edge-rate-limit.test.ts
describe('Edge Rate Limiting', () => {
  beforeEach(() => {
    clearRateLimitData(); // Clean state for each test
  });

  it('should allow requests within rate limit', () => {
    const identifier = 'test-user';
    const maxRequests = 5;
    
    // Test normal operation
    for (let i = 0; i < maxRequests; i++) {
      expect(rateLimit(identifier, maxRequests, windowMs)).toBe(true);
    }
    
    // Test limit enforcement
    expect(rateLimit(identifier, maxRequests, windowMs)).toBe(false);
  });

  it('should handle multiple identifiers independently', () => {
    // Test isolation between different users/IPs
  });

  it('should provide accurate rate limit status', () => {
    // Test status reporting functionality
  });
});
```

### Environment Testing Pattern

**Established Pattern**: Validation testing with different scenarios

```typescript
// Pattern: Test environment validation
describe('Environment Validation', () => {
  it('should validate required fields', () => {
    expect(() => validateEnv()).toThrow('NEXT_PUBLIC_APP_URL: Required');
  });

  it('should enforce HTTPS in production', () => {
    process.env.NODE_ENV = 'production';
    process.env.NEXT_PUBLIC_APP_URL = 'http://example.com';
    expect(() => validateEnv()).toThrow('Production app URL must use HTTPS');
  });
});
```

## Configuration Patterns ✅

### Security Headers Pattern

**Established Pattern**: Vercel.json security configuration

```json
{
  "headers": [
    {
      "source": "/(.*)",
      "headers": [
        {
          "key": "Strict-Transport-Security",
          "value": "max-age=31536000; includeSubDomains; preload"
        },
        {
          "key": "Content-Security-Policy",
          "value": "default-src 'self'; script-src 'self' 'unsafe-eval' 'unsafe-inline'; connect-src 'self' https://api.anthropic.com;"
        }
      ]
    }
  ]
}
```

### Build Configuration Pattern

**Established Pattern**: Next.js config with security considerations

```typescript
// Pattern: next.config.ts
const nextConfig: NextConfig = {
  // Security-focused image optimization
  images: {
    dangerouslyAllowSVG: true,
    contentSecurityPolicy: "default-src 'self'; script-src 'none'; sandbox;",
  },
  
  // Performance optimizations
  experimental: {
    optimizePackageImports: ['@heroicons/react', 'lucide-react'],
  },
  
  // Temporary build settings (remove for production)
  eslint: { ignoreDuringBuilds: true },
  typescript: { ignoreBuildErrors: true },
};
```

## Deployment Patterns ✅

### Security Audit Pattern

**Established Pattern**: Automated security validation

```typescript
// Pattern: scripts/security-audit.ts
class SecurityAuditor {
  async runAudit(): Promise<SecurityIssue[]> {
    await this.checkDependencies();      // Vulnerability scanning
    await this.checkEnvironment();       // Environment validation
    await this.checkSecurityHeaders();   // Header verification
    await this.checkCodePatterns();      // Code analysis
    await this.checkFilePermissions();   // Permission validation
    
    return this.issues;
  }
  
  generateReport(issues: SecurityIssue[]): string {
    // Actionable security report generation
  }
}

// Usage pattern
const auditor = new SecurityAuditor();
const issues = await auditor.runAudit();
const report = auditor.generateReport(issues);
```

### Memory Bank Update Pattern

**Established Pattern**: Structured context maintenance

```markdown
# Pattern: CLAUDE-activeContext.md structure
## Current Session State - STATUS
**Date**: YYYY-MM-DD
**Branch**: current → target
**Session Goal**: Specific objectives
**Status**: Current state

## Recently Completed Major Updates
### 🔒 Feature Name - STATUS
- Key implementation points
- Technical decisions made
- Results achieved

## Current Project Status
### ✅ Completed Core Features
- Categorized feature list with status
### 🎯 Production Ready Status  
- Deployment readiness indicators
```

## Anti-Patterns to Avoid ❌

### Development Anti-Patterns

```bash
# ❌ DON'T: Accumulate experimental features without validation
git add .
git commit -m "WIP: multiple experimental features"

# ✅ DO: Reset to stable state when experiments fail
git reset --hard origin/main
git clean -fd
```

### Feature Development Anti-Patterns

```typescript
// ❌ DON'T: Build multiple complex integrations simultaneously
import { VisionAPI } from './vision';
import { PerformanceAPI } from './performance';
import { SemanticAPI } from './semantic';
// All experimental and untested

// ✅ DO: Build one feature at a time from stable foundation
import { ExistingAPI } from './proven-api';
// Extend proven patterns incrementally
```

### Edge Runtime Anti-Patterns

```typescript
// ❌ DON'T: Import Node.js dependencies in middleware
import { auth } from '@/lib/auth'; // Contains database/crypto dependencies

// ✅ DO: Use edge-compatible alternatives
import { rateLimit } from './lib/edge-rate-limit'; // Pure JS implementation
```

### Security Anti-Patterns

```typescript
// ❌ DON'T: Log sensitive data
console.log('API key:', process.env.SECRET_KEY);

// ✅ DO: Redact sensitive data
console.log('API key available:', !!process.env.SECRET_KEY);
```

### Validation Anti-Patterns

```typescript
// ❌ DON'T: Trust user input without validation
const result = await database.query(`SELECT * FROM users WHERE id = ${userId}`);

// ✅ DO: Always validate and sanitize
const validatedId = await validateInput(idSchema, userId);
const result = await database.query('SELECT * FROM users WHERE id = $1', [validatedId]);
```