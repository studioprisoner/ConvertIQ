'use client';

import { useState } from 'react';
import { ArchiveBoxIcon, ArrowPathIcon } from '@heroicons/react/24/outline';
import { Heading } from '@/components/heading';
import { Text } from '@/components/text';
import { Button } from '@/components/button';
import { Badge } from '@/components/badge';
import { useRouter } from 'next/navigation';
import { trpc } from '@/lib/trpc/client';

export default function ArchivedReportsPage() {
  const router = useRouter();
  
  const [rescanConfirm, setRescanConfirm] = useState<{websiteId: string, websiteName: string} | null>(null);

  // Fetch archived reports
  const { data: archivedReports, isLoading, error, refetch } = trpc.reports.getArchivedReports.useQuery(
    { limit: 20, offset: 0 }
  );

  // Rescan mutation
  const rescanMutation = trpc.reports.rescanReport.useMutation({
    onSuccess: (data) => {
      console.log('✅ Rescan initiated:', data);
      setRescanConfirm(null);
      // Redirect to the main reports page to see the new scan
      router.push('/dashboard/reports');
    },
    onError: (error) => {
      console.error('❌ Failed to initiate rescan:', error);
      alert(`Failed to initiate rescan: ${error.message}`);
    }
  });

  // Rescan handlers
  const handleRescanClick = (websiteId: string, websiteName: string) => {
    setRescanConfirm({ websiteId, websiteName });
  };

  const handleConfirmRescan = () => {
    if (rescanConfirm) {
      console.log('🔄 Attempting to rescan website:', rescanConfirm.websiteId);
      rescanMutation.mutate({ websiteId: rescanConfirm.websiteId });
    }
  };

  const handleCancelRescan = () => {
    setRescanConfirm(null);
  };

  // Show loading state
  if (isLoading) {
    return (
      <div className="space-y-8">
        <div>
          <Heading>Archived Reports</Heading>
          <Text className="mt-4">Loading your archived reports...</Text>
        </div>
        <div className="bg-white dark:bg-zinc-900 rounded-lg border border-zinc-200 dark:border-zinc-800 p-8 text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-orange-600 mx-auto"></div>
          <Text className="mt-4 text-zinc-500 dark:text-zinc-400">
            Fetching your archived reports...
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
          <Heading>Archived Reports</Heading>
          <Text className="mt-4">There was an error loading your archived reports.</Text>
        </div>
        <div className="bg-white dark:bg-zinc-900 rounded-lg border border-zinc-200 dark:border-zinc-800 p-8 text-center">
          <Text className="text-red-600 dark:text-red-400 mb-4">
            Error: {error.message}
          </Text>
          <Button onClick={() => refetch()}>
            Try Again
          </Button>
        </div>
      </div>
    );
  }

  // Show empty state
  if (!archivedReports || archivedReports.reports.length === 0) {
    return (
      <div className="space-y-8">
        <div className="flex items-center justify-between">
          <div>
            <Heading>Archived Reports</Heading>
            <Text className="mt-2">
              Your archived conversion analysis reports
            </Text>
          </div>
          <Button 
            variant="outline"
            onClick={() => router.push('/dashboard/reports')}
          >
            ← Back to Reports
          </Button>
        </div>
        
        <div className="bg-white dark:bg-zinc-900 rounded-lg border border-zinc-200 dark:border-zinc-800 p-8 text-center">
          <ArchiveBoxIcon className="h-12 w-12 text-zinc-400 mx-auto mb-4" />
          <Text className="text-zinc-500 dark:text-zinc-400">
            No archived reports yet. Reports that you archive will appear here.
          </Text>
          <Button 
            className="mt-4"
            onClick={() => router.push('/dashboard/reports')}
          >
            Back to Reports
          </Button>
        </div>
      </div>
    );
  }

  // Show archived reports list
  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <Heading>Archived Reports</Heading>
          <Text className="mt-2">
            Your archived conversion analysis reports ({archivedReports.reports.length} total)
          </Text>
        </div>
        <Button 
          variant="outline"
          onClick={() => router.push('/dashboard/reports')}
        >
          ← Back to Reports
        </Button>
      </div>

      <div className="space-y-4">
        {archivedReports.reports.map((report) => (
          <div 
            key={report.id} 
            className="bg-white dark:bg-zinc-900 rounded-lg border border-zinc-200 dark:border-zinc-800 p-6 opacity-75"
          >
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <div className="flex items-center space-x-3 mb-2">
                  <ArchiveBoxIcon className="h-5 w-5 text-orange-600" />
                  <h3 className="text-lg font-semibold text-zinc-900 dark:text-white">
                    {report.websiteName}
                  </h3>
                  <Badge color="orange">
                    Archived
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
                    <div className="text-2xl font-bold text-zinc-500 dark:text-zinc-400 mb-1">
                      {report.overallScore}/10
                    </div>
                  )}
                  <Text className="text-xs text-zinc-500 dark:text-zinc-400">
                    Archived: {new Date(report.archivedDate).toLocaleDateString()}
                  </Text>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleRescanClick(report.websiteId, report.websiteName)}
                  className="text-blue-600 hover:text-blue-700 hover:border-blue-300"
                  title="Rescan this website"
                >
                  <ArrowPathIcon className="h-4 w-4 mr-1" />
                  Rescan
                </Button>
              </div>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mt-4 pt-4 border-t border-zinc-200 dark:border-zinc-700">
              <div className="text-sm">
                <span className="font-medium text-zinc-700 dark:text-zinc-300">Original Scan:</span>
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
                <span className="ml-1 text-orange-600 dark:text-orange-400">
                  Archived
                </span>
              </div>
            </div>
          </div>
        ))}
      </div>

      {archivedReports.hasMore && (
        <div className="text-center">
          <Button variant="outline" onClick={() => {
            // TODO: Implement pagination
            console.log('Load more archived reports');
          }}>
            Load More Archived Reports
          </Button>
        </div>
      )}

      {/* Rescan Confirmation Dialog */}
      {rescanConfirm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white dark:bg-zinc-900 rounded-lg p-6 max-w-md w-full mx-4 border border-zinc-200 dark:border-zinc-800">
            <div className="mb-4">
              <h3 className="text-lg font-semibold text-zinc-900 dark:text-white mb-2">
                Rescan Website
              </h3>
              <Text className="text-zinc-600 dark:text-zinc-400">
                Are you sure you want to rescan &quot;{rescanConfirm.websiteName}&quot;? This will create a new analysis report for this website.
              </Text>
            </div>
            <div className="flex space-x-3 justify-end">
              <Button
                variant="outline"
                onClick={handleCancelRescan}
                disabled={rescanMutation.isLoading}
              >
                Cancel
              </Button>
              <Button
                onClick={handleConfirmRescan}
                disabled={rescanMutation.isLoading}
                className="bg-blue-600 hover:bg-blue-700 text-white"
              >
                {rescanMutation.isLoading ? 'Starting Rescan...' : 'Start Rescan'}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}