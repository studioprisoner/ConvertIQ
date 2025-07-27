"use client";

import { useState } from "react";
import { useSession } from "@/lib/auth-client";
import { useRouter } from "next/navigation";
import { Heading, Subheading } from "@/components/heading";
import { Text } from "@/components/text";
import { Button } from "@/components/button";
import { Badge } from "@/components/badge";
import { POLAR_CONFIG, formatPrice } from "@/lib/polar-config";

type BillingCycle = "monthly" | "annual";

interface PlanFeature {
  text: string;
  included: boolean;
}

interface Plan {
  id: "basic" | "pro";
  name: string;
  description: string;
  features: PlanFeature[];
  monthlyPrice: number;
  yearlyPrice: number;
  popular?: boolean;
}

const plans: Plan[] = [
  {
    id: "basic",
    name: "Basic Plan",
    description:
      "Perfect for small businesses getting started with conversion optimisation",
    features: [
      { text: "1 website scan per month", included: true },
      { text: "Basic conversion analysis", included: true },
      { text: "Email support", included: true },
      { text: "Standard recommendations", included: true },
      { text: "Multi-website support", included: false },
      { text: "Unlimited scans", included: false },
      { text: "Export reports (PDF)", included: false },
      { text: "Historical data tracking", included: false },
    ],
    monthlyPrice: POLAR_CONFIG.plans.basic.priceMonthly,
    yearlyPrice: POLAR_CONFIG.plans.basic.priceMonthly * 10, // 20% discount
  },
  {
    id: "pro",
    name: "Pro Plan",
    description:
      "For growing businesses that need advanced conversion optimisation",
    features: [
      { text: "Unlimited website scans", included: true },
      { text: "Advanced conversion analysis", included: true },
      { text: "Priority support", included: true },
      { text: "Custom recommendations", included: true },
      { text: "Multi-website support", included: true },
      { text: "Export reports (PDF)", included: true },
      { text: "Historical data tracking", included: true },
      { text: "API access (coming soon)", included: true },
    ],
    monthlyPrice: POLAR_CONFIG.plans.pro.priceMonthly,
    yearlyPrice: POLAR_CONFIG.plans.pro.priceMonthly * 10, // 20% discount
    popular: true,
  },
];

