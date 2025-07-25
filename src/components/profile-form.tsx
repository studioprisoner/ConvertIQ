"use client";

import { useState } from "react";
import { useSession } from "@/lib/auth-client";
import { Button } from "@/components/button";
import { Input } from "@/components/input";
import { Field, Label, Description } from "@/components/fieldset";
import { UserIcon } from "@heroicons/react/24/outline";

interface ProfileFormProps {
  onSuccess?: () => void;
}

export function ProfileForm({ onSuccess }: ProfileFormProps) {
  const { data: session, isPending } = useSession();
  const user = session?.user;
  
  const [isEditing, setIsEditing] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [name, setName] = useState(user?.name || "");
  const [email, setEmail] = useState(user?.email || "");
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  // Update local state when user data changes
  useState(() => {
    if (user) {
      setName(user.name || "");
      setEmail(user.email || "");
    }
  });

  const handleSave = async () => {
    setIsLoading(true);
    setError(null);
    setSuccess(null);

    try {
      console.log('🔄 Submitting profile update:', { name, email });
      
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
      console.log('📥 Profile update response:', data);

      if (!response.ok) {
        throw new Error(data.error || `HTTP ${response.status}: Failed to update profile`);
      }

      console.log('✅ Profile updated successfully:', data.user);
      setSuccess(`Profile updated successfully! Name: "${data.user.name}"`);
      setIsEditing(false);
      
      // Call success callback if provided
      if (onSuccess) {
        onSuccess();
      }

      // Force session refresh after a short delay
      setTimeout(() => {
        console.log('🔄 Refreshing page to update session...');
        window.location.reload();
      }, 1000);

    } catch (error) {
      console.error("❌ Profile update failed:", error);
      const errorMessage = error instanceof Error ? error.message : "Failed to update profile";
      setError(errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  const handleCancel = () => {
    // Reset to original values
    if (user) {
      setName(user.name || "");
      setEmail(user.email || "");
    }
    setIsEditing(false);
    setError(null);
    setSuccess(null);
  };

  if (isPending) {
    return (
      <div className="space-y-6">
        <div className="animate-pulse">
          <div className="h-6 bg-gray-200 dark:bg-gray-700 rounded w-1/4 mb-4"></div>
          <div className="h-10 bg-gray-200 dark:bg-gray-700 rounded mb-4"></div>
          <div className="h-10 bg-gray-200 dark:bg-gray-700 rounded mb-4"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
          Personal Information
        </h3>
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
          disabled={!isEditing || isLoading}
          placeholder="Enter your full name"
          className={isEditing ? "border-blue-300 focus:border-blue-500" : ""}
        />
        <Description>
          This is your display name shown throughout the application.
          {isEditing && (
            <span className="block text-blue-600 dark:text-blue-400 mt-1">
              Currently editing - make your changes and click Save
            </span>
          )}
        </Description>
      </Field>

      <Field>
        <Label>Email Address</Label>
        <Input
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          disabled={!isEditing || isLoading}
          placeholder="Enter your email address"
          className={isEditing ? "border-blue-300 focus:border-blue-500" : ""}
        />
        <Description>
          {isEditing 
            ? "Changing your email will require verification of the new email address."
            : "This is the email address you use to sign in to your account."
          }
        </Description>
      </Field>

      {isEditing && (
        <div className="flex gap-3 pt-4 border-t border-gray-200 dark:border-gray-700">
          <Button 
            color="blue" 
            onClick={handleSave}
            disabled={isLoading || !name.trim()}
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
          
          {/* Debug Info when editing */}
          <div className="ml-auto text-sm text-gray-500">
            <div>Current Name: "{user?.name}"</div>
            <div>New Name: "{name}"</div>
            <div>Changed: {name !== (user?.name || "") ? "Yes" : "No"}</div>
          </div>
        </div>
      )}
    </div>
  );
}