// Polar webhook event types
export interface PolarWebhookEvent {
  id: string;
  type: string;
  data: PolarEventData;
  created_at: string;
}

export interface PolarEventData {
  id: string;
  subscription_id?: string;
  customer_id?: string;
  product_id?: string;
  price_id?: string;
  status?: string;
  current_period_start?: string;
  current_period_end?: string;
  canceled_at?: string;
  cancel_at_period_end?: boolean;
  trial_start?: string;
  trial_end?: string;
  metadata?: Record<string, unknown>;
  [key: string]: unknown;
}

// Subscription creation data structure
export interface SubscriptionCreatedData extends PolarEventData {
  customer_id: string;
  product_id: string;
  price_id: string;
  status: 'active' | 'trialing' | 'incomplete';
  current_period_start: string;
  current_period_end: string;
  trial_start?: string;
  trial_end?: string;
  metadata?: {
    userId?: string;
    planId?: string;
    [key: string]: unknown;
  };
}

// Subscription updated data structure
export interface SubscriptionUpdatedData extends PolarEventData {
  status: 'active' | 'trialing' | 'past_due' | 'canceled' | 'incomplete';
  current_period_start: string;
  current_period_end: string;
  canceled_at?: string;
  cancel_at_period_end?: boolean;
}

// Payment event data structure
export interface PaymentEventData extends PolarEventData {
  subscription_id: string;
  amount?: number;
  currency?: string;
  status?: 'succeeded' | 'failed' | 'pending';
}