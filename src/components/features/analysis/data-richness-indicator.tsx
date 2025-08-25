"use client";

import { Badge } from "@/components/badge";
import { Text } from "@/components/text";
import { ChartBarIcon, CheckCircleIcon, ExclamationCircleIcon } from "@heroicons/react/24/outline";

interface DataRichnessIndicatorProps {
  dataRichness: number; // 0-1 scale
  totalFields?: number;
  extractedFields?: number;
  extractionVersion?: "v1" | "v2";
  className?: string;
  showDetails?: boolean;
}

export default function DataRichnessIndicator({
  dataRichness,
  totalFields,
  extractedFields,
  extractionVersion = "v1",
  className = "",
  showDetails = false,
}: DataRichnessIndicatorProps) {
  const percentage = Math.round(dataRichness * 100);
  
  const getRichnessColor = (richness: number) => {
    if (richness >= 0.8) return "text-green-600 dark:text-green-400";
    if (richness >= 0.6) return "text-yellow-600 dark:text-yellow-400";
    return "text-red-600 dark:text-red-400";
  };

  const getRichnessBadgeColor = (richness: number) => {
    if (richness >= 0.8) return "green";
    if (richness >= 0.6) return "yellow";
    return "red";
  };

  const getRichnessLabel = (richness: number) => {
    if (richness >= 0.8) return "Rich";
    if (richness >= 0.6) return "Moderate";
    if (richness >= 0.4) return "Limited";
    return "Sparse";
  };

  const getVersionBadgeColor = (version: string) => {
    return version === "v2" ? "blue" : "zinc";
  };

  return (
    <div className={`space-y-3 ${className}`}>
      {/* Header with main indicators */}
      <div className="flex items-center space-x-3">
        <div className="flex items-center space-x-2">
          <ChartBarIcon className="h-5 w-5 text-zinc-500 dark:text-zinc-400" />
          <Text className="text-sm font-medium text-zinc-700 dark:text-zinc-300">
            Data Richness:
          </Text>
        </div>
        
        <div className="flex items-center space-x-2">
          <span className={`text-lg font-semibold ${getRichnessColor(dataRichness)}`}>
            {percentage}%
          </span>
          <Badge color={getRichnessBadgeColor(dataRichness)}>
            {getRichnessLabel(dataRichness)}
          </Badge>
        </div>

        <Badge color={getVersionBadgeColor(extractionVersion)}>
          {extractionVersion.toUpperCase()} Extraction
        </Badge>
      </div>

      {/* Progress bar */}
      <div className="w-full bg-zinc-200 dark:bg-zinc-700 rounded-full h-2">
        <div
          className={`h-2 rounded-full transition-all duration-500 ${
            dataRichness >= 0.8
              ? "bg-green-500"
              : dataRichness >= 0.6
                ? "bg-yellow-500"
                : "bg-red-500"
          }`}
          style={{ width: `${percentage}%` }}
        />
      </div>

      {/* Details section */}
      {showDetails && (
        <div className="space-y-2">
          {totalFields && extractedFields && (
            <div className="flex items-center justify-between text-sm">
              <Text className="text-zinc-500 dark:text-zinc-400">
                Fields extracted:
              </Text>
              <Text className="font-medium text-zinc-900 dark:text-white">
                {extractedFields} of {totalFields}
              </Text>
            </div>
          )}

          {extractionVersion === "v2" && (
            <div className="flex items-center space-x-2">
              <CheckCircleIcon className="h-4 w-4 text-green-500" />
              <Text className="text-sm text-green-600 dark:text-green-400">
                Enhanced extraction with structured data
              </Text>
            </div>
          )}

          {extractionVersion === "v1" && (
            <div className="flex items-center space-x-2">
              <ExclamationCircleIcon className="h-4 w-4 text-yellow-500" />
              <Text className="text-sm text-yellow-600 dark:text-yellow-400">
                Legacy extraction - consider upgrading for better insights
              </Text>
            </div>
          )}

          {/* Quality indicators */}
          <div className="grid grid-cols-2 gap-2 text-xs">
            <div className="flex justify-between">
              <span className="text-zinc-500 dark:text-zinc-400">Quality:</span>
              <span className={`font-medium ${getRichnessColor(dataRichness)}`}>
                {getRichnessLabel(dataRichness)}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-zinc-500 dark:text-zinc-400">Version:</span>
              <span className="font-medium text-zinc-900 dark:text-white">
                {extractionVersion.toUpperCase()}
              </span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}