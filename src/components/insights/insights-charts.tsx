"use client";

import { useMemo } from "react";
import {
  ResponsiveContainer,
  LineChart,
  Line,
  BarChart,
  Bar,
  ScatterChart,
  Scatter,
  XAxis,
  YAxis,
  ZAxis,
  CartesianGrid,
  Tooltip,
  Legend,
} from "recharts";
import { ArrowDownTrayIcon } from "@heroicons/react/20/solid";
import { Subheading } from "@/components/heading";
import { Text } from "@/components/text";
import { trpc } from "@/lib/trpc/client";
import { downloadCsv } from "@/lib/insights/export-csv";

const CATEGORY_COLORS: Record<string, string> = {
  conversion: "#6366f1", // indigo
  seo: "#10b981", // emerald
  technical: "#f59e0b", // amber
  ux: "#ec4899", // pink
  other: "#64748b", // slate
};

const STATUS_COLORS: Record<string, string> = {
  completed: "#10b981",
  in_progress: "#6366f1",
  pending: "#94a3b8",
  dismissed: "#ef4444",
};

const colorFor = (category: string) => CATEGORY_COLORS[category] ?? CATEGORY_COLORS.other;
const titleCase = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);
const AXIS_TICK = { fill: "#94a3b8", fontSize: 12 };

function Card({
  title,
  description,
  onExport,
  ariaLabel,
  children,
}: {
  title: string;
  description?: string;
  onExport?: () => void;
  ariaLabel: string;
  children: React.ReactNode;
}) {
  return (
    <div className="bg-white dark:bg-zinc-900 rounded-lg border border-zinc-950/10 dark:border-white/10 p-6">
      <div className="flex items-start justify-between gap-4 mb-4">
        <div>
          <Subheading>{title}</Subheading>
          {description && (
            <Text className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">{description}</Text>
          )}
        </div>
        {onExport && (
          <button
            type="button"
            onClick={onExport}
            className="inline-flex items-center gap-1 text-xs font-medium text-zinc-600 dark:text-zinc-400 hover:text-zinc-950 dark:hover:text-white whitespace-nowrap"
          >
            <ArrowDownTrayIcon className="h-4 w-4" />
            CSV
          </button>
        )}
      </div>
      <div role="img" aria-label={ariaLabel}>
        {children}
      </div>
    </div>
  );
}

function EmptyState({ message }: { message: string }) {
  return (
    <div className="flex items-center justify-center h-[260px] text-center">
      <Text className="text-zinc-500 dark:text-zinc-400 text-sm max-w-xs">{message}</Text>
    </div>
  );
}

