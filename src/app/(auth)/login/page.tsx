"use client";

import { useState, useEffect } from "react";
import { authClient, useSession } from "@/lib/auth-client";
import { useRouter } from "next/navigation";

import { Button } from "@/components/button";
import { Field, Label } from "@/components/fieldset";
import { Heading } from "@/components/heading";
import { Input } from "@/components/input";
import { Text, TextLink } from "@/components/text";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [otp, setOtp] = useState("");
  const [step, setStep] = useState<"email" | "otp">("email");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");
  const router = useRouter();
  const { data: session, isPending } = useSession();

  // Redirect to dashboard if user is already logged in
  useEffect(() => {
    if (!isPending && session) {
      // Check for stored redirect after OAuth
      const storedRedirect = sessionStorage.getItem('auth_redirect');
      if (storedRedirect) {
        console.log("🎯 Found stored redirect after OAuth:", storedRedirect);
        sessionStorage.removeItem('auth_redirect');
        router.push(storedRedirect);
      } else {
        // Default redirect to dashboard
        router.push("/dashboard");
      }
    }
  }, [session, isPending, router]);

  const handleEmailSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError("");

    try {
      await authClient.emailOtp.sendVerificationOtp({
        email,
        type: "sign-in",
      });
      setStep("otp");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to send OTP");
    } finally {
      setIsLoading(false);
    }
  };

  const handleOtpSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError("");

    try {
      const result = await authClient.signIn.emailOtp({
        email,
        otp,
      });
      
      if (result.data) {
        // Small delay to ensure session is fully established
        setTimeout(() => {
          router.push("/dashboard");
        }, 100);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Invalid OTP");
    } finally {
      setIsLoading(false);
    }
  };

  const handleResendOtp = async () => {
    setIsLoading(true);
    setError("");

    try {
      await authClient.emailOtp.sendVerificationOtp({
        email,
        type: "sign-in",
      });
      setError("");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to resend OTP");
    } finally {
      setIsLoading(false);
    }
  };

  const handleGoogleSignIn = async () => {
    console.log("Google sign-in button clicked");
    setIsLoading(true);
    setError("");
    
    try {
      // Store intended redirect in session storage
      sessionStorage.setItem('auth_redirect', '/dashboard');
      
      // Use Better Auth social sign-in method
      const result = await authClient.signIn.social({
        provider: "google",
      });
      
      console.log("Google sign-in result:", result);
      
      if (result.data && result.data.url) {
        // Redirect to Google OAuth URL
        console.log("Redirecting to Google OAuth:", result.data.url);
        window.location.href = result.data.url;
      }
    } catch (err) {
      console.error("Google sign-in error:", err);
      setError(err instanceof Error ? err.message : "Failed to sign in with Google");
      setIsLoading(false);
    }
    // Don't reset loading here since we're redirecting
  };

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

  // Don't render login form if user is authenticated (redirect will happen)
  if (session) {
    return null;
  }

  return (
    <div className="max-w-sm w-full">
      <div className="space-y-8">
        <div>
          <Heading>
            {step === "email" ? "Sign in to ConvertIQ" : "Enter verification code"}
          </Heading>
          <Text className="mt-2">
            {step === "email"
              ? "Enter your email to receive a verification code"
              : `We sent a 6-digit code to ${email}`}
          </Text>
        </div>

        {error && (
          <div className="rounded-md bg-red-50 p-4 ring-1 ring-red-200 dark:bg-red-950/30 dark:ring-red-800">
            <Text className="text-red-600 text-sm dark:text-red-400">{error}</Text>
          </div>
        )}

        {step === "email" ? (
          <form className="space-y-6" onSubmit={handleEmailSubmit}>
            <Field>
              <Label>Email address</Label>
              <Input
                id="email"
                name="email"
                type="email"
                autoComplete="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="Enter your email"
              />
            </Field>

            <Button
              type="submit"
              disabled={isLoading}
              className="w-full"
            >
              {isLoading ? "Sending..." : "Send verification code"}
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
              onClick={handleGoogleSignIn}
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
                Don&apos;t have an account?{" "}
                <TextLink href="/register">Sign up</TextLink>
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
              {isLoading ? "Verifying..." : "Verify code"}
            </Button>

            <div className="flex items-center justify-between">
              <TextLink href="#" onClick={(e) => { e.preventDefault(); setStep("email"); }}>
                ← Back to email
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