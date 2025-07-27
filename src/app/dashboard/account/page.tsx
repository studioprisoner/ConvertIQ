"use client";

import { useState, useEffect } from "react";
import { useSession } from "@/lib/auth-client";
import { useRouter } from "next/navigation";

// Extended user type to include our custom fields
type ExtendedUser = {
  id: string;
  name: string;
  emailVerified: boolean;
  email: string;
  createdAt: Date;
  updatedAt: Date;
  image?: string | null;
  avatarUrl?: string;
  primaryDomain?: string;
  onboardingCompleted?: boolean;
};
import { Button } from "@/components/button";
import { Input } from "@/components/input";
import { Avatar } from "@/components/avatar";
import { Heading } from "@/components/heading";
import { Divider } from "@/components/divider";
import { Field, Label, Description } from "@/components/fieldset";
import {
  UserIcon,
  CreditCardIcon,
  ArrowTopRightOnSquareIcon,
} from "@heroicons/react/24/outline";
import { Badge } from "@/components/badge";
import { AvatarUpload } from "@/components/avatar-upload";

// Subscription types
type SubscriptionStatus =
  | "active"
  | "trialing"
  | "past_due"
  | "canceled"
  | "incomplete";
type BillingCycle = "monthly" | "annual";

interface UserSubscription {
  id: string;
  status: SubscriptionStatus;
  plan?: {
    name: string;
    slug: string;
  };
  billingCycle: BillingCycle;
  currentPeriodEnd: Date | null;
  cancelAtPeriodEnd: boolean;
}

