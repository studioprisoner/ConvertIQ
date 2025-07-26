"use client";

import { motion } from "framer-motion";
import { CompanyIcon } from "@/components/company-logo";

interface ChangelogEntry {
  version: string;
  date: string;
  type: "feature" | "improvement" | "fix" | "security";
  title: string;
  description: string;
  items?: string[];
}

const changelog: ChangelogEntry[] = [
  {
    version: "1.4.0",
    date: "2025-01-26",
    type: "feature",
    title: "Subscription Management",
    description: "You can now easily manage your subscription and cancel anytime while keeping access until your billing period ends.",
    items: [
      "Cancel your subscription directly from the billing page",
      "Keep full access to all features until your billing period expires",
      "Clear messaging about when your access will end",
      "Improved billing page layout and user experience"
    ]
  },
  {
    version: "1.3.2",
    date: "2025-01-25",
    type: "security",
    title: "Enhanced Security & Performance",
    description: "Strengthened platform security and significantly improved page loading speeds.",
    items: [
      "Faster page loading times across the entire platform",
      "Enhanced protection against malicious attacks",
      "Improved security for user data and accounts",
      "Better platform stability and reliability"
    ]
  },
  {
    version: "1.3.1",
    date: "2025-01-24",
    type: "improvement",
    title: "Better User Experience",
    description: "Refreshed design and improved authentication flow for a smoother experience.",
    items: [
      "Updated login and registration pages with modern styling",
      "Fixed authentication issues for more reliable access",
      "Added usage analytics to help us improve the platform",
      "Refreshed marketing page design"
    ]
  },
  {
    version: "1.3.0",
    date: "2025-01-23",
    type: "feature",
    title: "Legal & Compliance",
    description: "Added comprehensive legal documentation to ensure transparency and compliance.",
    items: [
      "Complete Privacy Policy explaining how we handle your data",
      "Clear Terms of Service outlining platform usage",
      "Pro plan now supports analyzing multiple client websites",
      "Enhanced pricing page design and clarity"
    ]
  },
  {
    version: "1.2.0",
    date: "2025-01-20",
    type: "feature",
    title: "In-App Support",
    description: "Get help faster with our new integrated support system.",
    items: [
      "New support dialog accessible from anywhere in the dashboard",
      "Automatic ticket creation for faster response times",
      "Your account details are automatically included with support requests",
      "Real-time confirmation when your support ticket is created"
    ]
  },
  {
    version: "1.1.0",
    date: "2025-01-18",
    type: "feature",
    title: "Advanced Report Management",
    description: "Better organize and manage your website analysis reports.",
    items: [
      "View all your past website scans in one organized list",
      "Detailed view for each report with comprehensive insights",
      "Track which recommendations you've implemented",
      "Archive old reports to keep your dashboard clean",
      "Re-run analysis on websites to see improvements over time"
    ]
  },
  {
    version: "1.0.0",
    date: "2025-01-15",
    type: "feature",
    title: "ConvertIQ Launch",
    description: "Welcome to ConvertIQ - your AI-powered website optimization platform.",
    items: [
      "AI analysis of your website's conversion potential",
      "Detailed reports with actionable marketing recommendations",
      "Secure account creation and management",
      "Flexible subscription plans (Basic and Pro)",
      "Domain verification to ensure accurate analysis",
      "Personal dashboard to track your optimization journey",
      "Profile management with custom avatars"
    ]
  }
];

const getTypeStyle = (type: ChangelogEntry["type"]) => {
  switch (type) {
    case "feature":
      return {
        badge: "bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/20",
        icon: "🎉",
        iconBg: "bg-blue-500/10 text-blue-600 dark:text-blue-400"
      };
    case "improvement":
      return {
        badge: "bg-green-500/10 text-green-600 dark:text-green-400 border-green-500/20",
        icon: "⚡",
        iconBg: "bg-green-500/10 text-green-600 dark:text-green-400"
      };
    case "fix":
      return {
        badge: "bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20",
        icon: "🐛",
        iconBg: "bg-amber-500/10 text-amber-600 dark:text-amber-400"
      };
    case "security":
      return {
        badge: "bg-red-500/10 text-red-600 dark:text-red-400 border-red-500/20",
        icon: "🔒",
        iconBg: "bg-red-500/10 text-red-600 dark:text-red-400"
      };
    default:
      return {
        badge: "bg-gray-500/10 text-gray-600 dark:text-gray-400 border-gray-500/20",
        icon: "📝",
        iconBg: "bg-gray-500/10 text-gray-600 dark:text-gray-400"
      };
  }
};

