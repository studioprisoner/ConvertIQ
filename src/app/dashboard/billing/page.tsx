"use client";

import { useState, useEffect } from "react";
import { useSession } from "@/lib/auth-client";
import { useRouter } from "next/navigation";
import { Heading, Subheading } from "@/components/heading";
import { Text } from "@/components/text";
import { Button } from "@/components/button";
import { Badge } from "@/components/badge";
import { POLAR_CONFIG, formatPrice } from "@/lib/polar-config";

type BillingCycle = "monthly" | "annual";
type SubscriptionStatus =
  | "active"
  | "trialing"
  | "past_due"
  | "canceled"
  | "incomplete";

interface UserSubscription {
  id: string;
  status: SubscriptionStatus;
  plan?: {
    name: string;
    slug: string;
  };
  billingCycle: BillingCycle;
  currentPeriodEnd: Date | null;
  cancelAtPeriodEnd?: boolean;
}

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
      "Perfect for small businesses with a single website to optimize",
    features: [
      { text: "1 domain per account", included: true },
      { text: "Unlimited scans", included: true },
      { text: "AI-powered analysis & reporting", included: true },
      { text: "Conversion optimisation insights", included: true },
      { text: "Email support", included: true },
      { text: "Historical data tracking", included: true },
      { text: "Multi-website support", included: false },
      { text: "Export reports (PDF)", included: false },
    ],
    monthlyPrice: POLAR_CONFIG.plans.basic.priceMonthly,
    yearlyPrice: POLAR_CONFIG.plans.basic.priceMonthly * 10, // 20% discount
  },
  {
    id: "pro",
    name: "Pro Plan",
    description:
      "For growing businesses managing multiple websites and domains",
    features: [
      { text: "Up to 10 domains", included: true },
      { text: "Unlimited scans", included: true },
      { text: "AI-powered analysis & reporting", included: true },
      { text: "Advanced conversion optimisation", included: true },
      { text: "Email support", included: true },
      { text: "Task management (coming soon)", included: true },
      { text: "Export reports (PDF) (coming soon)", included: true },
      { text: "API access (coming soon)", included: true },
    ],
    monthlyPrice: POLAR_CONFIG.plans.pro.priceMonthly,
    yearlyPrice: POLAR_CONFIG.plans.pro.priceMonthly * 10, // 20% discount
    popular: true,
  },
];

