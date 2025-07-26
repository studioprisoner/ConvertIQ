/**
 * Enhanced error handling and retry logic for AI services (CON-12)
 */

import { captureErrorWithContext, addBreadcrumb } from '../sentry-utils';

export interface RetryConfig {
  maxRetries: number;
  baseDelayMs: number;
  maxDelayMs: number;
  exponentialBase: number;
  retryableErrors: string[];
}

export interface AIServiceError extends Error {
  code?: string;
  statusCode?: number;
  retryable?: boolean;
  provider?: 'anthropic' | 'voyage';
}

/**
 * Default retry configurations for different AI operations
 */
export const RETRY_CONFIGS = {
  analysis: {
    maxRetries: 3,
    baseDelayMs: 1000,
    maxDelayMs: 10000,
    exponentialBase: 2,
    retryableErrors: [
      'timeout',
      'rate_limit',
      'server_error',
      'network_error',
      'service_unavailable'
    ]
  },
  embedding: {
    maxRetries: 5,
    baseDelayMs: 500,
    maxDelayMs: 15000,
    exponentialBase: 2,
    retryableErrors: [
      'timeout',
      'rate_limit',
      'server_error',
      'network_error',
      'service_unavailable'
    ]
  },
  connection_test: {
    maxRetries: 2,
    baseDelayMs: 2000,
    maxDelayMs: 5000,
    exponentialBase: 1.5,
    retryableErrors: [
      'timeout',
      'network_error',
      'service_unavailable'
    ]
  }
} as const;

/**
 * Enhanced retry wrapper with exponential backoff and error classification
 */
export async function withRetry<T>(
  operation: () => Promise<T>,
  config: RetryConfig,
  operationName: string,
  context: { provider?: string; userId?: string; url?: string } = {}
): Promise<T> {
  let lastError: AIServiceError | null = null;
  
  for (let attempt = 0; attempt <= config.maxRetries; attempt++) {
    try {
      addBreadcrumb(
        `${operationName} attempt ${attempt + 1}/${config.maxRetries + 1}`,
        'ai.retry',
        { attempt, operationName, ...context }
      );

      const result = await operation();
      
      if (attempt > 0) {
        addBreadcrumb(
          `${operationName} succeeded after ${attempt} retries`,
          'ai.retry.success',
          { attempt, operationName, ...context }
        );
      }
      
      return result;
    } catch (error) {
      lastError = classifyError(error, context.provider as 'anthropic' | 'voyage');
      
      // If this is the last attempt or error is not retryable, throw
      if (attempt === config.maxRetries || !isRetryableError(lastError, config)) {
        captureErrorWithContext(lastError, {
          component: 'ai-error-handling',
          action: operationName,
          additionalData: {
            attempt: attempt + 1,
            maxRetries: config.maxRetries + 1,
            isRetryable: isRetryableError(lastError, config),
            ...context
          }
        });
        
        throw lastError;
      }
      
      // Calculate delay with exponential backoff and jitter
      const delay = Math.min(
        config.baseDelayMs * Math.pow(config.exponentialBase, attempt) + Math.random() * 1000,
        config.maxDelayMs
      );
      
      addBreadcrumb(
        `${operationName} failed (attempt ${attempt + 1}), retrying in ${delay}ms`,
        'ai.retry.failed',
        { 
          attempt, 
          delay, 
          error: lastError.message, 
          operationName, 
          ...context 
        }
      );
      
      await sleep(delay);
    }
  }
  
  // This should never be reached due to the logic above, but TypeScript requires it
  throw lastError || new Error('Unknown error in retry logic');
}

/**
 * Classify errors into retryable and non-retryable categories
 */
