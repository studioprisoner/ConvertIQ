import { Polar } from '@polar-sh/sdk';
import { POLAR_CONFIG } from './polar-config';

if (!process.env.POLAR_ACCESS_TOKEN) {
  throw new Error('POLAR_ACCESS_TOKEN environment variable is required');
}

// Initialize Polar API client (server-side only)
export const polar = new Polar({
  accessToken: process.env.POLAR_ACCESS_TOKEN,
  server: 'production', // Use production API
});

// Server-side Polar configuration
export const POLAR_SERVER_CONFIG = {
  webhookSecret: process.env.POLAR_WEBHOOK_SECRET,
  ...POLAR_CONFIG,
} as const;

// Re-export client-safe functions and config
export { POLAR_CONFIG, getPlanDetails, formatPrice } from './polar-config';