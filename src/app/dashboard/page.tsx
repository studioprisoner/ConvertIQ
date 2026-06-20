"use client";

import { useSession } from "@/lib/auth-client";
import { trpc } from "@/lib/trpc/client";
import dynamic from "next/dynamic";
import Link from "next/link";
import {
  GlobeAltIcon,
  DocumentTextIcon,
  LightBulbIcon,
  ChartBarSquareIcon,
  MagnifyingGlassIcon,
  ChartBarIcon,
  ArrowRightIcon,
} from "@heroicons/react/20/solid";

// Charts are heavy (Recharts); load them lazily and client-side only so they
// don't bloat the dashboard's initial bundle (CON-120).
const InsightsCharts = dynamic(
  () => import("@/components/insights/insights-charts"),
  {
    ssr: false,
    loading: () => (
      <div className="bg-white dark:bg-zinc-900 rounded-lg border border-zinc-950/10 dark:border-white/10 p-6 text-center text-zinc-500 dark:text-zinc-400">
        Loading charts…
      </div>
    ),
  },
);

function StatCard({
  label,
  value,
  icon,
  accent,
}: {
  label: string;
  value: string | number;
  icon: React.ReactNode;
  accent: string;
}) {
  return (
    <div className="bg-white dark:bg-zinc-900 rounded-lg border border-zinc-950/10 dark:border-white/10 p-6">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm font-medium text-zinc-500 dark:text-zinc-400">{label}</p>
          <p className="text-2xl font-bold text-zinc-900 dark:text-white mt-2">{value}</p>
        </div>
        <div className={`p-3 rounded-lg ${accent}`}>{icon}</div>
      </div>
    </div>
  );
}

export default function DashboardPage() {
  const { data: session } = useSession();
  const { data, isLoading } = trpc.insights.getDashboard.useQuery(undefined, {
    refetchOnWindowFocus: false,
  });

  const show = (value: number | undefined) => (isLoading || value == null ? "—" : value);

  return (
    <div className="p-6 space-y-8">
      {/* Header */}
      <div className="flex flex-wrap justify-between items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold text-zinc-900 dark:text-white">Dashboard</h1>
          <p className="text-zinc-600 dark:text-zinc-400 mt-1">
            Welcome back, {session?.user?.name || "there"}! Here&apos;s your website
            optimization overview.
          </p>
        </div>
        <Link
          href="/dashboard/scan"
          className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors"
        >
          New Scan
        </Link>
      </div>

      {/* First-visit welcome banner — shown only when user has no reports yet (CON-132) */}
      {!isLoading && data?.reportCount === 0 && (
        <div className="rounded-xl border border-blue-200 dark:border-blue-800 bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-blue-950/40 dark:to-indigo-950/40 p-8">
          <div className="max-w-2xl">
            <p className="text-xs font-semibold uppercase tracking-widest text-blue-600 dark:text-blue-400 mb-3">
              Get started
            </p>
            <h2 className="text-2xl font-bold text-zinc-900 dark:text-white mb-3">
              Analyse your first page
            </h2>
            <p className="text-zinc-600 dark:text-zinc-300 mb-6 leading-relaxed">
              Paste any URL from your website and get AI-powered conversion recommendations
              in minutes. We&apos;ll identify quick wins, trust signals, and opportunities
              your visitors see right now.
            </p>
            <Link
              href="/dashboard/scan"
              className="inline-flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-5 py-2.5 rounded-lg text-sm font-semibold transition-colors"
            >
              Start your first scan
              <ArrowRightIcon className="w-4 h-4" />
            </Link>
          </div>
        </div>
      )}

      {/* Real overview stats */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatCard
          label="Websites"
          value={show(data?.websiteCount)}
          accent="bg-blue-100 dark:bg-blue-900/20"
          icon={<GlobeAltIcon className="w-6 h-6 text-blue-600 dark:text-blue-400" />}
        />
        <StatCard
          label="Analyses"
          value={show(data?.reportCount)}
          accent="bg-green-100 dark:bg-green-900/20"
          icon={<DocumentTextIcon className="w-6 h-6 text-green-600 dark:text-green-400" />}
        />
        <StatCard
          label="Recommendations"
          value={show(data?.recommendationCount)}
          accent="bg-orange-100 dark:bg-orange-900/20"
          icon={<LightBulbIcon className="w-6 h-6 text-orange-600 dark:text-orange-400" />}
        />
        <StatCard
          label="Average Score"
          value={isLoading || data == null ? "—" : data.averageScore.toFixed(1)}
          accent="bg-purple-100 dark:bg-purple-900/20"
          icon={<ChartBarSquareIcon className="w-6 h-6 text-purple-600 dark:text-purple-400" />}
        />
      </div>

      {/* Quick actions */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <Link
          href="/dashboard/scan"
          className="flex items-center space-x-3 p-4 bg-white dark:bg-zinc-900 rounded-lg border border-zinc-950/10 dark:border-white/10 hover:bg-zinc-50 dark:hover:bg-zinc-800/50 transition-colors"
        >
          <div className="p-2 bg-blue-100 dark:bg-blue-900/30 rounded-lg">
            <MagnifyingGlassIcon className="w-5 h-5 text-blue-600 dark:text-blue-400" />
          </div>
          <div>
            <p className="text-sm font-medium text-zinc-900 dark:text-white">New Website Scan</p>
            <p className="text-xs text-zinc-600 dark:text-zinc-400">
              Analyze a website for optimization opportunities
            </p>
          </div>
        </Link>

        <Link
          href="/dashboard/reports"
          className="flex items-center space-x-3 p-4 bg-white dark:bg-zinc-900 rounded-lg border border-zinc-950/10 dark:border-white/10 hover:bg-zinc-50 dark:hover:bg-zinc-800/50 transition-colors"
        >
          <div className="p-2 bg-green-100 dark:bg-green-900/30 rounded-lg">
            <ChartBarIcon className="w-5 h-5 text-green-600 dark:text-green-400" />
          </div>
          <div>
            <p className="text-sm font-medium text-zinc-900 dark:text-white">View Reports</p>
            <p className="text-xs text-zinc-600 dark:text-zinc-400">
              Access your detailed analysis reports
            </p>
          </div>
        </Link>
      </div>

      {/* Insights & analytics */}
      <div>
        <h2 className="text-lg font-semibold text-zinc-900 dark:text-white mb-1">
          Trends &amp; Analytics
        </h2>
        <p className="text-sm text-zinc-600 dark:text-zinc-400 mb-6">
          Visual breakdown of scores, recommendation patterns, and impact across your portfolio.
        </p>
        <InsightsCharts />
      </div>
    </div>
  );
}
