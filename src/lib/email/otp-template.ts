/**
 * Branded OTP email templates for ConvertIQ (CON-50).
 *
 * Produces mobile-responsive HTML plus a plain-text fallback for the three
 * one-time-code email types Better Auth sends via the emailOTP plugin:
 *   - "sign-in"            -> sign-in code
 *   - "email-verification" -> verify email address
 *   - "forget-password"    -> password reset code
 *
 * HTML is table-based with inline styles for maximum email-client
 * compatibility (Gmail, Outlook, Apple Mail, mobile clients).
 */

/** How long an OTP stays valid. Kept in sync with `expiresIn` in auth.ts. */
export const OTP_EXPIRY_MINUTES = 5;

/** Better Auth emailOTP `type` values. */
export type OtpEmailType = "sign-in" | "email-verification" | "forget-password";

interface OtpEmailParams {
  otp: string;
  type: OtpEmailType | string;
  /** Override the default expiry copy. Defaults to OTP_EXPIRY_MINUTES. */
  expiryMinutes?: number;
}

interface RenderedOtpEmail {
  subject: string;
  html: string;
  text: string;
}

// Brand palette (see public/brain-logo.svg and src/styles/tailwind.css).
const BRAND = {
  name: "ConvertIQ",
  tagline: "AI-Powered Conversion Optimisation",
  gradientStart: "#2865FF",
  gradientEnd: "#183C99",
  accent: "#0BE7FF",
  ink: "#18181b", // zinc-900
  body: "#3f3f46", // zinc-700
  muted: "#71717a", // zinc-500
  border: "#e4e4e7", // zinc-200
  surface: "#f4f4f5", // zinc-100
  card: "#ffffff",
};

// Emails are read in third-party clients, so assets must resolve over a public
// URL — never localhost. Default to production; allow an explicit override.
const APP_URL = (
  process.env.NEXT_PUBLIC_APP_URL ||
  process.env.NEXT_PUBLIC_URL ||
  "https://convertiq.cloud"
).replace(/\/$/, "");

// PNG (not SVG) for the logo — Gmail and several clients strip inline/img SVG.
const LOGO_URL = `${APP_URL}/brain-logo.png`;
const SUPPORT_EMAIL = "support@convertiq.cloud";

const FONT_STACK =
  "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif";

interface CopyVariant {
  subject: string;
  preheader: string;
  heading: string;
  intro: string;
  /** Short reason the recipient is receiving this email. */
  reason: string;
}

function getCopy(type: OtpEmailType | string): CopyVariant {
  switch (type) {
    case "email-verification":
      return {
        subject: "Verify your email for ConvertIQ",
        preheader: `Your ConvertIQ verification code expires in ${OTP_EXPIRY_MINUTES} minutes.`,
        heading: "Verify your email",
        intro:
          "Confirm your email address with the code below to finish setting up your ConvertIQ account.",
        reason:
          "You're receiving this because an email verification was requested for your ConvertIQ account.",
      };
    case "forget-password":
      return {
        subject: "Reset your ConvertIQ password",
        preheader: `Your ConvertIQ password reset code expires in ${OTP_EXPIRY_MINUTES} minutes.`,
        heading: "Reset your password",
        intro:
          "Use the code below to reset your ConvertIQ password and get back into your account.",
        reason:
          "You're receiving this because a password reset was requested for your ConvertIQ account.",
      };
    case "sign-in":
    default:
      return {
        subject: "Your ConvertIQ sign-in code",
        preheader: `Your ConvertIQ sign-in code expires in ${OTP_EXPIRY_MINUTES} minutes.`,
        heading: "Sign in to ConvertIQ",
        intro: "Use the code below to securely sign in to your ConvertIQ account.",
        reason:
          "You're receiving this because a sign-in was requested for your ConvertIQ account.",
      };
  }
}

