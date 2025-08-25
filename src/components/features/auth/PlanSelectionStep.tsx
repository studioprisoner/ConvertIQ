"use client";

import { useState } from "react";
import { Button } from "@/components/button";
import { Heading } from "@/components/heading";
import { Text } from "@/components/text";
import { POLAR_CONFIG, formatPrice } from "@/lib/polar-config";
import { PlanComparisonCard } from "./PlanComparisonCard";
import { BillingToggle } from "./BillingToggle";

export interface PlanSelectionData {
  planType: "basic" | "pro";
  billingCycle: "monthly" | "annual";
}

interface PlanSelectionStepProps {
  onPlanSelected: (data: PlanSelectionData) => void;
  isLoading?: boolean;
  error?: string;
}

export function PlanSelectionStep({
  onPlanSelected,
  isLoading = false,
  error,
}: PlanSelectionStepProps) {
  const [selectedPlan, setSelectedPlan] = useState<"basic" | "pro">("basic");
  const [billingCycle, setBillingCycle] = useState<"monthly" | "annual">(
    "monthly",
  );

  const handleContinue = () => {
    onPlanSelected({ planType: selectedPlan, billingCycle });
  };

  const annualDiscount = 20; // 20% discount for annual billing

  const getPrice = (planType: "basic" | "pro", cycle: "monthly" | "annual") => {
    const plan = POLAR_CONFIG.plans[planType];
    const monthlyPrice = plan.priceMonthly;

    if (cycle === "annual") {
      const annualPrice = Math.floor(
        monthlyPrice * 12 * (1 - annualDiscount / 100),
      );
      return {
        price: annualPrice,
        monthlyEquivalent: Math.floor(annualPrice / 12),
        savings: monthlyPrice * 12 - annualPrice,
      };
    }

    return { price: monthlyPrice, monthlyEquivalent: monthlyPrice, savings: 0 };
  };

  const basicPricing = getPrice("basic", billingCycle);
  const proPricing = getPrice("pro", billingCycle);

  return (
    <div className="max-w-4xl w-full mx-auto">
      <div className="text-center mb-8">
        <Heading className="text-2xl mb-2">Choose Your Plan</Heading>
        <Text className="text-lg text-gray-600 dark:text-gray-400">
          Select the plan that best fits your needs. You can always upgrade
          later.
        </Text>
      </div>

      {error && (
        <div className="rounded-md bg-red-50 p-4 ring-1 ring-red-200 dark:bg-red-950/30 dark:ring-red-800 mb-6">
          <Text className="text-red-600 text-sm dark:text-red-400">
            {error}
          </Text>
        </div>
      )}

      {/* Billing Toggle */}
      <div className="flex justify-center mb-8">
        <BillingToggle
          billingCycle={billingCycle}
          onToggle={setBillingCycle}
          annualDiscount={annualDiscount}
        />
      </div>

      {/* Plan Cards */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
        {/* Basic Plan */}
        <PlanComparisonCard
          planType="basic"
          name={POLAR_CONFIG.plans.basic.name}
          price={formatPrice(basicPricing.monthlyEquivalent)}
          billingCycle={billingCycle}
          features={POLAR_CONFIG.plans.basic.features}
          isSelected={selectedPlan === "basic"}
          onSelect={() => setSelectedPlan("basic")}
          savings={billingCycle === "annual" ? basicPricing.savings : undefined}
          description="Perfect for single website optimisation"
        />

        {/* Pro Plan */}
        <PlanComparisonCard
          planType="pro"
          name={POLAR_CONFIG.plans.pro.name}
          price={formatPrice(proPricing.monthlyEquivalent)}
          billingCycle={billingCycle}
          features={POLAR_CONFIG.plans.pro.features}
          isSelected={selectedPlan === "pro"}
          onSelect={() => setSelectedPlan("pro")}
          savings={billingCycle === "annual" ? proPricing.savings : undefined}
          description="For businesses managing multiple websites"
          recommended
        />
      </div>

      {/* Continue Button */}
      <div className="flex justify-center">
        <Button
          onClick={handleContinue}
          disabled={isLoading}
          className="w-full max-w-md bg-blue-600 hover:bg-blue-700 text-white"
          size="lg"
        >
          {isLoading
            ? "Setting up your account..."
            : `Continue with ${selectedPlan === "basic" ? "Basic" : "Pro"} Plan`}
        </Button>
      </div>

      {/* Value Proposition */}
      <div className="mt-8 text-center">
        <Text className="text-sm text-gray-500 dark:text-gray-400">
          All plans include our core AI-powered conversion analysis.
          {billingCycle === "annual" && (
            <span className="text-green-600 dark:text-green-400 font-medium">
              {" "}
              Save {annualDiscount}% with annual billing!
            </span>
          )}
        </Text>
      </div>
    </div>
  );
}
