import { useState, useCallback, useRef } from 'react';
import { useConfig } from '../common/use-config';

export interface StreamingAnalysisState {
  phase: 'idle' | 'crawling' | 'extraction' | 'analysis' | 'complete' | 'error';
  progress: number;
  data?: any;
  error?: string;
  estimatedTimeRemaining?: number;
}

export interface StreamingAnalysisOptions {
  websiteUrl: string;
  analysisTypes: string[];
  onProgress?: (state: StreamingAnalysisState) => void;
  onComplete?: (result: any) => void;
  onError?: (error: string) => void;
}

/**
 * Hook for real-time streaming website analysis
 * Inspired by Firegeo's streaming capabilities
 */
export function useStreamingAnalysis() {
  const [state, setState] = useState<StreamingAnalysisState>({
    phase: 'idle',
    progress: 0,
  });
  
  const config = useConfig();
  const abortControllerRef = useRef<AbortController | null>(null);
  const startTimeRef = useRef<number>(0);

  const startAnalysis = useCallback(async (options: StreamingAnalysisOptions) => {
    // Abort any existing analysis
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }

    // Create new abort controller
    abortControllerRef.current = new AbortController();
    startTimeRef.current = Date.now();

    setState({
      phase: 'crawling',
      progress: 0,
    });

    try {
      const response = await fetch('/api/analysis/stream', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          websiteUrl: options.websiteUrl,
          analysisTypes: options.analysisTypes,
          config: {
            firecrawlV2Enabled: config.isFirecrawlV2Enabled(),
            enhancedAnalysisEnabled: config.isEnhancedAnalysisEnabled(),
            aiProvider: config.getDefaultAIProvider(),
          },
        }),
        signal: abortControllerRef.current.signal,
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      // Handle Server-Sent Events for real-time updates
      if (response.body) {
        const reader = response.body.getReader();
        const decoder = new TextDecoder();

        while (true) {
          const { done, value } = await reader.read();
          
          if (done) break;
          
          const chunk = decoder.decode(value);
          const lines = chunk.split('\n');
          
          for (const line of lines) {
            if (line.startsWith('data: ')) {
              try {
                const data = JSON.parse(line.slice(6));
                
                const newState: StreamingAnalysisState = {
                  phase: data.phase || 'crawling',
                  progress: data.progress || 0,
                  data: data.data,
                  estimatedTimeRemaining: calculateETA(data.progress),
                };
                
                setState(newState);
                options.onProgress?.(newState);
                
                if (data.phase === 'complete') {
                  options.onComplete?.(data.data);
                  break;
                }
                
                if (data.error) {
                  throw new Error(data.error);
                }
              } catch (parseError) {
                console.warn('Failed to parse SSE data:', parseError);
              }
            }
          }
        }
      }
    } catch (error) {
      if (error instanceof Error && error.name === 'AbortError') {
        setState({
          phase: 'idle',
          progress: 0,
        });
        return;
      }

      const errorMessage = error instanceof Error ? error.message : 'Analysis failed';
      
      setState({
        phase: 'error',
        progress: 0,
        error: errorMessage,
      });
      
      options.onError?.(errorMessage);
    }
  }, [config]);

  const stopAnalysis = useCallback(() => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      abortControllerRef.current = null;
    }
    
    setState({
      phase: 'idle',
      progress: 0,
    });
  }, []);

  const reset = useCallback(() => {
    stopAnalysis();
  }, [stopAnalysis]);

  // Calculate estimated time remaining based on progress
  const calculateETA = (progress: number): number | undefined => {
    if (progress <= 0 || startTimeRef.current === 0) return undefined;
    
    const elapsed = Date.now() - startTimeRef.current;
    const estimatedTotal = elapsed / (progress / 100);
    const remaining = estimatedTotal - elapsed;
    
    return Math.max(0, Math.round(remaining / 1000)); // Return seconds
  };

  return {
    // State
    state,
    isAnalyzing: state.phase !== 'idle' && state.phase !== 'complete' && state.phase !== 'error',
    isComplete: state.phase === 'complete',
    hasError: state.phase === 'error',
    
    // Actions
    startAnalysis,
    stopAnalysis,
    reset,
    
    // Helpers
    getPhaseDescription: (phase: StreamingAnalysisState['phase']) => {
      const descriptions = {
        idle: 'Ready to start analysis',
        crawling: 'Crawling website pages',
        extraction: 'Extracting structured data',
        analysis: 'Analyzing with AI',
        complete: 'Analysis complete',
        error: 'Analysis failed',
      };
      return descriptions[phase];
    },
    
    formatETA: (seconds?: number) => {
      if (!seconds) return null;
      if (seconds < 60) return `${seconds}s remaining`;
      const minutes = Math.floor(seconds / 60);
      const remainingSeconds = seconds % 60;
      return `${minutes}m ${remainingSeconds}s remaining`;
    },
  };
}