"use client";

import { Check } from "lucide-react";
import { Button } from "@/components/button";
import { Text } from "@/components/text";
import { formatPrice } from "@/lib/polar-config";
import { cn } from "@/lib/utils";

interface PlanComparisonCardProps {
  planType: 'basic' | 'pro';
  name: string;
  price: string;
  billingCycle: 'monthly' | 'annual';
  features: string[];
  isSelected: boolean;
  onSelect: () => void;
  savings?: number;
  description?: string;
  recommended?: boolean;
}

export function PlanComparisonCard({
  planType,
  name,
  price,
  billingCycle,
  features,
  isSelected,
  onSelect,
  savings,
  description,
  recommended = false,
}: PlanComparisonCardProps) {
  return (
    <div 
      className={cn(
        "relative rounded-lg border-2 p-6 cursor-pointer transition-all duration-200",
        isSelected 
          ? "border-blue-500 bg-blue-50 dark:bg-blue-950/20 shadow-lg" 
          : "border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600",
        recommended && "ring-2 ring-blue-500 ring-offset-2"
      )}
      onClick={onSelect}
    >
      {/* Recommended Badge */}
      {recommended && (
        <div className="absolute -top-3 left-1/2 -translate-x-1/2">
          <span className="bg-blue-500 text-white text-xs font-medium px-3 py-1 rounded-full">
            Most Popular
          </span>
        </div>
      )}

      {/* Plan Header */}
      <div className="text-center mb-6">
        <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">
          {name}
        </h3>
        {description && (
          <Text className="text-sm text-gray-500 dark:text-gray-400 mb-4">
            {description}
          </Text>
        )}
        
        {/* Pricing */}
        <div className="mb-4">
          <div className="text-3xl font-bold text-gray-900 dark:text-white">
            {price}
            <span className="text-sm font-normal text-gray-500 dark:text-gray-400">
              {billingCycle === 'annual' ? '/month' : '/month'}
            </span>
          </div>
          
          {billingCycle === 'annual' && (
            <div className="text-xs text-gray-500 dark:text-gray-400 mt-1">
              Billed annually
            </div>
          )}
          
          {savings && savings > 0 && (
            <div className="text-sm text-green-600 dark:text-green-400 font-medium mt-2">
              Save {formatPrice(savings)} per year
            </div>
          )}
        </div>
      </div>

      {/* Features List */}
      <div className="space-y-3 mb-6">
        {features.map((feature, index) => (
          <div key={index} className="flex items-start space-x-3">
            <Check className="w-5 h-5 text-green-500 mt-0.5 flex-shrink-0" />
            <Text className="text-sm text-gray-700 dark:text-gray-300">
              {feature}
            </Text>
          </div>
        ))}
      </div>

      {/* Selection Button */}
      <Button
        variant={isSelected ? "solid" : "outline"}
        className={cn(
          "w-full transition-colors",
          isSelected 
            ? "bg-blue-600 hover:bg-blue-700 text-white" 
            : "border-gray-300 hover:border-blue-500 hover:text-blue-600"
        )}
        onClick={(e) => {
          e.stopPropagation();
          onSelect();
        }}
      >
        {isSelected ? "Selected" : `Choose ${planType === 'basic' ? 'Basic' : 'Pro'}`}
      </Button>

      {/* Plan Type Specific Benefits */}
      {planType === 'basic' && (
        <div className="mt-4 p-3 bg-gray-50 dark:bg-gray-800 rounded-md">
          <Text className="text-xs text-gray-600 dark:text-gray-400 text-center">
            Perfect for getting started with conversion optimization
          </Text>
        </div>
      )}

      {planType === 'pro' && (
        <div className="mt-4 p-3 bg-gradient-to-r from-blue-50 to-purple-50 dark:from-blue-950/20 dark:to-purple-950/20 rounded-md">
          <Text className="text-xs text-gray-600 dark:text-gray-400 text-center">
            Everything you need to scale your optimization efforts
          </Text>
        </div>
      )}
    </div>
  );
}