export default function ChangelogPage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-cyan-50 via-blue-50 to-indigo-100 dark:from-gray-900 dark:via-blue-950 dark:to-indigo-950">
      <div className="relative">
        {/* Background decorations */}
        <div className="absolute inset-0 overflow-hidden">
          <div className="absolute -top-40 -right-40 w-80 h-80 bg-gradient-to-br from-blue-400/20 to-cyan-400/20 rounded-full blur-3xl"></div>
          <div className="absolute -bottom-40 -left-40 w-80 h-80 bg-gradient-to-tr from-indigo-400/20 to-purple-400/20 rounded-full blur-3xl"></div>
        </div>

        <div className="relative z-10">
          {/* Navigation Header */}
          <nav className="px-6 pt-6">
            <div className="max-w-4xl mx-auto">
              <motion.div
                initial={{ opacity: 0, y: -20 }}
                animate={{ opacity: 1, y: 0 }}
                className="flex items-center justify-between"
              >
                <a
                  href="/"
                  className="flex items-center gap-3 text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white transition-colors group"
                >
                  <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-white/60 dark:bg-gray-900/60 backdrop-blur-sm border border-white/20 dark:border-gray-800/20 group-hover:bg-white/80 dark:group-hover:bg-gray-800/80 transition-colors">
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                    </svg>
                  </div>
                  <div className="flex items-center gap-2">
                    <CompanyIcon width={20} height={20} className="flex-shrink-0" />
                    <span className="font-bold font-mono">ConvertIQ</span>
                  </div>
                </a>
                
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 rounded-full bg-green-500"></div>
                  <span className="text-sm text-gray-600 dark:text-gray-400">All systems operational</span>
                </div>
              </motion.div>
            </div>
          </nav>

          {/* Header */}
          <div className="pt-16 pb-16 px-6">
            <div className="max-w-4xl mx-auto text-center">
              <motion.h1 
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.1 }}
                className="text-5xl font-bold text-gray-900 dark:text-white mb-6 bg-gradient-to-r from-blue-600 to-cyan-600 bg-clip-text text-transparent"
              >
                Changelog
              </motion.h1>
              <motion.p 
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2 }}
                className="text-xl text-gray-600 dark:text-gray-300 max-w-2xl mx-auto"
              >
                New updates and improvements to ConvertIQ
              </motion.p>
            </div>
          </div>

          {/* Changelog Entries */}
          <div className="pb-24 px-6">
            <div className="max-w-4xl mx-auto">
              <div className="space-y-12">
                {changelog.map((entry, index) => {
                  const typeStyle = getTypeStyle(entry.type);
                  return (
                    <motion.article
                      key={`${entry.version}-${index}`}
                      initial={{ opacity: 0, y: 40 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: index * 0.1 }}
                      className="relative"
                    >
                      {/* Timeline connector */}
                      {index < changelog.length - 1 && (
                        <div className="absolute left-8 top-16 w-px h-16 bg-gradient-to-b from-gray-200 to-transparent dark:from-gray-700" />
                      )}

                      <div className="flex gap-6">
                        {/* Icon */}
                        <div className={`flex-shrink-0 w-16 h-16 rounded-xl ${typeStyle.iconBg} flex items-center justify-center text-2xl border border-white/20 dark:border-gray-800/20 shadow-lg backdrop-blur-sm`}>
                          {typeStyle.icon}
                        </div>

                        {/* Content */}
                        <div className="flex-1 min-w-0">
                          <div className="bg-white/60 dark:bg-gray-900/60 backdrop-blur-xl rounded-2xl border border-white/20 dark:border-gray-800/20 shadow-xl p-8">
                            {/* Header */}
                            <div className="flex flex-wrap items-start justify-between gap-4 mb-6">
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-3 mb-2">
                                  <h2 className="text-2xl font-semibold text-gray-900 dark:text-white">
                                    {entry.title}
                                  </h2>
                                  <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium border ${typeStyle.badge}`}>
                                    {entry.type}
                                  </span>
                                </div>
                                <div className="flex items-center gap-3 text-sm text-gray-500 dark:text-gray-400">
                                  <span className="font-mono font-semibold bg-gray-100 dark:bg-gray-800 px-2 py-1 rounded">
                                    v{entry.version}
                                  </span>
                                  <time dateTime={entry.date}>
                                    {new Date(entry.date).toLocaleDateString("en-US", {
                                      year: "numeric",
                                      month: "long",
                                      day: "numeric",
                                    })}
                                  </time>
                                </div>
                              </div>
                            </div>

                            {/* Description */}
                            <p className="text-gray-700 dark:text-gray-300 mb-6 text-lg">
                              {entry.description}
                            </p>

                            {/* Items */}
                            {entry.items && entry.items.length > 0 && (
                              <div className="space-y-3">
                                {entry.items.map((item, itemIndex) => (
                                  <div
                                    key={itemIndex}
                                    className="flex items-start gap-3 group"
                                  >
                                    <div className="flex-shrink-0 w-1.5 h-1.5 rounded-full bg-blue-500 mt-2.5 group-hover:scale-125 transition-transform" />
                                    <p className="text-gray-600 dark:text-gray-400 group-hover:text-gray-900 dark:group-hover:text-gray-200 transition-colors">
                                      {item}
                                    </p>
                                  </div>
                                ))}
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    </motion.article>
                  );
                })}
              </div>

              {/* Footer CTA */}
              <motion.div 
                initial={{ opacity: 0, y: 40 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: changelog.length * 0.1 }}
                className="mt-16 text-center"
              >
                <div className="bg-gradient-to-r from-blue-500/10 to-cyan-500/10 dark:from-blue-600/10 dark:to-cyan-600/10 backdrop-blur-xl rounded-2xl border border-blue-200/20 dark:border-blue-800/20 p-8">
                  <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">
                    Stay updated
                  </h3>
                  <p className="text-gray-600 dark:text-gray-400">
                    Follow our progress as we continue to build and improve ConvertIQ
                  </p>
                </div>
              </motion.div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}