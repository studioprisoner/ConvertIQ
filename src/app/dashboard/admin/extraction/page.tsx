"use client";

import { useState } from "react";
import { Heading } from "@/components/heading";
import { Text } from "@/components/text";
import { Button } from "@/components/button";
import { Badge } from "@/components/badge";
import {
  ChartBarIcon,
  CodeBracketIcon,
  ExclamationCircleIcon,
  CheckCircleIcon,
  ClockIcon,
  CpuChipIcon,
  ChartPieIcon,
  ArrowPathIcon,
} from "@heroicons/react/24/outline";

// Mock data for admin dashboard - in real implementation, this would come from tRPC queries
const mockExtractionMetrics = {
  today: {
    totalExtractions: 147,
    successfulExtractions: 142,
    failedExtractions: 5,
    averageProcessingTime: 8.2, // seconds
    averageDataRichness: 0.78,
    v2AdoptionRate: 0.85,
  },
  thisWeek: {
    totalExtractions: 892,
    successfulExtractions: 856,
    failedExtractions: 36,
    averageProcessingTime: 9.1,
    averageDataRichness: 0.76,
    v2AdoptionRate: 0.82,
  },
  pageTypeBreakdown: {
    "ecommerce-product": { count: 234, successRate: 0.94, avgRichness: 0.89 },
    "corporate-homepage": { count: 187, successRate: 0.91, avgRichness: 0.73 },
    "service-landing": { count: 156, successRate: 0.89, avgRichness: 0.67 },
    "blog-post": { count: 143, successRate: 0.96, avgRichness: 0.81 },
    "contact": { count: 89, successRate: 0.98, avgRichness: 0.85 },
    "pricing": { count: 67, successRate: 0.93, avgRichness: 0.79 },
    "other": { count: 216, successRate: 0.87, avgRichness: 0.61 },
  },
  recentErrors: [
    {
      id: "error-1",
      timestamp: "2024-01-15T10:30:00Z",
      url: "https://example.com/complex-spa",
      pageType: "other",
      errorType: "timeout",
      errorMessage: "Extraction timeout after 30 seconds",
      retryCount: 2,
    },
    {
      id: "error-2", 
      timestamp: "2024-01-15T09:15:00Z",
      url: "https://shop.example.com/product/123",
      pageType: "ecommerce-product",
      errorType: "schema_validation",
      errorMessage: "Invalid product schema: missing required price field",
      retryCount: 1,
    },
    {
      id: "error-3",
      timestamp: "2024-01-15T08:45:00Z",
      url: "https://blog.example.com/post-with-complex-layout",
      pageType: "blog-post",
      errorType: "api_limit",
      errorMessage: "Firecrawl API rate limit exceeded",
      retryCount: 0,
    },
  ],
  performanceTrends: {
    labels: ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"],
    successRates: [94, 96, 92, 95, 89, 91, 93],
    avgProcessingTimes: [8.5, 7.9, 9.2, 8.1, 10.3, 9.5, 8.8],
    dataRichness: [0.76, 0.78, 0.74, 0.79, 0.72, 0.75, 0.77],
  },
};

