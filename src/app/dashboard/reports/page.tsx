'use client';

import { useState } from 'react';
import { ChevronDownIcon, ChevronRightIcon } from '@heroicons/react/24/outline';
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
  
  const [filterPriority, setFilterPriority] = useState<'all' | 'high' | 'medium' | 'low'>('all');
  const [expandedCategories, setExpandedCategories] = useState<Set<string>>(new Set(['conversion', 'ux', 'seo', 'performance', 'content', 'technical', 'design']));

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
    const matchesPriority = filterPriority === 'all' || rec.priority === filterPriority;
    return matchesPriority;
  });

  // Group recommendations by category
  const groupedRecommendations = filteredRecommendations.reduce((groups, rec) => {
    const category = rec.category || 'other';
    if (!groups[category]) {
      groups[category] = [];
    }
    groups[category].push(rec);
    return groups;
  }, {} as Record<string, typeof filteredRecommendations>);

  // Category display names and icons
  const categoryInfo = {
    conversion: { name: 'Conversion Optimization', icon: '🎯', color: 'blue' },
    ux: { name: 'User Experience', icon: '👥', color: 'green' },
    seo: { name: 'SEO & Visibility', icon: '🔍', color: 'purple' },
    performance: { name: 'Performance', icon: '⚡', color: 'yellow' },
    content: { name: 'Content & Messaging', icon: '📝', color: 'indigo' },
    technical: { name: 'Technical Implementation', icon: '⚙️', color: 'gray' },
    design: { name: 'Design & Layout', icon: '🎨', color: 'pink' },
    other: { name: 'Other Recommendations', icon: '📋', color: 'zinc' }
  };

  const toggleCategory = (category: string) => {
    const newExpanded = new Set(expandedCategories);
    if (newExpanded.has(category)) {
      newExpanded.delete(category);
    } else {
      newExpanded.add(category);
    }
    setExpandedCategories(newExpanded);
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
        <div className="space-y-4 mb-6">
          {mockScanResults.summary.split('. ').map((sentence, index, array) => {
            // Skip empty sentences
            if (!sentence.trim()) return null;
            
            // Add period back if it's not the last sentence and doesn't already end with punctuation
            const formattedSentence = index === array.length - 1 ? sentence : 
              sentence.endsWith('.') || sentence.endsWith('!') || sentence.endsWith('?') ? sentence : sentence + '.';
            
            // Check if this sentence contains priority recommendations
            if (sentence.toLowerCase().includes('top') && sentence.toLowerCase().includes('priority')) {
              return (
                <div key={index} className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
                  <h4 className="font-semibold text-blue-900 dark:text-blue-100 mb-2 flex items-center">
                    🎯 Priority Recommendations
                  </h4>
                  <Text className="text-blue-800 dark:text-blue-200 text-sm leading-relaxed">
                    {formattedSentence}
                  </Text>
                </div>
              );
            }
            
            // Check if this sentence contains quick wins
            if (sentence.toLowerCase().includes('quick wins') || sentence.toLowerCase().includes('implementation within')) {
              return (
                <div key={index} className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg p-4">
                  <h4 className="font-semibold text-green-900 dark:text-green-100 mb-2 flex items-center">
                    ⚡ Quick Wins
                  </h4>
                  <Text className="text-green-800 dark:text-green-200 text-sm leading-relaxed">
                    {formattedSentence}
                  </Text>
                </div>
              );
            }
            
            // Check if this sentence contains long-term optimization
            if (sentence.toLowerCase().includes('long-term') || sentence.toLowerCase().includes('revenue growth potential')) {
              return (
                <div key={index} className="bg-purple-50 dark:bg-purple-900/20 border border-purple-200 dark:border-purple-800 rounded-lg p-4">
                  <h4 className="font-semibold text-purple-900 dark:text-purple-100 mb-2 flex items-center">
                    📈 Long-term Growth
                  </h4>
                  <Text className="text-purple-800 dark:text-purple-200 text-sm leading-relaxed">
                    {formattedSentence}
                  </Text>
                </div>
              );
            }
            
            // Default case - regular paragraph
            return (
              <Text key={index} className="text-zinc-600 dark:text-zinc-400 text-sm leading-relaxed">
                {formattedSentence}
              </Text>
            );
          }).filter(Boolean)}
        </div>

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

        {/* Recommendations List - Grouped by Category */}
        <div className="space-y-6">
          {Object.entries(groupedRecommendations).map(([category, recommendations]) => {
            const categoryData = categoryInfo[category as keyof typeof categoryInfo];
            const isExpanded = expandedCategories.has(category);
            
            return (
              <div key={category} className="border border-zinc-200 dark:border-zinc-700 rounded-lg overflow-hidden">
                <button
                  onClick={() => toggleCategory(category)}
                  className="w-full flex items-center justify-between p-4 bg-zinc-50 dark:bg-zinc-800 hover:bg-zinc-100 dark:hover:bg-zinc-700 transition-colors"
                >
                  <div className="flex items-center space-x-3">
                    <span className="text-lg">{categoryData.icon}</span>
                    <h4 className="font-semibold text-zinc-900 dark:text-white">
                      {categoryData.name}
                    </h4>
                    <Badge color={categoryData.color as any}>
                      {recommendations.length} {recommendations.length === 1 ? 'recommendation' : 'recommendations'}
                    </Badge>
                  </div>
                  <div className="flex items-center">
                    {isExpanded ? (
                      <ChevronDownIcon className="h-5 w-5 text-zinc-500" />
                    ) : (
                      <ChevronRightIcon className="h-5 w-5 text-zinc-500" />
                    )}
                  </div>
                </button>
                
                {isExpanded && (
                  <div className="border-t border-zinc-200 dark:border-zinc-700">
                    <div className="p-4 space-y-4">
                      {recommendations.map((rec) => (
                        <div key={rec.id} className="border border-zinc-200 dark:border-zinc-700 rounded-lg p-4 hover:border-zinc-300 dark:hover:border-zinc-600 transition-colors">
                          <div className="flex items-start justify-between mb-3">
                            <div className="flex-1">
                              <div className="flex items-center space-x-3 mb-2">
                                <h5 className="font-semibold text-zinc-900 dark:text-white">
                                  {rec.title}
                                </h5>
                                <Badge color={getPriorityColor(rec.priority)}>
                                  {rec.priority} priority
                                </Badge>
                              </div>
                              <Text className="text-sm text-zinc-600 dark:text-zinc-400 mb-3">
                                {rec.description}
                              </Text>
                            </div>
                          </div>

                          <div className="grid grid-cols-2 md:grid-cols-3 gap-4 text-sm">
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
                              <span className="font-medium text-zinc-700 dark:text-zinc-300">Expected Impact:</span>
                              <span className="ml-1 text-zinc-900 dark:text-white">
                                {rec.expectedImpact}
                              </span>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {filteredRecommendations.length === 0 && (
          <div className="text-center py-8">
            <Text className="text-zinc-500 dark:text-zinc-400">
              No recommendations match your current filters.
            </Text>
          </div>
        )}
      </div>

    </div>
  );
}