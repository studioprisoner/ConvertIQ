"use client";

import { useState } from "react";
import { useSession } from "@/lib/auth-client";

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
import { UserIcon, CameraIcon } from "@heroicons/react/24/outline";

export default function AccountPage() {
  const { data: session } = useSession();
  const user = session?.user as ExtendedUser | undefined;

  const [isEditing, setIsEditing] = useState(false);
  const [firstName, setFirstName] = useState(user?.firstName || "");
  const [lastName, setLastName] = useState(user?.lastName || "");
  const [email, setEmail] = useState(user?.email || "");
  const [isLoading, setIsLoading] = useState(false);

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
    </div>
  );
}