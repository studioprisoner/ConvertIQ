import { Polar } from '@polar-sh/sdk';

if (!process.env.POLAR_ACCESS_TOKEN) {
  throw new Error('POLAR_ACCESS_TOKEN environment variable is required');
}

// Initialize Polar API client
export const polar = new Polar({
  accessToken: process.env.POLAR_ACCESS_TOKEN,
  server: 'production', // Use production API
});

// Polar configuration constants
export const POLAR_CONFIG = {
  webhookSecret: process.env.POLAR_WEBHOOK_SECRET,
  organizationName: 'convertiq', // Your Polar organization name
  plans: {
    basic: {
      name: 'Basic Plan',
      priceMonthly: 1900, // $19.00 in cents
      features: [
        '1 website scan per month',
        'Basic conversion analysis',
        'Email support',
        'Standard recommendations'
      ]
    },
    pro: {
      name: 'Pro Plan', 
      priceMonthly: 4900, // $49.00 in cents
      features: [
        'Unlimited website scans',
        'Advanced conversion analysis',
        'Priority support',
        'Custom recommendations',
        'Multi-website support',
        'Export reports (PDF)',
        'Historical data tracking'
      ]
    }
  }
} as const;

// Helper function to get plan details
export function getPlanDetails(planType: 'basic' | 'pro') {
  return POLAR_CONFIG.plans[planType];
}

// Helper function to format price for display
export function formatPrice(cents: number): string {
  return `$${(cents / 100).toFixed(2)}`;
}