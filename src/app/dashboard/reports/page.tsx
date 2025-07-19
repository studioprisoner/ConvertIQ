'use client';

import { useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { Heading } from '@/components/heading';
import { Text } from '@/components/text';
import { Button } from '@/components/button';
import { Badge } from '@/components/badge';
import { useRouter } from 'next/navigation';
import { trpc } from '@/lib/trpc/client';

export default function ReportsPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const websiteId = searchParams.get('websiteId');
  
  const [filterStatus, setFilterStatus] = useState<'all' | 'pending' | 'in_progress' | 'completed'>('all');
  const [filterPriority, setFilterPriority] = useState<'all' | 'high' | 'medium' | 'low'>('all');

  // Fetch reports list if no websiteId, otherwise fetch specific dashboard
  const { data: reportsList, isLoading: isLoadingList, error: errorList } = trpc.reports.getReportsList.useQuery(
    { limit: 20, offset: 0 },
    { enabled: !websiteId } // Only fetch list when no specific websiteId
  );

  const { data: scanResults, isLoading: isLoadingDashboard, error: errorDashboard } = trpc.reports.getDashboard.useQuery(
    { websiteId: websiteId! },
    { enabled: !!websiteId } // Only fetch dashboard when websiteId is provided
  );

  const isLoading = websiteId ? isLoadingDashboard : isLoadingList;
  const error = websiteId ? errorDashboard : errorList;

  // Show loading state
  if (isLoading) {
    return (
      <div className="space-y-8">
        <div>
          <Heading>Reports Dashboard</Heading>
          <Text className="mt-4">Loading your scan results...</Text>
        </div>
        <div className="bg-white dark:bg-zinc-900 rounded-lg border border-zinc-200 dark:border-zinc-800 p-8 text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <Text className="mt-4 text-zinc-500 dark:text-zinc-400">
            Fetching your analysis results...
          </Text>
        </div>
      </div>
    );
  }

  // Show error state
  if (error) {
    return (
      <div className="space-y-8">
        <div>
          <Heading>Reports Dashboard</Heading>
          <Text className="mt-4">There was an error loading your scan results.</Text>
        </div>
        <div className="bg-white dark:bg-zinc-900 rounded-lg border border-zinc-200 dark:border-zinc-800 p-8 text-center">
          <Text className="text-red-600 dark:text-red-400 mb-4">
            Error: {error.message}
          </Text>
          <Button onClick={() => router.push('/dashboard/scan')}>
            Start New Scan
          </Button>
        </div>
      </div>
    );
  }

  // Show reports list if no websiteId is provided
  if (!websiteId) {
    if (!reportsList || reportsList.reports.length === 0) {
      return (
        <div className="space-y-8">
          <div>
            <Heading>Reports</Heading>
            <Text className="mt-4">
              Your conversion analysis reports will appear here.
            </Text>
          </div>
          
          <div className="bg-white dark:bg-zinc-900 rounded-lg border border-zinc-200 dark:border-zinc-800 p-8 text-center">
            <Text className="text-zinc-500 dark:text-zinc-400">
              No reports available yet. Start by scanning a webpage to generate your first conversion analysis report.
            </Text>
            <Button 
              className="mt-4"
              onClick={() => router.push('/dashboard/scan')}
            >
              Start Your First Scan
            </Button>
          </div>
        </div>
      );
    }

    // Show reports list
    return (
      <div className="space-y-8">
        <div className="flex items-center justify-between">
          <div>
            <Heading>Reports</Heading>
            <Text className="mt-2">
              Your conversion analysis reports ({reportsList.reports.length} total)
            </Text>
          </div>
          <Button onClick={() => router.push('/dashboard/scan')}>
            New Scan
          </Button>
        </div>

        <div className="space-y-4">
          {reportsList.reports.map((report) => (
            <div 
              key={report.id} 
              className="bg-white dark:bg-zinc-900 rounded-lg border border-zinc-200 dark:border-zinc-800 p-6 hover:border-zinc-300 dark:hover:border-zinc-600 transition-colors cursor-pointer"
              onClick={() => router.push(`/dashboard/reports?websiteId=${report.websiteId}`)}
            >
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center space-x-3 mb-2">
                    <h3 className="text-lg font-semibold text-zinc-900 dark:text-white">
                      {report.websiteName}
                    </h3>
                    <Badge 
                      color={report.status === 'completed' ? 'green' : report.status === 'processing' ? 'blue' : 'zinc'}
                    >
                      {report.status}
                    </Badge>
                    <Badge color="zinc">
                      {report.pageType}
                    </Badge>
                  </div>
                  <Text className="text-sm text-zinc-500 dark:text-zinc-400 mb-2">
                    {report.websiteUrl}
                  </Text>
                  <Text className="text-sm text-zinc-600 dark:text-zinc-400 mb-3">
                    {report.summary}
                  </Text>
                </div>
                <div className="text-right ml-4">
                  {report.overallScore && (
                    <div className="text-2xl font-bold text-blue-600 dark:text-blue-400 mb-1">
                      {report.overallScore}/10
                    </div>
                  )}
                  <Text className="text-xs text-zinc-500 dark:text-zinc-400">
                    {new Date(report.scanDate).toLocaleDateString()}
                  </Text>
                </div>
              </div>

              <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mt-4 pt-4 border-t border-zinc-200 dark:border-zinc-700">
                <div className="text-sm">
                  <span className="font-medium text-zinc-700 dark:text-zinc-300">Scan Date:</span>
                  <span className="ml-1 text-zinc-900 dark:text-white">
                    {new Date(report.scanDate).toLocaleDateString()}
                  </span>
                </div>
                <div className="text-sm">
                  <span className="font-medium text-zinc-700 dark:text-zinc-300">Recommendations:</span>
                  <span className="ml-1 text-zinc-900 dark:text-white">
                    {report.recommendationsCount}
                  </span>
                </div>
                <div className="text-sm">
                  <span className="font-medium text-zinc-700 dark:text-zinc-300">Status:</span>
                  <span className="ml-1 text-zinc-900 dark:text-white capitalize">
                    {report.hasAnalysis ? 'Complete' : 'Pending Analysis'}
                  </span>
                </div>
              </div>
            </div>
          ))}
        </div>

        {reportsList.hasMore && (
          <div className="text-center">
            <Button variant="outline" onClick={() => {
              // TODO: Implement pagination
              console.log('Load more reports');
            }}>
              Load More Reports
            </Button>
          </div>
        )}
      </div>
    );
  }

  // Default fallback for individual report without data
  if (!scanResults) {
    return (
      <div className="space-y-8">
        <div>
          <Heading>Report Details</Heading>
          <Text className="mt-4">
            Loading report details...
          </Text>
        </div>
        
        <div className="bg-white dark:bg-zinc-900 rounded-lg border border-zinc-200 dark:border-zinc-800 p-8 text-center">
          <Text className="text-zinc-500 dark:text-zinc-400">
            Report not found or still processing.
          </Text>
          <Button 
            className="mt-4"
            onClick={() => router.push('/dashboard/reports')}
          >
            Back to Reports List
          </Button>
        </div>
      </div>
    );
  }

  // Use the fetched data
  const mockScanResults = scanResults;

  // Filter recommendations based on selected filters
  const filteredRecommendations = mockScanResults.recommendations.filter(rec => {
    const matchesStatus = filterStatus === 'all' || rec.status === filterStatus;
    const matchesPriority = filterPriority === 'all' || rec.priority === filterPriority;
    return matchesStatus && matchesPriority;
  });

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending': return 'zinc';
      case 'in_progress': return 'blue';
      case 'completed': return 'green';
      default: return 'zinc';
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'high': return 'red';
      case 'medium': return 'yellow';
      case 'low': return 'green';
      default: return 'zinc';
    }
  };

  const getScoreColor = (score: number) => {
    if (score >= 8) return 'text-green-600 dark:text-green-400';
    if (score >= 6) return 'text-yellow-600 dark:text-yellow-400';
    return 'text-red-600 dark:text-red-400';
  };

  const updateRecommendationStatus = (recId: string, newStatus: 'pending' | 'in_progress' | 'completed') => {
    // In a real app, this would update via tRPC
    console.log(`Updating recommendation ${recId} to status: ${newStatus}`);
    // Mock implementation - would actually update the data
  };

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <div className="flex items-center space-x-3 mb-2">
            <Button 
              variant="outline" 
              size="sm"
              onClick={() => router.push('/dashboard/reports')}
            >
              ← Back to Reports
            </Button>
          </div>
          <Heading>Scan Results Dashboard</Heading>
          <Text className="mt-2">
            Analysis of {mockScanResults.websiteUrl} completed on {new Date(mockScanResults.scanDate).toLocaleDateString()}
            {websiteId && (
              <span className="text-green-600 dark:text-green-400 ml-2">
                ✓ Live Data
              </span>
            )}
          </Text>
        </div>
        <Button onClick={() => router.push('/dashboard/scan')} className="self-start sm:self-auto">
          New Scan
        </Button>
      </div>

      {/* Overall Score & Summary */}
      <div className="bg-white dark:bg-zinc-900 rounded-lg border border-zinc-200 dark:border-zinc-800 p-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-4">
          <h3 className="text-xl font-semibold text-zinc-900 dark:text-white">
            Overall Performance
          </h3>
          <div className="text-center sm:text-right">
            <div className={`text-3xl font-bold ${getScoreColor(mockScanResults.overallScore)}`}>
              {mockScanResults.overallScore}/10
            </div>
            <Text className="text-sm">Overall Score</Text>
          </div>
        </div>
        <Text className="text-zinc-600 dark:text-zinc-400 mb-6">
          {mockScanResults.summary}
        </Text>

        {/* Metrics Grid */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {Object.entries(mockScanResults.metrics).map(([key, metric]) => (
            <div key={key} className="text-center p-4 bg-zinc-50 dark:bg-zinc-800 rounded-lg">
              <div className={`text-2xl font-bold ${getScoreColor(metric.score)}`}>
                {metric.score}
              </div>
              <Text className="text-sm mt-1 capitalize">
                {key.replace(/([A-Z])/g, ' $1').toLowerCase()}
              </Text>
              <Badge 
                color={metric.status === 'good' ? 'green' : 'yellow'} 
                className="mt-2"
              >
                {metric.status.replace('_', ' ')}
              </Badge>
            </div>
          ))}
        </div>
      </div>

      {/* Key Insights */}
      <div className="bg-white dark:bg-zinc-900 rounded-lg border border-zinc-200 dark:border-zinc-800 p-6">
        <h3 className="text-lg font-semibold text-zinc-900 dark:text-white mb-4">
          💡 Key Insights
        </h3>
        <ul className="space-y-3">
          {mockScanResults.keyInsights.map((insight, index) => (
            <li key={index} className="flex items-start">
              <span className="w-2 h-2 bg-blue-500 rounded-full mt-2 mr-3 flex-shrink-0"></span>
              <Text className="text-zinc-600 dark:text-zinc-400">{insight}</Text>
            </li>
          ))}
        </ul>
      </div>

      {/* Recommendations Section */}
      <div className="bg-white dark:bg-zinc-900 rounded-lg border border-zinc-200 dark:border-zinc-800 p-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
          <h3 className="text-lg font-semibold text-zinc-900 dark:text-white">
            🎯 Recommendations ({filteredRecommendations.length})
          </h3>
          
          {/* Filters */}
          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3 sm:space-x-4">
            <div className="flex items-center space-x-2">
              <Text className="text-sm font-medium whitespace-nowrap">Status:</Text>
              <select 
                value={filterStatus} 
                onChange={(e) => setFilterStatus(e.target.value as 'all' | 'pending' | 'in_progress' | 'completed')}
                className="text-sm border border-zinc-300 dark:border-zinc-600 rounded-md px-2 py-1 bg-white dark:bg-zinc-800 min-w-[120px]"
              >
                <option value="all">All</option>
                <option value="pending">Pending</option>
                <option value="in_progress">In Progress</option>
                <option value="completed">Completed</option>
              </select>
            </div>
            <div className="flex items-center space-x-2">
              <Text className="text-sm font-medium whitespace-nowrap">Priority:</Text>
              <select 
                value={filterPriority} 
                onChange={(e) => setFilterPriority(e.target.value as 'all' | 'high' | 'medium' | 'low')}
                className="text-sm border border-zinc-300 dark:border-zinc-600 rounded-md px-2 py-1 bg-white dark:bg-zinc-800 min-w-[120px]"
              >
                <option value="all">All</option>
                <option value="high">High</option>
                <option value="medium">Medium</option>
                <option value="low">Low</option>
              </select>
            </div>
          </div>
        </div>

        {/* Recommendations List */}
        <div className="space-y-4">
          {filteredRecommendations.map((rec) => (
            <div key={rec.id} className="border border-zinc-200 dark:border-zinc-700 rounded-lg p-4 hover:border-zinc-300 dark:hover:border-zinc-600 transition-colors">
              <div className="flex items-start justify-between mb-3">
                <div className="flex-1">
                  <div className="flex items-center space-x-3 mb-2">
                    <h4 className="font-semibold text-zinc-900 dark:text-white">
                      {rec.title}
                    </h4>
                    <Badge color={getPriorityColor(rec.priority)}>
                      {rec.priority} priority
                    </Badge>
                    <Badge color={getStatusColor(rec.status)}>
                      {rec.status.replace('_', ' ')}
                    </Badge>
                  </div>
                  <Text className="text-sm text-zinc-600 dark:text-zinc-400 mb-3">
                    {rec.description}
                  </Text>
                </div>
              </div>

              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm mb-4">
                <div>
                  <span className="font-medium text-zinc-700 dark:text-zinc-300">Impact:</span>
                  <span className="ml-1 text-zinc-900 dark:text-white">
                    {rec.impact.score}/10 ({rec.impact.category})
                  </span>
                </div>
                <div>
                  <span className="font-medium text-zinc-700 dark:text-zinc-300">Effort:</span>
                  <span className="ml-1 text-zinc-900 dark:text-white">
                    {rec.effort.score}/10 ({rec.effort.category})
                  </span>
                </div>
                <div>
                  <span className="font-medium text-zinc-700 dark:text-zinc-300">Timeline:</span>
                  <span className="ml-1 text-zinc-900 dark:text-white">
                    {rec.estimatedTimeToComplete}
                  </span>
                </div>
                <div>
                  <span className="font-medium text-zinc-700 dark:text-zinc-300">Expected Impact:</span>
                  <span className="ml-1 text-zinc-900 dark:text-white">
                    {rec.expectedImpact}
                  </span>
                </div>
              </div>

              {/* Status Update Buttons */}
              <div className="flex flex-col sm:flex-row sm:items-center gap-3 sm:space-x-2 pt-3 border-t border-zinc-200 dark:border-zinc-700">
                <Text className="text-sm font-medium">Update Status:</Text>
                <div className="flex flex-wrap gap-2">
                  <Button 
                    size="sm"
                    variant={rec.status === 'pending' ? 'solid' : 'outline'}
                    onClick={() => updateRecommendationStatus(rec.id, 'pending')}
                  >
                    Pending
                  </Button>
                  <Button 
                    size="sm"
                    variant={rec.status === 'in_progress' ? 'solid' : 'outline'}
                    onClick={() => updateRecommendationStatus(rec.id, 'in_progress')}
                  >
                    In Progress
                  </Button>
                  <Button 
                    size="sm"
                    variant={rec.status === 'completed' ? 'solid' : 'outline'}
                    onClick={() => updateRecommendationStatus(rec.id, 'completed')}
                  >
                    Completed
                  </Button>
                </div>
              </div>
            </div>
          ))}
        </div>

        {filteredRecommendations.length === 0 && (
          <div className="text-center py-8">
            <Text className="text-zinc-500 dark:text-zinc-400">
              No recommendations match your current filters.
            </Text>
          </div>
        )}
      </div>

      {/* Progress Summary */}
      <div className="bg-white dark:bg-zinc-900 rounded-lg border border-zinc-200 dark:border-zinc-800 p-6">
        <h3 className="text-lg font-semibold text-zinc-900 dark:text-white mb-4">
          📊 Implementation Progress
        </h3>
        <div className="grid grid-cols-3 gap-4">
          <div className="text-center p-4 bg-zinc-50 dark:bg-zinc-800 rounded-lg">
            <div className="text-2xl font-bold text-zinc-600 dark:text-zinc-400">
              {mockScanResults.recommendations.filter(r => r.status === 'pending').length}
            </div>
            <Text className="text-sm mt-1">Pending</Text>
          </div>
          <div className="text-center p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
            <div className="text-2xl font-bold text-blue-600 dark:text-blue-400">
              {mockScanResults.recommendations.filter(r => r.status === 'in_progress').length}
            </div>
            <Text className="text-sm mt-1">In Progress</Text>
          </div>
          <div className="text-center p-4 bg-green-50 dark:bg-green-900/20 rounded-lg">
            <div className="text-2xl font-bold text-green-600 dark:text-green-400">
              {mockScanResults.recommendations.filter(r => r.status === 'completed').length}
            </div>
            <Text className="text-sm mt-1">Completed</Text>
          </div>
        </div>
      </div>
    </div>
  );
}