"use client";

import { useState } from "react";
import { authClient } from "@/lib/auth-client";
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
      // First, send OTP for email verification
      await authClient.emailOtp.sendVerificationOtp({
        email: formData.email,
        type: "email-verification",
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
      
      // Clear the temporary storage
      localStorage.removeItem('registration_name');
      
      router.push("/dashboard");
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
        type: "email-verification",
      });
      setError("");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to resend verification code");
    } finally {
      setIsLoading(false);
    }
  };

  const isFormValid = formData.name.trim().length >= 2 && 
                    formData.email.trim().length > 0 && 
                    formData.email.includes("@");

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