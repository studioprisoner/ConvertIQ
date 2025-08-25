"use client";

import { Badge } from "@/components/badge";
import { Text } from "@/components/text";
import { Button } from "@/components/button";
import {
  ChevronDownIcon,
  ChevronRightIcon,
  LightBulbIcon,
  ChartBarIcon,
  ClockIcon,
  CheckCircleIcon,
  SparklesIcon,
} from "@heroicons/react/24/outline";
import { useState } from "react";

interface EnhancedRecommendation {
  id: string;
  title: string;
  description: string;
  category: string;
  priority: "high" | "medium" | "low";
  impact: {
    score: number;
    category: string;
    reasoning: string;
  };
  effort: {
    score: number;
    category: string;
    reasoning: string;
  };
  implementation: {
    steps: string[];
    enhancedSteps?: string[];
    codeSnippets?: string[];
    resources?: string[];
  };
  whyItMatters: string;
  expectedImpact: string;
  // Enhanced fields from v2 extraction
  enhancedContext?: {
    pageType: string;
    dataConfidence: number;
    structuredInsights: string[];
  };
}

interface EnhancedRecommendationCardProps {
  recommendation: EnhancedRecommendation;
  className?: string;
  expanded?: boolean;
  onToggleExpand?: () => void;
}

export default function EnhancedRecommendationCard({
  recommendation,
  className = "",
  expanded = false,
  onToggleExpand,
}: EnhancedRecommendationCardProps) {
  const [showImplementation, setShowImplementation] = useState(false);

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case "high":
        return "red";
      case "medium":
        return "yellow";
      case "low":
        return "green";
      default:
        return "zinc";
    }
  };

  const getCategoryColor = (category: string) => {
    switch (category) {
      case "conversion":
        return "blue";
      case "ux":
        return "green";
      case "seo":
        return "purple";
      case "performance":
        return "yellow";
      case "content":
        return "indigo";
      case "technical":
        return "gray";
      case "design":
        return "pink";
      default:
        return "zinc";
    }
  };

  const getImpactColor = (score: number) => {
    if (score >= 8) return "text-green-600 dark:text-green-400";
    if (score >= 6) return "text-yellow-600 dark:text-yellow-400";
    return "text-red-600 dark:text-red-400";
  };

  const getEffortColor = (score: number) => {
    if (score <= 3) return "text-green-600 dark:text-green-400"; // Low effort is good
    if (score <= 6) return "text-yellow-600 dark:text-yellow-400";
    return "text-red-600 dark:text-red-400"; // High effort is challenging
  };

  const getConfidenceColor = (confidence: number) => {
    if (confidence >= 0.8) return "text-green-600 dark:text-green-400";
    if (confidence >= 0.6) return "text-yellow-600 dark:text-yellow-400";
    return "text-red-600 dark:text-red-400";
  };

  const isEnhanced = !!recommendation.enhancedContext;
  const hasEnhancedSteps = recommendation.implementation.enhancedSteps && 
    recommendation.implementation.enhancedSteps.length > 0;

  return (
    <div
      className={`border border-zinc-200 dark:border-zinc-700 rounded-lg overflow-hidden hover:border-zinc-300 dark:hover:border-zinc-600 transition-colors ${className}`}
    >
      {/* Header */}
      <div className="p-4 bg-white dark:bg-zinc-900">
        <div className="flex items-start justify-between mb-3">
          <div className="flex-1 min-w-0">
            <div className="flex items-center space-x-3 mb-2">
              <h5 className="font-semibold text-zinc-900 dark:text-white text-lg leading-tight">
                {recommendation.title}
              </h5>
              
              {isEnhanced && (
                <Badge color="blue" className="flex items-center space-x-1">
                  <SparklesIcon className="h-3 w-3" />
                  <span>Enhanced</span>
                </Badge>
              )}
            </div>
            
            <div className="flex flex-wrap items-center gap-2 mb-3">
              <Badge color={getPriorityColor(recommendation.priority) as any}>
                {recommendation.priority} priority
              </Badge>
              <Badge color={getCategoryColor(recommendation.category) as any}>
                {recommendation.category}
              </Badge>
              
              {recommendation.enhancedContext && (
                <Badge color="indigo">
                  {recommendation.enhancedContext.pageType}
                </Badge>
              )}
            </div>
            
            <Text className="text-sm text-zinc-600 dark:text-zinc-400 leading-relaxed">
              {recommendation.description}
            </Text>
          </div>
          
          {onToggleExpand && (
            <Button
              variant="ghost"
              size="sm"
              onClick={onToggleExpand}
              className="ml-4 flex-shrink-0"
            >
              {expanded ? (
                <ChevronDownIcon className="h-4 w-4" />
              ) : (
                <ChevronRightIcon className="h-4 w-4" />
              )}
            </Button>
          )}
        </div>

        {/* Metrics Grid */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
          <div className="flex justify-between">
            <span className="font-medium text-zinc-700 dark:text-zinc-300">Impact:</span>
            <span className={`font-semibold ${getImpactColor(recommendation.impact.score)}`}>
              {recommendation.impact.score}/10
            </span>
          </div>
          <div className="flex justify-between">
            <span className="font-medium text-zinc-700 dark:text-zinc-300">Effort:</span>
            <span className={`font-semibold ${getEffortColor(recommendation.effort.score)}`}>
              {recommendation.effort.score}/10
            </span>
          </div>
          <div className="flex justify-between">
            <span className="font-medium text-zinc-700 dark:text-zinc-300">ROI:</span>
            <span className="font-semibold text-zinc-900 dark:text-white">
              {recommendation.expectedImpact}
            </span>
          </div>
          {recommendation.enhancedContext && (
            <div className="flex justify-between">
              <span className="font-medium text-zinc-700 dark:text-zinc-300">Confidence:</span>
              <span className={`font-semibold ${getConfidenceColor(recommendation.enhancedContext.dataConfidence)}`}>
                {Math.round(recommendation.enhancedContext.dataConfidence * 100)}%
              </span>
            </div>
          )}
        </div>
      </div>

      {/* Expanded Content */}
      {expanded && (
        <div className="border-t border-zinc-200 dark:border-zinc-700">
          {/* Why It Matters */}
          <div className="p-4 bg-blue-50 dark:bg-blue-900/20">
            <div className="flex items-start space-x-2">
              <LightBulbIcon className="h-5 w-5 text-blue-500 mt-0.5 flex-shrink-0" />
              <div>
                <h6 className="font-medium text-blue-900 dark:text-blue-100 mb-1">
                  Why This Matters
                </h6>
                <Text className="text-sm text-blue-800 dark:text-blue-200">
                  {recommendation.whyItMatters}
                </Text>
              </div>
            </div>
          </div>

          {/* Enhanced Insights */}
          {recommendation.enhancedContext?.structuredInsights && 
           recommendation.enhancedContext.structuredInsights.length > 0 && (
            <div className="p-4 bg-green-50 dark:bg-green-900/20">
              <div className="flex items-start space-x-2">
                <SparklesIcon className="h-5 w-5 text-green-500 mt-0.5 flex-shrink-0" />
                <div className="flex-1">
                  <h6 className="font-medium text-green-900 dark:text-green-100 mb-2">
                    Data-Driven Insights
                  </h6>
                  <ul className="space-y-1">
                    {recommendation.enhancedContext.structuredInsights.map((insight, index) => (
                      <li key={index} className="text-sm text-green-800 dark:text-green-200 flex items-start">
                        <span className="w-2 h-2 bg-green-500 rounded-full mt-2 mr-2 flex-shrink-0"></span>
                        {insight}
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            </div>
          )}

          {/* Impact & Effort Reasoning */}
          <div className="p-4 bg-white dark:bg-zinc-900 grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <div className="flex items-center space-x-2">
                <ChartBarIcon className="h-4 w-4 text-zinc-500" />
                <Text className="font-medium text-zinc-700 dark:text-zinc-300">
                  Impact Reasoning
                </Text>
              </div>
              <Text className="text-sm text-zinc-600 dark:text-zinc-400">
                {recommendation.impact.reasoning}
              </Text>
            </div>
            
            <div className="space-y-2">
              <div className="flex items-center space-x-2">
                <ClockIcon className="h-4 w-4 text-zinc-500" />
                <Text className="font-medium text-zinc-700 dark:text-zinc-300">
                  Effort Reasoning
                </Text>
              </div>
              <Text className="text-sm text-zinc-600 dark:text-zinc-400">
                {recommendation.effort.reasoning}
              </Text>
            </div>
          </div>

          {/* Implementation Steps */}
          <div className="p-4 bg-zinc-50 dark:bg-zinc-800">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center space-x-2">
                <CheckCircleIcon className="h-5 w-5 text-zinc-500" />
                <h6 className="font-medium text-zinc-900 dark:text-white">
                  Implementation Steps
                </h6>
                {hasEnhancedSteps && (
                  <Badge color="blue" className="text-xs">Enhanced</Badge>
                )}
              </div>
              
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setShowImplementation(!showImplementation)}
              >
                {showImplementation ? "Hide" : "Show"} Steps
              </Button>
            </div>

            {showImplementation && (
              <div className="space-y-3">
                {/* Enhanced steps if available */}
                {hasEnhancedSteps ? (
                  <div className="space-y-2">
                    <Text className="text-sm font-medium text-blue-700 dark:text-blue-300 mb-2">
                      Enhanced Implementation (with structured data insights):
                    </Text>
                    <ol className="list-decimal list-inside space-y-2">
                      {recommendation.implementation.enhancedSteps!.map((step, index) => (
                        <li key={index} className="text-sm text-zinc-600 dark:text-zinc-400 leading-relaxed">
                          {step}
                        </li>
                      ))}
                    </ol>
                  </div>
                ) : (
                  <ol className="list-decimal list-inside space-y-2">
                    {recommendation.implementation.steps.map((step, index) => (
                      <li key={index} className="text-sm text-zinc-600 dark:text-zinc-400 leading-relaxed">
                        {step}
                      </li>
                    ))}
                  </ol>
                )}

                {/* Code snippets if available */}
                {recommendation.implementation.codeSnippets && 
                 recommendation.implementation.codeSnippets.length > 0 && (
                  <div className="mt-3">
                    <Text className="text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-2">
                      Code Examples:
                    </Text>
                    <div className="space-y-2">
                      {recommendation.implementation.codeSnippets.map((snippet, index) => (
                        <pre key={index} className="bg-zinc-900 text-green-400 rounded text-xs p-2 overflow-x-auto">
                          <code>{snippet}</code>
                        </pre>
                      ))}
                    </div>
                  </div>
                )}

                {/* Resources if available */}
                {recommendation.implementation.resources && 
                 recommendation.implementation.resources.length > 0 && (
                  <div className="mt-3">
                    <Text className="text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-2">
                      Helpful Resources:
                    </Text>
                    <ul className="list-disc list-inside space-y-1">
                      {recommendation.implementation.resources.map((resource, index) => (
                        <li key={index} className="text-sm text-blue-600 dark:text-blue-400">
                          {resource.startsWith('http') ? (
                            <a href={resource} target="_blank" rel="noopener noreferrer" className="hover:underline">
                              {resource}
                            </a>
                          ) : (
                            resource
                          )}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}