export default function ExtractionAdminPage() {
  const [selectedTimeframe, setSelectedTimeframe] = useState<"today" | "week" | "month">("today");
  const [isRefreshing, setIsRefreshing] = useState(false);

  const handleRefreshMetrics = async () => {
    setIsRefreshing(true);
    // Simulate API call
    await new Promise(resolve => setTimeout(resolve, 2000));
    setIsRefreshing(false);
  };

  const getSuccessRate = (timeframe: "today" | "week" | "month") => {
    const metrics = timeframe === "today" ? mockExtractionMetrics.today : mockExtractionMetrics.thisWeek;
    return ((metrics.successfulExtractions / metrics.totalExtractions) * 100).toFixed(1);
  };

  const getStatusColor = (rate: number) => {
    if (rate >= 95) return "green";
    if (rate >= 90) return "yellow"; 
    return "red";
  };

  const getRichnessColor = (richness: number) => {
    if (richness >= 0.8) return "text-green-600 dark:text-green-400";
    if (richness >= 0.6) return "text-yellow-600 dark:text-yellow-400";
    return "text-red-600 dark:text-red-400";
  };

  const getErrorTypeIcon = (errorType: string) => {
    switch (errorType) {
      case "timeout":
        return <ClockIcon className="h-4 w-4 text-yellow-500" />;
      case "schema_validation":
        return <CodeBracketIcon className="h-4 w-4 text-red-500" />;
      case "api_limit":
        return <ExclamationCircleIcon className="h-4 w-4 text-orange-500" />;
      default:
        return <ExclamationCircleIcon className="h-4 w-4 text-red-500" />;
    }
  };

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <Heading>Extraction Monitoring</Heading>
          <Text className="mt-2 text-zinc-500 dark:text-zinc-400">
            Real-time monitoring of enhanced data extraction performance
          </Text>
        </div>
        
        <div className="flex items-center space-x-3">
          <select
            value={selectedTimeframe}
            onChange={(e) => setSelectedTimeframe(e.target.value as "today" | "week" | "month")}
            className="border border-zinc-300 dark:border-zinc-600 rounded-md px-3 py-2 bg-white dark:bg-zinc-800 text-sm"
          >
            <option value="today">Today</option>
            <option value="week">This Week</option>
            <option value="month">This Month</option>
          </select>
          
          <Button
            variant="outline"
            size="sm"
            onClick={handleRefreshMetrics}
            disabled={isRefreshing}
          >
            <ArrowPathIcon className={`h-4 w-4 mr-2 ${isRefreshing ? "animate-spin" : ""}`} />
            {isRefreshing ? "Refreshing..." : "Refresh"}
          </Button>
        </div>
      </div>

      {/* Key Metrics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {/* Success Rate */}
        <div className="bg-white dark:bg-zinc-900 rounded-lg border border-zinc-200 dark:border-zinc-800 p-6">
          <div className="flex items-center justify-between">
            <div>
              <Text className="text-sm font-medium text-zinc-500 dark:text-zinc-400">
                Success Rate
              </Text>
              <div className="text-2xl font-bold text-zinc-900 dark:text-white mt-1">
                {getSuccessRate(selectedTimeframe)}%
              </div>
            </div>
            <CheckCircleIcon className="h-8 w-8 text-green-500" />
          </div>
          <Badge 
            color={getStatusColor(parseFloat(getSuccessRate(selectedTimeframe))) as any}
            className="mt-3"
          >
            {parseFloat(getSuccessRate(selectedTimeframe)) >= 95 ? "Excellent" :
             parseFloat(getSuccessRate(selectedTimeframe)) >= 90 ? "Good" : "Needs Attention"}
          </Badge>
        </div>

        {/* Processing Time */}
        <div className="bg-white dark:bg-zinc-900 rounded-lg border border-zinc-200 dark:border-zinc-800 p-6">
          <div className="flex items-center justify-between">
            <div>
              <Text className="text-sm font-medium text-zinc-500 dark:text-zinc-400">
                Avg Processing Time
              </Text>
              <div className="text-2xl font-bold text-zinc-900 dark:text-white mt-1">
                {selectedTimeframe === "today" ? 
                  mockExtractionMetrics.today.averageProcessingTime :
                  mockExtractionMetrics.thisWeek.averageProcessingTime}s
              </div>
            </div>
            <CpuChipIcon className="h-8 w-8 text-blue-500" />
          </div>
          <Text className="text-xs text-zinc-500 dark:text-zinc-400 mt-3">
            Target: &lt;10 seconds
          </Text>
        </div>

        {/* Data Richness */}
        <div className="bg-white dark:bg-zinc-900 rounded-lg border border-zinc-200 dark:border-zinc-800 p-6">
          <div className="flex items-center justify-between">
            <div>
              <Text className="text-sm font-medium text-zinc-500 dark:text-zinc-400">
                Avg Data Richness
              </Text>
              <div className={`text-2xl font-bold mt-1 ${getRichnessColor(
                selectedTimeframe === "today" ? 
                  mockExtractionMetrics.today.averageDataRichness :
                  mockExtractionMetrics.thisWeek.averageDataRichness
              )}`}>
                {Math.round((selectedTimeframe === "today" ? 
                  mockExtractionMetrics.today.averageDataRichness :
                  mockExtractionMetrics.thisWeek.averageDataRichness) * 100)}%
              </div>
            </div>
            <ChartBarIcon className="h-8 w-8 text-purple-500" />
          </div>
          <Text className="text-xs text-zinc-500 dark:text-zinc-400 mt-3">
            Target: &gt;80%
          </Text>
        </div>

        {/* V2 Adoption */}
        <div className="bg-white dark:bg-zinc-900 rounded-lg border border-zinc-200 dark:border-zinc-800 p-6">
          <div className="flex items-center justify-between">
            <div>
              <Text className="text-sm font-medium text-zinc-500 dark:text-zinc-400">
                V2 Adoption Rate
              </Text>
              <div className="text-2xl font-bold text-zinc-900 dark:text-white mt-1">
                {Math.round((selectedTimeframe === "today" ? 
                  mockExtractionMetrics.today.v2AdoptionRate :
                  mockExtractionMetrics.thisWeek.v2AdoptionRate) * 100)}%
              </div>
            </div>
            <ChartPieIcon className="h-8 w-8 text-indigo-500" />
          </div>
          <Badge color="blue" className="mt-3">
            Enhanced Extraction
          </Badge>
        </div>
      </div>

      {/* Page Type Breakdown */}
      <div className="bg-white dark:bg-zinc-900 rounded-lg border border-zinc-200 dark:border-zinc-800 p-6">
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-lg font-semibold text-zinc-900 dark:text-white">
            Page Type Performance
          </h3>
          <Text className="text-sm text-zinc-500 dark:text-zinc-400">
            Last 7 days
          </Text>
        </div>
        
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-zinc-200 dark:border-zinc-700">
                <th className="text-left py-3 px-4 font-medium text-zinc-500 dark:text-zinc-400">
                  Page Type
                </th>
                <th className="text-right py-3 px-4 font-medium text-zinc-500 dark:text-zinc-400">
                  Count
                </th>
                <th className="text-right py-3 px-4 font-medium text-zinc-500 dark:text-zinc-400">
                  Success Rate
                </th>
                <th className="text-right py-3 px-4 font-medium text-zinc-500 dark:text-zinc-400">
                  Avg Richness
                </th>
              </tr>
            </thead>
            <tbody>
              {Object.entries(mockExtractionMetrics.pageTypeBreakdown)
                .sort(([,a], [,b]) => b.count - a.count)
                .map(([pageType, stats]) => (
                <tr key={pageType} className="border-b border-zinc-100 dark:border-zinc-800 hover:bg-zinc-50 dark:hover:bg-zinc-800/50">
                  <td className="py-3 px-4">
                    <div className="flex items-center space-x-2">
                      <Text className="font-medium text-zinc-900 dark:text-white capitalize">
                        {pageType.replace(/-/g, " ")}
                      </Text>
                    </div>
                  </td>
                  <td className="py-3 px-4 text-right">
                    <Text className="text-zinc-600 dark:text-zinc-400">
                      {stats.count.toLocaleString()}
                    </Text>
                  </td>
                  <td className="py-3 px-4 text-right">
                    <Badge color={getStatusColor(stats.successRate * 100) as any}>
                      {(stats.successRate * 100).toFixed(1)}%
                    </Badge>
                  </td>
                  <td className="py-3 px-4 text-right">
                    <span className={`font-medium ${getRichnessColor(stats.avgRichness)}`}>
                      {(stats.avgRichness * 100).toFixed(0)}%
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Recent Errors */}
      <div className="bg-white dark:bg-zinc-900 rounded-lg border border-zinc-200 dark:border-zinc-800 p-6">
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-lg font-semibold text-zinc-900 dark:text-white">
            Recent Extraction Errors
          </h3>
          <Badge color="red">
            {mockExtractionMetrics.recentErrors.length} errors
          </Badge>
        </div>

        {mockExtractionMetrics.recentErrors.length === 0 ? (
          <div className="text-center py-8">
            <CheckCircleIcon className="h-12 w-12 text-green-500 mx-auto mb-4" />
            <Text className="text-zinc-500 dark:text-zinc-400">
              No recent errors! Extraction system is running smoothly.
            </Text>
          </div>
        ) : (
          <div className="space-y-4">
            {mockExtractionMetrics.recentErrors.map((error) => (
              <div
                key={error.id}
                className="border border-red-200 dark:border-red-800 rounded-lg p-4 bg-red-50 dark:bg-red-900/20"
              >
                <div className="flex items-start justify-between mb-2">
                  <div className="flex items-center space-x-2">
                    {getErrorTypeIcon(error.errorType)}
                    <Text className="font-medium text-red-900 dark:text-red-100">
                      {error.errorType.replace(/_/g, " ").toUpperCase()}
                    </Text>
                    <Badge color="zinc">{error.pageType}</Badge>
                  </div>
                  <Text className="text-xs text-red-600 dark:text-red-400">
                    {new Date(error.timestamp).toLocaleString()}
                  </Text>
                </div>
                
                <Text className="text-sm text-red-800 dark:text-red-200 mb-2">
                  {error.errorMessage}
                </Text>
                
                <div className="flex items-center justify-between">
                  <Text className="text-xs text-red-600 dark:text-red-400 truncate">
                    URL: {error.url}
                  </Text>
                  <div className="flex items-center space-x-2">
                    <Text className="text-xs text-red-600 dark:text-red-400">
                      Retries: {error.retryCount}
                    </Text>
                    <Button variant="outline" size="sm" className="text-xs">
                      Retry
                    </Button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Performance Trends Chart Placeholder */}
      <div className="bg-white dark:bg-zinc-900 rounded-lg border border-zinc-200 dark:border-zinc-800 p-6">
        <h3 className="text-lg font-semibold text-zinc-900 dark:text-white mb-6">
          Performance Trends (Last 7 Days)
        </h3>
        
        {/* Simple placeholder for charts - in real implementation, use Chart.js or similar */}
        <div className="space-y-4">
          <div className="h-32 bg-gradient-to-r from-blue-100 to-purple-100 dark:from-blue-900/20 dark:to-purple-900/20 rounded-lg flex items-center justify-center">
            <Text className="text-zinc-500 dark:text-zinc-400">
              Success Rate Trend Chart (95.3% avg)
            </Text>
          </div>
          
          <div className="h-32 bg-gradient-to-r from-green-100 to-blue-100 dark:from-green-900/20 dark:to-blue-900/20 rounded-lg flex items-center justify-center">
            <Text className="text-zinc-500 dark:text-zinc-400">
              Processing Time Chart (8.8s avg)
            </Text>
          </div>
          
          <div className="h-32 bg-gradient-to-r from-purple-100 to-pink-100 dark:from-purple-900/20 dark:to-pink-900/20 rounded-lg flex items-center justify-center">
            <Text className="text-zinc-500 dark:text-zinc-400">
              Data Richness Chart (76% avg)
            </Text>
          </div>
        </div>
      </div>
    </div>
  );
}