# Troubleshooting Guide - ConvertIQ

## Recently Resolved Issues ✅

### Edge Runtime Compatibility (CON-18) - RESOLVED

**Error**: `The edge runtime does not support Node.js 'crypto' module`

**Symptoms**:
- Build failures during deployment
- Middleware not loading properly
- Runtime errors in Edge functions

**Root Cause**: 
Middleware importing database dependencies that use Node.js crypto module (PostgreSQL client)

**Solution Applied**:
```typescript
// OLD: src/middleware.ts (problematic)
import { rateLimit } from './lib/api-middleware'; // Contains DB dependencies

// NEW: src/middleware.ts (fixed)
import { rateLimit } from './lib/edge-rate-limit'; // Pure JS, no Node.js deps
```

**Files Modified**:
- Created `src/lib/edge-rate-limit.ts` - Edge-compatible rate limiting
- Updated `src/middleware.ts` - Import from edge-compatible module
- Updated `src/lib/api-middleware.ts` - Re-export edge functions

**Verification**:
- Build successful without warnings
- Middleware bundle reduced from 495kB → 40.9kB (92% reduction)
- All tests passing (6/6 rate limiting tests)

### Neon Workflow Role Error - RESOLVED

**Error**: `Multiple roles found for the branch, please provide one with the --role-name option: authenticator, anonymous, authenticated, neondb_owner`

**Symptoms**:
- GitHub Actions workflow failing
- Neon branch creation unsuccessful
- CI/CD pipeline interruption

**Root Cause**: 
Neon create-branch-action v5 → v6 changed parameter names and requires explicit role specification

**Solution Applied**:
```yaml
# OLD: .github/workflows/neon_workflow.yml (problematic)
uses: neondatabase/create-branch-action@v5
with:
  role_name: neondb_owner  # Wrong parameter name for v6

# NEW: .github/workflows/neon_workflow.yml (fixed)
uses: neondatabase/create-branch-action@v6
with:
  role: neondb_owner       # Correct parameter name for v6
```

**Files Modified**:
- `.github/workflows/neon_workflow.yml` - Updated action version and parameters

**Verification**:
- Workflow ready for testing on next PR
- Parameter names match v6 API specification

## Security Implementation Troubleshooting

### Content Security Policy (CSP) Issues

**Common Issue**: Application features breaking due to restrictive CSP

**Current CSP Configuration**:
```
default-src 'self'; 
style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; 
font-src 'self' https://fonts.gstatic.com; 
script-src 'self' 'unsafe-eval' 'unsafe-inline' https://va.vercel-scripts.com https://vitals.vercel-insights.com; 
connect-src 'self' https://api.anthropic.com https://api.voyageai.com https://vitals.vercel-insights.com; 
img-src 'self' data: https: blob:; 
media-src 'self'; 
object-src 'none'; 
frame-src 'none'; 
base-uri 'self'; 
form-action 'self';
```

**Troubleshooting Steps**:
1. Check browser console for CSP violations
2. Add specific domains to appropriate directives
3. Test in development before deployment
4. Use CSP reporting for ongoing monitoring

### Environment Validation Failures

**Error**: Environment validation failed at startup

**Symptoms**:
- Application won't start
- Production deployment failures
- Validation error messages

**Troubleshooting Steps**:
1. Check all required environment variables are set
2. Verify environment variable formats (URLs, API keys, etc.)
3. Review `src/lib/env-validation.ts` for specific requirements
4. Use development mode for detailed error messages

**Common Issues**:
```bash
# Missing required variables
NEXT_PUBLIC_APP_URL: Required
NODE_ENV: Required

# Invalid formats
BETTER_AUTH_SECRET: Must be at least 32 characters
NEXT_PUBLIC_APP_URL: Must use HTTPS in production
```

### Rate Limiting Issues

**Issue**: Rate limiting too aggressive or not working

**Troubleshooting**:
1. Check rate limit headers in response:
   - `X-RateLimit-Limit`
   - `X-RateLimit-Remaining` 
   - `X-RateLimit-Reset`

