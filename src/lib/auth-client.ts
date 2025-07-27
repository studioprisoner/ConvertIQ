import { createAuthClient } from "better-auth/react";
import { emailOTPClient } from "better-auth/client/plugins";

export const authClient = createAuthClient({
  baseURL: process.env.NEXT_PUBLIC_URL || "http://localhost:3000",
  plugins: [emailOTPClient()],
  fetchOptions: {
    credentials: 'include',
  },
});

export const {
  signIn,
  signOut,
  signUp,
  useSession,
  getSession,
} = authClient;