import { betterAuth } from "better-auth";
import { emailOTP } from "better-auth/plugins";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { google } from "better-auth/social-providers";
import { db } from "@/db/connection";
import { Resend } from "resend";
import {
  renderOtpEmail,
  OTP_EXPIRY_MINUTES,
  type OtpEmailType,
} from "@/lib/email/otp-template";

const resend = new Resend(process.env.RESEND_API_KEY || "re_placeholder");

export const auth = betterAuth({
  database: drizzleAdapter(db, {
    provider: "pg",
  }),
  user: {
    additionalFields: {
      name: {
        type: "string",
        required: true,
      },
      firstName: {
        type: "string",
        required: false,
      },
      lastName: {
        type: "string",
        required: false,
      },
      avatarUrl: {
        type: "string",
        required: false,
      },
      onboardingCompleted: {
        type: "boolean",
        required: false,
        defaultValue: false,
      },
      primaryDomain: {
        type: "string",
        required: false,
      },
    },
  },
  socialProviders: {
    google: {
      clientId: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
    },
  },
  plugins: [
    emailOTP({
      disableSignUp: false, // Allow signup through Email OTP
      autoSignIn: true, // Automatically sign in after OTP verification
      async sendVerificationOTP({ email, otp, type }) {
        try {
          const { subject, html, text } = renderOtpEmail({
            otp,
            type: type as OtpEmailType,
          });

          const result = await resend.emails.send({
            from: "ConvertIQ <hello@convertiq.cloud>",
            replyTo: "support@convertiq.cloud",
            to: email,
            subject,
            html,
            text,
          });

        } catch (error) {
          console.error('Failed to send OTP email:', error);
          throw error;
        }
      },
      otpLength: 6,
      expiresIn: OTP_EXPIRY_MINUTES * 60, // 5 minutes
      allowedAttempts: 3,
    }),
  ],
  secret: process.env.BETTER_AUTH_SECRET!,
  baseURL: process.env.BETTER_AUTH_URL || "http://localhost:3000",
  trustedOrigins: [
    process.env.NEXT_PUBLIC_URL || "http://localhost:3000",
    "http://localhost:3000",
  ],
  session: {
    expiresIn: 60 * 60 * 24 * 7, // 7 days
    updateAge: 60 * 60 * 24, // 1 day
    cookieCache: {
      enabled: true,
      maxAge: 60 * 5, // 5 minutes
    },
  },
  advanced: {
    crossSubDomainCookies: {
      enabled: false, // Keep false for localhost
    },
  },
});
