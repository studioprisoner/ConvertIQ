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
  firstName?: string;
  lastName?: string;
  avatarUrl?: string;
};
import { Button } from "@/components/button";
import { Input } from "@/components/input";
import { Avatar } from "@/components/avatar";
import { Heading } from "@/components/heading";
import { Divider } from "@/components/divider";
import { Field, Label, Description } from "@/components/fieldset";
import { UserIcon, CameraIcon, CreditCardIcon, ArrowTopRightOnSquareIcon } from "@heroicons/react/24/outline";
import { Badge } from "@/components/badge";

// Subscription types
type SubscriptionStatus = 'active' | 'trialing' | 'past_due' | 'canceled' | 'incomplete';
type BillingCycle = 'monthly' | 'annual';

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
  const { data: session } = useSession();
  const user = session?.user as ExtendedUser | undefined;
  const router = useRouter();

  const [isEditing, setIsEditing] = useState(false);
  const [firstName, setFirstName] = useState(user?.firstName || "");
  const [lastName, setLastName] = useState(user?.lastName || "");
  const [email, setEmail] = useState(user?.email || "");
  const [isLoading, setIsLoading] = useState(false);
  
  // Subscription state
  const [subscription, setSubscription] = useState<UserSubscription | null>(null);
  const [subscriptionLoading, setSubscriptionLoading] = useState(true);

  // Fetch subscription data
  useEffect(() => {
    const fetchSubscription = async () => {
      if (!session?.user) return;
      
      try {
        const response = await fetch('/api/subscription');
        if (response.ok) {
          const data = await response.json();
          setSubscription(data.subscription);
        }
      } catch (error) {
        console.error('Failed to fetch subscription:', error);
      } finally {
        setSubscriptionLoading(false);
      }
    };

    fetchSubscription();
  }, [session]);

  const handleSave = async () => {
    setIsLoading(true);
    try {
      const response = await fetch("/api/profile", {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          firstName,
          lastName,
          email,
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Failed to update profile");
      }

      const data = await response.json();
      console.log("Profile updated:", data);
      
      // Refresh the session to get updated user data
      window.location.reload();
      setIsEditing(false);
    } catch (error) {
      console.error("Failed to update profile:", error);
      alert("Failed to update profile. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleCancel = () => {
    setFirstName(user?.firstName || "");
    setLastName(user?.lastName || "");
    setEmail(user?.email || "");
    setIsEditing(false);
  };

  const handleAvatarChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setIsLoading(true);
    try {
      const formData = new FormData();
      formData.append("avatar", file);

      const response = await fetch("/api/profile/avatar", {
        method: "POST",
        body: formData,
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Failed to upload avatar");
      }

      const data = await response.json();
      console.log("Avatar uploaded:", data);
      
      // Refresh the session to get updated user data
      window.location.reload();
    } catch (error) {
      console.error("Failed to upload avatar:", error);
      alert("Failed to upload avatar. Please try again.");
    } finally {
      setIsLoading(false);
    }
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
      
      // Refresh the session to get updated user data
      window.location.reload();
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
            src={user?.avatarUrl || user?.image || undefined}
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
              <Button 
                color="white" 
                className="cursor-pointer"
                onClick={() => document.getElementById('avatar-upload')?.click()}
                disabled={isLoading}
              >
                <CameraIcon className="size-4" />
                Change Photo
              </Button>
              <input
                id="avatar-upload"
                type="file"
                accept="image/*"
                className="hidden"
                onChange={handleAvatarChange}
              />
              <Button 
                outline
                onClick={handleRemoveAvatar}
                disabled={isLoading}
              >
                Remove
              </Button>
            </div>
            <p className="text-sm text-gray-500">
              JPG, GIF or PNG. Max size of 5MB.
            </p>
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

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <Field>
            <Label>First Name</Label>
            <Input
              value={firstName}
              onChange={(e) => setFirstName(e.target.value)}
              disabled={!isEditing}
              placeholder="Enter your first name"
            />
          </Field>

          <Field>
            <Label>Last Name</Label>
            <Input
              value={lastName}
              onChange={(e) => setLastName(e.target.value)}
              disabled={!isEditing}
              placeholder="Enter your last name"
            />
          </Field>
        </div>

        <Field>
          <Label>Display Name</Label>
          <Input
            value={user?.name || ""}
            disabled
            placeholder="This is generated from your first and last name"
          />
          <Description>
            Your display name is automatically generated from your first and last name.
          </Description>
        </Field>

        <Field>
          <Label>Email Address</Label>
          <Input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            disabled={!isEditing}
            placeholder="Enter your email address"
          />
          <Description>
            {isEditing 
              ? "Changing your email will require verification of the new email address."
              : "This is the email address you use to sign in to your account."
            }
          </Description>
        </Field>

        {isEditing && (
          <div className="flex gap-3 pt-4">
            <Button 
              color="blue" 
              onClick={handleSave}
              disabled={isLoading}
            >
              {isLoading ? "Saving..." : "Save Changes"}
            </Button>
            <Button 
              color="white" 
              onClick={handleCancel}
              disabled={isLoading}
            >
              Cancel
            </Button>
          </div>
        )}
      </div>

      <Divider />

      {/* Account Settings Section */}
      <div className="space-y-4">
        <Heading level={2}>Account Settings</Heading>
        <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-4">
          <div className="flex items-center justify-between">
            <div>
              <h4 className="font-medium text-gray-900 dark:text-gray-100">
                Email Verification
              </h4>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                Your email is {user?.emailVerified ? "verified" : "not verified"}
              </p>
            </div>
            {!user?.emailVerified && (
              <Button outline>
                Verify Email
              </Button>
            )}
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
                  : "Unknown"
                }
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
            onClick={() => router.push('/dashboard/billing')}
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
                  {subscription.plan?.name || 'Unknown Plan'}
                  <Badge color={subscription.status === 'active' ? 'green' : 'yellow'}>
                    {subscription.status.charAt(0).toUpperCase() + subscription.status.slice(1)}
                  </Badge>
                </h4>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  {subscription.billingCycle === 'monthly' ? 'Monthly billing' : 'Annual billing'}
                  {subscription.currentPeriodEnd && (
                    <> • Next billing: {new Date(subscription.currentPeriodEnd).toLocaleDateString()}</>
                  )}
                </p>
              </div>
              <ArrowTopRightOnSquareIcon className="size-5 text-gray-400" />
            </div>
            
            {subscription.cancelAtPeriodEnd && (
              <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-md p-3">
                <p className="text-sm text-yellow-800 dark:text-yellow-200">
                  Your subscription will be canceled at the end of the current billing period.
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
                Choose a plan to start optimizing your website's conversion rate.
              </p>
              <Button 
                color="blue"
                onClick={() => router.push('/dashboard/billing')}
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