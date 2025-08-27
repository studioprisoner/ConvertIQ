"use client";

import { useState, useEffect } from "react";
import { authClient, useSession } from "@/lib/auth-client";
import { useRouter } from "next/navigation";

import { Button } from "@/components/button";
import { Field, Label } from "@/components/fieldset";
import { Heading } from "@/components/heading";
import { Input } from "@/components/input";
import { Text, TextLink } from "@/components/text";

export default function RegisterPage() {
  const [formData, setFormData] = useState({
    name: "",
    email: "",
  });
  const [otp, setOtp] = useState("");
  const [step, setStep] = useState<"form" | "otp">("form");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");
  const router = useRouter();
  const { data: session, isPending } = useSession();

  // Redirect to dashboard if user is already logged in
  useEffect(() => {
    if (!isPending && session) {
      router.push("/dashboard");
    }
  }, [session, isPending, router]);

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
      await authClient.emailOtp.sendVerificationOtp({
        email: formData.email,
        type: "sign-in",
      });
      setStep("otp");
    } catch (err) {
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
      // Store the name in localStorage temporarily
      localStorage.setItem('registration_name', formData.name);
      
      // Sign in/up using email OTP (will create user if doesn't exist)
      await authClient.signIn.emailOtp({
        email: formData.email,
        otp: otp,
      });
      
      // Update user with name field (required for our schema)
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
        throw new Error(errorData.error || "Failed to update user profile");
      }
      
      // Clear the temporary storage
      localStorage.removeItem('registration_name');
      
      router.push("/onboarding");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Registration failed. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleResendOtp = async () => {
    setIsLoading(true);
    setError("");

    try {
      await authClient.emailOtp.sendVerificationOtp({
        email: formData.email,
        type: "sign-in",
      });
      setError("");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to resend verification code");
    } finally {
      setIsLoading(false);
    }
  };

  const handleGoogleSignUp = async () => {
    console.log("Google sign-up button clicked");
    setIsLoading(true);
    setError("");
    
    try {
      // Use Better Auth social sign-in method
      const result = await authClient.signIn.social({
        provider: "google",
        redirectTo: "/onboarding",
      });
      
      console.log("Google sign-up result:", result);
      
      if (result.data) {
        // Successful sign-up, redirect will happen automatically
        console.log("Google sign-up successful");
      }
    } catch (err) {
      console.error("Google sign-up error:", err);
      setError(err instanceof Error ? err.message : "Failed to sign up with Google");
    } finally {
      setIsLoading(false);
    }
  };

  const isFormValid = formData.name.trim().length >= 2 && 
                    formData.email.trim().length > 0 && 
                    formData.email.includes("@");

  // Show loading while checking session
  if (isPending) {
    return (
      <div className="max-w-sm w-full">
        <div className="flex items-center justify-center py-12">
          <div className="animate-pulse text-gray-600">Checking authentication...</div>
        </div>
      </div>
    );
  }

  // Don't render register form if user is authenticated (redirect will happen)
  if (session) {
    return null;
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

            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <span className="w-full border-t border-gray-300 dark:border-gray-600" />
              </div>
              <div className="relative flex justify-center text-sm">
                <span className="px-2 bg-white dark:bg-gray-950 text-gray-500 dark:text-gray-400">
                  Or continue with
                </span>
              </div>
            </div>

            <Button
              type="button"
              onClick={handleGoogleSignUp}
              className="w-full bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 border border-gray-300 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-700 cursor-pointer"
            >
              <svg className="w-5 h-5 mr-2" viewBox="0 0 24 24">
                <path
                  fill="currentColor"
                  d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                />
                <path
                  fill="currentColor"
                  d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                />
                <path
                  fill="currentColor"
                  d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                />
                <path
                  fill="currentColor"
                  d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                />
              </svg>
              Continue with Google
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
                <TextLink href="/terms" className="underline">Terms of Service</TextLink>{" "}
                and{" "}
                <TextLink href="/privacy" className="underline">Privacy Policy</TextLink>
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
              {isLoading ? "Verifying..." : "Complete registration"}
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