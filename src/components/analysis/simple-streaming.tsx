'use client';

import { useState, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { 
  CheckCircleIcon, 
  ClockIcon, 
  ExclamationCircleIcon,
  SparklesIcon,
  ArrowPathIcon
} from '@heroicons/react/24/outline';

import type { CrawlResult } from '@/lib/crawler/types';

interface SimpleStreamingProps {
  crawlData: CrawlResult;
  websiteId: string;
  analysisType: 'conversion_psychology' | 'ux_analysis' | 'technical_seo' | 'comprehensive';
  onComplete?: (result: any) => void;
}

interface StreamEvent {
  type: 'status' | 'result' | 'error';
  message?: string;
  data?: any;
  progress: number;
}

export function SimpleStreaming({ 
  crawlData, 
  websiteId, 
  analysisType, 
  onComplete 
}: SimpleStreamingProps) {
  const [isStarted, setIsStarted] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [status, setStatus] = useState('');
  const [result, setResult] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);
  const eventSourceRef = useRef<EventSource | null>(null);

  const getAnalysisTitle = () => {
    switch (analysisType) {
      case 'conversion_psychology':
        return 'Conversion Psychology Analysis';
      case 'ux_analysis':
        return 'UX/UI Analysis';
      case 'technical_seo':
        return 'Technical SEO Analysis';
      case 'comprehensive':
        return 'Comprehensive Analysis';
      default:
        return 'Analysis';
    }
  };

  const getAnalysisIcon = () => {
    switch (analysisType) {
      case 'conversion_psychology':
        return '🎯';
      case 'ux_analysis':
        return '🎨';
      case 'technical_seo':
        return '🔍';
      case 'comprehensive':
        return '📊';
      default:
        return '📊';
    }
  };

  const startAnalysis = async () => {
    setIsStarted(true);
    setIsLoading(true);
    setProgress(0);
    setStatus('Initializing...');
    setError(null);
    setResult(null);

    try {
      // Start the streaming analysis (use demo API for testing)
      const response = await fetch('/api/ai/stream-demo', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          crawlData,
          websiteId,
          analysisType,
        }),
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      // Create EventSource for server-sent events
      const reader = response.body?.getReader();
      const decoder = new TextDecoder();

      if (!reader) {
        throw new Error('No response body reader available');
      }

      while (true) {
        const { done, value } = await reader.read();
        
        if (done) break;

        const chunk = decoder.decode(value);
        const lines = chunk.split('\n');

        for (const line of lines) {
          if (line.startsWith('data: ')) {
            const data = line.slice(6);
            
            if (data === '[DONE]') {
              setIsLoading(false);
              return;
            }

            try {
              const event: StreamEvent = JSON.parse(data);
              
              setProgress(event.progress);
              
              if (event.type === 'status') {
                setStatus(event.message || '');
              } else if (event.type === 'result') {
                setResult(event.data);
                setStatus('Analysis complete!');
                setIsLoading(false);
                onComplete?.(event.data);
              } else if (event.type === 'error') {
                setError(event.message || 'Unknown error');
                setIsLoading(false);
              }
            } catch (parseError) {
              console.warn('Failed to parse SSE data:', data);
            }
          }
        }
      }
    } catch (err) {
      console.error('Streaming analysis failed:', err);
      setError(err instanceof Error ? err.message : 'Unknown error');
      setIsLoading(false);
    }
  };

  const stopAnalysis = () => {
    if (eventSourceRef.current) {
      eventSourceRef.current.close();
      eventSourceRef.current = null;
    }
    setIsLoading(false);
    setStatus('Analysis stopped');
  };

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <span className="text-2xl">{getAnalysisIcon()}</span>
          {getAnalysisTitle()}
          {isLoading && (
            <ArrowPathIcon className="h-4 w-4 animate-spin text-blue-500" />
          )}
        </CardTitle>
        <CardDescription>
          Real-time AI analysis for {crawlData.url}
        </CardDescription>
      </CardHeader>
      
      <CardContent className="space-y-4">
        {/* Analysis Controls */}
        {!isStarted && (
          <div className="flex gap-2">
            <Button onClick={startAnalysis} className="flex items-center gap-2">
              <SparklesIcon className="h-4 w-4" />
              Start {getAnalysisTitle()}
            </Button>
          </div>
        )}

        {isStarted && (
          <div className="flex gap-2">
            {isLoading && (
              <Button onClick={stopAnalysis} variant="outline" className="flex items-center gap-2">
                <ExclamationCircleIcon className="h-4 w-4" />
                Stop Analysis
              </Button>
            )}
            {!isLoading && result && (
              <Badge variant="secondary" className="flex items-center gap-1">
                <CheckCircleIcon className="h-3 w-3" />
                Analysis Complete
              </Badge>
            )}
          </div>
        )}

        {/* Progress Indicator */}
        {isLoading && (
          <div className="space-y-2">
            <div className="flex items-center justify-between text-sm">
              <span>Progress</span>
              <span>{Math.round(progress)}%</span>
            </div>
            <Progress value={progress} className="w-full" />
            {status && (
              <p className="text-sm text-gray-600">{status}</p>
            )}
          </div>
        )}

        {/* Error State */}
        {error && (
          <div className="rounded-lg border border-red-200 bg-red-50 p-4">
            <div className="flex items-center gap-2 text-red-800">
              <ExclamationCircleIcon className="h-5 w-5" />
              <span className="font-medium">Analysis Failed</span>
            </div>
            <p className="mt-2 text-sm text-red-700">{error}</p>
          </div>
        )}

        {/* Results */}
        {result && (
          <div className="space-y-4">
            {/* Overall Score */}
            {result.analysis?.overallScore && (
              <div className="rounded-lg border bg-gradient-to-r from-blue-50 to-indigo-50 p-4">
                <h3 className="font-medium text-gray-900">Overall Score</h3>
                <div className="mt-2 flex items-center gap-3">
                  <div className="text-3xl font-bold text-indigo-600">
                    {result.analysis.overallScore}/10
                  </div>
                  <Progress value={result.analysis.overallScore * 10} className="flex-1" />
                </div>
              </div>
            )}

            {/* Key Findings */}
            {result.analysis?.keyFindings && result.analysis.keyFindings.length > 0 && (
              <div className="rounded-lg border p-4">
                <h3 className="font-medium text-gray-900 mb-3">Key Findings</h3>
                <ul className="space-y-2">
                  {result.analysis.keyFindings.map((finding: string, index: number) => (
                    <li key={index} className="flex items-start gap-2 text-sm">
                      <div className="mt-1 h-1.5 w-1.5 rounded-full bg-blue-500 flex-shrink-0" />
                      <span>{finding}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {/* Priority Recommendations */}
            {result.analysis?.priorityRecommendations && result.analysis.priorityRecommendations.length > 0 && (
              <div className="rounded-lg border p-4">
                <h3 className="font-medium text-gray-900 mb-3">Priority Recommendations</h3>
                <ul className="space-y-3">
                  {result.analysis.priorityRecommendations.map((recommendation: string, index: number) => (
                    <li key={index} className="flex items-start gap-3">
                      <Badge variant="outline" className="mt-0.5">
                        {index + 1}
                      </Badge>
                      <span className="text-sm">{recommendation}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {/* Categories */}
            {result.analysis?.categories && (
              <div className="rounded-lg border p-4">
                <h3 className="font-medium text-gray-900 mb-3">Detailed Analysis</h3>
                <div className="space-y-3">
                  {Object.entries(result.analysis.categories).map(([category, data]: [string, any]) => (
                    <div key={category} className="border rounded-lg p-3">
                      <div className="flex items-center justify-between mb-2">
                        <h4 className="font-medium capitalize">
                          {category.replace(/([A-Z])/g, ' $1').trim()}
                        </h4>
                        {data.score && (
                          <Badge variant={data.score >= 7 ? 'default' : 'secondary'}>
                            {data.score}/10
                          </Badge>
                        )}
                      </div>
                      {data.recommendations && (
                        <ul className="text-sm text-gray-600 space-y-1">
                          {data.recommendations.slice(0, 3).map((rec: string, idx: number) => (
                            <li key={idx} className="flex items-start gap-2">
                              <span className="text-blue-500">•</span>
                              <span>{rec}</span>
                            </li>
                          ))}
                        </ul>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Loading State */}
        {isLoading && !result && progress < 25 && (
          <div className="flex items-center justify-center py-8">
            <div className="text-center space-y-3">
              <ClockIcon className="h-8 w-8 animate-pulse text-blue-500 mx-auto" />
              <p className="text-sm text-gray-600">
                Starting analysis for {crawlData.url}...
              </p>
              <p className="text-xs text-gray-500">
                This may take 30-90 seconds
              </p>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}