"use client";

import { Badge } from "@/components/badge";
import { Text } from "@/components/text";
import {
  ShoppingCartIcon,
  BuildingStorefrontIcon,
  HomeIcon,
  DocumentTextIcon,
  PhoneIcon,
  CurrencyDollarIcon,
  ChartBarIcon,
  TagIcon,
} from "@heroicons/react/24/outline";

export type PageType =
  | "ecommerce-product"
  | "ecommerce-category"
  | "service-landing"
  | "corporate-homepage"
  | "about-us"
  | "contact"
  | "blog-post"
  | "landing-page"
  | "pricing"
  | "case-study"
  | "product-comparison"
  | "other";

interface PageTypeIndicatorProps {
  pageType: PageType;
  confidence?: number;
  className?: string;
  showDetails?: boolean;
}

const pageTypeConfig: Record<PageType, {
  name: string;
  icon: React.ComponentType<{ className?: string }>;
  color: "red" | "blue" | "green" | "yellow" | "purple" | "pink" | "indigo" | "gray" | "zinc";
  description: string;
}> = {
  "ecommerce-product": {
    name: "Product Page",
    icon: ShoppingCartIcon,
    color: "blue",
    description: "E-commerce product details page",
  },
  "ecommerce-category": {
    name: "Category Page",
    icon: BuildingStorefrontIcon,
    color: "indigo",
    description: "Product category or collection page",
  },
  "service-landing": {
    name: "Service Landing",
    icon: TagIcon,
    color: "green",
    description: "Service or business landing page",
  },
  "corporate-homepage": {
    name: "Homepage",
    icon: HomeIcon,
    color: "purple",
    description: "Corporate or business homepage",
  },
  "about-us": {
    name: "About Page",
    icon: DocumentTextIcon,
    color: "indigo",
    description: "Company information and about page",
  },
  "contact": {
    name: "Contact Page",
    icon: PhoneIcon,
    color: "green",
    description: "Contact information and forms",
  },
  "blog-post": {
    name: "Blog Post",
    icon: DocumentTextIcon,
    color: "gray",
    description: "Content article or blog post",
  },
  "landing-page": {
    name: "Landing Page",
    icon: TagIcon,
    color: "yellow",
    description: "Marketing or campaign landing page",
  },
  "pricing": {
    name: "Pricing Page",
    icon: CurrencyDollarIcon,
    color: "green",
    description: "Pricing and subscription information",
  },
  "case-study": {
    name: "Case Study",
    icon: ChartBarIcon,
    color: "purple",
    description: "Customer success or case study",
  },
  "product-comparison": {
    name: "Comparison",
    icon: ChartBarIcon,
    color: "blue",
    description: "Product or service comparison page",
  },
  "other": {
    name: "Other",
    icon: DocumentTextIcon,
    color: "zinc",
    description: "General webpage or unclassified",
  },
};

export default function PageTypeIndicator({
  pageType,
  confidence,
  className = "",
  showDetails = false,
}: PageTypeIndicatorProps) {
  const config = pageTypeConfig[pageType] || pageTypeConfig.other;
  const IconComponent = config.icon;

  const getConfidenceColor = (conf: number) => {
    if (conf >= 0.9) return "text-green-600 dark:text-green-400";
    if (conf >= 0.7) return "text-yellow-600 dark:text-yellow-400";
    return "text-red-600 dark:text-red-400";
  };

  const getConfidenceBadgeColor = (conf: number) => {
    if (conf >= 0.9) return "green";
    if (conf >= 0.7) return "yellow";
    return "red";
  };

  return (
    <div className={`flex items-center space-x-3 ${className}`}>
      <div className="flex items-center space-x-2">
        <IconComponent className="h-5 w-5 text-zinc-500 dark:text-zinc-400" />
        <Badge color={config.color}>{config.name}</Badge>
      </div>

      {confidence !== undefined && (
        <div className="flex items-center space-x-2">
          <Text className="text-sm text-zinc-500 dark:text-zinc-400">
            Confidence:
          </Text>
          <Badge color={getConfidenceBadgeColor(confidence)}>
            {Math.round(confidence * 100)}%
          </Badge>
        </div>
      )}

      {showDetails && (
        <Text className="text-sm text-zinc-500 dark:text-zinc-400">
          {config.description}
        </Text>
      )}
    </div>
  );
}