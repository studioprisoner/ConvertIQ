"use client";

import { Switch } from "@headlessui/react";
import { Text } from "@/components/text";
import { cn } from "@/lib/utils";

interface BillingToggleProps {
  billingCycle: 'monthly' | 'annual';
  onToggle: (cycle: 'monthly' | 'annual') => void;
  annualDiscount: number;
}

export function BillingToggle({ 
  billingCycle, 
  onToggle, 
  annualDiscount 
}: BillingToggleProps) {
  const isAnnual = billingCycle === 'annual';

  return (
    <div className="flex items-center space-x-4 p-4 bg-gray-50 dark:bg-gray-800 rounded-lg">
      <Text className={cn(
        "font-medium transition-colors",
        !isAnnual ? "text-gray-900 dark:text-white" : "text-gray-500 dark:text-gray-400"
      )}>
        Monthly
      </Text>
      
      <Switch
        checked={isAnnual}
        onChange={(checked) => onToggle(checked ? 'annual' : 'monthly')}
        className={cn(
          "relative inline-flex h-6 w-11 items-center rounded-full transition-colors",
          isAnnual ? "bg-blue-600" : "bg-gray-300 dark:bg-gray-600"
        )}
      >
        <span className="sr-only">Toggle billing cycle</span>
        <span
          className={cn(
            "inline-block h-4 w-4 transform rounded-full bg-white transition-transform",
            isAnnual ? "translate-x-6" : "translate-x-1"
          )}
        />
      </Switch>
      
      <div className="flex items-center space-x-2">
        <Text className={cn(
          "font-medium transition-colors",
          isAnnual ? "text-gray-900 dark:text-white" : "text-gray-500 dark:text-gray-400"
        )}>
          Annual
        </Text>
        <span className="inline-flex items-center rounded-full bg-green-100 dark:bg-green-900 px-2.5 py-0.5 text-xs font-medium text-green-800 dark:text-green-200">
          Save {annualDiscount}%
        </span>
      </div>
    </div>
  );
}