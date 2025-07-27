import { createUploadthing, type FileRouter } from "uploadthing/next";
import { auth } from "@/lib/auth";
import { db } from "@/db/connection";
import { user } from "@/db/schema/auth";
import { eq } from "drizzle-orm";

const f = createUploadthing();

export const ourFileRouter = {
  avatarUploader: f({ image: { maxFileSize: "4MB", maxFileCount: 1 } })
    .middleware(async ({ req }) => {
      // Get session from BetterAuth
      const session = await auth.api.getSession({
        headers: req.headers,
      });

      if (!session?.user) {
        throw new Error("Unauthorized");
      }

      return { userId: session.user.id };
    })
    .onUploadComplete(async ({ metadata, file }) => {
      console.log("Upload complete for userId:", metadata.userId);
      console.log("File URL:", file.url);

      // Update user avatar URL in database
      await db
        .update(user)
        .set({ 
          avatarUrl: file.url,
          updatedAt: new Date()
        })
        .where(eq(user.id, metadata.userId));

      return { uploadedBy: metadata.userId, url: file.url };
    }),
} satisfies FileRouter;

export type OurFileRouter = typeof ourFileRouter;