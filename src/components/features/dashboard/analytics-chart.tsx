'use client';

import { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  LineChart,
  Line,
  AreaChart,
  Area,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
} from 'recharts';

interface DataPoint {
  date: string;
  score: number;
  conversion?: number;
  seo?: number;
  performance?: number;
}

interface AnalyticsChartProps {
  data: DataPoint[];
  title: string;
  type?: 'line' | 'area' | 'bar' | 'pie';
  showControls?: boolean;
  height?: number;
}

// Color scheme for different metrics
const COLORS = {
  primary: '#3b82f6',
  secondary: '#10b981',
  tertiary: '#f59e0b',
  quaternary: '#ef4444',
  accent: '#8b5cf6',
};

const PIE_COLORS = [
  COLORS.primary,
  COLORS.secondary,
  COLORS.tertiary,
  COLORS.quaternary,
  COLORS.accent,
];

export function AnalyticsChart({ 
  data, 
  title, 
  type = 'line', 
  showControls = true,
  height = 300 
}: AnalyticsChartProps) {
  const [chartType, setChartType] = useState(type);
  const [selectedMetrics, setSelectedMetrics] = useState({
    score: true,
    conversion: false,
    seo: false,
    performance: false,
  });

  // Transform data for pie chart
  const pieData = useMemo(() => {
    if (chartType !== 'pie' || data.length === 0) return [];
    
    const latestData = data[data.length - 1];
    return [
      { name: 'Overall Score', value: latestData.score, color: COLORS.primary },
      { name: 'Conversion', value: latestData.conversion || 0, color: COLORS.secondary },
      { name: 'SEO', value: latestData.seo || 0, color: COLORS.tertiary },
      { name: 'Performance', value: latestData.performance || 0, color: COLORS.quaternary },
    ].filter(item => item.value > 0);
  }, [data, chartType]);

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      return (
        <motion.div
          className="bg-white dark:bg-zinc-800 p-3 rounded-lg shadow-lg border border-zinc-200 dark:border-zinc-700"
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.15 }}
        >
          <p className="text-sm font-medium text-zinc-900 dark:text-white mb-2">
            {label}
          </p>
          {payload.map((entry: any, index: number) => (
            <div key={index} className="flex items-center space-x-2">
              <div 
                className="w-3 h-3 rounded-full" 
                style={{ backgroundColor: entry.color }}
              />
              <span className="text-sm text-zinc-600 dark:text-zinc-400">
                {entry.dataKey}: <span className="font-medium">{entry.value}</span>
              </span>
            </div>
          ))}
        </motion.div>
      );
    }
    return null;
  };

  const renderChart = () => {
    switch (chartType) {
      case 'area':
        return (
          <AreaChart data={data}>
            <CartesianGrid strokeDasharray="3 3" className="opacity-30" />
            <XAxis 
              dataKey="date" 
              className="text-xs text-zinc-500"
              tickFormatter={(value) => new Date(value).toLocaleDateString()}
            />
            <YAxis className="text-xs text-zinc-500" />
            <Tooltip content={<CustomTooltip />} />
            {selectedMetrics.score && (
              <Area
                type="monotone"
                dataKey="score"
                stroke={COLORS.primary}
                fill={COLORS.primary}
                fillOpacity={0.6}
                strokeWidth={2}
              />
            )}
            {selectedMetrics.conversion && (
              <Area
                type="monotone"
                dataKey="conversion"
                stroke={COLORS.secondary}
                fill={COLORS.secondary}
                fillOpacity={0.4}
                strokeWidth={2}
              />
            )}
            {selectedMetrics.seo && (
              <Area
                type="monotone"
                dataKey="seo"
                stroke={COLORS.tertiary}
                fill={COLORS.tertiary}
                fillOpacity={0.4}
                strokeWidth={2}
              />
            )}
            {selectedMetrics.performance && (
              <Area
                type="monotone"
                dataKey="performance"
                stroke={COLORS.quaternary}
                fill={COLORS.quaternary}
                fillOpacity={0.4}
                strokeWidth={2}
              />
            )}
          </AreaChart>
        );

      case 'bar':
        return (
          <BarChart data={data}>
            <CartesianGrid strokeDasharray="3 3" className="opacity-30" />
            <XAxis 
              dataKey="date" 
              className="text-xs text-zinc-500"
              tickFormatter={(value) => new Date(value).toLocaleDateString()}
            />
            <YAxis className="text-xs text-zinc-500" />
            <Tooltip content={<CustomTooltip />} />
            {selectedMetrics.score && (
              <Bar dataKey="score" fill={COLORS.primary} radius={[2, 2, 0, 0]} />
            )}
            {selectedMetrics.conversion && (
              <Bar dataKey="conversion" fill={COLORS.secondary} radius={[2, 2, 0, 0]} />
            )}
            {selectedMetrics.seo && (
              <Bar dataKey="seo" fill={COLORS.tertiary} radius={[2, 2, 0, 0]} />
            )}
            {selectedMetrics.performance && (
              <Bar dataKey="performance" fill={COLORS.quaternary} radius={[2, 2, 0, 0]} />
            )}
          </BarChart>
        );

      case 'pie':
        return (
          <PieChart>
            <Pie
              data={pieData}
              cx="50%"
              cy="50%"
              innerRadius={60}
              outerRadius={120}
              paddingAngle={5}
              dataKey="value"
            >
              {pieData.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={entry.color} />
              ))}
            </Pie>
            <Tooltip 
              content={({ active, payload }) => {
                if (active && payload && payload.length) {
                  const data = payload[0].payload;
                  return (
                    <div className="bg-white dark:bg-zinc-800 p-3 rounded-lg shadow-lg border border-zinc-200 dark:border-zinc-700">
                      <p className="text-sm font-medium text-zinc-900 dark:text-white">
                        {data.name}: {data.value}
                      </p>
                    </div>
                  );
                }
                return null;
              }}
            />
          </PieChart>
        );

      default: // line
        return (
          <LineChart data={data}>
            <CartesianGrid strokeDasharray="3 3" className="opacity-30" />
            <XAxis 
              dataKey="date" 
              className="text-xs text-zinc-500"
              tickFormatter={(value) => new Date(value).toLocaleDateString()}
            />
            <YAxis className="text-xs text-zinc-500" />
            <Tooltip content={<CustomTooltip />} />
            {selectedMetrics.score && (
              <Line
                type="monotone"
                dataKey="score"
                stroke={COLORS.primary}
                strokeWidth={3}
                dot={{ fill: COLORS.primary, strokeWidth: 2, r: 4 }}
                activeDot={{ r: 6, stroke: COLORS.primary, strokeWidth: 2 }}
              />
            )}
            {selectedMetrics.conversion && (
              <Line
                type="monotone"
                dataKey="conversion"
                stroke={COLORS.secondary}
                strokeWidth={2}
                dot={{ fill: COLORS.secondary, strokeWidth: 2, r: 4 }}
                activeDot={{ r: 6, stroke: COLORS.secondary, strokeWidth: 2 }}
              />
            )}
            {selectedMetrics.seo && (
              <Line
                type="monotone"
                dataKey="seo"
                stroke={COLORS.tertiary}
                strokeWidth={2}
                dot={{ fill: COLORS.tertiary, strokeWidth: 2, r: 4 }}
                activeDot={{ r: 6, stroke: COLORS.tertiary, strokeWidth: 2 }}
              />
            )}
            {selectedMetrics.performance && (
              <Line
                type="monotone"
                dataKey="performance"
                stroke={COLORS.quaternary}
                strokeWidth={2}
                dot={{ fill: COLORS.quaternary, strokeWidth: 2, r: 4 }}
                activeDot={{ r: 6, stroke: COLORS.quaternary, strokeWidth: 2 }}
              />
            )}
          </LineChart>
        );
    }
  };

  return (
    <motion.div
      className="bg-white dark:bg-zinc-800 rounded-lg border border-zinc-200 dark:border-zinc-700"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
    >
      <div className="p-6">
        {/* Header with Controls */}
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-lg font-semibold text-zinc-900 dark:text-white">
            {title}
          </h3>

          {showControls && (
            <div className="flex items-center space-x-4">
              {/* Chart Type Toggle */}
              <div className="flex items-center space-x-1 bg-zinc-100 dark:bg-zinc-700 rounded-lg p-1">
                {(['line', 'area', 'bar', 'pie'] as const).map((type) => (
                  <motion.button
                    key={type}
                    onClick={() => setChartType(type)}
                    className={`px-3 py-1 rounded-md text-xs font-medium transition-colors ${
                      chartType === type
                        ? 'bg-white dark:bg-zinc-600 text-zinc-900 dark:text-white shadow-sm'
                        : 'text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-white'
                    }`}
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                  >
                    {type.charAt(0).toUpperCase() + type.slice(1)}
                  </motion.button>
                ))}
              </div>

              {/* Metric Selection (only for non-pie charts) */}
              {chartType !== 'pie' && (
                <div className="flex items-center space-x-2">
                  {Object.entries(selectedMetrics).map(([key, selected]) => (
                    <motion.button
                      key={key}
                      onClick={() => setSelectedMetrics(prev => ({
                        ...prev,
                        [key]: !prev[key as keyof typeof prev]
                      }))}
                      className={`inline-flex items-center px-2 py-1 rounded-md text-xs font-medium transition-colors ${
                        selected
                          ? 'bg-blue-100 text-blue-800 dark:bg-blue-900/20 dark:text-blue-400'
                          : 'bg-zinc-100 text-zinc-600 dark:bg-zinc-700 dark:text-zinc-400'
                      }`}
                      whileHover={{ scale: 1.05 }}
                      whileTap={{ scale: 0.95 }}
                    >
                      <div 
                        className={`w-2 h-2 rounded-full mr-1 ${
                          key === 'score' ? 'bg-blue-500' :
                          key === 'conversion' ? 'bg-green-500' :
                          key === 'seo' ? 'bg-yellow-500' :
                          'bg-red-500'
                        }`}
                      />
                      {key.charAt(0).toUpperCase() + key.slice(1)}
                    </motion.button>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Chart Container */}
        <AnimatePresence mode="wait">
          <motion.div
            key={chartType}
            className="w-full"
            style={{ height }}
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            transition={{ duration: 0.3 }}
          >
            {data.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                {renderChart()}
              </ResponsiveContainer>
            ) : (
              <div className="flex items-center justify-center h-full border-2 border-dashed border-zinc-300 dark:border-zinc-600 rounded-lg">
                <div className="text-center">
                  <div className="w-12 h-12 bg-zinc-100 dark:bg-zinc-700 rounded-lg flex items-center justify-center mx-auto mb-4">
                    <svg
                      className="w-6 h-6 text-zinc-400"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"
                      />
                    </svg>
                  </div>
                  <p className="text-sm text-zinc-500 dark:text-zinc-400">
                    No data available for analysis
                  </p>
                  <p className="text-xs text-zinc-400 dark:text-zinc-500 mt-1">
                    Complete some scans to see your performance trends
                  </p>
                </div>
              </div>
            )}
          </motion.div>
        </AnimatePresence>
      </div>
    </motion.div>
  );
}