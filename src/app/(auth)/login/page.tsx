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
      router.push("/dashboard");
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