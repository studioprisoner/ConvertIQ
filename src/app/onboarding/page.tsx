"use client";

import { Suspense, useState, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import PlanSelection from "./plan-selection";
import DomainSetup from "./domain-setup";
import { authClient } from "@/lib/auth-client";

export type OnboardingStep = "plan-selection" | "domain-setup" | "complete";

export interface OnboardingData {
  planType?: "basic" | "pro";
  billingCycle?: "monthly" | "annual";
  primaryDomain?: string;
}

function OnboardingContent() {
  const [step, setStep] = useState<OnboardingStep>("plan-selection");
  const [data, setData] = useState<OnboardingData>({});
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");
  const router = useRouter();
  const searchParams = useSearchParams();

  const updateData = (newData: Partial<OnboardingData>) => {
    setData(prev => ({ ...prev, ...newData }));
  };

  // Check for payment success and determine the appropriate step
  useEffect(() => {
    const paymentSuccess = searchParams.get('payment');
    
    if (paymentSuccess === 'success') {
      // Payment was successful, need to determine what step to show next
      checkUserSubscriptionAndContinue();
    }
  }, [searchParams]);

  const checkUserSubscriptionAndContinue = async () => {
    setIsLoading(true);
    setError("");

    try {
      // Try multiple times with increasing delays to account for webhook processing
      let subscription = null;
      let attempts = 0;
      const maxAttempts = 3;

      while (attempts < maxAttempts && !subscription) {
        attempts++;
        console.log(`Attempt ${attempts} to fetch subscription...`);
        
        // Wait before each attempt (longer each time)
        await new Promise(resolve => setTimeout(resolve, attempts * 1000));

        // Fetch user's subscription to determine plan type
        const response = await fetch('/api/subscription', {
          credentials: 'include',
        });

        if (response.ok) {
          const result = await response.json();
          subscription = result.subscription;
          
          if (subscription?.plan?.slug) {
            console.log('Found subscription:', subscription);
            break;
          }
        }
      }

      if (subscription?.plan?.slug) {
        updateData({ 
          planType: subscription.plan.slug, 
          billingCycle: subscription.billingCycle 
        });

        // If Basic plan, go to domain setup; if Pro, complete onboarding
        if (subscription.plan.slug === 'basic') {
          setStep('domain-setup');
        } else {
          completeOnboarding();
        }
      } else {
        // If no subscription found after payment, there might be a webhook delay
        // For now, let's check the URL params for customer session token which indicates successful payment
        const customerSessionToken = searchParams.get('customer_session_token');
        
        if (customerSessionToken) {
          // Payment was successful, but webhook hasn't processed yet
          // We need to get the plan info from localStorage or make an educated guess
          const lastPlanSelection = localStorage.getItem('lastPlanSelection');
          
          if (lastPlanSelection) {
            const planData = JSON.parse(lastPlanSelection);
            updateData(planData);
            
            if (planData.planType === 'basic') {
              setStep('domain-setup');
            } else {
              completeOnboarding();
            }
          } else {
            // Fallback: ask user to wait and try again
            setError('Payment successful! Please wait while we process your subscription...');
            setTimeout(() => {
              window.location.reload();
            }, 3000);
          }
        } else {
          // Fallback to plan selection if we can't determine the plan
          setStep('plan-selection');
        }
      }
    } catch (error) {
      console.error('Error checking subscription:', error);
      setError('Failed to verify payment. Please contact support if this persists.');
      setStep('plan-selection');
    } finally {
      setIsLoading(false);
    }
  };

  const nextStep = () => {
    if (step === "plan-selection") {
      // If user selects Basic plan, go to domain setup
      // If user selects Pro plan, skip domain setup and complete onboarding
      if (data.planType === "basic") {
        setStep("domain-setup");
      } else {
        completeOnboarding();
      }
    } else if (step === "domain-setup") {
      completeOnboarding();
    }
  };

  const completeOnboarding = async () => {
    console.log('🎯 Starting onboarding completion...');
    setIsLoading(true);
    setError("");

    try {
      // Mark onboarding as completed
      console.log('📞 Calling complete-onboarding API...');
      const response = await fetch('/api/auth/complete-onboarding', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
      });

      console.log('📋 Complete onboarding response:', {
        ok: response.ok,
        status: response.status,
        statusText: response.statusText
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        console.error('❌ Complete onboarding failed:', errorData);
        throw new Error(errorData.error || 'Failed to complete onboarding');
      }

      const result = await response.json();
      console.log('✅ Onboarding completion successful:', result);

      // Try to refresh the session to get updated user data
      console.log('🔄 Refreshing session to get updated user data...');
      try {
        const refreshResponse = await fetch('/api/auth/refresh-session', {
          method: 'POST',
          credentials: 'include',
        });
        
        if (refreshResponse.ok) {
          const refreshResult = await refreshResponse.json();
          console.log('✅ Session refresh successful:', refreshResult);
        } else {
          console.log('⚠️ Session refresh failed, will use page reload fallback');
        }
      } catch (refreshError) {
        console.log('⚠️ Session refresh error, will use page reload fallback:', refreshError);
      }

      // Clean up localStorage and set payment completion flag
      localStorage.removeItem('lastPlanSelection');
      
      // Set flag to help feature gates handle post-payment timing
      const paymentSuccess = searchParams.get('payment');
      if (paymentSuccess === 'success') {
        // Use utility to set payment flag
        if (typeof window !== 'undefined') {
          sessionStorage.setItem('payment-completed', 'true');
          console.log('🎯 Set payment-completed flag for feature gate timing');
        }
      }
      
      console.log('🧹 Cleaned up localStorage');

      // Force a page reload to refresh the session with updated user data
      console.log('🔄 Force reloading page to refresh session data...');
      window.location.href = "/dashboard";
    } catch (err) {
      console.error('❌ Error completing onboarding:', err);
      setError(err instanceof Error ? err.message : "Failed to complete onboarding");
    } finally {
      setIsLoading(false);
    }
  };

  const renderStep = () => {
    switch (step) {
      case "plan-selection":
        return (
          <PlanSelection
            data={data}
            updateData={updateData}
            nextStep={nextStep}
            setError={setError}
            isLoading={isLoading}
            setIsLoading={setIsLoading}
          />
        );
      case "domain-setup":
        return (
          <DomainSetup
            data={data}
            updateData={updateData}
            nextStep={nextStep}
            setError={setError}
            isLoading={isLoading}
            setIsLoading={setIsLoading}
          />
        );
      default:
        return null;
    }
  };

  // Show loading state when processing payment success
  if (searchParams.get('payment') === 'success' && isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-slate-50 to-white dark:from-slate-950 dark:to-slate-900">
        <div className="container mx-auto px-4 py-12">
          <div className="max-w-2xl mx-auto text-center">
            <div className="space-y-4">
              <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-600 mx-auto"></div>
              <h2 className="text-2xl font-bold">Payment Successful!</h2>
              <p className="text-gray-600 dark:text-gray-300">
                Processing your subscription and continuing with setup...
              </p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 to-white dark:from-slate-950 dark:to-slate-900">
      <div className="container mx-auto px-4 py-12">
        <div className="max-w-2xl mx-auto">
          {error && (
            <div className="mb-6 rounded-md bg-red-50 p-4 ring-1 ring-red-200 dark:bg-red-950/30 dark:ring-red-800">
              <p className="text-red-600 text-sm dark:text-red-400">{error}</p>
            </div>
          )}
          
          {renderStep()}
        </div>
      </div>
    </div>
  );
}

// Loading component for Suspense fallback
function OnboardingLoading() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 to-white dark:from-slate-950 dark:to-slate-900">
      <div className="container mx-auto px-4 py-12">
        <div className="max-w-2xl mx-auto text-center">
          <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-600 mx-auto"></div>
          <h2 className="text-2xl font-bold mt-4">Loading...</h2>
        </div>
      </div>
    </div>
  );
}

// Main export with Suspense wrapper
export default function OnboardingPage() {
  return (
    <Suspense fallback={<OnboardingLoading />}>
      <OnboardingContent />
    </Suspense>
  );
}