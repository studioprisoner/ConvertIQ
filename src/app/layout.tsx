import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "@/styles/tailwind.css";
import { TRPCProvider } from "@/lib/trpc/provider";
import { SentryErrorBoundary } from "@/components/sentry-error-boundary";
import { WebVitalsReporter } from "@/components/common/performance/web-vitals-reporter";
import { Analytics } from "@vercel/analytics/react";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "ConvertIQ - AI-Powered Conversion Optimisation for Small Businesses",
  description:
    "Empower your small business with data-driven website analysis and actionable recommendations to boost conversions and sales.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={`${geistSans.variable} ${geistMono.variable}`} suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{
          __html: `
            (function() {
              try {
                const darkMode = localStorage.getItem('darkMode') === 'true' || 
                  (!localStorage.getItem('darkMode') && window.matchMedia('(prefers-color-scheme: dark)').matches);
                if (darkMode) {
                  document.documentElement.classList.add('dark');
                }
              } catch (e) {}
            })();
          `
        }} />
      </head>
      <body className="antialiased">
        <SentryErrorBoundary>
          <TRPCProvider>
            <WebVitalsReporter />
            {children}
            <Analytics />
          </TRPCProvider>
        </SentryErrorBoundary>
      </body>
    </html>
  );
}
