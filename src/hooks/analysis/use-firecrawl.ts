import { useState, useCallback } from 'react';
import { config } from '@/config';
import { FIRECRAWL_CONSTANTS } from '@/constants';

export interface FirecrawlOptions {
  formats?: ('markdown' | 'html' | 'text' | 'extract')[];
  maxDepth?: number;
  maxLinks?: number;
  timeout?: number;
  onlyMainContent?: boolean;
}

export interface FirecrawlResult {
  success: boolean;
  data?: any;
  error?: string;
  metadata?: {
    tokensUsed?: number;
    cost?: number;
    processingTime?: number;
  };
}

/**
 * Hook for Firecrawl API operations with enhanced error handling and state management
 */
export function useFirecrawl() {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [progress, setProgress] = useState(0);

  const scrapeUrl = useCallback(async (url: string, options: FirecrawlOptions = {}): Promise<FirecrawlResult> => {
    setIsLoading(true);
    setError(null);
    setProgress(0);

    try {
      const response = await fetch('/api/firecrawl/scrape', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          url,
          options: {
            formats: options.formats || ['markdown'],
            timeout: options.timeout || FIRECRAWL_CONSTANTS.TIMEOUTS.SCRAPE,
            pageOptions: {
              onlyMainContent: options.onlyMainContent ?? true,
            },
          },
        }),
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const result = await response.json();
      setProgress(100);
      
      return result;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error occurred';
      setError(errorMessage);
      return {
        success: false,
        error: errorMessage,
      };
    } finally {
      setIsLoading(false);
    }
  }, []);

  const crawlWebsite = useCallback(async (baseUrl: string, options: FirecrawlOptions = {}): Promise<FirecrawlResult> => {
    setIsLoading(true);
    setError(null);
    setProgress(0);

    try {
      const response = await fetch('/api/firecrawl/crawl', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          baseUrl,
          options: {
            maxDepth: options.maxDepth || 2,
            maxLinks: options.maxLinks || 50,
            formats: options.formats || ['markdown'],
            onlyDomain: true,
            timeout: options.timeout || FIRECRAWL_CONSTANTS.TIMEOUTS.CRAWL,
          },
        }),
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const result = await response.json();
      setProgress(100);
      
      return result;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error occurred';
      setError(errorMessage);
      return {
        success: false,
        error: errorMessage,
      };
    } finally {
      setIsLoading(false);
    }
  }, []);

  const extractStructuredData = useCallback(async (
    urls: string[], 
    extractionType: string,
    customPrompt?: string
  ): Promise<FirecrawlResult> => {
    setIsLoading(true);
    setError(null);
    setProgress(0);

    try {
      const response = await fetch('/api/firecrawl/extract', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          urls,
          extractionType,
          customPrompt,
        }),
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const result = await response.json();
      setProgress(100);
      
      return result;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error occurred';
      setError(errorMessage);
      return {
        success: false,
        error: errorMessage,
      };
    } finally {
      setIsLoading(false);
    }
  }, []);

  const batchScrape = useCallback(async (urls: string[], options: FirecrawlOptions = {}): Promise<FirecrawlResult> => {
    setIsLoading(true);
    setError(null);
    setProgress(0);

    try {
      const response = await fetch('/api/firecrawl/batch-scrape', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          urls,
          options: {
            formats: options.formats || ['markdown'],
            timeout: options.timeout || FIRECRAWL_CONSTANTS.TIMEOUTS.SCRAPE,
            pageOptions: {
              onlyMainContent: options.onlyMainContent ?? true,
            },
          },
        }),
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const result = await response.json();
      setProgress(100);
      
      return result;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error occurred';
      setError(errorMessage);
      return {
        success: false,
        error: errorMessage,
      };
    } finally {
      setIsLoading(false);
    }
  }, []);

  const reset = useCallback(() => {
    setError(null);
    setProgress(0);
    setIsLoading(false);
  }, []);

  return {
    // State
    isLoading,
    error,
    progress,
    
    // Actions
    scrapeUrl,
    crawlWebsite,
    extractStructuredData,
    batchScrape,
    reset,
    
    // Helpers
    canUseBatchScrape: urls => urls.length <= FIRECRAWL_CONSTANTS.MAX_URLS.BATCH_SCRAPE,
    canUseExtract: urls => urls.length <= FIRECRAWL_CONSTANTS.MAX_URLS.EXTRACT,
  };
}