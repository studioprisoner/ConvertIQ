'use client';

import { useState } from 'react';
import { ChevronDownIcon, ChevronRightIcon, ArchiveBoxIcon, ArrowPathIcon } from '@heroicons/react/24/outline';
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
  const [archiveConfirm, setArchiveConfirm] = useState<{reportId: string, reportName: string} | null>(null);
  const [retriggerConfirm, setRetriggerConfirm] = useState<{analysisId: string, reportName: string} | null>(null);
  const [retriggeringAnalysis, setRetriggeringAnalysis] = useState<string | null>(null);

  // Fetch reports list if no websiteId, otherwise fetch specific dashboard
  const { data: reportsList, isLoading: isLoadingList, error: errorList } = trpc.reports.getReportsList.useQuery(
    { limit: 20, offset: 0 },
    { enabled: !websiteId } // Only fetch list when no specific websiteId
  );

  const { data: scanResults, isLoading: isLoadingDashboard, error: errorDashboard } = trpc.reports.getDashboard.useQuery(
    { websiteId: websiteId! },
    { enabled: !!websiteId } // Only fetch dashboard when websiteId is provided
  );

  // Archive mutation
  const archiveReportMutation = trpc.reports.archiveReport.useMutation({
    onSuccess: (data) => {
      console.log('✅ Archive successful:', data);
      setArchiveConfirm(null);
      if (websiteId) {
        // If we're viewing an individual report, redirect back to the list
        router.push('/dashboard/reports');
      } else {
        // We're in the reports list view, refetch the list
        window.location.reload(); // Simple refresh for now
      }
    },
    onError: (error) => {
      console.error('❌ Failed to archive report:', error);
      console.error('Error details:', {
        message: error.message,
        code: error.data?.code,
        httpStatus: error.data?.httpStatus,
        zodError: error.data?.zodError
      });
      alert(`Failed to archive report: ${error.message}`);
    }
  });

  // Retrigger mutation
  const retriggerAnalysisMutation = trpc.reports.retriggerAnalysis.useMutation({
    onSuccess: (data) => {
      console.log('✅ Retrigger successful:', data);
      setRetriggerConfirm(null);
      setRetriggeringAnalysis(null);
      // Refresh the reports list to show updated status
      window.location.reload();
    },
    onError: (error) => {
      console.error('❌ Failed to retrigger analysis:', error);
      setRetriggeringAnalysis(null);
      alert(`Failed to retrigger analysis: ${error.message}`);
    }
  });

  const isLoading = websiteId ? isLoadingDashboard : isLoadingList;
  const error = websiteId ? errorDashboard : errorList;

  // Archive handlers
  const handleArchiveClick = (reportId: string, reportName: string) => {
    console.log('🗃️ Archive button clicked:', { reportId, reportName });
    const confirmData = { reportId, reportName };
    console.log('🗃️ Setting archiveConfirm to:', confirmData);
    setArchiveConfirm(confirmData);
    console.log('🗃️ archiveConfirm state should now be set');
  };

  const handleConfirmArchive = () => {
    if (archiveConfirm) {
      console.log('📦 Attempting to archive report:', archiveConfirm.reportId);
      archiveReportMutation.mutate({ reportId: archiveConfirm.reportId });
    }
  };

  const handleCancelArchive = () => {
    setArchiveConfirm(null);
  };

  // Retrigger handlers
  const handleRetriggerClick = (analysisId: string, reportName: string) => {
    setRetriggerConfirm({ analysisId, reportName });
  };

  const handleConfirmRetrigger = () => {
    if (retriggerConfirm) {
      console.log('🔄 Attempting to retrigger analysis:', retriggerConfirm.analysisId);
      setRetriggeringAnalysis(retriggerConfirm.analysisId);
      retriggerAnalysisMutation.mutate({ analysisId: retriggerConfirm.analysisId });
    }
  };

  const handleCancelRetrigger = () => {
    setRetriggerConfirm(null);
  };

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
          <div className="flex space-x-3">
            <Button 
              variant="outline"
              onClick={() => router.push('/dashboard/reports/archived')}
              className="text-orange-600 hover:text-orange-700"
            >
              <ArchiveBoxIcon className="h-4 w-4 mr-1" />
              View Archived
            </Button>
            <Button onClick={() => router.push('/dashboard/scan')}>
              New Scan
            </Button>
          </div>
        </div>

        <div className="space-y-4">
          {reportsList.reports.map((report) => (
            <div 
              key={report.id} 
              className="bg-white dark:bg-zinc-900 rounded-lg border border-zinc-200 dark:border-zinc-800 p-6 hover:border-zinc-300 dark:hover:border-zinc-600 transition-colors"
            >
              <div className="flex items-start justify-between">
                <div 
                  className="flex-1 cursor-pointer"
                  onClick={() => router.push(`/dashboard/reports?websiteId=${report.websiteId}`)}
                >
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
                <div className="flex items-start space-x-3 ml-4">
                  <div className="text-right">
                    {report.overallScore && (
                      <div className="text-2xl font-bold text-blue-600 dark:text-blue-400 mb-1">
                        {report.overallScore}/10
                      </div>
                    )}
                    <Text className="text-xs text-zinc-500 dark:text-zinc-400">
                      {new Date(report.scanDate).toLocaleDateString()}
                    </Text>
                  </div>
                  <div className="flex space-x-2">
                    {/* Retrigger button - only show for pending or failed analyses */}
                    {(report.status === 'pending' || report.status === 'failed') && report.hasAnalysis && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleRetriggerClick(report.id, report.websiteName);
                        }}
                        className="text-blue-600 hover:text-blue-700 hover:border-blue-300 p-2"
                        title="Retrigger analysis"
                        disabled={retriggeringAnalysis === report.id}
                      >
                        <ArrowPathIcon className={`h-4 w-4 ${retriggeringAnalysis === report.id ? 'animate-spin' : ''}`} />
                      </Button>
                    )}
                    
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={(e) => {
                        console.log('🖱️ Archive button onClick fired for:', report.id);
                        console.log('🖱️ Report data:', { id: report.id, websiteName: report.websiteName, websiteUrl: report.websiteUrl });
                        e.stopPropagation();
                        handleArchiveClick(report.id, report.websiteName);
                      }}
                      className="text-orange-600 hover:text-orange-700 hover:border-orange-300 p-2 relative z-10"
                      title="Archive report"
                    >
                      <ArchiveBoxIcon className="h-4 w-4" />
                    </Button>
                  </div>
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

        {/* Archive Confirmation Dialog */}
        {archiveConfirm && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50" onClick={(e) => console.log('🗃️ Dialog backdrop clicked')}>
            <div className="bg-white dark:bg-zinc-900 rounded-lg p-6 max-w-md w-full mx-4 border border-zinc-200 dark:border-zinc-800">
              <div className="mb-4">
                <h3 className="text-lg font-semibold text-zinc-900 dark:text-white mb-2">
                  Archive Report
                </h3>
                <Text className="text-zinc-600 dark:text-zinc-400">
                  Are you sure you want to archive the report for &quot;{archiveConfirm.reportName}&quot;? You can view archived reports in your history and rescan them later.
                </Text>
              </div>
              <div className="flex space-x-3 justify-end">
                <Button
                  variant="outline"
                  onClick={handleCancelArchive}
                  disabled={archiveReportMutation.isLoading}
                >
                  Cancel
                </Button>
                <Button
                  onClick={handleConfirmArchive}
                  disabled={archiveReportMutation.isLoading}
                  className="bg-orange-600 hover:bg-orange-700 text-white"
                >
                  {archiveReportMutation.isLoading ? 'Archiving...' : 'Archive Report'}
                </Button>
              </div>
            </div>
          </div>
        )}

        {/* Retrigger Confirmation Dialog */}
        {retriggerConfirm && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white dark:bg-zinc-900 rounded-lg p-6 max-w-md w-full mx-4 border border-zinc-200 dark:border-zinc-800">
              <div className="mb-4">
                <h3 className="text-lg font-semibold text-zinc-900 dark:text-white mb-2">
                  Retrigger Analysis
                </h3>
                <Text className="text-zinc-600 dark:text-zinc-400">
                  Are you sure you want to retrigger the analysis for &quot;{retriggerConfirm.reportName}&quot;? This will reset the analysis status to pending and attempt to process it again.
                </Text>
              </div>
              <div className="flex space-x-3 justify-end">
                <Button
                  variant="outline"
                  onClick={handleCancelRetrigger}
                  disabled={retriggerAnalysisMutation.isLoading}
                >
                  Cancel
                </Button>
                <Button
                  onClick={handleConfirmRetrigger}
                  disabled={retriggerAnalysisMutation.isLoading}
                  className="bg-blue-600 hover:bg-blue-700 text-white"
                >
                  {retriggerAnalysisMutation.isLoading ? 'Retriggering...' : 'Retrigger Analysis'}
                </Button>
              </div>
            </div>
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


  console.log('🗃️ Current archiveConfirm state:', archiveConfirm);

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="space-y-4">
        {/* Top button bar - all buttons aligned */}
        <div className="flex items-center justify-between">
          <Button 
            variant="outline" 
            size="sm"
            onClick={() => router.push('/dashboard/reports')}
          >
            ← Back to Reports
          </Button>
          <div className="flex space-x-3">
            <Button onClick={() => router.push('/dashboard/scan')}>
              New Scan
            </Button>
            <Button 
              variant="outline"
              onClick={() => handleArchiveClick(mockScanResults.id, mockScanResults.websiteUrl)}
              className="text-orange-600 hover:text-orange-700 hover:border-orange-300"
              title="Archive this report"
            >
              <ArchiveBoxIcon className="h-4 w-4 mr-1" />
              Archive
            </Button>
          </div>
        </div>
        
        {/* Title and description */}
        <div>
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
          {(() => {
            // Smart text processing that handles numbered lists and various formats
            const processReportText = (text: string) => {
              // First, normalize numbered lists by ensuring they start on new lines
              let processedText = text
                // Handle numbered lists (1. 2. 3. etc.) by adding line breaks before them
                .replace(/(\w)\s*(\d+\.\s)/g, '$1\n\n$2')
                // Handle bullet points (• - *) by adding line breaks before them
                .replace(/(\w)\s*([•\-\*]\s)/g, '$1\n\n$2')
                // Clean up multiple consecutive line breaks
                .replace(/\n{3,}/g, '\n\n')
                // Split into logical sections, preserving numbered lists
                .split(/(?<!\d)\.(?:\s+|$)(?!\d)/)
                .filter(segment => segment.trim());

              return processedText.map((segment, index) => {
                const trimmedSegment = segment.trim();
                if (!trimmedSegment) return null;

                // Restore period for segments that don't end with punctuation (except last)
                const isLast = index === processedText.length - 1;
                let formattedSegment = trimmedSegment;
                if (!isLast && !trimmedSegment.match(/[.!?:]$/)) {
                  formattedSegment += '.';
                }

                const lowerSegment = formattedSegment.toLowerCase();

                // Check for priority recommendations
                if (lowerSegment.includes('top priority') || lowerSegment.includes('priority recommendation')) {
                  return (
                    <div key={index} className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
                      <h4 className="font-semibold text-blue-900 dark:text-blue-100 mb-2 flex items-center">
                        🎯 Priority Recommendations
                      </h4>
                      <div className="text-blue-800 dark:text-blue-200 text-sm leading-relaxed whitespace-pre-line">
                        {formattedSegment}
                      </div>
                    </div>
                  );
                }

                // Check for quick wins
                if (lowerSegment.includes('quick wins') || lowerSegment.includes('implementation within')) {
                  return (
                    <div key={index} className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg p-4">
                      <h4 className="font-semibold text-green-900 dark:text-green-100 mb-2 flex items-center">
                        ⚡ Quick Wins
                      </h4>
                      <div className="text-green-800 dark:text-green-200 text-sm leading-relaxed whitespace-pre-line">
                        {formattedSegment}
                      </div>
                    </div>
                  );
                }

                // Check for long-term optimization
                if (lowerSegment.includes('long-term') || lowerSegment.includes('revenue growth potential')) {
                  return (
                    <div key={index} className="bg-purple-50 dark:bg-purple-900/20 border border-purple-200 dark:border-purple-800 rounded-lg p-4">
                      <h4 className="font-semibold text-purple-900 dark:text-purple-100 mb-2 flex items-center">
                        📈 Long-term Growth
                      </h4>
                      <div className="text-purple-800 dark:text-purple-200 text-sm leading-relaxed whitespace-pre-line">
                        {formattedSegment}
                      </div>
                    </div>
                  );
                }

                // Default case - regular paragraph with proper line break handling
                return (
                  <Text key={index} className="text-zinc-600 dark:text-zinc-400 text-sm leading-relaxed whitespace-pre-line">
                    {formattedSegment}
                  </Text>
                );
              }).filter(Boolean);
            };

            return processReportText(mockScanResults.summary);
          })()}
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
                    <Badge color={categoryData.color as 'red' | 'blue' | 'green' | 'yellow' | 'purple' | 'pink' | 'indigo' | 'gray' | 'zinc'}>
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

      {/* Archive Confirmation Dialog */}
      {archiveConfirm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50" onClick={(e) => console.log('🗃️ Dialog backdrop clicked')}>
          <div className="bg-white dark:bg-zinc-900 rounded-lg p-6 max-w-md w-full mx-4 border border-zinc-200 dark:border-zinc-800">
            <div className="mb-4">
              <h3 className="text-lg font-semibold text-zinc-900 dark:text-white mb-2">
                Archive Report
              </h3>
              <Text className="text-zinc-600 dark:text-zinc-400">
                Are you sure you want to archive the report for &quot;{archiveConfirm.reportName}&quot;? You can view archived reports in your history and rescan them later.
              </Text>
            </div>
            <div className="flex space-x-3 justify-end">
              <Button
                variant="outline"
                onClick={handleCancelArchive}
                disabled={archiveReportMutation.isLoading}
              >
                Cancel
              </Button>
              <Button
                onClick={handleConfirmArchive}
                disabled={archiveReportMutation.isLoading}
                className="bg-orange-600 hover:bg-orange-700 text-white"
              >
                {archiveReportMutation.isLoading ? 'Archiving...' : 'Archive Report'}
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Retrigger Confirmation Dialog */}
      {retriggerConfirm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white dark:bg-zinc-900 rounded-lg p-6 max-w-md w-full mx-4 border border-zinc-200 dark:border-zinc-800">
            <div className="mb-4">
              <h3 className="text-lg font-semibold text-zinc-900 dark:text-white mb-2">
                Retrigger Analysis
              </h3>
              <Text className="text-zinc-600 dark:text-zinc-400">
                Are you sure you want to retrigger the analysis for &quot;{retriggerConfirm.reportName}&quot;? This will reset the analysis status to pending and attempt to process it again.
              </Text>
            </div>
            <div className="flex space-x-3 justify-end">
              <Button
                variant="outline"
                onClick={handleCancelRetrigger}
                disabled={retriggerAnalysisMutation.isLoading}
              >
                Cancel
              </Button>
              <Button
                onClick={handleConfirmRetrigger}
                disabled={retriggerAnalysisMutation.isLoading}
                className="bg-blue-600 hover:bg-blue-700 text-white"
              >
                {retriggerAnalysisMutation.isLoading ? 'Retriggering...' : 'Retrigger Analysis'}
              </Button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}