import { betterAuth } from "better-auth";
import { emailOTP } from "better-auth/plugins";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { db } from "@/db/connection";
import { Resend } from "resend";

const resend = new Resend(process.env.RESEND_API_KEY || "re_placeholder");

export const auth = betterAuth({
  database: drizzleAdapter(db, {
    provider: "pg",
  }),
  emailAndPassword: {
    enabled: true,
    requireEmailVerification: true,
  },
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
  plugins: [
    emailOTP({
      disableSignUp: false, // Allow signup through Email OTP
      autoSignIn: true, // Automatically sign in after OTP verification
      async sendVerificationOTP({ email, otp, type }) {
        const subject = 
          type === "sign-in" ? "Sign in to ConvertIQ" :
          type === "email-verification" ? "Verify your email" :
          "Reset your password";

        const htmlContent = `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <h2 style="color: #2563eb;">ConvertIQ</h2>
            <p>Hello!</p>
            <p>Your verification code is:</p>
            <div style="background-color: #f3f4f6; padding: 20px; border-radius: 8px; text-align: center; margin: 20px 0;">
              <h1 style="color: #1f2937; font-size: 32px; margin: 0; letter-spacing: 4px;">${otp}</h1>
            </div>
            <p>This code will expire in 5 minutes.</p>
            <p>If you didn't request this code, please ignore this email.</p>
            <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 20px 0;">
            <p style="color: #6b7280; font-size: 14px;">ConvertIQ - AI-Powered Conversion Optimization</p>
          </div>
        `;

        await resend.emails.send({
          from: "ConvertIQ <noreply@convertiq.cloud>", // Using your verified domain
          to: email,
          subject,
          html: htmlContent,
        });
      },
      otpLength: 6,
      expiresIn: 300, // 5 minutes
      allowedAttempts: 3,
    }),
  ],
  secret: process.env.BETTER_AUTH_SECRET!,
  baseURL: process.env.BETTER_AUTH_URL || "http://localhost:3000",
  trustedOrigins: [
    process.env.NEXT_PUBLIC_URL || "http://localhost:3000",
    "http://localhost:3000"
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