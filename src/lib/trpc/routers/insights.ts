import { createTRPCRouter, protectedProcedure } from '../server';
import { db } from '@/db/connection';
import { analyses, websites, recommendations, reports } from '@/db/schema';
import { and, eq, sql } from 'drizzle-orm';

/**
 * Insights dashboard data (CON-120).
 *
 * Aggregates the user's completed analyses into the datasets that back the
 * dashboard insights visualizations:
 *   - scoreTrend           overall score per analysis over time
 *   - issueFrequency       recommendation counts per category per day
 *   - scatter              every recommendation as an effort/impact point
 *   - heatmap              recommendation counts per website x category
 *   - categoryTotals       recommendation counts per category
 *   - adoption             recommendation status counts per category
 *
 * Recommendations currently live in the `analyses.ai_analysis` JSON, so the
 * score/scatter/heatmap/frequency datasets are parsed from there. Adoption
 * (status tracking) is read from the structured `recommendations` table -- its
 * real source -- so it lights up automatically once recommendations are tracked
 * there; until then it returns an empty set and the UI shows an empty state.
 *
 * All queries are scoped to the requesting user via the websites join so a user
 * only ever sees their own portfolio.
 */

const KNOWN_CATEGORIES = ['conversion', 'seo', 'technical', 'ux'] as const;

export interface ScatterPoint {
  id: string;
  title: string;
  category: string;
  effort: number;
  impact: number;
  priority: string;
  websiteUrl: string;
}

export interface ScoreTrendPoint {
  analysisId: string;
  websiteUrl: string;
  date: string; // ISO date
  timestamp: number; // ms, for numeric time axis
  score: number;
}

export interface InsightsDashboard {
  websiteCount: number;
  reportCount: number;
  recommendationCount: number;
  averageScore: number;
  categories: string[];
  scoreTrend: ScoreTrendPoint[];
  issueFrequency: Array<Record<string, string | number>>;
  scatter: ScatterPoint[];
  heatmap: {
    websites: string[];
    categories: string[];
    cells: Array<{ website: string; category: string; count: number }>;
    max: number;
  };
  categoryTotals: Array<{ category: string; count: number }>;
  adoption: Array<{ category: string; pending: number; in_progress: number; completed: number; dismissed: number }>;
}

/** Build a collision-free composite key for website + category aggregation. */
function heatmapKey(website: string, category: string): string {
  return `${website}|${category}`;
}

/** Impact/effort can be a raw number or a `{ score, category, reasoning }` object. */
function readScore(value: unknown): number | null {
  if (typeof value === 'number' && Number.isFinite(value)) return value;
  if (value && typeof value === 'object') {
    const score = (value as { score?: unknown }).score;
    if (typeof score === 'number' && Number.isFinite(score)) return score;
  }
  return null;
}

function dayKey(date: Date): { date: string; timestamp: number } {
  const day = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()));
  return { date: day.toISOString().slice(0, 10), timestamp: day.getTime() };
}

