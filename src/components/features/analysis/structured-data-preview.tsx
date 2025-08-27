"use client";

import { useState } from "react";
import { Badge } from "@/components/badge";
import { Text } from "@/components/text";
import { Button } from "@/components/button";
import {
  ChevronDownIcon,
  ChevronRightIcon,
  EyeIcon,
  EyeSlashIcon,
  CodeBracketIcon,
  ShoppingCartIcon,
  ChatBubbleBottomCenterTextIcon,
  ShieldCheckIcon,
  CursorArrowRaysIcon,
} from "@heroicons/react/24/outline";

interface StructuredDataPreviewProps {
  structuredData: any;
  pageType: string;
  className?: string;
  maxPreviewItems?: number;
}

export default function StructuredDataPreview({
  structuredData,
  pageType,
  className = "",
  maxPreviewItems = 3,
}: StructuredDataPreviewProps) {
  const [expandedSections, setExpandedSections] = useState<Set<string>>(new Set());
  const [showRawData, setShowRawData] = useState(false);

  if (!structuredData || Object.keys(structuredData).length === 0) {
    return (
      <div className={`p-4 bg-zinc-50 dark:bg-zinc-800 rounded-lg border border-zinc-200 dark:border-zinc-700 ${className}`}>
        <Text className="text-zinc-500 dark:text-zinc-400 text-center">
          No structured data available for this page
        </Text>
      </div>
    );
  }

  const toggleSection = (section: string) => {
    const newExpanded = new Set(expandedSections);
    if (newExpanded.has(section)) {
      newExpanded.delete(section);
    } else {
      newExpanded.add(section);
    }
    setExpandedSections(newExpanded);
  };

  const getSectionIcon = (sectionKey: string) => {
    switch (sectionKey) {
      case "product":
      case "products":
        return <ShoppingCartIcon className="h-4 w-4" />;
      case "callsToAction":
      case "ctaElements":
        return <CursorArrowRaysIcon className="h-4 w-4" />;
      case "socialProof":
      case "reviews":
      case "testimonials":
        return <ChatBubbleBottomCenterTextIcon className="h-4 w-4" />;
      case "trustSignals":
      case "securityFeatures":
        return <ShieldCheckIcon className="h-4 w-4" />;
      default:
        return <CodeBracketIcon className="h-4 w-4" />;
    }
  };

  const getSectionColor = (sectionKey: string) => {
    switch (sectionKey) {
      case "product":
      case "products":
        return "blue";
      case "callsToAction":
      case "ctaElements":
        return "green";
      case "socialProof":
      case "reviews":
      case "testimonials":
        return "purple";
      case "trustSignals":
      case "securityFeatures":
        return "indigo";
      default:
        return "zinc";
    }
  };

  const formatValue = (value: any, maxItems: number = maxPreviewItems): string => {
    if (value === null || value === undefined) return "Not found";
    
    if (typeof value === "string") {
      return value.length > 100 ? `${value.substring(0, 100)}...` : value;
    }
    
    if (typeof value === "number" || typeof value === "boolean") {
      return String(value);
    }
    
    if (Array.isArray(value)) {
      if (value.length === 0) return "None found";
      
      const preview = value.slice(0, maxItems).map(item => {
        if (typeof item === "object") {
          return item.name || item.title || item.text || JSON.stringify(item).substring(0, 50);
        }
        return String(item);
      }).join(", ");
      
      const remaining = value.length - maxItems;
      return remaining > 0 ? `${preview} (+${remaining} more)` : preview;
    }
    
    if (typeof value === "object") {
      const keys = Object.keys(value);
      if (keys.length === 0) return "No data";
      
      const preview = keys.slice(0, maxItems).map(key => {
        const val = value[key];
        return `${key}: ${formatValue(val, 1)}`;
      }).join("; ");
      
      const remaining = keys.length - maxItems;
      return remaining > 0 ? `${preview} (+${remaining} more fields)` : preview;
    }
    
    return String(value);
  };

  const getSectionSummary = (key: string, data: any) => {
    switch (key) {
      case "product":
        return `${data.name || "Product"} - ${data.price?.current || "Price not found"}`;
      case "callsToAction":
        return Array.isArray(data) ? `${data.length} CTAs found` : "CTA data available";
      case "socialProof":
        const reviewCount = data.reviews?.length || 0;
        const testimonialCount = data.testimonials?.length || 0;
        return `${reviewCount} reviews, ${testimonialCount} testimonials`;
      default:
        if (Array.isArray(data)) {
          return `${data.length} items found`;
        }
        if (typeof data === "object" && data !== null) {
          return `${Object.keys(data).length} fields available`;
        }
        return formatValue(data, 1);
    }
  };

  const mainSections = Object.entries(structuredData)
    .filter(([key, value]) => value !== null && value !== undefined)
    .sort(([a], [b]) => {
      const priority = ["product", "callsToAction", "socialProof", "conversionElements"];
      const aIndex = priority.indexOf(a);
      const bIndex = priority.indexOf(b);
      if (aIndex !== -1 && bIndex !== -1) return aIndex - bIndex;
      if (aIndex !== -1) return -1;
      if (bIndex !== -1) return 1;
      return a.localeCompare(b);
    });

  return (
    <div className={`space-y-4 ${className}`}>
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-2">
          <CodeBracketIcon className="h-5 w-5 text-zinc-500 dark:text-zinc-400" />
          <Text className="font-medium text-zinc-900 dark:text-white">
            Structured Data
          </Text>
          <Badge color="blue">{mainSections.length} sections</Badge>
        </div>
        
        <Button
          variant="outline"
          size="sm"
          onClick={() => setShowRawData(!showRawData)}
          className="text-xs"
        >
          {showRawData ? (
            <>
              <EyeSlashIcon className="h-3 w-3 mr-1" />
              Hide Raw
            </>
          ) : (
            <>
              <EyeIcon className="h-3 w-3 mr-1" />
              Show Raw
            </>
          )}
        </Button>
      </div>

      {showRawData ? (
        /* Raw JSON display */
        <div className="bg-zinc-900 text-green-400 rounded-lg p-4 text-xs font-mono overflow-x-auto">
          <pre>{JSON.stringify(structuredData, null, 2)}</pre>
        </div>
      ) : (
        /* Formatted display */
        <div className="space-y-3">
          {mainSections.map(([key, value]) => {
            const isExpanded = expandedSections.has(key);
            const sectionColor = getSectionColor(key);
            
            return (
              <div
                key={key}
                className="border border-zinc-200 dark:border-zinc-700 rounded-lg overflow-hidden"
              >
                <button
                  onClick={() => toggleSection(key)}
                  className="w-full flex items-center justify-between p-3 bg-zinc-50 dark:bg-zinc-800 hover:bg-zinc-100 dark:hover:bg-zinc-700 transition-colors"
                >
                  <div className="flex items-center space-x-3">
                    {getSectionIcon(key)}
                    <Text className="font-medium text-zinc-900 dark:text-white capitalize">
                      {key.replace(/([A-Z])/g, " $1").toLowerCase()}
                    </Text>
                    <Badge color={sectionColor as any}>
                      {Array.isArray(value) ? `${value.length} items` : "Available"}
                    </Badge>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Text className="text-xs text-zinc-500 dark:text-zinc-400 max-w-xs truncate">
                      {getSectionSummary(key, value)}
                    </Text>
                    {isExpanded ? (
                      <ChevronDownIcon className="h-4 w-4 text-zinc-500" />
                    ) : (
                      <ChevronRightIcon className="h-4 w-4 text-zinc-500" />
                    )}
                  </div>
                </button>

                {isExpanded && (
                  <div className="border-t border-zinc-200 dark:border-zinc-700 p-4 bg-white dark:bg-zinc-900">
                    <div className="space-y-2 text-sm">
                      {Array.isArray(value) ? (
                        value.slice(0, 5).map((item, index) => (
                          <div key={index} className="flex items-start space-x-2">
                            <span className="w-4 h-4 bg-blue-100 dark:bg-blue-900 text-blue-600 dark:text-blue-300 rounded-full text-xs flex items-center justify-center mt-0.5 flex-shrink-0">
                              {index + 1}
                            </span>
                            <Text className="text-zinc-600 dark:text-zinc-400 flex-1">
                              {formatValue(item, 2)}
                            </Text>
                          </div>
                        ))
                      ) : typeof value === "object" && value !== null ? (
                        Object.entries(value).slice(0, 5).map(([subKey, subValue]) => (
                          <div key={subKey} className="flex items-start justify-between">
                            <Text className="font-medium text-zinc-700 dark:text-zinc-300 capitalize min-w-0 flex-shrink-0 mr-3">
                              {subKey.replace(/([A-Z])/g, " $1").toLowerCase()}:
                            </Text>
                            <Text className="text-zinc-600 dark:text-zinc-400 text-right min-w-0">
                              {formatValue(subValue, 1)}
                            </Text>
                          </div>
                        ))
                      ) : (
                        <Text className="text-zinc-600 dark:text-zinc-400">
                          {formatValue(value)}
                        </Text>
                      )}
                      
                      {/* Show truncation indicator */}
                      {((Array.isArray(value) && value.length > 5) ||
                        (typeof value === "object" && value !== null && Object.keys(value).length > 5)) && (
                        <Text className="text-xs text-zinc-500 dark:text-zinc-400 italic">
                          ... and more items (showing first 5)
                        </Text>
                      )}
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {mainSections.length === 0 && (
        <div className="text-center py-6">
          <Text className="text-zinc-500 dark:text-zinc-400">
            No structured data sections available
          </Text>
        </div>
      )}
    </div>
  );
}