"use client";

import { useState } from "react";
import { Button } from "@/components/button";
import { Heading } from "@/components/heading";
import { Text } from "@/components/text";
import { OnboardingData } from "./page";

interface PlanSelectionProps {
  data: OnboardingData;
  updateData: (data: Partial<OnboardingData>) => void;
  nextStep: () => void;
  setError: (error: string) => void;
  isLoading: boolean;
  setIsLoading: (loading: boolean) => void;
}

export default function PlanSelection({
  data,
  updateData,
  nextStep,
  setError,
  isLoading,
  setIsLoading,
}: PlanSelectionProps) {
  const [selectedPlan, setSelectedPlan] = useState<"basic" | "pro" | null>(
    data.planType || null,
  );
  const [billingCycle, setBillingCycle] = useState<"monthly" | "annual">(
    data.billingCycle || "monthly",
  );

  const handlePlanSelection = async () => {
    if (!selectedPlan) {
      setError("Please select a plan to continue");
      return;
    }

    setIsLoading(true);
    setError("");

    try {
      // Store plan selection in localStorage for post-payment retrieval
      const planData = {
        planType: selectedPlan,
        billingCycle: billingCycle,
      };
      localStorage.setItem("lastPlanSelection", JSON.stringify(planData));

      const response = await fetch("/api/onboarding/plan-selection", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        credentials: "include",
        body: JSON.stringify(planData),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || "Plan selection failed");
      }

      // Update onboarding data
      updateData(planData);

      // Handle payment redirect if needed
      if (result.requiresPayment && result.checkoutUrl) {
        window.location.href = result.checkoutUrl;
        return;
      }

      // Continue to next step
      nextStep();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Plan selection failed");
    } finally {
      setIsLoading(false);
    }
  };

  const plans = [
    {
      id: "basic" as const,
      name: "Basic",
      price: billingCycle === "monthly" ? 19 : 15.2,
      originalPrice: billingCycle === "monthly" ? 19 : 19,
      features: [
        "1 website analysis",
        "Marketing improvement reports",
        "Conversion rate optimisation reports",
        "Basic recommendations",
        "Email support",
      ],
      popular: false,
    },
    {
      id: "pro" as const,
      name: "Pro",
      price: billingCycle === "monthly" ? 49 : 39.2,
      originalPrice: billingCycle === "monthly" ? 49 : 49,
      features: [
        "Unlimited website analyses",
        "Advanced AI-powered insights",
        "Competitor benchmarking",
        "Priority recommendations",
        "Custom reporting",
        "Priority support",
        "API access",
      ],
      popular: true,
    },
  ];

  return (
    <div className="space-y-8">
      <div className="text-center">
        <Heading className="text-3xl font-bold">Choose your plan</Heading>
        <Text className="mt-4 text-lg text-gray-600 dark:text-gray-300">
          Start optimizing your website conversions today
        </Text>
      </div>

      {/* Billing Toggle */}
      <div className="flex justify-center">
        <div className="bg-gray-100 dark:bg-gray-800 p-1 rounded-lg">
          <button
            onClick={() => setBillingCycle("monthly")}
            className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
              billingCycle === "monthly"
                ? "bg-white dark:bg-gray-700 text-gray-900 dark:text-white shadow-sm"
                : "text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white"
            }`}
          >
            Monthly
          </button>
          <button
            onClick={() => setBillingCycle("annual")}
            className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
              billingCycle === "annual"
                ? "bg-white dark:bg-gray-700 text-gray-900 dark:text-white shadow-sm"
                : "text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white"
            }`}
          >
            Annual
            <span className="ml-1 text-xs bg-green-100 dark:bg-green-900 text-green-600 dark:text-green-400 px-2 py-0.5 rounded-full">
              Save 20%
            </span>
          </button>
        </div>
      </div>

      {/* Plan Cards */}
      <div className="grid md:grid-cols-2 gap-6">
        {plans.map((plan) => (
          <div
            key={plan.id}
            className={`relative rounded-lg border-2 p-6 cursor-pointer transition-all ${
              selectedPlan === plan.id
                ? "border-blue-500 bg-blue-50/50 dark:bg-blue-950/20 dark:border-blue-400"
                : "border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600"
            } ${plan.popular ? "ring-2 ring-blue-500" : ""}`}
            onClick={() => setSelectedPlan(plan.id)}
          >
            {plan.popular && (
              <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                <span className="bg-blue-500 text-white px-3 py-1 rounded-full text-sm font-medium">
                  Most Popular
                </span>
              </div>
            )}

            <div className="text-center">
              <h3 className="text-xl font-bold text-gray-900 dark:text-white">
                {plan.name}
              </h3>
              <div className="mt-4">
                <span className="text-4xl font-bold text-gray-900 dark:text-white">
                  ${plan.price}
                </span>
                <span className="text-gray-600 dark:text-gray-400">
                  /{billingCycle === "monthly" ? "month" : "month"}
                </span>
                {billingCycle === "annual" && (
                  <div className="text-sm text-gray-500 dark:text-gray-400">
                    <span className="line-through">
                      ${plan.originalPrice}/month
                    </span>
                  </div>
                )}
              </div>
            </div>

            <ul className="mt-6 space-y-3">
              {plan.features.map((feature, index) => (
                <li key={index} className="flex items-center text-sm">
                  <svg
                    className="h-4 w-4 text-green-500 mr-3 flex-shrink-0"
                    fill="currentColor"
                    viewBox="0 0 20 20"
                  >
                    <path
                      fillRule="evenodd"
                      d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                      clipRule="evenodd"
                    />
                  </svg>
                  <span className="text-gray-700 dark:text-gray-300">
                    {feature}
                  </span>
                </li>
              ))}
            </ul>

            <div
              className={`mt-6 w-6 h-6 mx-auto rounded-full border-2 flex items-center justify-center ${
                selectedPlan === plan.id
                  ? "border-blue-500 bg-blue-500"
                  : "border-gray-300 dark:border-gray-600"
              }`}
            >
              {selectedPlan === plan.id && (
                <svg
                  className="w-3 h-3 text-white"
                  fill="currentColor"
                  viewBox="0 0 20 20"
                >
                  <path
                    fillRule="evenodd"
                    d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                    clipRule="evenodd"
                  />
                </svg>
              )}
            </div>
          </div>
        ))}
      </div>

      <div className="flex justify-center">
        <Button
          onClick={handlePlanSelection}
          disabled={!selectedPlan || isLoading}
          className="px-8 py-3 text-lg"
        >
          {isLoading ? "Processing..." : "Continue"}
        </Button>
      </div>

      <div className="text-center text-sm text-gray-500 dark:text-gray-400">
        <Text>
          No commitment • Cancel anytime • 14-day money-back guarantee
        </Text>
      </div>
    </div>
  );
}
