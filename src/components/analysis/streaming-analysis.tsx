'use client';

import { useChat } from '@ai-sdk/react';
import { useState } from 'react';
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
import { conversionPsychologyAnalysisSchema, uxAnalysisSchema, technicalSeoAnalysisSchema } from '@/lib/ai/types';

interface StreamingAnalysisProps {
  crawlData: {
    url: string;
    htmlAnalysis: {
      title?: string;
      description?: string;
      content?: string;
      headings?: string[];
      images?: string[];
      links?: string[];
    };
    statusCode: number;
  };
  websiteId: string;
  analysisType: 'conversion_psychology' | 'ux_analysis' | 'technical_seo';
  onComplete?: (result: any) => void;
}

export function StreamingAnalysis({ 
  crawlData, 
  websiteId, 
  analysisType, 
  onComplete 
}: StreamingAnalysisProps) {
  const [isStarted, setIsStarted] = useState(false);
  
  // Get the appropriate schema based on analysis type
  const getSchema = () => {
    switch (analysisType) {
      case 'conversion_psychology':
        return conversionPsychologyAnalysisSchema;
      case 'ux_analysis':
        return uxAnalysisSchema;
      case 'technical_seo':
        return technicalSeoAnalysisSchema;
      default:
        return conversionPsychologyAnalysisSchema;
    }
  };

  const [parsedObject, setParsedObject] = useState<any>(null);
  
  const { messages, append, isLoading, error, stop } = useChat({
    api: '/api/ai/stream-analysis',
    onFinish: (message) => {
      console.log('✅ Streaming analysis completed:', message.content);
      try {
        const parsed = JSON.parse(message.content);
        setParsedObject(parsed);
        onComplete?.(parsed);
      } catch (err) {
        console.error('Failed to parse JSON response:', err);
      }
    },
  });

  const startAnalysis = () => {
    setIsStarted(true);
    append({
      role: 'user',
      content: JSON.stringify({
        crawlData,
        websiteId,
        analysisType,
      }),
    });
  };

  const getAnalysisTitle = () => {
    switch (analysisType) {
      case 'conversion_psychology':
        return 'Conversion Psychology Analysis';
      case 'ux_analysis':
        return 'UX/UI Analysis';
      case 'technical_seo':
        return 'Technical SEO Analysis';
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
      default:
        return '📊';
    }
  };

  // Calculate progress based on available data
  const calculateProgress = () => {
    if (!parsedObject) return 0;
    
    const fields = ['overallScore', 'keyFindings', 'priorityRecommendations'];
    const completedFields = fields.filter(field => parsedObject[field] !== undefined);
    
    return (completedFields.length / fields.length) * 100;
  };

  // Get current streaming text
  const currentText = messages[messages.length - 1]?.content || '';
  
  // Try to parse partial JSON as streaming happens
  const object = parsedObject || (() => {
    if (!currentText || !isLoading) return null;
    try {
      // Try to extract and parse JSON from partial text
      const jsonMatch = currentText.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        return JSON.parse(jsonMatch[0]);
      }
    } catch {
      // Ignore parsing errors during streaming
    }
    return null;
  })();

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
              <Button onClick={stop} variant="outline" className="flex items-center gap-2">
                <ExclamationCircleIcon className="h-4 w-4" />
                Stop Analysis
              </Button>
            )}
            {!isLoading && parsedObject && (
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
              <span>Analysis Progress</span>
              <span>{Math.round(calculateProgress())}%</span>
            </div>
            <Progress value={calculateProgress()} className="w-full" />
          </div>
        )}

        {/* Error State */}
        {error && (
          <div className="rounded-lg border border-red-200 bg-red-50 p-4">
            <div className="flex items-center gap-2 text-red-800">
              <ExclamationCircleIcon className="h-5 w-5" />
              <span className="font-medium">Analysis Failed</span>
            </div>
            <p className="mt-2 text-sm text-red-700">{error.message}</p>
          </div>
        )}

        {/* Streaming Results */}
        {object && (
          <div className="space-y-4">
            {/* Overall Score */}
            {object.overallScore && (
              <div className="rounded-lg border bg-gradient-to-r from-blue-50 to-indigo-50 p-4">
                <h3 className="font-medium text-gray-900">Overall Score</h3>
                <div className="mt-2 flex items-center gap-3">
                  <div className="text-3xl font-bold text-indigo-600">
                    {object.overallScore}/10
                  </div>
                  <Progress value={object.overallScore * 10} className="flex-1" />
                </div>
              </div>
            )}

            {/* Key Findings */}
            {object.keyFindings && object.keyFindings.length > 0 && (
              <div className="rounded-lg border p-4">
                <h3 className="font-medium text-gray-900 mb-3">Key Findings</h3>
                <ul className="space-y-2">
                  {object.keyFindings.map((finding: string, index: number) => (
                    <li key={index} className="flex items-start gap-2 text-sm">
                      <div className="mt-1 h-1.5 w-1.5 rounded-full bg-blue-500 flex-shrink-0" />
                      <span>{finding}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {/* Priority Recommendations */}
            {object.priorityRecommendations && object.priorityRecommendations.length > 0 && (
              <div className="rounded-lg border p-4">
                <h3 className="font-medium text-gray-900 mb-3">Priority Recommendations</h3>
                <ul className="space-y-3">
                  {object.priorityRecommendations.map((recommendation: string, index: number) => (
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

            {/* Category-specific results */}
            {object.categories && (
              <div className="rounded-lg border p-4">
                <h3 className="font-medium text-gray-900 mb-3">Detailed Analysis</h3>
                <div className="space-y-3">
                  {Object.entries(object.categories).map(([category, data]: [string, any]) => (
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
        {isLoading && !object && (
          <div className="flex items-center justify-center py-8">
            <div className="text-center space-y-3">
              <ClockIcon className="h-8 w-8 animate-pulse text-blue-500 mx-auto" />
              <p className="text-sm text-gray-600">
                Analyzing {crawlData.url}...
              </p>
              <p className="text-xs text-gray-500">
                Real-time results will appear as they become available
              </p>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}