import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "@/styles/tailwind.css";
import { TRPCProvider } from "@/lib/trpc/provider";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "ConvertIQ - AI-Powered Conversion Optimization for Small Businesses",
  description: "Empower your small business with data-driven website analysis and actionable recommendations to boost conversions and sales.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={`${geistSans.variable} ${geistMono.variable}`}>
      <body className="antialiased">
        <TRPCProvider>
          {children}
        </TRPCProvider>
      </body>
    </html>
  );
}
