import { z } from 'zod';

// Environment validation schema with security requirements
const envSchema = z.object({
  // Database
  DATABASE_URL: z.string().url('Invalid database URL'),
  
  // Authentication
  BETTER_AUTH_SECRET: z.string().min(32, 'Auth secret must be at least 32 characters'),
  BETTER_AUTH_URL: z.string().url('Invalid auth URL'),
  
  // AI Services
  ANTHROPIC_API_KEY: z.string().min(10, 'Invalid Anthropic API key'),
  VOYAGE_API_KEY: z.string().min(10, 'Invalid Voyage API key'),
  
  // Email
  RESEND_API_KEY: z.string().startsWith('re_', 'Invalid Resend API key format'),
  
  // Payments
  POLAR_ACCESS_TOKEN: z.string().min(10, 'Invalid Polar access token'),
  
  // Monitoring
  SENTRY_ORG: z.string().optional(),
  SENTRY_PROJECT: z.string().optional(),
  SENTRY_DSN: z.string().url('Invalid Sentry DSN').optional(),
  
  // Linear Support
  LINEAR_API_KEY: z.string().min(10, 'Invalid Linear API key'),
  LINEAR_TEAM_ID: z.string().uuid('Invalid Linear team ID'),
  
  // App Configuration
  NEXT_PUBLIC_APP_URL: z.string().url('Invalid app URL'),
  NODE_ENV: z.enum(['development', 'production', 'test']),
  
  // Optional development vars
  NEXT_PUBLIC_VERCEL_URL: z.string().optional(),
  VERCEL_URL: z.string().optional(),
});

export type EnvVars = z.infer<typeof envSchema>;

// Validate environment variables at startup
let validatedEnv: EnvVars;

export function validateEnv(): EnvVars {
  if (validatedEnv) {
    return validatedEnv;
  }

  try {
    validatedEnv = envSchema.parse(process.env);
    
    // Additional security checks
    if (validatedEnv.NODE_ENV === 'production') {
      // Ensure production has secure configurations
      if (!validatedEnv.NEXT_PUBLIC_APP_URL.startsWith('https://')) {
        throw new Error('Production app URL must use HTTPS');
      }
      
      if (validatedEnv.BETTER_AUTH_SECRET.length < 64) {
        console.warn('⚠️  Consider using a longer auth secret (64+ chars) for production');
      }
    }
    
    console.log('✅ Environment validation passed');
    return validatedEnv;
  } catch (error) {
    if (error instanceof z.ZodError) {
      const formattedErrors = error.errors.map(err => 
        `${err.path.join('.')}: ${err.message}`
      ).join('\n');
      
      console.error('❌ Environment validation failed:');
      console.error(formattedErrors);
      
      throw new Error(`Invalid environment configuration:\n${formattedErrors}`);
    }
    
    throw error;
  }
}

// Helper to get validated environment variables
export function getEnv(): EnvVars {
  return validateEnv();
}

// Security helper to redact sensitive values in logs
export function redactEnvForLogs(env: Record<string, any>): Record<string, any> {
  const sensitiveKeys = [
    'DATABASE_URL',
    'BETTER_AUTH_SECRET', 
    'ANTHROPIC_API_KEY',
    'VOYAGE_API_KEY',
    'RESEND_API_KEY',
    'POLAR_ACCESS_TOKEN',
    'LINEAR_API_KEY',
    'SENTRY_DSN'
  ];
  
  const redacted = { ...env };
  
  for (const key of sensitiveKeys) {
    if (redacted[key]) {
      const value = redacted[key] as string;
      redacted[key] = value.length > 8 
        ? `${value.slice(0, 4)}***${value.slice(-4)}`
        : '***';
    }
  }
  
  return redacted;
}