function classifyError(error: unknown, provider?: 'anthropic' | 'voyage'): AIServiceError {
  if (error instanceof Error) {
    const aiError = error as AIServiceError;
    aiError.provider = provider;
    
    // Anthropic-specific error classification
    if (provider === 'anthropic') {
      if (error.message.includes('timeout')) {
        aiError.code = 'timeout';
        aiError.retryable = true;
      } else if (error.message.includes('rate limit') || error.message.includes('429')) {
        aiError.code = 'rate_limit';
        aiError.retryable = true;
      } else if (error.message.includes('server error') || error.message.includes('5')) {
        aiError.code = 'server_error';
        aiError.retryable = true;
      } else if (error.message.includes('network') || error.message.includes('fetch')) {
        aiError.code = 'network_error';
        aiError.retryable = true;
      } else if (error.message.includes('quota') || error.message.includes('usage')) {
        aiError.code = 'quota_exceeded';
        aiError.retryable = false;
      } else if (error.message.includes('invalid') || error.message.includes('400')) {
        aiError.code = 'invalid_request';
        aiError.retryable = false;
      } else {
        aiError.code = 'unknown';
        aiError.retryable = false;
      }
    }
    
    // Voyage AI-specific error classification
    if (provider === 'voyage') {
      if (error.message.includes('429')) {
        aiError.code = 'rate_limit';
        aiError.retryable = true;
      } else if (error.message.includes('timeout')) {
        aiError.code = 'timeout';
        aiError.retryable = true;
      } else if (error.message.includes('5')) {
        aiError.code = 'server_error';
        aiError.retryable = true;
      } else if (error.message.includes('network') || error.message.includes('fetch')) {
        aiError.code = 'network_error';
        aiError.retryable = true;
      } else if (error.message.includes('quota') || error.message.includes('usage')) {
        aiError.code = 'quota_exceeded';
        aiError.retryable = false;
      } else if (error.message.includes('invalid') || error.message.includes('400')) {
        aiError.code = 'invalid_request';
        aiError.retryable = false;
      } else {
        aiError.code = 'unknown';
        aiError.retryable = false;
      }
    }
    
    return aiError;
  }
  
  return {
    name: 'AIServiceError',
    message: String(error),
    code: 'unknown',
    retryable: false,
    provider
  };
}

/**
 * Check if error is retryable based on configuration
 */
function isRetryableError(error: AIServiceError, config: RetryConfig): boolean {
  if (error.retryable === false) return false;
  if (!error.code) return false;
  return config.retryableErrors.includes(error.code);
}

/**
 * Sleep utility for retry delays
 */
function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Circuit breaker for AI services to prevent cascading failures
 */
export class AIServiceCircuitBreaker {
  private failureCount = 0;
  private lastFailureTime = 0;
  private state: 'closed' | 'open' | 'half-open' = 'closed';
  
  constructor(
    private readonly failureThreshold: number = 5,
    private readonly resetTimeoutMs: number = 60000, // 1 minute
    private readonly serviceName: string = 'ai-service'
  ) {}
  
  async execute<T>(
    operation: () => Promise<T>,
    operationName: string = 'unknown'
  ): Promise<T> {
    if (this.state === 'open') {
      if (Date.now() - this.lastFailureTime >= this.resetTimeoutMs) {
        this.state = 'half-open';
        addBreadcrumb(
          `Circuit breaker half-open for ${this.serviceName}`,
          'ai.circuit-breaker',
          { state: 'half-open', serviceName: this.serviceName }
        );
      } else {
        throw new Error(`Circuit breaker open for ${this.serviceName}. Service temporarily unavailable.`);
      }
    }
    
    try {
      const result = await operation();
      
      if (this.state === 'half-open') {
        this.reset();
      }
      
      return result;
    } catch (error) {
      this.recordFailure();
      
      captureErrorWithContext(
        error instanceof Error ? error : new Error(String(error)),
        {
          component: 'ai-circuit-breaker',
          action: operationName,
          additionalData: {
            serviceName: this.serviceName,
            failureCount: this.failureCount,
            state: this.state
          }
        }
      );
      
      throw error;
    }
  }
  
  private recordFailure(): void {
    this.failureCount++;
    this.lastFailureTime = Date.now();
    
    if (this.failureCount >= this.failureThreshold) {
      this.state = 'open';
      addBreadcrumb(
        `Circuit breaker opened for ${this.serviceName}`,
        'ai.circuit-breaker',
        { 
          state: 'open', 
          serviceName: this.serviceName, 
          failureCount: this.failureCount 
        }
      );
    }
  }
  
  private reset(): void {
    this.failureCount = 0;
    this.state = 'closed';
    addBreadcrumb(
      `Circuit breaker reset for ${this.serviceName}`,
      'ai.circuit-breaker',
      { state: 'closed', serviceName: this.serviceName }
    );
  }
  
  getState(): { state: string; failureCount: number; lastFailureTime: number } {
    return {
      state: this.state,
      failureCount: this.failureCount,
      lastFailureTime: this.lastFailureTime
    };
  }
}

// Singleton circuit breakers for each service
export const anthropicCircuitBreaker = new AIServiceCircuitBreaker(5, 60000, 'anthropic');
export const voyageCircuitBreaker = new AIServiceCircuitBreaker(3, 30000, 'voyage');