2. Adjust limits in `src/middleware.ts`:
```typescript
// API endpoints have different limits
if (pathname.startsWith('/api/auth/')) {
  maxRequests = 10;      // Adjust as needed
  windowMs = 60000;      // 1 minute window
}
```

3. Clear rate limit data for testing:
```typescript
import { clearRateLimitData } from './lib/edge-rate-limit';
clearRateLimitData(); // For testing only
```

## Build & Deployment Issues

### TypeScript/ESLint Bypass

**Current Configuration** (temporary for rapid development):
```typescript
// next.config.ts
eslint: {
  ignoreDuringBuilds: true,  // Temporarily disabled
},
typescript: {
  ignoreBuildErrors: true,   // Temporarily disabled
},
```

**For Production**:
1. Re-enable TypeScript checking
2. Fix all type errors
3. Re-enable ESLint validation
4. Run `bun run lint` before deployment

### Dependency Conflicts

**Issue**: Multiple lockfiles or dependency conflicts

**Solution**:
```bash
# Remove conflicting lockfiles
rm package-lock.json yarn.lock

# Use Bun exclusively
bun install
```

## Testing & Validation

### Security Audit Failures

**Command**: `bun run security:audit`

**Common Issues**:
1. **Critical/High Issues**: Must be resolved before deployment
2. **Environment Issues**: Fix configuration problems
3. **Dependency Issues**: Update vulnerable packages
4. **Permission Issues**: Run `bun run security:fix-permissions`

### Test Failures

**Rate Limiting Tests**:
```bash
bun test src/lib/__tests__/edge-rate-limit.test.ts
```

**Common Issues**:
- Timing-related test failures: Increase timeout values
- Memory cleanup issues: Use `clearRateLimitData()` in test setup

## Performance Issues

### Middleware Bundle Size

**Monitor**: Keep middleware bundle under 50kB for optimal performance

**Current**: 40.9kB (optimized from 495kB)

**If Size Increases**:
1. Check for unnecessary imports
2. Use dynamic imports where possible
3. Split functionality between Edge and Node.js runtimes

### Edge Runtime Limitations

**Restrictions**:
- No Node.js APIs (fs, crypto, etc.)
- No database connections
- Limited npm package compatibility

**Solutions**:
- Use Web APIs instead of Node.js APIs
- Move database operations to API routes
- Use Edge-compatible alternatives

## Monitoring & Alerting

### Security Monitoring

**Automated Checks**:
```bash
# Run security audit
bun run security:audit

# Check file permissions
bun run security:fix-permissions

# Dependency vulnerability scan
bun audit
```

**Production Monitoring**:
- Security headers verification
- Rate limiting effectiveness
- Environment validation logs
- Build-time security checks

### Performance Monitoring

**Key Metrics**:
- Middleware bundle size
- Edge Runtime response times
- Rate limiting accuracy
- Memory usage patterns

**Alerts**:
- Bundle size increases > 50kB
- Rate limiting failures
- Security validation failures
- Environment validation errors

## Emergency Procedures

### Rollback Security Changes

**If Security Measures Break Production**:

1. **Disable CSP** (temporary):
```typescript
// vercel.json - comment out CSP header
// {
//   "key": "Content-Security-Policy",
//   "value": "..."
// }
```

2. **Disable Rate Limiting**:
```typescript
// src/middleware.ts - bypass rate limiting
if (false && !rateLimit(ip, maxRequests, windowMs)) {
  // Rate limiting disabled
}
```

3. **Disable Environment Validation**:
```typescript
// instrumentation.ts - comment out validation
// validateEnv();
```

### Performance Degradation

**If Edge Runtime Issues**:
1. Check middleware bundle size
2. Verify no Node.js dependencies
3. Monitor Edge Runtime logs
4. Consider reverting to Node.js middleware temporarily

**Contact & Support**:
- Linear issues for bug reports
- GitHub Issues for urgent problems
- Security issues: immediate priority