'use client';

import { useSession } from '@/lib/auth-client';
import { trpc } from '@/lib/trpc/client';
import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  ChartBarIcon, 
  GlobeAltIcon, 
  EyeIcon, 
  ClockIcon,
  ArrowTrendingUpIcon,
  PlayIcon,
  CheckCircleIcon,
  ExclamationTriangleIcon
} from '@heroicons/react/24/outline';
import Link from 'next/link';
import { AnalyticsChart } from '@/components/features/dashboard/analytics-chart';

interface DashboardMetrics {
  totalScans: number;
  totalReports: number;
  avgScore: number;
  activeAnalyses: number;
  recentActivity: Array<{
    id: string;
    type: 'scan' | 'report' | 'analysis';
    title: string;
    timestamp: Date | string;
    status: 'completed' | 'processing' | 'failed';
  }>;
  scoreHistory: Array<{
    date: string;
    score: number;
  }>;
}

export default function DashboardPage() {
  const { data: session } = useSession();
  const [refreshInterval, setRefreshInterval] = useState<number | null>(null);
  const [lastUpdate, setLastUpdate] = useState(new Date());

  // Real-time dashboard data fetching
  const { data: dashboardData, isLoading, refetch } = trpc.dashboard.getMetrics.useQuery(
    undefined,
    {
      refetchInterval: 30000, // Refresh every 30 seconds for real-time updates
      refetchIntervalInBackground: false,
    }
  );

  // Mock real-time updates (in production, this would be WebSocket-based)
  useEffect(() => {
    const interval = setInterval(() => {
      setLastUpdate(new Date());
      refetch();
    }, 30000);

    setRefreshInterval(interval as any);

    return () => {
      if (refreshInterval) {
        clearInterval(refreshInterval);
      }
    };
  }, [refetch]);

  // Mock data for Phase 4 implementation
  const mockMetrics: DashboardMetrics = {
    totalScans: dashboardData?.totalScans || 12,
    totalReports: dashboardData?.totalReports || 8,
    avgScore: dashboardData?.avgScore || 78,
    activeAnalyses: dashboardData?.activeAnalyses || 2,
    recentActivity: dashboardData?.recentActivity || [
      {
        id: '1',
        type: 'scan',
        title: 'Completed scan for example.com',
        timestamp: new Date(Date.now() - 2 * 60 * 1000),
        status: 'completed'
      },
      {
        id: '2',
        type: 'analysis',
        title: 'Deep analysis in progress',
        timestamp: new Date(Date.now() - 5 * 60 * 1000),
        status: 'processing'
      },
      {
        id: '3',
        type: 'report',
        title: 'Generated marketing report',
        timestamp: new Date(Date.now() - 15 * 60 * 1000),
        status: 'completed'
      }
    ],
    scoreHistory: dashboardData?.scoreHistory || [
      { date: '2025-01-20', score: 72 },
      { date: '2025-01-21', score: 75 },
      { date: '2025-01-22', score: 78 },
      { date: '2025-01-23', score: 76 },
      { date: '2025-01-24', score: 80 },
    ]
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'completed':
        return <CheckCircleIcon className="w-4 h-4 text-green-500" />;
      case 'processing':
        return <motion.div 
          animate={{ rotate: 360 }}
          transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
        >
          <PlayIcon className="w-4 h-4 text-blue-500" />
        </motion.div>;
      case 'failed':
        return <ExclamationTriangleIcon className="w-4 h-4 text-red-500" />;
      default:
        return null;
    }
  };

  const formatTimeAgo = (date: Date | string) => {
    try {
      const dateObj = typeof date === 'string' ? new Date(date) : date;
      if (isNaN(dateObj.getTime())) return 'Invalid date';
      
      const seconds = Math.floor((Date.now() - dateObj.getTime()) / 1000);
      
      if (seconds < 60) return `${seconds}s ago`;
      
      const minutes = Math.floor(seconds / 60);
      if (minutes < 60) return `${minutes}m ago`;
      
      const hours = Math.floor(minutes / 60);
      if (hours < 24) return `${hours}h ago`;
      
      const days = Math.floor(hours / 24);
      return `${days}d ago`;
    } catch (error) {
      console.error('Error formatting time:', error);
      return 'Unknown time';
    }
  };

  return (
    <div className="p-6 space-y-8">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
      >
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold text-zinc-900 dark:text-white">
              Dashboard
            </h1>
            <p className="text-zinc-600 dark:text-zinc-400 mt-1">
              Welcome back, {session?.user?.name || 'User'}! Here's your website optimization overview.
            </p>
          </div>
          <div className="flex items-center space-x-4">
            <motion.div
              className="text-xs text-zinc-500 dark:text-zinc-400 flex items-center space-x-1"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.3 }}
            >
              <ClockIcon className="w-3 h-3" />
              <span>Last updated: {lastUpdate.toLocaleTimeString()}</span>
            </motion.div>
            <Link href="/dashboard/scan">
              <motion.button
                className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors"
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
              >
                New Scan
              </motion.button>
            </Link>
          </div>
        </div>
      </motion.div>

      {/* Metrics Grid */}
      <motion.div
        className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.1 }}
      >
        {/* Total Scans */}
        <motion.div
          className="bg-white dark:bg-zinc-800 rounded-lg p-6 border border-zinc-200 dark:border-zinc-700"
          whileHover={{ scale: 1.02 }}
          transition={{ duration: 0.2 }}
        >
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-zinc-600 dark:text-zinc-400">
                Total Scans
              </p>
              <motion.p
                className="text-2xl font-bold text-zinc-900 dark:text-white mt-2"
                key={mockMetrics.totalScans}
                initial={{ scale: 1.2 }}
                animate={{ scale: 1 }}
                transition={{ duration: 0.3 }}
              >
                {mockMetrics.totalScans}
              </motion.p>
            </div>
            <div className="p-3 bg-blue-100 dark:bg-blue-900/20 rounded-lg">
              <GlobeAltIcon className="w-6 h-6 text-blue-600 dark:text-blue-400" />
            </div>
          </div>
        </motion.div>

        {/* Total Reports */}
        <motion.div
          className="bg-white dark:bg-zinc-800 rounded-lg p-6 border border-zinc-200 dark:border-zinc-700"
          whileHover={{ scale: 1.02 }}
          transition={{ duration: 0.2 }}
        >
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-zinc-600 dark:text-zinc-400">
                Reports Generated
              </p>
              <motion.p
                className="text-2xl font-bold text-zinc-900 dark:text-white mt-2"
                key={mockMetrics.totalReports}
                initial={{ scale: 1.2 }}
                animate={{ scale: 1 }}
                transition={{ duration: 0.3 }}
              >
                {mockMetrics.totalReports}
              </motion.p>
            </div>
            <div className="p-3 bg-green-100 dark:bg-green-900/20 rounded-lg">
              <ChartBarIcon className="w-6 h-6 text-green-600 dark:text-green-400" />
            </div>
          </div>
        </motion.div>

        {/* Average Score */}
        <motion.div
          className="bg-white dark:bg-zinc-800 rounded-lg p-6 border border-zinc-200 dark:border-zinc-700"
          whileHover={{ scale: 1.02 }}
          transition={{ duration: 0.2 }}
        >
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-zinc-600 dark:text-zinc-400">
                Average Score
              </p>
              <div className="flex items-center space-x-2 mt-2">
                <motion.p
                  className="text-2xl font-bold text-zinc-900 dark:text-white"
                  key={mockMetrics.avgScore}
                  initial={{ scale: 1.2 }}
                  animate={{ scale: 1 }}
                  transition={{ duration: 0.3 }}
                >
                  {mockMetrics.avgScore}
                </motion.p>
                <ArrowTrendingUpIcon className="w-4 h-4 text-green-500" />
              </div>
            </div>
            <div className="p-3 bg-purple-100 dark:bg-purple-900/20 rounded-lg">
              <ArrowTrendingUpIcon className="w-6 h-6 text-purple-600 dark:text-purple-400" />
            </div>
          </div>
        </motion.div>

        {/* Active Analyses */}
        <motion.div
          className="bg-white dark:bg-zinc-800 rounded-lg p-6 border border-zinc-200 dark:border-zinc-700"
          whileHover={{ scale: 1.02 }}
          transition={{ duration: 0.2 }}
        >
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-zinc-600 dark:text-zinc-400">
                Active Analyses
              </p>
              <motion.p
                className="text-2xl font-bold text-zinc-900 dark:text-white mt-2"
                key={mockMetrics.activeAnalyses}
                initial={{ scale: 1.2 }}
                animate={{ scale: 1 }}
                transition={{ duration: 0.3 }}
              >
                {mockMetrics.activeAnalyses}
              </motion.p>
            </div>
            <div className="p-3 bg-orange-100 dark:bg-orange-900/20 rounded-lg">
              <EyeIcon className="w-6 h-6 text-orange-600 dark:text-orange-400" />
            </div>
          </div>
        </motion.div>
      </motion.div>

      {/* Dashboard Content Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Recent Activity */}
        <motion.div
          className="lg:col-span-2 bg-white dark:bg-zinc-800 rounded-lg border border-zinc-200 dark:border-zinc-700"
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.5, delay: 0.2 }}
        >
          <div className="p-6">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-lg font-semibold text-zinc-900 dark:text-white">
                Recent Activity
              </h2>
              <Link 
                href="/dashboard/history"
                className="text-sm text-blue-600 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300"
              >
                View all
              </Link>
            </div>

            <div className="space-y-4">
              <AnimatePresence mode="popLayout">
                {mockMetrics.recentActivity.map((activity, index) => (
                  <motion.div
                    key={activity.id}
                    className="flex items-center space-x-4 p-3 hover:bg-zinc-50 dark:hover:bg-zinc-700/50 rounded-lg transition-colors"
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: index * 0.1 }}
                    layout
                  >
                    <div className="flex-shrink-0">
                      {getStatusIcon(activity.status)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-zinc-900 dark:text-white">
                        {activity.title}
                      </p>
                      <p className="text-xs text-zinc-500 dark:text-zinc-400">
                        {formatTimeAgo(activity.timestamp)}
                      </p>
                    </div>
                    <div className="flex-shrink-0">
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                        activity.status === 'completed' 
                          ? 'bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-400'
                          : activity.status === 'processing'
                          ? 'bg-blue-100 text-blue-800 dark:bg-blue-900/20 dark:text-blue-400'
                          : 'bg-red-100 text-red-800 dark:bg-red-900/20 dark:text-red-400'
                      }`}>
                        {activity.status}
                      </span>
                    </div>
                  </motion.div>
                ))}
              </AnimatePresence>
            </div>
          </div>
        </motion.div>

        {/* Quick Actions */}
        <motion.div
          className="bg-white dark:bg-zinc-800 rounded-lg border border-zinc-200 dark:border-zinc-700"
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.5, delay: 0.3 }}
        >
          <div className="p-6">
            <h2 className="text-lg font-semibold text-zinc-900 dark:text-white mb-6">
              Quick Actions
            </h2>

            <div className="space-y-3">
              <Link href="/dashboard/scan">
                <motion.div
                  className="flex items-center space-x-3 p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg hover:bg-blue-100 dark:hover:bg-blue-900/30 transition-colors cursor-pointer"
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                >
                  <div className="p-2 bg-blue-100 dark:bg-blue-800 rounded-lg">
                    <GlobeAltIcon className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-zinc-900 dark:text-white">
                      New Website Scan
                    </p>
                    <p className="text-xs text-zinc-600 dark:text-zinc-400">
                      Analyze a website for optimization opportunities
                    </p>
                  </div>
                </motion.div>
              </Link>

              <Link href="/dashboard/reports">
                <motion.div
                  className="flex items-center space-x-3 p-3 bg-green-50 dark:bg-green-900/20 rounded-lg hover:bg-green-100 dark:hover:bg-green-900/30 transition-colors cursor-pointer"
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                >
                  <div className="p-2 bg-green-100 dark:bg-green-800 rounded-lg">
                    <ChartBarIcon className="w-5 h-5 text-green-600 dark:text-green-400" />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-zinc-900 dark:text-white">
                      View Reports
                    </p>
                    <p className="text-xs text-zinc-600 dark:text-zinc-400">
                      Access your analysis reports and insights
                    </p>
                  </div>
                </motion.div>
              </Link>

              <Link href="/dashboard/insights">
                <motion.div
                  className="flex items-center space-x-3 p-3 bg-purple-50 dark:bg-purple-900/20 rounded-lg hover:bg-purple-100 dark:hover:bg-purple-900/30 transition-colors cursor-pointer"
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                >
                  <div className="p-2 bg-purple-100 dark:bg-purple-800 rounded-lg">
                    <EyeIcon className="w-5 h-5 text-purple-600 dark:text-purple-400" />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-zinc-900 dark:text-white">
                      View Insights
                    </p>
                    <p className="text-xs text-zinc-600 dark:text-zinc-400">
                      Discover trends and performance insights
                    </p>
                  </div>
                </motion.div>
              </Link>
            </div>
          </div>
        </motion.div>
      </div>

      {/* Interactive Performance Chart */}
      <AnalyticsChart
        data={mockMetrics.scoreHistory.map(entry => ({
          date: entry.date,
          score: entry.score,
          conversion: Math.max(0, entry.score - 5 + Math.random() * 10),
          seo: Math.max(0, entry.score - 3 + Math.random() * 8),
          performance: Math.max(0, entry.score - 7 + Math.random() * 12),
        }))}
        title="Performance Trends (Last 5 days)"
        type="line"
        showControls={true}
        height={350}
      />
    </div>
  );
}