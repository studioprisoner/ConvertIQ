"use client";

import { UploadButton } from "@uploadthing/react";
import type { OurFileRouter } from "@/app/api/uploadthing/core";
import { CameraIcon } from "@heroicons/react/24/outline";

interface AvatarUploadProps {
  onUploadComplete?: (url: string) => void;
  onUploadError?: (error: Error) => void;
  disabled?: boolean;
}

export function AvatarUpload({ 
  onUploadComplete, 
  onUploadError, 
  disabled 
}: AvatarUploadProps) {
  return (
    <UploadButton<OurFileRouter, "avatarUploader">
      endpoint="avatarUploader"
      onClientUploadComplete={(res) => {
        console.log("Upload completed:", res);
        if (res?.[0]?.url) {
          onUploadComplete?.(res[0].url);
        }
      }}
      onUploadError={(error: Error) => {
        console.error("Upload error:", error);
        onUploadError?.(error);
      }}
      appearance={{
        button: `ut-ready:bg-blue-600 ut-ready:text-white ut-uploading:cursor-not-allowed ut-ready:bg-blue-600 ut-ready:text-white ut-uploading:bg-blue-600/50 bg-blue-600 text-white px-4 py-2 rounded-md text-sm font-medium inline-flex items-center gap-2 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed ${disabled ? 'opacity-50 cursor-not-allowed' : ''}`,
        allowedContent: "text-xs text-gray-500 mt-1",
      }}
      content={{
        button({ ready, isUploading }) {
          if (disabled) return "Disabled";
          if (isUploading) return "Uploading...";
          if (ready) return (
            <>
              <CameraIcon className="size-4" />
              Change Photo
            </>
          );
          return "Getting ready...";
        },
        allowedContent() {
          return "JPG, PNG, or GIF. Max 4MB.";
        },
      }}
      disabled={disabled}
    />
  );
}