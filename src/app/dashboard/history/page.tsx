'use client';

import { useState } from 'react';
import { Heading } from '@/components/heading';
import { Text } from '@/components/text';
import { Badge } from '@/components/badge';
import { Button } from '@/components/button';
import { useRouter } from 'next/navigation';
import { trpc } from '@/lib/trpc/client';

export default function HistoryPage() {
  const router = useRouter();
  const [sortBy, setSortBy] = useState<'date' | 'domain' | 'status'>('date');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');
  const [filterStatus, setFilterStatus] = useState<'all' | 'completed' | 'processing' | 'failed'>('all');

  // Fetch reports list for history
  const { data: reportsList, isLoading, error } = trpc.reports.getReportsList.useQuery(
    { limit: 100, offset: 0 }
  );

  // Show loading state
  if (isLoading) {
    return (
      <div className="space-y-8">
        <div>
          <Heading>Analysis History</Heading>
          <Text className="mt-4">Loading your scan history...</Text>
        </div>
        <div className="bg-white dark:bg-zinc-900 rounded-lg border border-zinc-200 dark:border-zinc-800 p-8 text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <Text className="mt-4 text-zinc-500 dark:text-zinc-400">
            Fetching your analysis history...
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
          <Heading>Analysis History</Heading>
          <Text className="mt-4">There was an error loading your scan history.</Text>
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

  // Show empty state
  if (!reportsList || reportsList.reports.length === 0) {
    return (
      <div className="space-y-8">
        <div>
          <Heading>Analysis History</Heading>
          <Text className="mt-4">
            Your complete scan history and past analyses.
          </Text>
        </div>
        
        <div className="bg-white dark:bg-zinc-900 rounded-lg border border-zinc-200 dark:border-zinc-800 p-8 text-center">
          <Text className="text-zinc-500 dark:text-zinc-400 mb-4">
            No analysis history available yet. Your completed scans and reports will be stored here for future reference.
          </Text>
          <Button onClick={() => router.push('/dashboard/scan')}>
            Start Your First Scan
          </Button>
        </div>
      </div>
    );
  }

  // Filter and sort reports
  const filteredReports = reportsList.reports
    .filter(report => filterStatus === 'all' || report.status === filterStatus)
    .sort((a, b) => {
      let aValue, bValue;
      
      switch (sortBy) {
        case 'date':
          aValue = new Date(a.scanDate).getTime();
          bValue = new Date(b.scanDate).getTime();
          break;
        case 'domain':
          aValue = a.websiteName.toLowerCase();
          bValue = b.websiteName.toLowerCase();
          break;
        case 'status':
          aValue = a.status;
          bValue = b.status;
          break;
        default:
          return 0;
      }
      
      if (sortOrder === 'asc') {
        return aValue > bValue ? 1 : -1;
      } else {
        return aValue < bValue ? 1 : -1;
      }
    });

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed': return 'green';
      case 'processing': return 'blue';
      case 'failed': return 'red';
      default: return 'zinc';
    }
  };

  const handleSort = (column: 'date' | 'domain' | 'status') => {
    if (sortBy === column) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortBy(column);
      setSortOrder('desc');
    }
  };

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <Heading>Analysis History</Heading>
          <Text className="mt-2">
            Your complete scan history and past analyses ({filteredReports.length} total)
          </Text>
        </div>
        <Button onClick={() => router.push('/dashboard/scan')}>
          New Scan
        </Button>
      </div>

      {/* Filters */}
      <div className="bg-white dark:bg-zinc-900 rounded-lg border border-zinc-200 dark:border-zinc-800 p-4">
        <div className="flex flex-col sm:flex-row sm:items-center gap-4">
          <div className="flex items-center space-x-2">
            <Text className="text-sm font-medium whitespace-nowrap">Filter by Status:</Text>
            <select 
              value={filterStatus} 
              onChange={(e) => setFilterStatus(e.target.value as 'all' | 'completed' | 'processing' | 'failed')}
              className="text-sm border border-zinc-300 dark:border-zinc-600 rounded-md px-2 py-1 bg-white dark:bg-zinc-800 min-w-[120px]"
            >
              <option value="all">All Status</option>
              <option value="completed">Completed</option>
              <option value="processing">Processing</option>
              <option value="failed">Failed</option>
            </select>
          </div>
          
          <div className="flex items-center space-x-2">
            <Text className="text-sm font-medium whitespace-nowrap">Sort by:</Text>
            <select 
              value={`${sortBy}-${sortOrder}`} 
              onChange={(e) => {
                const [column, order] = e.target.value.split('-') as [typeof sortBy, typeof sortOrder];
                setSortBy(column);
                setSortOrder(order);
              }}
              className="text-sm border border-zinc-300 dark:border-zinc-600 rounded-md px-2 py-1 bg-white dark:bg-zinc-800 min-w-[140px]"
            >
              <option value="date-desc">Newest First</option>
              <option value="date-asc">Oldest First</option>
              <option value="domain-asc">Domain A-Z</option>
              <option value="domain-desc">Domain Z-A</option>
              <option value="status-asc">Status A-Z</option>
              <option value="status-desc">Status Z-A</option>
            </select>
          </div>
        </div>
      </div>

      {/* History Table */}
      <div className="bg-white dark:bg-zinc-900 rounded-lg border border-zinc-200 dark:border-zinc-800 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-zinc-50 dark:bg-zinc-800 border-b border-zinc-200 dark:border-zinc-700">
              <tr>
                <th 
                  className="text-left p-4 font-semibold text-zinc-900 dark:text-white cursor-pointer hover:bg-zinc-100 dark:hover:bg-zinc-700 transition-colors"
                  onClick={() => handleSort('domain')}
                >
                  <div className="flex items-center space-x-1">
                    <span>Domain</span>
                    {sortBy === 'domain' && (
                      <span className="text-xs">{sortOrder === 'asc' ? '↑' : '↓'}</span>
                    )}
                  </div>
                </th>
                <th 
                  className="text-left p-4 font-semibold text-zinc-900 dark:text-white cursor-pointer hover:bg-zinc-100 dark:hover:bg-zinc-700 transition-colors"
                  onClick={() => handleSort('status')}
                >
                  <div className="flex items-center space-x-1">
                    <span>Status</span>
                    {sortBy === 'status' && (
                      <span className="text-xs">{sortOrder === 'asc' ? '↑' : '↓'}</span>
                    )}
                  </div>
                </th>
                <th 
                  className="text-left p-4 font-semibold text-zinc-900 dark:text-white cursor-pointer hover:bg-zinc-100 dark:hover:bg-zinc-700 transition-colors"
                  onClick={() => handleSort('date')}
                >
                  <div className="flex items-center space-x-1">
                    <span>Scan Date</span>
                    {sortBy === 'date' && (
                      <span className="text-xs">{sortOrder === 'asc' ? '↑' : '↓'}</span>
                    )}
                  </div>
                </th>
                <th className="text-left p-4 font-semibold text-zinc-900 dark:text-white">Score</th>
                <th className="text-left p-4 font-semibold text-zinc-900 dark:text-white">Page Type</th>
                <th className="text-left p-4 font-semibold text-zinc-900 dark:text-white">Recommendations</th>
                <th className="text-left p-4 font-semibold text-zinc-900 dark:text-white">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredReports.map((report) => (
                <tr 
                  key={report.id} 
                  className="border-b border-zinc-200 dark:border-zinc-700 hover:bg-zinc-50 dark:hover:bg-zinc-800/50 transition-colors"
                >
                  <td className="p-4">
                    <div>
                      <div className="font-medium text-zinc-900 dark:text-white">
                        {report.websiteName}
                      </div>
                      <div className="text-sm text-zinc-500 dark:text-zinc-400 truncate max-w-xs">
                        {report.websiteUrl}
                      </div>
                    </div>
                  </td>
                  <td className="p-4">
                    <Badge color={getStatusColor(report.status)}>
                      {report.status}
                    </Badge>
                  </td>
                  <td className="p-4">
                    <div className="text-sm text-zinc-900 dark:text-white">
                      {new Date(report.scanDate).toLocaleDateString()}
                    </div>
                    <div className="text-xs text-zinc-500 dark:text-zinc-400">
                      {new Date(report.scanDate).toLocaleTimeString()}
                    </div>
                  </td>
                  <td className="p-4">
                    {report.overallScore ? (
                      <div className="text-lg font-semibold text-blue-600 dark:text-blue-400">
                        {report.overallScore}/10
                      </div>
                    ) : (
                      <span className="text-zinc-400 dark:text-zinc-500">-</span>
                    )}
                  </td>
                  <td className="p-4">
                    <Badge color="zinc">
                      {report.pageType}
                    </Badge>
                  </td>
                  <td className="p-4">
                    <span className="text-sm text-zinc-900 dark:text-white">
                      {report.recommendationsCount}
                    </span>
                  </td>
                  <td className="p-4">
                    <Button
                      onClick={() => router.push(`/dashboard/reports?websiteId=${report.websiteId}`)}
                    >
                      View Report
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {filteredReports.length === 0 && reportsList.reports.length > 0 && (
        <div className="bg-white dark:bg-zinc-900 rounded-lg border border-zinc-200 dark:border-zinc-800 p-8 text-center">
          <Text className="text-zinc-500 dark:text-zinc-400">
            No scans match your current filters.
          </Text>
        </div>
      )}
    </div>
  );
}