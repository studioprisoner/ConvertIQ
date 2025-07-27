/**
 * Utilities to handle post-payment timing issues
 */

export const PAYMENT_STORAGE_KEY = 'payment-completed';

/**
 * Check if user is in post-payment state
 */
export function isPostPayment(): boolean {
  if (typeof window === 'undefined') return false;
  
  return (
    window.location.search.includes('payment=success') ||
    sessionStorage.getItem(PAYMENT_STORAGE_KEY) === 'true'
  );
}

/**
 * Set payment completion flag
 */
export function setPaymentCompleted(): void {
  if (typeof window === 'undefined') return;
  
  sessionStorage.setItem(PAYMENT_STORAGE_KEY, 'true');
  console.log('🎯 Payment completion flag set');
}

/**
 * Clear payment completion flag
 */
export function clearPaymentCompleted(): void {
  if (typeof window === 'undefined') return;
  
  sessionStorage.removeItem(PAYMENT_STORAGE_KEY);
  console.log('🧹 Payment completion flag cleared');
}

/**
 * Get retry delay for feature gate checks (exponential backoff)
 */
export function getRetryDelay(retryCount: number): number {
  return Math.min(2000 * (retryCount + 1), 10000); // Cap at 10s
}

/**
 * Maximum number of retries for post-payment feature checks
 */
export const MAX_RETRIES = 3;