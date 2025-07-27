"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/button";
import { Heading, Subheading } from "@/components/heading";
import { Input, InputGroup } from "@/components/input";
import { Divider } from "@/components/divider";
import { Badge } from "@/components/badge";
import { Strong, Text } from "@/components/text";
import {
  MagnifyingGlassIcon,
  SparklesIcon,
  ChartBarSquareIcon,
  LightBulbIcon,
  ArrowTrendingUpIcon,
  DocumentTextIcon,
  ClockIcon,
} from "@heroicons/react/20/solid";
import { trpc } from "@/lib/trpc/client";
import { useSession } from "@/lib/auth-client";

interface SearchResult {
  analysisId: string;
  websiteUrl: string;
  title: string;
  similarity: number;
  relevantSnippets: string[];
  createdAt: string;
  overallScore?: number;
}

interface SimilarReport {
  analysisId: string;
  similarity: number;
  commonTopics: string[];
  websiteUrl: string;
}

export default function AIInsightsPage() {
  const [searchQuery, setSearchQuery] = useState("");
  const [isSearching, setIsSearching] = useState(false);
  const [searchResults, setSearchResults] = useState<SearchResult[]>([]);
  const [selectedReportId, setSelectedReportId] = useState<string | null>(null);
  const [similarReports, setSimilarReports] = useState<SimilarReport[]>([]);
  const [insights, setInsights] = useState<{
    topPatterns: string[];
    commonIssues: string[];
    avgScore: number;
    totalReports: number;
  } | null>(null);
  const [isUsingFallback, setIsUsingFallback] = useState(false);

  const { data: session } = useSession();
  const searchMutation = trpc.search.searchReports.useMutation();
  const similarMutation = trpc.search.findSimilarReports.useMutation();
  const statsMutation = trpc.search.getSearchStats.useMutation();

  // Load initial insights on component mount
  useEffect(() => {
    if (session?.user?.id) {
      loadInitialInsights();
    }
  }, [session?.user?.id]);

  const loadInitialInsights = async () => {
    if (!session?.user?.id) return;

    try {
      const stats = await statsMutation.mutateAsync({
        userId: session.user.id,
      });

      setInsights({
        topPatterns: stats.topPatterns || [],
        commonIssues: stats.commonIssues || [],
        avgScore: stats.averageScore || 0,
        totalReports: stats.totalReports || 0,
      });
    } catch (error) {
      console.error("Failed to load insights:", error);
    }
  };

  const handleSearch = async () => {
    if (!searchQuery.trim() || !session?.user?.id) return;

    setIsSearching(true);
    setIsUsingFallback(false);

    try {
      const results = await searchMutation.mutateAsync({
        query: searchQuery,
        userId: session.user.id,
      });

      setSearchResults(results as SearchResult[]);

      // Check if this might be a fallback result (simple heuristic)
      if (
        results.length > 0 &&
        results.every((r: SearchResult) => r.similarity <= 0.5)
      ) {
        setIsUsingFallback(true);
      }
    } catch (error) {
      console.error("Search failed:", error);
      setSearchResults([]);

      // Show user-friendly error message for rate limiting
      if (error instanceof Error && error.message.includes("429")) {
        setIsUsingFallback(true);
        alert(
          "Using keyword search due to API limits. For semantic search, please try again in a few minutes.",
        );
      } else if (
        error instanceof Error &&
        error.message.includes("Too Many Requests")
      ) {
        alert(
          "Search service is temporarily busy. Please try again in a few moments.",
        );
      } else {
        alert("Search failed. Please try again later.");
      }
    } finally {
      setIsSearching(false);
    }
  };

  const findSimilarReports = async (reportId: string) => {
    if (!session?.user?.id) return;

    try {
      const results = await similarMutation.mutateAsync({
        reportId,
        userId: session.user.id,
      });

      setSimilarReports(results as SimilarReport[]);
      setSelectedReportId(reportId);
    } catch (error) {
      console.error("Failed to find similar reports:", error);
      setSimilarReports([]);

      // Show user-friendly error message for rate limiting
      if (error instanceof Error && error.message.includes("429")) {
        alert(
          "API rate limit reached. Please wait a moment before trying again.",
        );
      } else if (
        error instanceof Error &&
        error.message.includes("Too Many Requests")
      ) {
        alert(
          "Service is temporarily busy. Please try again in a few moments.",
        );
      } else {
        alert("Failed to find similar reports. Please try again later.");
      }
    }
  };

  const getScoreColor = (score: number) => {
    if (score >= 80) return "lime";
    if (score >= 60) return "amber";
    return "red";
  };

  const getSimilarityColor = (similarity: number) => {
    if (similarity >= 0.8) return "lime";
    if (similarity >= 0.6) return "amber";
    return "zinc";
  };

  return (
    <div className="max-w-6xl mx-auto">
      <div className="mb-8">
        <Heading>AI Insights Dashboard</Heading>
        <Text className="mt-2">
          Discover patterns, find similar reports, and get intelligent insights
          from your analysis data.
        </Text>
      </div>

      {/* Overview Cards */}
      {insights && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <div className="bg-white dark:bg-zinc-900 rounded-lg border border-zinc-950/10 dark:border-white/10 p-6">
            <div className="flex items-center">
              <ChartBarSquareIcon className="h-8 w-8 text-blue-600" />
              <div className="ml-4">
                <Text className="text-sm font-medium text-zinc-500 dark:text-zinc-400">
                  Average Score
                </Text>
                <Strong className="text-2xl">
                  {insights.avgScore.toFixed(1)}
                </Strong>
              </div>
            </div>
          </div>

          <div className="bg-white dark:bg-zinc-900 rounded-lg border border-zinc-950/10 dark:border-white/10 p-6">
            <div className="flex items-center">
              <DocumentTextIcon className="h-8 w-8 text-green-600" />
              <div className="ml-4">
                <Text className="text-sm font-medium text-zinc-500 dark:text-zinc-400">
                  Total Reports
                </Text>
                <Strong className="text-2xl">{insights.totalReports}</Strong>
              </div>
            </div>
          </div>

          <div className="bg-white dark:bg-zinc-900 rounded-lg border border-zinc-950/10 dark:border-white/10 p-6">
            <div className="flex items-center">
              <ArrowTrendingUpIcon className="h-8 w-8 text-purple-600" />
              <div className="ml-4">
                <Text className="text-sm font-medium text-zinc-500 dark:text-zinc-400">
                  Top Patterns
                </Text>
                <Strong className="text-lg">
                  {insights.topPatterns.length}
                </Strong>
              </div>
            </div>
          </div>

          <div className="bg-white dark:bg-zinc-900 rounded-lg border border-zinc-950/10 dark:border-white/10 p-6">
            <div className="flex items-center">
              <LightBulbIcon className="h-8 w-8 text-orange-600" />
              <div className="ml-4">
                <Text className="text-sm font-medium text-zinc-500 dark:text-zinc-400">
                  Common Issues
                </Text>
                <Strong className="text-lg">
                  {insights.commonIssues.length}
                </Strong>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Semantic Search */}
      <div className="bg-white dark:bg-zinc-900 rounded-lg border border-zinc-950/10 dark:border-white/10 p-6 mb-8">
        <Subheading className="mb-4">
          <SparklesIcon className="h-5 w-5 inline mr-2" />
          Semantic Search
        </Subheading>
        <Text className="mb-4 text-zinc-600 dark:text-zinc-400">
          Search through your reports using natural language. Find insights
          based on meaning, not just keywords.
        </Text>

        <div className="flex gap-3">
          <InputGroup className="flex-1">
            <Input
              placeholder="e.g., 'mobile optimisation issues' or 'conversion rate problems'"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onKeyPress={(e) => e.key === "Enter" && handleSearch()}
            />
          </InputGroup>
          <Button
            onClick={handleSearch}
            disabled={!searchQuery.trim() || isSearching}
          >
            <MagnifyingGlassIcon className="h-4 w-4 mr-2" />
            {isSearching ? "Analyzing..." : "Search"}
          </Button>
        </div>

        {/* Fallback notification */}
        {isUsingFallback && (
          <div className="mt-4 p-3 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-700 rounded-lg">
            <Text className="text-amber-800 dark:text-amber-200 text-sm">
              ⚡ Using keyword search due to API rate limits. Results may be
              less precise than semantic search.
            </Text>
          </div>
        )}

        {/* Search Results */}
        {searchResults.length > 0 && (
          <div className="mt-6">
            <Subheading className="mb-4">
              Search Results
              {isUsingFallback && (
                <Badge color="amber" size="sm" className="ml-2">
                  Keyword Search
                </Badge>
              )}
            </Subheading>
            <div className="space-y-4">
              {searchResults.map((result) => (
                <div
                  key={result.analysisId}
                  className="border border-zinc-950/10 dark:border-white/10 rounded-lg p-4 hover:bg-zinc-50 dark:hover:bg-zinc-800/50 transition-colors"
                >
                  <div className="flex items-start justify-between mb-2">
                    <div className="flex-1">
                      <Strong className="text-blue-600 dark:text-blue-400">
                        {result.websiteUrl}
                      </Strong>
                      <div className="flex items-center gap-2 mt-1">
                        {result.overallScore && (
                          <Badge color={getScoreColor(result.overallScore)}>
                            Score: {result.overallScore}
                          </Badge>
                        )}
                        <Badge color="zinc">
                          Relevance: {(result.similarity * 100).toFixed(1)}%
                        </Badge>
                        <span className="text-xs text-zinc-500 dark:text-zinc-400 flex items-center">
                          <ClockIcon className="h-3 w-3 mr-1" />
                          {new Date(result.createdAt).toLocaleDateString()}
                        </span>
                      </div>
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => findSimilarReports(result.analysisId)}
                    >
                      Find Similar
                    </Button>
                  </div>
                  <Text className="text-sm text-zinc-600 dark:text-zinc-400 mb-3">
                    {result.title}
                  </Text>

                  {/* Relevant Snippets */}
                  {result.relevantSnippets?.slice(0, 2).map((snippet, idx) => (
                    <div
                      key={idx}
                      className="text-xs bg-zinc-50 dark:bg-zinc-800 rounded p-2 mb-2"
                    >
                      <Text className="text-zinc-700 dark:text-zinc-300">
                        {snippet}
                      </Text>
                    </div>
                  ))}
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Similar Reports */}
        {similarReports.length > 0 && (
          <div className="bg-white dark:bg-zinc-900 rounded-lg border border-zinc-950/10 dark:border-white/10 p-6">
            <Subheading className="mb-4">Similar Reports</Subheading>
            <Text className="mb-4 text-zinc-600 dark:text-zinc-400">
              Reports with similar patterns and characteristics
            </Text>

            <div className="space-y-3">
              {similarReports.map((report) => (
                <div
                  key={report.analysisId}
                  className="border border-zinc-950/10 dark:border-white/10 rounded-lg p-3"
                >
                  <div className="flex items-start justify-between mb-2">
                    <Strong className="text-sm">{report.websiteUrl}</Strong>
                    <Badge
                      color={getSimilarityColor(report.similarity)}
                      size="sm"
                    >
                      {(report.similarity * 100).toFixed(1)}% similar
                    </Badge>
                  </div>
                  {report.commonTopics.length > 0 && (
                    <div className="mb-2">
                      <Text className="text-xs text-zinc-600 dark:text-zinc-400 mb-1">
                        Common Topics:
                      </Text>
                      <div className="flex flex-wrap gap-1">
                        {report.commonTopics.slice(0, 3).map((topic, idx) => (
                          <Badge key={idx} color="blue" size="sm">
                            {topic}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Pattern Recognition */}
        {insights && (
          <div className="bg-white dark:bg-zinc-900 rounded-lg border border-zinc-950/10 dark:border-white/10 p-6">
            <Subheading className="mb-4">Pattern Recognition</Subheading>

            {insights.topPatterns.length > 0 && (
              <div className="mb-6">
                <Strong className="text-sm text-zinc-700 dark:text-zinc-300 mb-2 block">
                  Top Patterns Detected
                </Strong>
                <div className="space-y-2">
                  {insights.topPatterns.map((pattern, idx) => (
                    <div key={idx} className="flex items-center">
                      <ArrowTrendingUpIcon className="h-4 w-4 text-green-600 mr-2" />
                      <Text className="text-sm">{pattern}</Text>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {insights.commonIssues.length > 0 && (
              <div>
                <Strong className="text-sm text-zinc-700 dark:text-zinc-300 mb-2 block">
                  Common Issues
                </Strong>
                <div className="space-y-2">
                  {insights.commonIssues.map((issue, idx) => (
                    <div key={idx} className="flex items-center">
                      <LightBulbIcon className="h-4 w-4 text-orange-600 mr-2" />
                      <Text className="text-sm">{issue}</Text>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {insights.topPatterns.length === 0 &&
              insights.commonIssues.length === 0 && (
                <Text className="text-zinc-500 dark:text-zinc-400 text-center py-8">
                  No patterns detected yet. Run more analyses to see insights.
                </Text>
              )}
          </div>
        )}
      </div>
    </div>
  );
}