export default function AccountPage() {
  const { data: session, isPending } = useSession();
  const user = session?.user as ExtendedUser | undefined;
  const router = useRouter();

  const [isEditing, setIsEditing] = useState(false);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [primaryDomain, setPrimaryDomain] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isDomainEditing, setIsDomainEditing] = useState(false);
  const [isDomainLoading, setIsDomainLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [currentAvatarUrl, setCurrentAvatarUrl] = useState<string | null>(null);

  // Update state when user data changes
  useEffect(() => {
    if (user) {
      setName(user.name || "");
      setEmail(user.email || "");
      setPrimaryDomain(user.primaryDomain || "");
      setCurrentAvatarUrl(user.avatarUrl || user.image || null);
    }
  }, [user]);

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
        const response = await fetch("/api/subscription", {
          credentials: "include",
        });

        if (response.ok) {
          const data = await response.json();
          console.log("Account page received subscription data:", data);
          setSubscription(data.subscription);
        } else {
          console.error("Subscription fetch failed:", response.status);
        }
      } catch (error) {
        console.error("Failed to fetch subscription:", error);
      } finally {
        setSubscriptionLoading(false);
      }
    };

    fetchSubscription();
  }, [session]);

  // Check if domain can be changed (only after next billing cycle)
  const canChangeDomain = () => {
    if (!subscription?.currentPeriodEnd) return true; // No subscription, allow change
    const nextBillingDate = new Date(subscription.currentPeriodEnd);
    const now = new Date();
    return now >= nextBillingDate;
  };

  const getNextDomainChangeDate = () => {
    if (!subscription?.currentPeriodEnd) return null;
    return new Date(subscription.currentPeriodEnd);
  };

  const handleSave = async () => {
    setIsLoading(true);
    setError(null);
    setSuccess(null);
    try {
      console.log("🔄 Submitting profile update:", {
        name: name.trim(),
        email: email.trim(),
      });
      const response = await fetch("/api/profile", {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        credentials: "include",
        body: JSON.stringify({
          name: name.trim(),
          email: email.trim(),
        }),
      });

      const data = await response.json();
      console.log("📥 Profile update response:", data);

      if (!response.ok) {
        throw new Error(
          data.error || `HTTP ${response.status}: Failed to update profile`,
        );
      }

      console.log("✅ Profile updated successfully:", data.user);
      setSuccess(
        `Profile updated successfully! Name changed to "${data.user.name}"`,
      );
      setIsEditing(false);

      // Force session refresh after showing success message
      setTimeout(() => {
        console.log("🔄 Refreshing page to update session...");
        window.location.reload();
      }, 1500);
    } catch (error) {
      console.error("❌ Profile update failed:", error);
      const errorMessage =
        error instanceof Error ? error.message : "Failed to update profile";
      setError(errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  const handleCancel = () => {
    if (user) {
      setName(user.name || "");
      setEmail(user.email || "");
    }
    setIsEditing(false);
    setError(null);
    setSuccess(null);
  };

  const handleDomainCancel = () => {
    if (user) {
      setPrimaryDomain(user.primaryDomain || "");
    }
    setIsDomainEditing(false);
  };

  const handleDomainSave = async () => {
    setIsDomainLoading(true);
    try {
      const response = await fetch("/api/profile/domain", {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          primaryDomain,
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Failed to update domain");
      }

      const data = await response.json();
      console.log("Domain updated:", data);

      // Refresh the session to get updated user data
      window.location.reload();
      setIsDomainEditing(false);
    } catch (error) {
      console.error("Failed to update domain:", error);
      alert("Failed to update domain. Please try again.");
    } finally {
      setIsDomainLoading(false);
    }
  };

  const handleAvatarUploadComplete = (url: string) => {
    console.log("Avatar uploaded successfully:", url);
    setSuccess("Profile picture updated successfully!");
    
    // Immediately update the avatar display
    setCurrentAvatarUrl(url);
    
    // Clear success message after a delay
    setTimeout(() => {
      setSuccess(null);
    }, 3000);
  };

  const handleAvatarUploadError = (error: Error) => {
    console.error("Failed to upload avatar:", error);
    setError(`Failed to upload avatar: ${error.message}`);
  };

  const handleRemoveAvatar = async () => {
    if (!confirm("Are you sure you want to remove your profile picture?")) {
      return;
    }

    setIsLoading(true);
    try {
      const response = await fetch("/api/profile/avatar", {
        method: "DELETE",
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Failed to remove avatar");
      }

      const data = await response.json();
      console.log("Avatar removed:", data);

      // Immediately update the avatar display
      setCurrentAvatarUrl(null);
      setSuccess("Profile picture removed successfully!");
      
      // Reload page to refresh session data globally after showing success
      setTimeout(() => {
        window.location.reload();
      }, 1500);
    } catch (error) {
      console.error("Failed to remove avatar:", error);
      alert("Failed to remove avatar. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto p-6 space-y-8">
      <div>
        <Heading level={1}>My Account</Heading>
        <p className="text-sm text-gray-600 dark:text-gray-400 mt-2">
          Manage your personal information and account settings.
        </p>
      </div>

      <Divider />

      {/* Profile Picture Section */}
      <div className="space-y-4">
        <Heading level={2}>Profile Picture</Heading>
        <div className="flex items-center gap-6">
          <Avatar
            src={currentAvatarUrl || undefined}
            initials={
              user?.name
                ? user.name
                    .split(" ")
                    .map((n: string) => n[0])
                    .join("")
                    .toUpperCase()
                : "U"
            }
            className="size-20"
          />
          <div className="space-y-2">
            <div className="flex gap-2">
              <AvatarUpload 
                onUploadComplete={handleAvatarUploadComplete}
                onUploadError={handleAvatarUploadError}
                disabled={isLoading}
              />
              <Button outline onClick={handleRemoveAvatar} disabled={isLoading}>
                Remove
              </Button>
            </div>
          </div>
        </div>
      </div>

      <Divider />

      {/* Personal Information Section */}
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <Heading level={2}>Personal Information</Heading>
          {!isEditing && (
            <Button color="blue" onClick={() => setIsEditing(true)}>
              <UserIcon className="size-4" />
              Edit Profile
            </Button>
          )}
        </div>

        {/* Success Message */}
        {success && (
          <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-md p-4">
            <p className="text-sm text-green-800 dark:text-green-200">
              {success}
            </p>
          </div>
        )}

        {/* Error Message */}
        {error && (
          <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-md p-4">
            <p className="text-sm text-red-800 dark:text-red-200">
              <strong>Error:</strong> {error}
            </p>
          </div>
        )}

        <Field>
          <Label>Name</Label>
          <Input
            value={name}
            onChange={(e) => setName(e.target.value)}
            disabled={!isEditing || isPending}
            placeholder={isPending ? "Loading..." : "Enter your full name"}
          />
          <Description>
            This is your display name shown throughout the application.
          </Description>
        </Field>

        <Field>
          <Label>Email Address</Label>
          <Input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            disabled={!isEditing || isPending}
            placeholder={isPending ? "Loading..." : "Enter your email address"}
          />
          <Description>
            {isEditing
              ? "Changing your email will require verification of the new email address."
              : "This is the email address you use to sign in to your account."}
          </Description>
        </Field>

        {isEditing && (
          <div className="flex gap-3 pt-4">
            <Button
              color="blue"
              onClick={handleSave}
              disabled={isLoading || !name.trim()}
            >
              {isLoading ? "Saving..." : "Save Changes"}
            </Button>
            <Button color="white" onClick={handleCancel} disabled={isLoading}>
              Cancel
            </Button>
          </div>
        )}
      </div>

      <Divider />

      {/* Account Settings Section */}
      <div className="space-y-4">
        <Heading level={2}>Account Settings</Heading>

        {/* Primary Domain Settings - Hidden for Pro users */}
        {subscription?.plan?.slug !== "pro" && (
          <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-4">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h4 className="font-medium text-gray-900 dark:text-gray-100">
                  Primary Domain
                </h4>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  {primaryDomain
                    ? `Your website: ${primaryDomain}`
                    : "No primary domain set"}
                </p>
              </div>
              {!isDomainEditing && (
                <Button
                  outline
                  onClick={() => setIsDomainEditing(true)}
                  disabled={!canChangeDomain() || subscriptionLoading}
                >
                  {canChangeDomain() ? "Change Domain" : "Locked"}
                </Button>
              )}
            </div>

            {isDomainEditing && (
              <div className="space-y-4">
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <span className="text-gray-500 text-sm">https://</span>
                  </div>
                  <Input
                    type="text"
                    value={primaryDomain?.replace(/^https?:\/\//, "") || ""}
                    onChange={(e) => {
                      const cleanDomain = e.target.value.replace(
                        /^https?:\/\//,
                        "",
                      );
                      setPrimaryDomain(
                        cleanDomain ? `https://${cleanDomain}` : "",
                      );
                    }}
                    placeholder="example.com"
                    className="pl-[65px]"
                  />
                </div>
                <div className="flex gap-3">
                  <Button
                    color="blue"
                    onClick={handleDomainSave}
                    disabled={isDomainLoading}
                  >
                    {isDomainLoading ? "Saving..." : "Save Domain"}
                  </Button>
                  <Button
                    color="white"
                    onClick={handleDomainCancel}
                    disabled={isDomainLoading}
                  >
                    Cancel
                  </Button>
                </div>
              </div>
            )}

            {!canChangeDomain() && (
              <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-md p-3 mt-3">
                <p className="text-sm text-yellow-800 dark:text-yellow-200">
                  Domain changes are restricted to prevent plan abuse. You can
                  change your domain again on{" "}
                  <span className="font-medium">
                    {getNextDomainChangeDate()?.toLocaleDateString()}
                  </span>{" "}
                  (next billing cycle).
                </p>
              </div>
            )}
          </div>
        )}

        <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-4">
          <div className="flex items-center justify-between">
            <div>
              <h4 className="font-medium text-gray-900 dark:text-gray-100">
                Email Verification
              </h4>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                Your email is{" "}
                {user?.emailVerified ? "verified" : "not verified"}
              </p>
            </div>
            {!user?.emailVerified && <Button outline>Verify Email</Button>}
          </div>
        </div>

        <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-4">
          <div className="flex items-center justify-between">
            <div>
              <h4 className="font-medium text-gray-900 dark:text-gray-100">
                Account Created
              </h4>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                {user?.createdAt
                  ? new Date(user.createdAt).toLocaleDateString()
                  : "Unknown"}
              </p>
            </div>
          </div>
        </div>
      </div>

      <Divider />

      {/* Subscription Section */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <Heading level={2}>Subscription</Heading>
          <Button
            color="blue"
            onClick={() => router.push("/dashboard/billing")}
          >
            <CreditCardIcon className="size-4" />
            Manage Plan
          </Button>
        </div>

        {subscriptionLoading ? (
          <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-4">
            <div className="animate-pulse">
              <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-1/4 mb-2"></div>
              <div className="h-3 bg-gray-200 dark:bg-gray-700 rounded w-1/2"></div>
            </div>
          </div>
        ) : subscription ? (
          <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-4">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h4 className="font-medium text-gray-900 dark:text-gray-100 flex items-center gap-2">
                  {subscription.plan?.name || "Unknown Plan"}
                  <Badge
                    color={
                      subscription.status === "active" ? "green" : "yellow"
                    }
                  >
                    {subscription.status.charAt(0).toUpperCase() +
                      subscription.status.slice(1)}
                  </Badge>
                </h4>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  {subscription.billingCycle === "monthly"
                    ? "Monthly billing"
                    : "Annual billing"}
                  {subscription.currentPeriodEnd && (
                    <>
                      {" "}
                      • Next billing:{" "}
                      {new Date(
                        subscription.currentPeriodEnd,
                      ).toLocaleDateString()}
                    </>
                  )}
                </p>
              </div>
              <ArrowTopRightOnSquareIcon className="size-5 text-gray-400" />
            </div>

            {subscription.cancelAtPeriodEnd && (
              <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-md p-3">
                <p className="text-sm text-yellow-800 dark:text-yellow-200">
                  Your subscription will be canceled at the end of the current
                  billing period.
                </p>
              </div>
            )}
          </div>
        ) : (
          <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-4">
            <div className="text-center py-6">
              <CreditCardIcon className="size-12 text-gray-400 mx-auto mb-4" />
              <h4 className="font-medium text-gray-900 dark:text-gray-100 mb-2">
                No Active Subscription
              </h4>
              <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
                Choose a plan to start optimizing your website's conversion
                rate.
              </p>
              <Button
                color="blue"
                onClick={() => router.push("/dashboard/billing")}
              >
                View Plans
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