export const insightsRouter = createTRPCRouter({
  getDashboard: protectedProcedure.query(async ({ ctx }): Promise<InsightsDashboard> => {
    const userId = ctx.user!.id;

    const rows = await db
      .select({
        id: analyses.id,
        websiteUrl: websites.url,
        aiAnalysis: analyses.aiAnalysis,
        createdAt: analyses.createdAt,
      })
      .from(analyses)
      .innerJoin(websites, eq(analyses.websiteId, websites.id))
      .where(and(eq(websites.userId, userId), eq(analyses.status, 'completed')));

    const scoreTrend: ScoreTrendPoint[] = [];
    const scatter: ScatterPoint[] = [];
    const categoryCounts = new Map<string, number>();
    const heatmapCounts = new Map<string, number>();
    const websiteSet = new Set<string>();
    const categorySet = new Set<string>(KNOWN_CATEGORIES);
    // date -> category -> count
    const frequencyByDay = new Map<number, { date: string; counts: Map<string, number> }>();
    let scores = 0;
    let scoreSum = 0;
    let recommendationCount = 0;

    for (const row of rows) {
      if (!row.aiAnalysis) continue;
      let parsed: Record<string, unknown>;
      try {
        parsed = JSON.parse(row.aiAnalysis) as Record<string, unknown>;
      } catch {
        continue;
      }

      const createdAt = row.createdAt ?? new Date();
      const { date, timestamp } = dayKey(createdAt);

      const score = readScore(parsed.overallScore);
      if (score != null) {
        scoreTrend.push({
          analysisId: row.id,
          websiteUrl: row.websiteUrl,
          date,
          timestamp: createdAt.getTime(),
          score,
        });
        scores += 1;
        scoreSum += score;
      }

      const recs = Array.isArray(parsed.recommendations) ? parsed.recommendations : [];
      for (let i = 0; i < recs.length; i++) {
        const rec = recs[i] as Record<string, unknown>;
        const category = String(rec.category ?? 'other').toLowerCase();
        categorySet.add(category);
        recommendationCount += 1;

        categoryCounts.set(category, (categoryCounts.get(category) ?? 0) + 1);

        websiteSet.add(row.websiteUrl);
        const heatKey = heatmapKey(row.websiteUrl, category);
        heatmapCounts.set(heatKey, (heatmapCounts.get(heatKey) ?? 0) + 1);

        let dayEntry = frequencyByDay.get(timestamp);
        if (!dayEntry) {
          dayEntry = { date, counts: new Map() };
          frequencyByDay.set(timestamp, dayEntry);
        }
        dayEntry.counts.set(category, (dayEntry.counts.get(category) ?? 0) + 1);

        const impact = readScore(rec.impact);
        const effort = readScore(rec.effort);
        if (impact != null && effort != null) {
          scatter.push({
            id: String(rec.id ?? `${row.id}-${i}`),
            title: String(rec.title ?? 'Recommendation'),
            category,
            effort,
            impact,
            priority: String(rec.priority ?? 'medium'),
            websiteUrl: row.websiteUrl,
          });
        }
      }
    }

    const categories = Array.from(categorySet).sort();

    // Stacked frequency rows: one row per day, a count column per category.
    const issueFrequency = Array.from(frequencyByDay.entries())
      .sort(([a], [b]) => a - b)
      .map(([timestamp, entry]) => {
        const out: Record<string, string | number> = {
          date: entry.date,
          timestamp,
        };
        for (const category of categories) out[category] = entry.counts.get(category) ?? 0;
        return out;
      });

    scoreTrend.sort((a, b) => a.timestamp - b.timestamp);

    const websitesList = Array.from(websiteSet).sort();
    const cells = [] as Array<{ website: string; category: string; count: number }>;
    let maxCell = 0;
    for (const website of websitesList) {
      for (const category of categories) {
        const count = heatmapCounts.get(heatmapKey(website, category)) ?? 0;
        if (count > maxCell) maxCell = count;
        cells.push({ website, category, count });
      }
    }

    const categoryTotals = categories
      .map((category) => ({ category, count: categoryCounts.get(category) ?? 0 }))
      .filter((c) => c.count > 0)
      .sort((a, b) => b.count - a.count);

    // Adoption from the structured recommendations table (real source; empty
    // until status tracking is populated). Scoped to the user's portfolio.
    const adoptionRows = await db
      .select({
        category: recommendations.category,
        status: recommendations.status,
        count: sql<number>`count(*)::int`,
      })
      .from(recommendations)
      .innerJoin(reports, eq(recommendations.reportId, reports.id))
      .innerJoin(analyses, eq(reports.analysisId, analyses.id))
      .innerJoin(websites, eq(analyses.websiteId, websites.id))
      .where(eq(websites.userId, userId))
      .groupBy(recommendations.category, recommendations.status);

    const adoptionMap = new Map<
      string,
      { category: string; pending: number; in_progress: number; completed: number; dismissed: number }
    >();
    for (const r of adoptionRows) {
      const category = (r.category ?? 'other').toLowerCase();
      let entry = adoptionMap.get(category);
      if (!entry) {
        entry = { category, pending: 0, in_progress: 0, completed: 0, dismissed: 0 };
        adoptionMap.set(category, entry);
      }
      const status = (r.status ?? 'pending') as keyof Omit<typeof entry, 'category'>;
      if (status in entry) entry[status] = Number(r.count);
    }

    const websiteCountRows = await db
      .select({ count: sql<number>`count(*)::int` })
      .from(websites)
      .where(eq(websites.userId, userId));

    return {
      websiteCount: Number(websiteCountRows[0]?.count ?? 0),
      reportCount: rows.length,
      recommendationCount,
      averageScore: scores > 0 ? Math.round((scoreSum / scores) * 10) / 10 : 0,
      categories,
      scoreTrend,
      issueFrequency,
      scatter,
      heatmap: { websites: websitesList, categories, cells, max: maxCell },
      categoryTotals,
      adoption: Array.from(adoptionMap.values()),
    };
  }),
});