export default function PricingPage() {
  const [billingCycle, setBillingCycle] = useState<BillingCycle>("monthly");
  const [loading, setLoading] = useState<string | null>(null);
  const { data: session } = useSession();
  const router = useRouter();

  const handleSelectPlan = async (planId: "basic" | "pro") => {
    if (!session?.user) {
      router.push("/login?redirect=/pricing");
      return;
    }

    setLoading(planId);
    try {
      console.log("🚀 Submitting plan selection:", {
        planType: planId,
        billingCycle,
      });

      const response = await fetch("/api/subscription", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          planType: planId,
          billingCycle: billingCycle,
        }),
      });

      console.log("📡 Response status:", response.status);

      if (!response.ok) {
        const errorData = await response
          .json()
          .catch(() => ({ error: "Unknown error" }));
        console.error("❌ API Error Response:", errorData);
        throw new Error(
          errorData.error ||
            `HTTP ${response.status}: Failed to create subscription`,
        );
      }

      const result = await response.json();
      console.log("✅ API Success Response:", result);

      if (result.checkoutUrl) {
        // Redirect to Polar checkout
        console.log("🔗 Redirecting to checkout:", result.checkoutUrl);
        window.location.href = result.checkoutUrl;
      } else {
        // Plan changed/created successfully
        console.log(
          "🎉 Subscription operation successful, redirecting to dashboard",
        );
        router.push("/dashboard?success=plan-changed");
      }
    } catch (error) {
      console.error("Error selecting plan:", error);
      const errorMessage =
        error instanceof Error ? error.message : "Unknown error occurred";
      alert(`Error selecting plan: ${errorMessage}. Please try again.`);
    } finally {
      setLoading(null);
    }
  };

  const getPrice = (plan: Plan) => {
    return billingCycle === "monthly" ? plan.monthlyPrice : plan.yearlyPrice;
  };

  const getSavings = (plan: Plan) => {
    if (billingCycle === "annual") {
      const monthlyTotal = plan.monthlyPrice * 12;
      const yearlyTotal = plan.yearlyPrice;
      const savings = monthlyTotal - yearlyTotal;
      return formatPrice(savings);
    }
    return null;
  };

  return (
    <div className="bg-white dark:bg-zinc-950">
      <div className="mx-auto max-w-7xl px-6 py-24 sm:py-32 lg:px-8">
        {/* Header */}
        <div className="mx-auto max-w-4xl text-center">
          <Heading
            level={1}
            className="text-4xl font-bold tracking-tight sm:text-5xl"
          >
            Choose Your Plan
          </Heading>
          <Text className="mt-6 text-lg leading-8">
            Start optimizing your website&apos;s conversion rate today. Choose a
            plan that fits your business needs and get instant access to
            powerful insights.
          </Text>
        </div>

        {/* Billing Toggle */}
        <div className="mt-16 flex justify-center">
          <fieldset className="grid grid-cols-2 gap-x-1 rounded-full p-1 text-center text-xs font-semibold leading-5 ring-1 ring-inset ring-gray-200 dark:ring-gray-800">
            <legend className="sr-only">Payment frequency</legend>
            <label
              className={`cursor-pointer rounded-full px-2.5 py-1 ${
                billingCycle === "monthly"
                  ? "bg-blue-600 text-white"
                  : "text-gray-500 dark:text-gray-400"
              }`}
            >
              <input
                type="radio"
                name="frequency"
                value="monthly"
                className="sr-only"
                checked={billingCycle === "monthly"}
                onChange={() => setBillingCycle("monthly")}
              />
              Monthly billing
            </label>
            <label
              className={`cursor-pointer rounded-full px-2.5 py-1 ${
                billingCycle === "annual"
                  ? "bg-blue-600 text-white"
                  : "text-gray-500 dark:text-gray-400"
              }`}
            >
              <input
                type="radio"
                name="frequency"
                value="annual"
                className="sr-only"
                checked={billingCycle === "annual"}
                onChange={() => setBillingCycle("annual")}
              />
              Annual billing
            </label>
          </fieldset>
        </div>

        {billingCycle === "annual" && (
          <div className="mt-4 text-center">
            <Badge color="green">Save 20% with annual billing</Badge>
          </div>
        )}

        {/* Plans */}
        <div className="mx-auto mt-16 grid max-w-lg grid-cols-1 items-center gap-y-6 sm:mt-20 sm:gap-y-0 lg:max-w-4xl lg:grid-cols-2">
          {plans.map((plan, planIdx) => (
            <div
              key={plan.id}
              className={`${
                plan.popular
                  ? "relative bg-gray-900 dark:bg-white shadow-2xl"
                  : "bg-white dark:bg-gray-900 sm:mx-8 lg:mx-0"
              } ${
                plan.popular
                  ? ""
                  : planIdx === 0
                    ? "rounded-t-3xl sm:rounded-b-none lg:rounded-bl-3xl lg:rounded-tr-none"
                    : "sm:rounded-t-none lg:rounded-bl-none lg:rounded-tr-3xl"
              } rounded-3xl p-8 ring-1 ring-gray-900/10 dark:ring-gray-100/10 sm:p-10`}
            >
              {plan.popular && (
                <div className="absolute -top-2 left-1/2 -translate-x-1/2">
                  <Badge color="blue">Most Popular</Badge>
                </div>
              )}

              <Subheading
                level={3}
                className={plan.popular ? "text-white dark:text-gray-900" : ""}
              >
                {plan.name}
              </Subheading>

              <Text
                className={`mt-4 ${plan.popular ? "text-gray-300 dark:text-gray-600" : ""}`}
              >
                {plan.description}
              </Text>

              <p className="mt-6 flex items-baseline gap-x-1">
                <span
                  className={`text-4xl font-bold tracking-tight ${
                    plan.popular
                      ? "text-white dark:text-gray-900"
                      : "text-gray-900 dark:text-white"
                  }`}
                >
                  {formatPrice(getPrice(plan))}
                </span>
                <span
                  className={`text-sm font-semibold leading-6 ${
                    plan.popular
                      ? "text-gray-300 dark:text-gray-600"
                      : "text-gray-600 dark:text-gray-400"
                  }`}
                >
                  /{billingCycle === "monthly" ? "month" : "year"}
                </span>
              </p>

              {getSavings(plan) && (
                <p
                  className={`mt-2 text-sm ${
                    plan.popular
                      ? "text-green-300 dark:text-green-600"
                      : "text-green-600 dark:text-green-400"
                  }`}
                >
                  Save {getSavings(plan)} per year
                </p>
              )}

              <Button
                onClick={() => handleSelectPlan(plan.id)}
                disabled={loading === plan.id}
                className={`mt-6 w-full ${
                  plan.popular
                    ? "bg-white dark:bg-gray-900 text-gray-900 dark:text-white hover:bg-gray-100 dark:hover:bg-gray-800"
                    : "bg-blue-600 text-white hover:bg-blue-500"
                }`}
              >
                {loading === plan.id ? "Processing..." : "Subscribe Now"}
              </Button>

              <ul
                className={`mt-8 space-y-3 text-sm leading-6 ${
                  plan.popular
                    ? "text-gray-300 dark:text-gray-600"
                    : "text-gray-600 dark:text-gray-400"
                }`}
              >
                {plan.features.map((feature) => (
                  <li key={feature.text} className="flex gap-x-3">
                    <svg
                      className={`h-6 w-5 flex-none ${
                        feature.included
                          ? plan.popular
                            ? "text-white dark:text-gray-900"
                            : "text-blue-600 dark:text-blue-400"
                          : "text-gray-300 dark:text-gray-600"
                      }`}
                      viewBox="0 0 20 20"
                      fill="currentColor"
                      aria-hidden="true"
                    >
                      {feature.included ? (
                        <path
                          fillRule="evenodd"
                          d="M16.704 4.153a.75.75 0 01.143 1.052l-8 10.5a.75.75 0 01-1.127.075l-4.5-4.5a.75.75 0 011.06-1.06l3.894 3.893 7.48-9.817a.75.75 0 011.05-.143z"
                          clipRule="evenodd"
                        />
                      ) : (
                        <path
                          fillRule="evenodd"
                          d="M4 10a.75.75 0 01.75-.75h10.5a.75.75 0 010 1.5H4.75A.75.75 0 014 10z"
                          clipRule="evenodd"
                        />
                      )}
                    </svg>
                    <span
                      className={
                        feature.included ? "" : "line-through opacity-50"
                      }
                    >
                      {feature.text}
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        {/* FAQ Section */}
        <div className="mx-auto mt-24 max-w-4xl">
          <Subheading level={2} className="text-center">
            Frequently Asked Questions
          </Subheading>

          <dl className="mt-12 space-y-8">
            <div>
              <dt className="text-base font-semibold leading-7 text-gray-900 dark:text-white">
                Can I change plans later?
              </dt>
              <dd className="mt-2 text-base leading-7 text-gray-600 dark:text-gray-400">
                Yes, you can upgrade or downgrade your plan at any time. Changes
                will be prorated and take effect immediately.
              </dd>
            </div>

            <div>
              <dt className="text-base font-semibold leading-7 text-gray-900 dark:text-white">
                When will I be charged?
              </dt>
              <dd className="mt-2 text-base leading-7 text-gray-600 dark:text-gray-400">
                You&apos;ll be charged immediately when you select a plan. Your subscription starts right away, giving you instant access to all features.
              </dd>
            </div>

            <div>
              <dt className="text-base font-semibold leading-7 text-gray-900 dark:text-white">
                What payment methods do you accept?
              </dt>
              <dd className="mt-2 text-base leading-7 text-gray-600 dark:text-gray-400">
                We accept all major credit cards and PayPal through our secure
                payment processor.
              </dd>
            </div>

            <div>
              <dt className="text-base font-semibold leading-7 text-gray-900 dark:text-white">
                Can I cancel anytime?
              </dt>
              <dd className="mt-2 text-base leading-7 text-gray-600 dark:text-gray-400">
                Absolutely. You can cancel your subscription at any time. Your
                access will continue until the end of your current billing
                period.
              </dd>
            </div>
          </dl>
        </div>
      </div>
    </div>
  );
}