/** Render the branded HTML + plain-text OTP email for a given type. */
export function renderOtpEmail({
  otp,
  type,
  expiryMinutes = OTP_EXPIRY_MINUTES,
}: OtpEmailParams): RenderedOtpEmail {
  const copy = getCopy(type);
  const year = new Date().getFullYear();

  const html = `<!DOCTYPE html>
<html lang="en" xmlns="http://www.w3.org/1999/xhtml">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <meta http-equiv="X-UA-Compatible" content="IE=edge" />
  <meta name="color-scheme" content="light only" />
  <meta name="supported-color-schemes" content="light only" />
  <title>${copy.subject}</title>
  <!--[if mso]><noscript><xml><o:OfficeDocumentSettings><o:PixelsPerInch>96</o:PixelsPerInch></o:OfficeDocumentSettings></xml></noscript><![endif]-->
</head>
<body style="margin:0; padding:0; background-color:${BRAND.surface}; -webkit-text-size-adjust:100%; -ms-text-size-adjust:100%;">
  <!-- Preheader: shown in inbox preview, hidden in body -->
  <div style="display:none; max-height:0; overflow:hidden; mso-hide:all; font-size:1px; line-height:1px; color:${BRAND.surface};">
    ${copy.preheader}&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;
  </div>

  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color:${BRAND.surface};">
    <tr>
      <td align="center" style="padding:32px 16px;">
        <table role="presentation" width="600" cellpadding="0" cellspacing="0" border="0" style="width:100%; max-width:600px; margin:0 auto;">

          <!-- Header -->
          <tr>
            <td style="background:${BRAND.gradientStart}; background:linear-gradient(135deg, ${BRAND.gradientStart} 0%, ${BRAND.gradientEnd} 100%); border-radius:16px 16px 0 0; padding:28px 32px;">
              <table role="presentation" cellpadding="0" cellspacing="0" border="0">
                <tr>
                  <td style="vertical-align:middle; padding-right:12px;">
                    <img src="${LOGO_URL}" width="42" height="28" alt="" style="display:block; border:0; outline:none; text-decoration:none; width:42px; height:28px;" />
                  </td>
                  <td style="vertical-align:middle;">
                    <span style="font-family:${FONT_STACK}; font-size:22px; font-weight:700; color:#ffffff; letter-spacing:-0.3px;">${BRAND.name}</span>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Card body -->
          <tr>
            <td style="background-color:${BRAND.card}; padding:40px 32px 32px 32px; border-left:1px solid ${BRAND.border}; border-right:1px solid ${BRAND.border};">
              <h1 style="margin:0 0 16px 0; font-family:${FONT_STACK}; font-size:24px; line-height:1.3; font-weight:700; color:${BRAND.ink};">${copy.heading}</h1>
              <p style="margin:0 0 28px 0; font-family:${FONT_STACK}; font-size:16px; line-height:1.6; color:${BRAND.body};">${copy.intro}</p>

              <!-- OTP code -->
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
                <tr>
                  <td align="center" style="background-color:${BRAND.surface}; border:1px solid ${BRAND.border}; border-radius:12px; padding:24px 16px;">
                    <div style="font-family:${FONT_STACK}; font-size:12px; font-weight:600; letter-spacing:1px; text-transform:uppercase; color:${BRAND.muted}; margin-bottom:10px;">Your verification code</div>
                    <div style="font-family:'SFMono-Regular', Consolas, 'Liberation Mono', Menlo, monospace; font-size:40px; line-height:1; font-weight:700; letter-spacing:10px; color:${BRAND.ink}; padding-left:10px;">${otp}</div>
                  </td>
                </tr>
              </table>

              <p style="margin:24px 0 0 0; font-family:${FONT_STACK}; font-size:14px; line-height:1.6; color:${BRAND.muted};">
                This code expires in <strong style="color:${BRAND.body};">${expiryMinutes} minutes</strong>. For your security, please don't share it with anyone.
              </p>
              <p style="margin:16px 0 0 0; font-family:${FONT_STACK}; font-size:14px; line-height:1.6; color:${BRAND.muted};">
                ${copy.reason} If this wasn't you, you can safely ignore this email — no changes will be made.
              </p>
            </td>
          </tr>

          <!-- Support strip -->
          <tr>
            <td style="background-color:${BRAND.card}; padding:0 32px 32px 32px; border-left:1px solid ${BRAND.border}; border-right:1px solid ${BRAND.border}; border-bottom:1px solid ${BRAND.border}; border-radius:0 0 16px 16px;">
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
                <tr><td style="border-top:1px solid ${BRAND.border}; padding-top:24px;">
                  <p style="margin:0; font-family:${FONT_STACK}; font-size:14px; line-height:1.6; color:${BRAND.muted};">
                    Need help? Contact us at <a href="mailto:${SUPPORT_EMAIL}" style="color:${BRAND.gradientStart}; text-decoration:none; font-weight:600;">${SUPPORT_EMAIL}</a>.
                  </p>
                </td></tr>
              </table>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="padding:24px 32px;">
              <p style="margin:0 0 4px 0; font-family:${FONT_STACK}; font-size:13px; line-height:1.5; color:${BRAND.muted};">
                <strong style="color:${BRAND.body};">${BRAND.name}</strong> — ${BRAND.tagline}
              </p>
              <p style="margin:0; font-family:${FONT_STACK}; font-size:12px; line-height:1.5; color:${BRAND.muted};">
                &copy; ${year} ${BRAND.name}. All rights reserved.
              </p>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;

  const text = [
    `${BRAND.name} — ${copy.heading}`,
    "",
    copy.intro,
    "",
    `Your verification code: ${otp}`,
    "",
    `This code expires in ${expiryMinutes} minutes. For your security, please don't share it with anyone.`,
    "",
    `${copy.reason} If this wasn't you, you can safely ignore this email — no changes will be made.`,
    "",
    `Need help? Contact us at ${SUPPORT_EMAIL}`,
    "",
    `${BRAND.name} — ${BRAND.tagline}`,
    `© ${year} ${BRAND.name}. All rights reserved.`,
  ].join("\n");

  return { subject: copy.subject, html, text };
}