export default function BillingPage() {
  const [billingCycle, setBillingCycle] = useState<BillingCycle>("monthly");
  const [loading, setLoading] = useState<string | null>(null);
  const [cancelLoading, setCancelLoading] = useState(false);
  const { data: session } = useSession();
  const router = useRouter();

  // Subscription state
  const [subscription, setSubscription] = useState<UserSubscription | null>(
    null,
  );
  const [subscriptionLoading, setSubscriptionLoading] = useState(true);

  // Fetch subscription data
  useEffect(() => {
    const fetchSubscription = async () => {
      if (!session?.user) return;

      try {
        const response = await fetch("/api/subscription");
        if (response.ok) {
          const data = await response.json();
          setSubscription(data.subscription);
        }
      } catch (error) {
        console.error("Failed to fetch subscription:", error);
      } finally {
        setSubscriptionLoading(false);
      }
    };

    fetchSubscription();
  }, [session]);

  const handleSelectPlan = async (planId: "basic" | "pro") => {
    if (!session?.user) {
      router.push("/login?redirect=/dashboard/billing");
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

  const isCurrentPlan = (planId: "basic" | "pro") => {
    if (!subscription || !subscription.plan) return false;
    return (
      subscription.plan.slug === planId && subscription.status === "active"
    );
  };

  const getButtonText = (planId: "basic" | "pro") => {
    if (loading === planId) return "Processing...";
    if (isCurrentPlan(planId)) return "Current Plan";
    return "Subscribe Now";
  };

  const isButtonDisabled = (planId: "basic" | "pro") => {
    return loading === planId || isCurrentPlan(planId);
  };

  const handleCancelSubscription = async () => {
    if (!subscription || !subscription.plan) return;

    const confirmed = window.confirm(
      `Are you sure you want to cancel your ${subscription.plan.name}? You'll continue to have access until ${subscription.currentPeriodEnd ? new Date(subscription.currentPeriodEnd).toLocaleDateString() : "the end of your billing period"}.`,
    );

    if (!confirmed) return;

    setCancelLoading(true);
    try {
      const response = await fetch("/api/subscription/cancel", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        credentials: "include",
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || "Failed to cancel subscription");
      }

      const result = await response.json();

      // Update local subscription state
      setSubscription((prev) =>
        prev
          ? {
              ...prev,
              cancelAtPeriodEnd: true,
            }
          : null,
      );

      alert(
        "Your subscription has been canceled. You'll continue to have access until the end of your current billing period.",
      );
    } catch (error) {
      console.error("Cancel subscription error:", error);
      const errorMessage =
        error instanceof Error
          ? error.message
          : "Failed to cancel subscription";
      alert(`Error: ${errorMessage}. Please try again or contact support.`);
    } finally {
      setCancelLoading(false);
    }
  };

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <Heading>Billing & Subscription</Heading>
        <div className="mt-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <Text>
            Manage your subscription plan and billing preferences. Choose a plan
            that fits your business needs.
          </Text>
          {!subscriptionLoading && subscription && (
            <div className="flex items-center space-x-2">
              <Badge
                color={subscription.status === "active" ? "green" : "yellow"}
              >
                {subscription.status === "active"
                  ? "Active"
                  : subscription.status.charAt(0).toUpperCase() +
                    subscription.status.slice(1)}
              </Badge>
              {subscription.plan && (
                <Text className="text-sm font-medium">
                  {subscription.plan.name} Plan
                </Text>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Current Subscription Info */}
      {!subscriptionLoading &&
        subscription &&
        subscription.status === "active" && (
          <div className="bg-white dark:bg-zinc-900 rounded-lg border border-zinc-200 dark:border-zinc-800 p-6">
            <Subheading level={3} className="mb-4">
              Current Subscription
            </Subheading>

            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <Text className="font-medium">
                    {subscription.plan?.name} Plan
                  </Text>
                  <Text className="text-sm text-zinc-600 dark:text-zinc-400">
                    {subscription.currentPeriodEnd
                      ? `Renews on ${new Date(subscription.currentPeriodEnd).toLocaleDateString()}`
                      : "Active subscription"}
                  </Text>
                  {subscription.cancelAtPeriodEnd && (
                    <Text className="text-sm text-red-600 dark:text-red-400 mt-1">
                      ⚠️ Subscription will be canceled at the end of the current
                      billing period
                    </Text>
                  )}
                </div>
              </div>

              {subscription.cancelAtPeriodEnd && (
                <div className="bg-red-50 dark:bg-red-950/50 border border-red-200 dark:border-red-800 rounded-lg p-4">
                  <Text className="text-sm text-red-800 dark:text-red-200">
                    Your subscription has been canceled and will end on{" "}
                    {subscription.currentPeriodEnd
                      ? new Date(
                          subscription.currentPeriodEnd,
                        ).toLocaleDateString()
                      : "the end of your billing period"}
                    . You can still access all features until then.
                  </Text>
                </div>
              )}
            </div>
          </div>
        )}

      {/* Billing Toggle */}
      <div className="bg-white dark:bg-zinc-900 rounded-lg p-6">
        <div className="flex justify-center">
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
      </div>

      {/* Plans */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {plans.map((plan) => {
          const isCurrent = isCurrentPlan(plan.id);
          return (
            <div
              key={plan.id}
              className={`relative rounded-lg border p-6 ${
                isCurrent
                  ? "border-green-500 bg-green-50 dark:bg-green-950/50 shadow-lg ring-2 ring-green-200 dark:ring-green-800"
                  : plan.popular
                    ? "border-blue-500 bg-blue-50 dark:bg-blue-950/50 shadow-lg"
                    : "border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900"
              }`}
            >
              {isCurrent && (
                <div className="absolute -top-2 left-1/2 -translate-x-1/2">
                  <Badge color="green">Current Plan</Badge>
                </div>
              )}
              {!isCurrent && plan.popular && (
                <div className="absolute -top-2 left-1/2 -translate-x-1/2">
                  <Badge color="blue">Most Popular</Badge>
                </div>
              )}

              <div className="text-center">
                <Subheading
                  level={3}
                  className={
                    isCurrent
                      ? "text-green-900 dark:text-green-100"
                      : plan.popular
                        ? "text-blue-900 dark:text-blue-100"
                        : ""
                  }
                >
                  {plan.name}
                </Subheading>

                <Text
                  className={`mt-2 ${
                    isCurrent
                      ? "text-green-800 dark:text-green-200"
                      : plan.popular
                        ? "text-blue-800 dark:text-blue-200"
                        : ""
                  }`}
                >
                  {plan.description}
                </Text>

                <div className="mt-4">
                  <span
                    className={`text-3xl font-bold ${
                      isCurrent
                        ? "text-green-900 dark:text-green-100"
                        : plan.popular
                          ? "text-blue-900 dark:text-blue-100"
                          : "text-zinc-900 dark:text-white"
                    }`}
                  >
                    {formatPrice(getPrice(plan))}
                  </span>
                  <span
                    className={`text-sm ml-1 ${
                      isCurrent
                        ? "text-green-700 dark:text-green-300"
                        : plan.popular
                          ? "text-blue-700 dark:text-blue-300"
                          : "text-zinc-500 dark:text-zinc-400"
                    }`}
                  >
                    /{billingCycle === "monthly" ? "month" : "year"}
                  </span>
                </div>

                {getSavings(plan) && (
                  <p className="mt-2 text-sm text-green-600 dark:text-green-400">
                    Save {getSavings(plan)} per year
                  </p>
                )}

                <Button
                  onClick={() => handleSelectPlan(plan.id)}
                  disabled={isButtonDisabled(plan.id)}
                  className={`mt-6 w-full ${
                    isCurrent
                      ? "bg-green-600 text-white cursor-not-allowed opacity-75"
                      : plan.popular
                        ? "bg-blue-600 text-white hover:bg-blue-700"
                        : ""
                  }`}
                >
                  {getButtonText(plan.id)}
                </Button>
              </div>

              <ul
                className={`mt-6 space-y-3 text-sm ${
                  isCurrent
                    ? "text-green-800 dark:text-green-200"
                    : plan.popular
                      ? "text-blue-800 dark:text-blue-200"
                      : "text-zinc-600 dark:text-zinc-400"
                }`}
              >
                {plan.features.map((feature) => (
                  <li key={feature.text} className="flex items-start space-x-3">
                    <svg
                      className={`h-5 w-5 flex-shrink-0 mt-0.5 ${
                        feature.included
                          ? isCurrent
                            ? "text-green-600 dark:text-green-400"
                            : plan.popular
                              ? "text-blue-600 dark:text-blue-400"
                              : "text-green-500"
                          : "text-zinc-300 dark:text-zinc-600"
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
          );
        })}
      </div>

      {/* FAQ Section */}
      <div className="bg-white dark:bg-zinc-900 rounded-lg border border-zinc-200 dark:border-zinc-800 p-6">
        <Subheading level={3} className="mb-6">
          Billing FAQ
        </Subheading>

        <dl className="space-y-6">
          <div>
            <dt className="text-sm font-semibold text-zinc-900 dark:text-white">
              Can I change plans later?
            </dt>
            <dd className="mt-2 text-sm text-zinc-600 dark:text-zinc-400">
              Yes, you can upgrade or downgrade your plan at any time. Changes
              will be prorated and take effect immediately.
            </dd>
          </div>

          <div>
            <dt className="text-sm font-semibold text-zinc-900 dark:text-white">
              When will I be charged?
            </dt>
            <dd className="mt-2 text-sm text-zinc-600 dark:text-zinc-400">
              You&apos;ll be charged immediately when you select a plan. Your
              subscription starts right away, giving you instant access to all
              features.
            </dd>
          </div>

          <div>
            <dt className="text-sm font-semibold text-zinc-900 dark:text-white">
              What payment methods do you accept?
            </dt>
            <dd className="mt-2 text-sm text-zinc-600 dark:text-zinc-400">
              We accept all major credit cards and PayPal through our secure
              payment processor.
            </dd>
          </div>

          <div>
            <dt className="text-sm font-semibold text-zinc-900 dark:text-white">
              Can I cancel anytime?
            </dt>
            <dd className="mt-2 text-sm text-zinc-600 dark:text-zinc-400">
              Absolutely. You can cancel your subscription at any time. Your
              access will continue until the end of your current billing period.
            </dd>
          </div>
        </dl>
      </div>

      {/* Cancel Subscription Section */}
      {!subscriptionLoading &&
        subscription &&
        subscription.status === "active" &&
        !subscription.cancelAtPeriodEnd && (
          <div className="bg-white dark:bg-zinc-900 rounded-lg border border-red-200 dark:border-red-800 p-6">
            <Subheading
              level={3}
              className="mb-4 text-red-600 dark:text-red-400"
            >
              Cancel Subscription
            </Subheading>

            <div className="space-y-4">
              <Text className="text-sm text-zinc-600 dark:text-zinc-400">
                If you cancel your subscription, you'll continue to have access
                to all features until the end of your current billing period on{" "}
                {subscription.currentPeriodEnd
                  ? new Date(subscription.currentPeriodEnd).toLocaleDateString()
                  : "your billing period end date"}
                .
              </Text>

              <Button
                onClick={handleCancelSubscription}
                disabled={cancelLoading}
                color="red"
                className="text-white hover:bg-red-700"
              >
                {cancelLoading ? "Canceling..." : "Cancel Subscription"}
              </Button>
            </div>
          </div>
        )}
    </div>
  );
}
