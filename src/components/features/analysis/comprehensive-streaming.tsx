'use client';

import { experimental_useObject as useObject } from '@ai-sdk/react';
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
  ArrowPathIcon,
  BeakerIcon,
  PaintBrushIcon,
  MagnifyingGlassIcon,
  ChartBarIcon
} from '@heroicons/react/24/outline';
import { z } from 'zod';

// Schema for comprehensive streaming analysis
const comprehensiveStreamSchema = z.object({
  conversionPsychology: z.any().optional(),
  uxAnalysis: z.any().optional(),
  technicalSeo: z.any().optional(),
  overallInsights: z.object({
    summary: z.string(),
    overallScore: z.number().min(1).max(10),
    priorityAreas: z.array(z.string()),
    isPartial: z.boolean().default(false),
    failedSections: z.number().default(0),
  }).optional(),
  metadata: z.object({
    processingTime: z.number(),
    modelUsed: z.string(),
    promptVersion: z.string(),
    confidence: z.number(),
    isPartial: z.boolean().default(false),
    completedSections: z.array(z.string()),
    currentSection: z.string().optional(),
  }),
});

interface ComprehensiveStreamingProps {
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
  onComplete?: (result: any) => void;
}

export function ComprehensiveStreaming({ 
  crawlData, 
  websiteId, 
  onComplete 
}: ComprehensiveStreamingProps) {
  const [isStarted, setIsStarted] = useState(false);

  const { object, submit, isLoading, error, stop } = useObject({
    api: '/api/ai/stream-comprehensive',
    schema: comprehensiveStreamSchema,
    onFinish: ({ object }) => {
      console.log('✅ Comprehensive streaming analysis completed:', object);
      onComplete?.(object);
    },
  });

  const startAnalysis = () => {
    setIsStarted(true);
    submit({
      crawlData,
      websiteId,
    });
  };

  const sections = [
    {
      key: 'conversionPsychology',
      name: 'Conversion Psychology',
      icon: BeakerIcon,
      color: 'text-purple-600',
      bgColor: 'bg-purple-50',
    },
    {
      key: 'uxAnalysis',
      name: 'UX Analysis',
      icon: PaintBrushIcon,
      color: 'text-blue-600',
      bgColor: 'bg-blue-50',
    },
    {
      key: 'technicalSeo',
      name: 'Technical SEO',
      icon: MagnifyingGlassIcon,
      color: 'text-green-600',
      bgColor: 'bg-green-50',
    },
    {
      key: 'overallInsights',
      name: 'Overall Insights',
      icon: ChartBarIcon,
      color: 'text-orange-600',
      bgColor: 'bg-orange-50',
    },
  ];

  // Calculate overall progress
  const calculateProgress = () => {
    if (!object?.metadata) return 0;
    
    const completedSections = object.metadata.completedSections || [];
    return (completedSections.length / sections.length) * 100;
  };

  // Get section status
  const getSectionStatus = (sectionKey: string) => {
    if (!object) return 'pending';
    
    const hasData = object[sectionKey as keyof typeof object];
    const isCompleted = object.metadata?.completedSections?.includes(sectionKey);
    const isCurrent = object.metadata?.currentSection === sectionKey;
    
    if (isCompleted || hasData) return 'completed';
    if (isCurrent) return 'processing';
    return 'pending';
  };

  const renderSectionCard = (section: typeof sections[0]) => {
    const status = getSectionStatus(section.key);
    const data = object?.[section.key as keyof typeof object];
    const Icon = section.icon;

    return (
      <Card key={section.key} className={`${section.bgColor} border-2 ${
        status === 'processing' ? 'border-blue-300 animate-pulse' :
        status === 'completed' ? 'border-green-300' :
        'border-gray-200'
      }`}>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-3">
            <Icon className={`h-5 w-5 ${section.color}`} />
            <span>{section.name}</span>
            {status === 'processing' && (
              <ArrowPathIcon className="h-4 w-4 animate-spin text-blue-500" />
            )}
            {status === 'completed' && (
              <CheckCircleIcon className="h-4 w-4 text-green-500" />
            )}
            {status === 'pending' && (
              <ClockIcon className="h-4 w-4 text-gray-400" />
            )}
          </CardTitle>
        </CardHeader>
        
        <CardContent>
          {status === 'pending' && (
            <p className="text-sm text-gray-600">Waiting to start...</p>
          )}
          
          {status === 'processing' && (
            <div className="space-y-2">
              <p className="text-sm text-blue-600 font-medium">Analyzing...</p>
              <Progress value={50} className="w-full" />
            </div>
          )}
          
          {status === 'completed' && data && (
            <div className="space-y-3">
              {/* Overall Score */}
              {data.overallScore && (
                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium">Score:</span>
                  <Badge variant="outline">{data.overallScore}/10</Badge>
                </div>
              )}
              
              {/* Key Findings */}
              {data.keyFindings && data.keyFindings.length > 0 && (
                <div>
                  <h4 className="text-sm font-medium mb-2">Key Findings:</h4>
                  <ul className="space-y-1">
                    {data.keyFindings.slice(0, 2).map((finding: string, idx: number) => (
                      <li key={idx} className="text-xs text-gray-600 flex items-start gap-1">
                        <span className="text-blue-500 mt-1">•</span>
                        <span>{finding}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
              
              {/* Summary for Overall Insights */}
              {section.key === 'overallInsights' && data.summary && (
                <div className="prose prose-sm max-w-none">
                  <div className="text-xs text-gray-600">
                    {data.summary.split('\n').slice(0, 3).join('\n')}...
                  </div>
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>
    );
  };

  return (
    <div className="space-y-6">
      {/* Main Control Card */}
      <Card className="border-2 border-blue-200">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <SparklesIcon className="h-6 w-6 text-blue-600" />
            Comprehensive Analysis
            {isLoading && (
              <ArrowPathIcon className="h-4 w-4 animate-spin text-blue-500" />
            )}
          </CardTitle>
          <CardDescription>
            Real-time comprehensive AI analysis for {crawlData.url}
          </CardDescription>
        </CardHeader>
        
        <CardContent className="space-y-4">
          {/* Controls */}
          {!isStarted && (
            <Button onClick={startAnalysis} className="flex items-center gap-2">
              <SparklesIcon className="h-4 w-4" />
              Start Comprehensive Analysis
            </Button>
          )}

          {isStarted && (
            <div className="flex gap-2">
              {isLoading && (
                <Button onClick={stop} variant="outline" className="flex items-center gap-2">
                  <ExclamationCircleIcon className="h-4 w-4" />
                  Stop Analysis
                </Button>
              )}
              {!isLoading && object && (
                <Badge variant="secondary" className="flex items-center gap-1">
                  <CheckCircleIcon className="h-3 w-3" />
                  Analysis Complete
                </Badge>
              )}
            </div>
          )}

          {/* Overall Progress */}
          {isLoading && (
            <div className="space-y-2">
              <div className="flex items-center justify-between text-sm">
                <span>Overall Progress</span>
                <span>{Math.round(calculateProgress())}%</span>
              </div>
              <Progress value={calculateProgress()} className="w-full" />
              {object?.metadata?.currentSection && (
                <p className="text-xs text-gray-600">
                  Currently analyzing: {object.metadata.currentSection.replace(/([A-Z])/g, ' $1').trim()}
                </p>
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
              <p className="mt-2 text-sm text-red-700">{error.message}</p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Section Cards Grid */}
      {isStarted && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {sections.map(renderSectionCard)}
        </div>
      )}

      {/* Final Results Summary */}
      {object?.overallInsights && (
        <Card className="border-2 border-green-200 bg-green-50">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-green-800">
              <CheckCircleIcon className="h-6 w-6" />
              Analysis Complete
            </CardTitle>
          </CardHeader>
          
          <CardContent>
            <div className="space-y-4">
              <div className="flex items-center gap-4">
                <div className="text-center">
                  <div className="text-3xl font-bold text-green-700">
                    {object.overallInsights.overallScore}/10
                  </div>
                  <div className="text-sm text-green-600">Overall Score</div>
                </div>
                <div className="flex-1">
                  <Progress value={object.overallInsights.overallScore * 10} className="w-full" />
                </div>
              </div>
              
              {object.overallInsights.priorityAreas && (
                <div>
                  <h4 className="font-medium text-green-800 mb-2">Priority Areas:</h4>
                  <div className="flex flex-wrap gap-2">
                    {object.overallInsights.priorityAreas.map((area: string, idx: number) => (
                      <Badge key={idx} variant="outline" className="text-green-700 border-green-300">
                        {area}
                      </Badge>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}