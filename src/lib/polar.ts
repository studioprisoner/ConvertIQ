import { Polar } from '@polar-sh/sdk';
import { POLAR_CONFIG } from './polar-config';

if (!process.env.POLAR_ACCESS_TOKEN) {
  throw new Error('POLAR_ACCESS_TOKEN environment variable is required');
}

// Determine Polar environment
const polarEnvironment = (process.env.POLAR_ENVIRONMENT || 'sandbox') as 'production' | 'sandbox';

// Initialize Polar API client (server-side only)
export const polar = new Polar({
  accessToken: process.env.POLAR_ACCESS_TOKEN,
  server: polarEnvironment,
});

// Log the environment being used (server-side only)
if (typeof window === 'undefined') {
  console.log(`🔧 Polar configured for: ${polarEnvironment.toUpperCase()} environment`);
}

// Server-side Polar configuration
export const POLAR_SERVER_CONFIG = {
  webhookSecret: process.env.POLAR_WEBHOOK_SECRET,
  ...POLAR_CONFIG,
} as const;

// Re-export client-safe functions and config
export { POLAR_CONFIG, getPlanDetails, formatPrice } from './polar-config';