export default function InsightsCharts() {
  const { data, isLoading, error } = trpc.insights.getDashboard.useQuery(undefined, {
    refetchOnWindowFocus: false,
  });

  const heatmapRows = useMemo(() => {
    if (!data) return [];
    return data.heatmap.websites.map((website) => {
      const row: Record<string, unknown> = { website };
      for (const category of data.heatmap.categories) {
        row[category] =
          data.heatmap.cells.find((c) => c.website === website && c.category === category)?.count ?? 0;
      }
      return row;
    });
  }, [data]);

  if (isLoading) {
    return (
      <div className="bg-white dark:bg-zinc-900 rounded-lg border border-zinc-950/10 dark:border-white/10 p-6">
        <Text className="text-zinc-500 dark:text-zinc-400 text-center py-12">
          Loading insights…
        </Text>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="bg-white dark:bg-zinc-900 rounded-lg border border-zinc-950/10 dark:border-white/10 p-6">
        <Text className="text-zinc-500 dark:text-zinc-400 text-center py-12">
          Couldn&apos;t load insights data. Please try again later.
        </Text>
      </div>
    );
  }

  if (data.reportCount === 0) {
    return (
      <div className="bg-white dark:bg-zinc-900 rounded-lg border border-zinc-950/10 dark:border-white/10 p-6">
        <EmptyState message="No completed analyses yet. Run a few scans to unlock trends, patterns, and impact analysis across your portfolio." />
      </div>
    );
  }

  const lowData = data.reportCount < 5;

  return (
    <div className="space-y-6">
      {lowData && (
        <div className="p-3 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg">
          <Text className="text-blue-800 dark:text-blue-200 text-sm">
            You have {data.reportCount} completed{" "}
            {data.reportCount === 1 ? "analysis" : "analyses"}. Trends become more meaningful with
            5 or more.
          </Text>
        </div>
      )}

      {/* Score over time */}
      <Card
        title="Optimization Score Over Time"
        description="Overall score for each completed analysis."
        ariaLabel="Line chart of overall optimization score over time"
        onExport={() =>
          downloadCsv(
            "score-trend.csv",
            data.scoreTrend.map((p) => ({
              date: p.date,
              website: p.websiteUrl,
              score: p.score,
            })),
          )
        }
      >
        {data.scoreTrend.length === 0 ? (
          <EmptyState message="No scored analyses yet." />
        ) : (
          <ResponsiveContainer width="100%" height={260}>
            <LineChart data={data.scoreTrend} margin={{ top: 8, right: 16, bottom: 0, left: -16 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#94a3b833" />
              <XAxis dataKey="date" tick={AXIS_TICK} tickLine={false} />
              <YAxis domain={[0, 10]} tick={AXIS_TICK} tickLine={false} axisLine={false} />
              <Tooltip
                contentStyle={{ fontSize: 12, borderRadius: 8 }}
                labelFormatter={(label) => `Date: ${label}`}
              />
              <Line
                type="monotone"
                dataKey="score"
                stroke="#6366f1"
                strokeWidth={2}
                dot={{ r: 3 }}
                name="Score"
              />
            </LineChart>
          </ResponsiveContainer>
        )}
      </Card>

      {/* Issue frequency over time */}
      <Card
        title="Recommendations by Category Over Time"
        description="How many recommendations each category generated, by day."
        ariaLabel="Stacked bar chart of recommendation counts by category over time"
        onExport={() => downloadCsv("issue-frequency.csv", data.issueFrequency)}
      >
        {data.issueFrequency.length === 0 ? (
          <EmptyState message="No recommendations to chart yet." />
        ) : (
          <ResponsiveContainer width="100%" height={260}>
            <BarChart
              data={data.issueFrequency}
              margin={{ top: 8, right: 16, bottom: 0, left: -16 }}
            >
              <CartesianGrid strokeDasharray="3 3" stroke="#94a3b833" />
              <XAxis dataKey="date" tick={AXIS_TICK} tickLine={false} />
              <YAxis allowDecimals={false} tick={AXIS_TICK} tickLine={false} axisLine={false} />
              <Tooltip contentStyle={{ fontSize: 12, borderRadius: 8 }} />
              <Legend wrapperStyle={{ fontSize: 12 }} />
              {data.categories.map((category) => (
                <Bar
                  key={category}
                  dataKey={category}
                  stackId="recs"
                  fill={colorFor(category)}
                  name={titleCase(category)}
                />
              ))}
            </BarChart>
          </ResponsiveContainer>
        )}
      </Card>

      {/* Impact vs effort scatter */}
      <Card
        title="Impact vs. Effort"
        description="Every recommendation plotted by effort (x) and impact (y). Top-left = quick wins."
        ariaLabel="Scatter plot of recommendation impact versus effort, colored by category"
        onExport={() => downloadCsv("impact-effort.csv", data.scatter)}
      >
        {data.scatter.length === 0 ? (
          <EmptyState message="No recommendations with impact/effort scores yet." />
        ) : (
          <ResponsiveContainer width="100%" height={320}>
            <ScatterChart margin={{ top: 8, right: 16, bottom: 16, left: -16 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#94a3b833" />
              <XAxis
                type="number"
                dataKey="effort"
                name="Effort"
                domain={[0, 10]}
                tick={AXIS_TICK}
                tickLine={false}
                label={{ value: "Effort →", position: "insideBottom", offset: -8, fill: "#94a3b8", fontSize: 12 }}
              />
              <YAxis
                type="number"
                dataKey="impact"
                name="Impact"
                domain={[0, 10]}
                tick={AXIS_TICK}
                tickLine={false}
                axisLine={false}
                label={{ value: "Impact →", angle: -90, position: "insideLeft", fill: "#94a3b8", fontSize: 12 }}
              />
              <ZAxis range={[60, 60]} />
              <Tooltip
                cursor={{ strokeDasharray: "3 3" }}
                contentStyle={{ fontSize: 12, borderRadius: 8 }}
                formatter={(value, name) => [value, titleCase(String(name))]}
              />
              <Legend wrapperStyle={{ fontSize: 12 }} />
              {data.categories
                .filter((category) => data.scatter.some((p) => p.category === category))
                .map((category) => (
                  <Scatter
                    key={category}
                    name={titleCase(category)}
                    data={data.scatter.filter((p) => p.category === category)}
                    fill={colorFor(category)}
                  />
                ))}
            </ScatterChart>
          </ResponsiveContainer>
        )}
      </Card>

      {/* Pattern heatmap: website x category */}
      <Card
        title="Pattern Heatmap"
        description="Recommendation counts by website and category. Darker = more recommendations."
        ariaLabel="Heatmap of recommendation counts by website and category"
        onExport={() => downloadCsv("pattern-heatmap.csv", heatmapRows)}
      >
        {data.heatmap.websites.length === 0 ? (
          <EmptyState message="No patterns to chart yet." />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full border-separate border-spacing-1 text-sm">
              <thead>
                <tr>
                  <th className="text-left font-medium text-zinc-500 dark:text-zinc-400 px-2 py-1">
                    Website
                  </th>
                  {data.heatmap.categories.map((category) => (
                    <th
                      key={category}
                      className="text-center font-medium text-zinc-500 dark:text-zinc-400 px-2 py-1"
                    >
                      {titleCase(category)}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {data.heatmap.websites.map((website) => (
                  <tr key={website}>
                    <td className="text-zinc-700 dark:text-zinc-300 px-2 py-1 max-w-[200px] truncate">
                      {website}
                    </td>
                    {data.heatmap.categories.map((category) => {
                      const count =
                        data.heatmap.cells.find(
                          (c) => c.website === website && c.category === category,
                        )?.count ?? 0;
                      const intensity = data.heatmap.max > 0 ? count / data.heatmap.max : 0;
                      return (
                        <td
                          key={category}
                          className="text-center rounded px-2 py-1 font-medium"
                          style={{
                            backgroundColor:
                              count === 0
                                ? "transparent"
                                : `${colorFor(category)}${Math.round(
                                    60 + intensity * 195,
                                  )
                                    .toString(16)
                                    .padStart(2, "0")}`,
                            color: intensity > 0.45 ? "#fff" : undefined,
                          }}
                          title={`${website} · ${titleCase(category)}: ${count}`}
                        >
                          {count || ""}
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      {/* Recommendation adoption */}
      <Card
        title="Recommendation Adoption by Category"
        description="Status of recommendations you've tracked, grouped by category."
        ariaLabel="Stacked bar chart of recommendation status by category"
        onExport={
          data.adoption.length > 0
            ? () => downloadCsv("adoption.csv", data.adoption)
            : undefined
        }
      >
        {data.adoption.length === 0 ? (
          <EmptyState message="No recommendation status tracked yet. As you mark recommendations in progress, completed, or dismissed, adoption rates will appear here." />
        ) : (
          <ResponsiveContainer width="100%" height={260}>
            <BarChart data={data.adoption} margin={{ top: 8, right: 16, bottom: 0, left: -16 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#94a3b833" />
              <XAxis
                dataKey="category"
                tick={AXIS_TICK}
                tickLine={false}
                tickFormatter={titleCase}
              />
              <YAxis allowDecimals={false} tick={AXIS_TICK} tickLine={false} axisLine={false} />
              <Tooltip contentStyle={{ fontSize: 12, borderRadius: 8 }} />
              <Legend wrapperStyle={{ fontSize: 12 }} />
              {(["completed", "in_progress", "pending", "dismissed"] as const).map((status) => (
                <Bar
                  key={status}
                  dataKey={status}
                  stackId="status"
                  fill={STATUS_COLORS[status]}
                  name={titleCase(status.replace("_", " "))}
                />
              ))}
            </BarChart>
          </ResponsiveContainer>
        )}
      </Card>
    </div>
  );
}
