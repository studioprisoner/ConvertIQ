"use client";

import { useState, useEffect } from "react";
import { authClient, useSession } from "@/lib/auth-client";
import { useRouter } from "next/navigation";
import { PlanSelectionStep, type PlanSelectionData } from "./PlanSelectionStep";
import { Button } from "@/components/button";
import { Field, Label } from "@/components/fieldset";
import { Heading } from "@/components/heading";
import { Input } from "@/components/input";
import { Text, TextLink } from "@/components/text";

type WizardStep = "form" | "otp" | "plan-selection";

interface FormData {
  name: string;
  email: string;
}

export function RegistrationWizard() {
  const [formData, setFormData] = useState<FormData>({
    name: "",
    email: "",
  });
  const [otp, setOtp] = useState("");
  // Remove unused state variable - plan data is passed directly to API
  const [step, setStep] = useState<WizardStep>("form");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");
  const router = useRouter();
  const { data: session, isLoading: sessionLoading } = useSession();

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleFormSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError("");

    try {
      // First, send OTP for sign-in/registration
      console.log('📧 Attempting to send OTP to:', formData.email);
      const result = await authClient.emailOtp.sendVerificationOtp({
        email: formData.email,
        type: "sign-in",
      });
      console.log('✅ OTP send result:', result);
      setStep("otp");
    } catch (err) {
      console.error('❌ OTP send error:', {
        error: err,
        message: err instanceof Error ? err.message : 'Unknown error',
        stack: err instanceof Error ? err.stack : 'No stack'
      });
      setError(err instanceof Error ? err.message : "Failed to send verification code");
    } finally {
      setIsLoading(false);
    }
  };

  const handleOtpSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError("");

    try {
      // Step 1: Verify OTP using direct API call
      console.log('🔑 Attempting OTP verification for:', formData.email, 'with OTP:', otp);
      
      const response = await fetch('/api/auth/email-otp/verify-otp', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify({
          email: formData.email,
          otp: otp,
        }),
      });
      
      const result = await response.json();
      console.log('🔐 OTP verification response:', { 
        ok: response.ok, 
        status: response.status, 
        data: result 
      });
      
      if (!response.ok) {
        throw new Error(result.error?.message || result.message || 'OTP verification failed');
      }
      
      console.log('✅ OTP verification successful:', result);
      
      // Check if we have a user and session
      if (result.user || result.session) {
        // Step 2: Update user with name field via API (required for our schema)
        console.log('👤 Updating user with name:', formData.name);
        const updateResponse = await fetch('/api/auth/update-user', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          credentials: 'include',
          body: JSON.stringify({
            name: formData.name,
          }),
        });
        
        if (!updateResponse.ok) {
          const errorData = await updateResponse.json().catch(() => ({}));
          console.error('❌ User update failed:', errorData);
          throw new Error(errorData.error || "Failed to update user profile");
        }
        
        const updateResult = await updateResponse.json();
        console.log('✅ User update result:', updateResult);
        
        // Clear temporary storage since we've successfully created the user
        localStorage.removeItem('registration_name');
        
        // Wait for session to be established and verify it's working
        console.log('🔄 Waiting for session to establish...');
        let sessionEstablished = false;
        let attempts = 0;
        const maxAttempts = 10;
        
        while (!sessionEstablished && attempts < maxAttempts) {
          await new Promise(resolve => setTimeout(resolve, 500));
          
          try {
            const sessionCheck = await fetch('/api/auth-check', {
              credentials: 'include',
              headers: {
                'Cache-Control': 'no-cache',
              },
            });
            const sessionData = await sessionCheck.json();
            
            console.log(`🔍 Session check attempt ${attempts + 1}:`, sessionData);
            
            if (sessionData.authenticated) {
              sessionEstablished = true;
              console.log('✅ Session established successfully!');
            }
          } catch (checkError) {
            console.warn('⚠️ Session check failed:', checkError);
          }
          
          attempts++;
        }
        
        if (sessionEstablished) {
          console.log('🎉 Redirecting to dashboard with established session');
          window.location.href = '/dashboard';
        } else {
          console.error('❌ Failed to establish session after', maxAttempts, 'attempts');
          throw new Error('Failed to establish user session');
        }
      } else {
        throw new Error("Failed to create user session");
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Registration failed. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  const handlePlanSelection = async (planData: PlanSelectionData) => {
    setIsLoading(true);
    setError("");

    console.log('🎯 Plan selection started:', {
      planData,
      session: session ? 'authenticated' : 'not authenticated',
      userId: session?.user?.id,
      userEmail: session?.user?.email
    });

    try {
      // Call the dedicated onboarding plan selection API
      console.log('🚀 Calling plan selection API...');
      const response = await fetch('/api/onboarding/plan-selection', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify({
          planType: planData.planType,
          billingCycle: planData.billingCycle,
        }),
      });

      console.log('📡 Raw API response:', {
        ok: response.ok,
        status: response.status,
        statusText: response.statusText,
        url: response.url,
        headers: Object.fromEntries(response.headers.entries())
      });

      let data;
      const responseText = await response.text();
      console.log('📄 Raw response text:', responseText);

      try {
        data = JSON.parse(responseText);
        console.log('📊 Parsed response data:', data);
      } catch (parseError) {
        console.error('❌ Failed to parse response as JSON:', parseError);
        throw new Error(`Invalid JSON response: ${responseText}`);
      }

      if (!response.ok) {
        console.error('Plan selection API error:', {
          status: response.status,
          statusText: response.statusText,
          data,
          headers: Object.fromEntries(response.headers.entries())
        });
        throw new Error(data.error || `Plan selection failed (${response.status}): ${response.statusText}`);
      }

      // Store plan selection for potential onboarding use
      localStorage.setItem('selected_plan_during_signup', planData.planType);
      localStorage.setItem('plan_selection_date', new Date().toISOString());
      
      // Clear temporary registration data
      localStorage.removeItem('registration_name');

      if (data.requiresPayment && data.checkoutUrl) {
        // Redirect to Polar checkout for paid plans
        window.location.href = data.checkoutUrl;
      } else {
        // Subscription created successfully, redirect to dashboard
        router.push("/dashboard");
      }
    } catch (err) {
      console.error('❌ Plan selection error details:', {
        error: err,
        errorMessage: err instanceof Error ? err.message : 'Unknown error',
        errorStack: err instanceof Error ? err.stack : 'No stack trace',
        errorType: typeof err,
        errorKeys: err && typeof err === 'object' ? Object.keys(err) : 'Not an object'
      });
      setError(err instanceof Error ? err.message : "Plan selection failed");
    } finally {
      setIsLoading(false);
    }
  };

  const handleResendOtp = async () => {
    setIsLoading(true);
    setError("");

    try {
      console.log('🔄 Resending OTP to:', formData.email);
      const result = await authClient.emailOtp.sendVerificationOtp({
        email: formData.email,
        type: "sign-in",
      });
      console.log('✅ OTP resend result:', result);
      setError("");
    } catch (err) {
      console.error('❌ OTP resend error:', err);
      setError(err instanceof Error ? err.message : "Failed to resend verification code");
    } finally {
      setIsLoading(false);
    }
  };

  const isFormValid = formData.name.trim().length >= 2 && 
                    formData.email.trim().length > 0 && 
                    formData.email.includes("@");

  if (step === "plan-selection") {
    // Debug session state for troubleshooting
    console.log('📊 Plan selection render - Session state:', {
      sessionLoading,
      hasSession: !!session,
      userId: session?.user?.id,
      userEmail: session?.user?.email,
      userName: session?.user?.name
    });

    // Wait for session to be established before showing plan selection
    if (sessionLoading) {
      return (
        <div className="max-w-sm w-full">
          <div className="space-y-8 text-center">
            <Heading>Setting up your account...</Heading>
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
          </div>
        </div>
      );
    }

    // If no session after loading, something went wrong
    if (!session) {
      console.error('❌ No session found after OTP verification and user update');
      setError("Authentication failed. Please try again.");
      setStep("form");
      return null;
    }

    return (
      <PlanSelectionStep
        onPlanSelected={handlePlanSelection}
        isLoading={isLoading}
        error={error}
      />
    );
  }

  return (
    <div className="max-w-sm w-full">
      <div className="space-y-8">
        <div>
          <Heading>
            {step === "form" ? "Create your account" : "Verify your email"}
          </Heading>
          <Text className="mt-2">
            {step === "form"
              ? "Join ConvertIQ to start optimizing your website conversions"
              : `We sent a 6-digit code to ${formData.email}`}
          </Text>
        </div>

        {error && (
          <div className="rounded-md bg-red-50 p-4 ring-1 ring-red-200 dark:bg-red-950/30 dark:ring-red-800">
            <Text className="text-red-600 text-sm dark:text-red-400">{error}</Text>
          </div>
        )}

        {step === "form" ? (
          <form className="space-y-6" onSubmit={handleFormSubmit}>
            <Field>
              <Label>Full name</Label>
              <Input
                id="name"
                name="name"
                type="text"
                autoComplete="name"
                required
                value={formData.name}
                onChange={handleChange}
                placeholder="Enter your full name"
              />
            </Field>

            <Field>
              <Label>Email address</Label>
              <Input
                id="email"
                name="email"
                type="email"
                autoComplete="email"
                required
                value={formData.email}
                onChange={handleChange}
                placeholder="Enter your email"
              />
            </Field>

            <Button
              type="submit"
              disabled={isLoading || !isFormValid}
              className="w-full"
            >
              {isLoading ? "Creating account..." : "Create account"}
            </Button>

            <div className="text-center">
              <Text className="text-sm">
                Already have an account?{" "}
                <TextLink href="/login">Sign in</TextLink>
              </Text>
            </div>

            <div className="text-center">
              <Text className="text-xs text-gray-500 dark:text-gray-400">
                By creating an account, you agree to our{" "}
                <TextLink href="#" className="underline">Terms of Service</TextLink>{" "}
                and{" "}
                <TextLink href="#" className="underline">Privacy Policy</TextLink>
              </Text>
            </div>
          </form>
        ) : (
          <form className="space-y-6" onSubmit={handleOtpSubmit}>
            <Field>
              <Label>Verification code</Label>
              <Input
                id="otp"
                name="otp"
                type="text"
                required
                value={otp}
                onChange={(e) =>
                  setOtp(e.target.value.replace(/\D/g, "").slice(0, 6))
                }
                placeholder="000000"
                maxLength={6}
                className="text-center text-xl tracking-widest"
              />
            </Field>

            <Button
              type="submit"
              disabled={isLoading || otp.length !== 6}
              className="w-full"
            >
              {isLoading ? "Verifying..." : "Continue to plan selection"}
            </Button>

            <div className="flex items-center justify-between">
              <TextLink href="#" onClick={(e) => { e.preventDefault(); setStep("form"); }}>
                ← Back to form
              </TextLink>
              <TextLink 
                href="#" 
                onClick={(e) => { e.preventDefault(); handleResendOtp(); }}
                className={isLoading ? "opacity-50 pointer-events-none" : ""}
              >
                Resend code
              </TextLink>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}