"use client";

import { useState } from "react";
import { Button } from "@/components/button";
import { Field, Label } from "@/components/fieldset";
import { Heading } from "@/components/heading";
import { Input } from "@/components/input";
import { Text, TextLink } from "@/components/text";
import { OnboardingData } from "./page";

interface DomainSetupProps {
  data: OnboardingData;
  updateData: (data: Partial<OnboardingData>) => void;
  nextStep: () => void;
  setError: (error: string) => void;
  isLoading: boolean;
  setIsLoading: (loading: boolean) => void;
}

export default function DomainSetup({
  data,
  updateData,
  nextStep,
  setError,
  isLoading,
  setIsLoading
}: DomainSetupProps) {
  const [domain, setDomain] = useState(data.primaryDomain || "");
  const [validationStatus, setValidationStatus] = useState<"idle" | "validating" | "valid" | "invalid">("idle");
  const [validationMessage, setValidationMessage] = useState("");

  const validateDomain = (domainToValidate: string): boolean => {
    // Basic domain validation
    const domainPattern = /^[a-zA-Z0-9]([a-zA-Z0-9-]*[a-zA-Z0-9])?(\.[a-zA-Z0-9]([a-zA-Z0-9-]*[a-zA-Z0-9])?)*$/;
    
    if (!domainToValidate) return false;
    if (domainToValidate.length > 253) return false;
    
    // Remove protocol if present
    let cleanDomain = domainToValidate.replace(/^https?:\/\//, '').replace(/^www\./, '');
    
    // Remove trailing slash
    cleanDomain = cleanDomain.replace(/\/$/, '');
    
    // Check if it matches domain pattern
    return domainPattern.test(cleanDomain);
  };

  const handleDomainChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setDomain(value);
    
    if (value && validateDomain(value)) {
      setValidationStatus("valid");
      setValidationMessage("Domain looks valid");
    } else if (value) {
      setValidationStatus("invalid");
      setValidationMessage("Please enter a valid domain (e.g., example.com)");
    } else {
      setValidationStatus("idle");
      setValidationMessage("");
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!domain) {
      setError("Please enter your primary domain");
      return;
    }

    if (!validateDomain(domain)) {
      setError("Please enter a valid domain format");
      return;
    }

    setIsLoading(true);
    setError("");

    try {
      // Clean the domain and add https:// prefix for consistency
      let cleanDomain = domain.replace(/^https?:\/\//, '').replace(/^www\./, '').replace(/\/$/, '');
      const domainWithProtocol = `https://${cleanDomain}`;
      
      const response = await fetch('/api/auth/update-user', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify({
          primaryDomain: domainWithProtocol,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || "Failed to save primary domain");
      }

      // Update onboarding data
      updateData({ primaryDomain: domainWithProtocol });

      // Continue to next step (complete onboarding)
      nextStep();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save primary domain");
    } finally {
      setIsLoading(false);
    }
  };

  const handleSkip = () => {
    // Allow skipping but show warning
    if (confirm("You can set this up later in your account settings, but we recommend setting your primary domain now to get the most accurate recommendations. Skip anyway?")) {
      nextStep();
    }
  };

  return (
    <div className="space-y-8">
      <div className="text-center">
        <Heading className="text-3xl font-bold">Set up your primary domain</Heading>
        <Text className="mt-4 text-lg text-gray-600 dark:text-gray-300">
          Tell us about your website so we can provide personalized recommendations
        </Text>
      </div>

      <div className="bg-blue-50 dark:bg-blue-950/20 border border-blue-200 dark:border-blue-800 rounded-lg p-6">
        <div className="flex items-start">
          <svg className="h-6 w-6 text-blue-500 mr-3 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <div>
            <Text className="font-medium text-blue-900 dark:text-blue-100">
              Why do we need your domain?
            </Text>
            <Text className="mt-1 text-sm text-blue-700 dark:text-blue-200">
              Your Basic plan includes analysis for one primary website. Setting this now will pre-fill our scan form and ensure you get the most relevant recommendations for your business.
            </Text>
          </div>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        <Field>
          <Label htmlFor="domain">Primary website domain</Label>
          <div className="relative">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <span className="text-gray-500 text-sm">https://</span>
            </div>
            <Input
              id="domain"
              name="domain"
              type="text"
              value={domain}
              onChange={handleDomainChange}
              placeholder="example.com"
              className={`pl-[65px] ${
                validationStatus === "valid" ? "border-green-500 focus:border-green-500" :
                validationStatus === "invalid" ? "border-red-500 focus:border-red-500" : ""
              }`}
            />
          </div>
          {validationMessage && (
            <Text className={`text-sm mt-1 ${
              validationStatus === "valid" ? "text-green-600 dark:text-green-400" :
              validationStatus === "invalid" ? "text-red-600 dark:text-red-400" : ""
            }`}>
              {validationMessage}
            </Text>
          )}
          <Text className="text-sm text-gray-500 dark:text-gray-400 mt-1">
            Enter your website domain (https:// will be added automatically)
          </Text>
        </Field>

        <div className="flex flex-col sm:flex-row gap-3">
          <Button
            type="submit"
            disabled={isLoading || validationStatus === "invalid"}
            className="flex-1"
          >
            {isLoading ? "Saving..." : "Save and continue"}
          </Button>
          <Button
            type="button"
            variant="outline"
            onClick={handleSkip}
            disabled={isLoading}
            className="flex-1"
          >
            Skip for now
          </Button>
        </div>
      </form>

      <div className="text-center">
        <Text className="text-sm text-gray-500 dark:text-gray-400">
          You can always change your primary domain later in{" "}
          <TextLink href="/dashboard/settings">account settings</TextLink>
        </Text>
      </div>
    </div>
  );
}