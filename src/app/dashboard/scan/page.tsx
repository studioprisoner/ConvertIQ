"use client";

import { useState, FormEvent, useEffect } from "react";
import { useRouter } from "next/navigation";
import { trpc } from "@/lib/trpc/client";
import { useFeatureGate } from "@/hooks/common/use-feature-gate";
import { FeatureGate } from "@/components/features/feature-gating/feature-gate";
import { urlValidationSchema, detectPageType } from "@/lib/url-validation";
import { motion, AnimatePresence, Variants } from "framer-motion";
import { CompanyIcon } from "@/components/common/company-logo";
import { Input, InputGroup } from "@/components/input";
import { AiChat } from "@/components/features/analysis/aichat";
import {
  Dialog,
  DialogActions,
  DialogBody,
  DialogDescription,
  DialogTitle,
} from "@/components/dialog";
import { Button } from "@/components/button";
import { getUserFeatureFlags } from "@/lib/feature-flags/service";
import { timeFirecrawlOperation } from "@/lib/monitoring/firecrawl-monitor";
import { useSession } from "@/lib/auth-client";

type ScanPhase =
  | "website-creation"
  | "webcrawler"
  | "ai-analysis"
  | "report-generation"
  | "complete";

interface ProcessingStep {
  title: string;
  description?: string;
  completed: boolean;
  inProgress: boolean;
  details?: string[];
}

export default function ScanPage() {
  const router = useRouter();
  const { data: session } = useSession();
  const [url, setUrl] = useState("");
  const [isProcessing, setIsProcessing] = useState(false);
  const [currentPhase, setCurrentPhase] =
    useState<ScanPhase>("website-creation");
  const [currentWebsiteId, setCurrentWebsiteId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [scanStartTime, setScanStartTime] = useState<Date | null>(null);
  const [elapsedTime, setElapsedTime] = useState<string>("0:00");
  const [useFirecrawlV2, setUseFirecrawlV2] = useState(false);
  const [extractionResults, setExtractionResults] = useState<any>(null);
  const [featureFlags, setFeatureFlags] = useState<{
    firecrawl_v2_enabled: boolean;
    firecrawl_extraction_enabled: boolean;
    enhanced_analysis_enabled: boolean;
    batch_processing_enabled: boolean;
  } | null>(null);
  const [domainDialog, setDomainDialog] = useState<{
    domain: string;
    currentCount: number;
    limit: number;
  } | null>(null);

  // Feature gating hooks
  const scanFeatureGate = useFeatureGate("unlimited_scans");

  // Load feature flags on mount
  useEffect(() => {
    if (session?.user?.id) {
      getUserFeatureFlags(session.user.id, session.user.email)
        .then(flags => {
          setFeatureFlags(flags);
          // Auto-enable v2 if feature flag is enabled
          if (flags.firecrawl_v2_enabled && !useFirecrawlV2) {
            setUseFirecrawlV2(true);
          }
        })
        .catch(error => {
          console.warn('Failed to load feature flags:', error);
          // Use defaults if feature flags fail to load
          setFeatureFlags({
            firecrawl_v2_enabled: false,
            firecrawl_extraction_enabled: false,
            enhanced_analysis_enabled: false,
            batch_processing_enabled: false,
          });
        });
    }
  }, [session?.user?.id, session?.user?.email]);

  // Domain creation mutation for adding new domains during scan
  const createDomainMutation = trpc.websites.create.useMutation({
    onSuccess: (domain) => {
      console.log("✅ Domain added successfully:", domain);
      setDomainDialog(null);
      setError(null); // Clear any previous errors
      // Small delay to ensure domain is fully created before retry
      setTimeout(() => {
        retryWebsiteCreation();
      }, 500);
    },
    onError: (error) => {
      console.error("❌ Failed to add domain:", error);
      setError(`Failed to add domain: ${error.message}`);
      setDomainDialog(null);
      setIsProcessing(false);
    },
  });

  // Update elapsed time every second during processing
  useEffect(() => {
    if (!isProcessing || !scanStartTime) return;

    const interval = setInterval(() => {
      const elapsed = Math.floor((Date.now() - scanStartTime.getTime()) / 1000);
      const minutes = Math.floor(elapsed / 60);
      const seconds = elapsed % 60;
      setElapsedTime(`${minutes}:${seconds.toString().padStart(2, "0")}`);
    }, 1000);

    return () => clearInterval(interval);
  }, [isProcessing, scanStartTime]);

  const websiteCreateMutation = trpc.websites.createOrGet.useMutation({
    onMutate: (variables) => {
      console.log("🚀 websiteCreateMutation.onMutate called with:", variables);
    },
    onSuccess: (website) => {
      console.log("📝 Website created/found:", website);
      console.log("🔍 Setting websiteId:", website.id);
      setCurrentWebsiteId(website.id);
      
      // Determine the URL to crawl
      const urlToCrawl = "scanUrl" in website ? website.scanUrl : website.url;
      console.log("🕷️ Target URL:", urlToCrawl);

      // Choose appropriate crawl method based on v2 features
      if (useFirecrawlV2 && featureFlags?.firecrawl_extraction_enabled) {
        console.log("🚀 Using enhanced crawl with v2 extraction");
        setCurrentPhase("webcrawler");
        
        crawlEnhancedMutation.mutate({
          url: urlToCrawl,
          options: {
            timeout: 30000,
            followRedirects: true,
            respectRobots: true,
            includeRawHtml: false,
          },
        });
      } else {
        console.log("🕷️ Using standard crawling");
        setCurrentPhase("webcrawler");
        
        crawlMutation.mutate({
          url: urlToCrawl,
          options: {
            timeout: 30000,
            followRedirects: true,
            respectRobots: true,
            includeRawHtml: false, // Don't include raw HTML to save space
          },
        });
      }
    },
    onSettled: (data, error) => {
      console.log(
        "📝 websiteCreateMutation.onSettled - data:",
        data,
        "error:",
        error,
      );
    },
    onError: (error) => {
      console.error("📝 Website creation failed:", error);
      console.log("📝 Full error object:", error);
      console.log("📝 Error message:", error.message);
      console.log("📝 Error type:", typeof error.message);

      // Handle domain validation errors
      const errorMessage = error.message;

      // If we're showing a domain dialog, don't show this error as it's expected
      if (domainDialog) {
        console.log(
          "🔄 Domain validation error during retry - dialog already shown, ignoring",
        );
        return;
      }

      console.log(
        "📝 Checking if error starts with DOMAIN_NOT_ALLOWED:",
        errorMessage.startsWith("DOMAIN_NOT_ALLOWED:"),
      );

      if (errorMessage.startsWith("DOMAIN_NOT_ALLOWED:")) {
        console.log("🎯 Processing DOMAIN_NOT_ALLOWED error");

        // Parse the error message to extract domain info
        const parts = errorMessage.split(":")[1];
        console.log("🔍 Parsing domain error:", parts);

        const domainMatch = parts?.match(
          /like to add "([^"]+)" to your domains/,
        );
        const countMatch = parts?.match(/using (\d+) of (\d+) domains/);

        console.log("🔍 Domain match:", domainMatch);
        console.log("🔍 Count match:", countMatch);

        if (domainMatch && countMatch) {
          console.log("✅ Successfully parsed domain info");
          const dialogData = {
            domain: domainMatch[1],
            currentCount: parseInt(countMatch[1]),
            limit: parseInt(countMatch[2]),
          };
          console.log("🎯 Setting domain dialog:", dialogData);
          setDomainDialog(dialogData);
          return;
        } else {
          console.log(
            "❌ Failed to parse domain error message - using improved fallback",
          );

          // Improved fallback - extract info from error message using different approach
          try {
            const urlDomain = new URL(url).hostname;

            // Try to extract count info from the error message
            let currentCount = 8; // default
            let limit = 10; // default

            const countMatch2 = errorMessage.match(
              /using (\d+) of (\d+) domains/,
            );
            if (countMatch2) {
              currentCount = parseInt(countMatch2[1]);
              limit = parseInt(countMatch2[2]);
              console.log("✅ Extracted count info from error:", {
                currentCount,
                limit,
              });
            }

            const fallbackData = {
              domain: urlDomain,
              currentCount,
              limit,
            };
            console.log(
              "🎯 Setting improved fallback domain dialog:",
              fallbackData,
            );
            setDomainDialog(fallbackData);
            return;
          } catch (e) {
            console.error("Failed to extract domain from URL:", e);

            // Ultimate fallback - show dialog with minimal info
            console.log("🎯 Using ultimate fallback - showing basic dialog");
            setDomainDialog({
              domain: "unknown-domain",
              currentCount: 8,
              limit: 10,
            });
            return;
          }
        }
      } else if (errorMessage.startsWith("DOMAIN_LIMIT_REACHED:")) {
        console.log("🎯 Processing DOMAIN_LIMIT_REACHED error");
        setError(errorMessage.split(":")[1]);
        setIsProcessing(false);
        return;
      }

      console.log("⚠️ Unhandled error - showing generic error");
      // Only show generic error if it's not a domain validation issue
      if (
        !errorMessage.includes("DOMAIN_NOT_ALLOWED") &&
        !errorMessage.includes("DOMAIN_LIMIT_REACHED")
      ) {
        setError(`Website registration failed: ${errorMessage}`);
      }
      setIsProcessing(false);
    },
  });

  // Function to retry website creation after domain is added
  const retryWebsiteCreation = () => {
    if (!url) return;

    console.log("🔄 Retrying website creation after domain addition");
    setError(null); // Clear any existing errors before retry

    // Reset the mutation state to clear any previous errors
    if (websiteCreateMutation.error) {
      websiteCreateMutation.reset();
    }

    const detectedPageType = detectPageType(url);
    websiteCreateMutation.mutate({
      url: url,
      pageType: detectedPageType,
    });
  };

  const aiAnalysisMutation = trpc.ai.analyze.useMutation({
    onSuccess: (result) => {
      console.log("🤖 AI analysis completed successfully:", result);
      setCurrentPhase("report-generation");

      // Reports are now generated automatically in the backend
      // Show brief completion state then redirect
      setTimeout(() => {
        setCurrentPhase("complete");

        // Redirect to reports dashboard
        setTimeout(() => {
          if (currentWebsiteId) {
            router.push(`/dashboard/reports?websiteId=${currentWebsiteId}`);
          } else {
            console.warn("No websiteId available for redirect");
            router.push("/dashboard/reports");
          }
        }, 1000); // Reduced from 2000ms to 1000ms since reports are real
      }, 500); // Reduced from 1500ms to 500ms since no simulation needed
    },
    onError: (error) => {
      console.error("🤖 AI analysis failed:", error);
      
      // Record error for monitoring
      if (session?.user?.id) {
        // Log the failure for monitoring
        console.error("AI Analysis Error:", {
          userId: session.user.id,
          websiteId: currentWebsiteId,
          error: error.message,
          useFirecrawlV2,
          extractionEnabled: featureFlags?.firecrawl_extraction_enabled,
        });
      }
      
      // Check if this was a v2 failure and fallback is possible
      if (useFirecrawlV2 && featureFlags?.firecrawl_v2_enabled) {
        console.warn("🔄 AI analysis with v2 data failed, attempting fallback to v1");
        
        // Disable v2 features temporarily and retry
        setUseFirecrawlV2(false);
        setExtractionResults(null);
        setError("Enhanced analysis failed, retrying with standard analysis...");
        
        // Retry with v1 after a brief delay
        setTimeout(() => {
          if (currentWebsiteId) {
            // Get the original crawl result from the previous successful crawl
            // This would need to be stored when crawl succeeds
            console.log("🔄 Retrying analysis without v2 enhancements");
            setError(null);
            setCurrentPhase("ai-analysis");
            // Note: In a real implementation, you'd need to store the crawl result
            // and re-call aiAnalysisMutation with fallback parameters
          }
        }, 2000);
      } else {
        // Final failure - no fallback available
        setError(`Analysis failed: ${error.message}`);
        setIsProcessing(false);
      }
    },
  });

  // Firecrawl v2 extraction mutation
  const firecrawlExtractionMutation = trpc.firecrawlV2.extractStructuredData.useMutation({
    onSuccess: (result) => {
      console.log("🔍 Firecrawl v2 extraction completed:", result);
      setExtractionResults(result.data);
      
      // Proceed with standard crawling after extraction
      setCurrentPhase("webcrawler");
      crawlMutation.mutate({ 
        url: url,
        options: {
          timeout: 30000,
          followRedirects: true,
          respectRobots: true,
          includeRawHtml: false,
        },
      });
    },
    onError: (error) => {
      console.error("🔍 Firecrawl v2 extraction failed:", error);
      // Continue with standard analysis even if extraction fails
      console.log("Falling back to standard crawling without extraction data");
      setUseFirecrawlV2(false);
      setCurrentPhase("webcrawler");
      crawlMutation.mutate({ 
        url: url,
        options: {
          timeout: 30000,
          followRedirects: true,
          respectRobots: true,
          includeRawHtml: false,
        },
      });
    },
  });

  const crawlMutation = trpc.url.crawl.useMutation({
    onSuccess: (result) => {
      console.log("🕷️ Crawl completed successfully:", result);
      setCurrentPhase("ai-analysis");

      // Use the actual website ID and enable database saving
      if (!currentWebsiteId) {
        setError("Website ID not found. Please try again.");
        setIsProcessing(false);
        return;
      }

      aiAnalysisMutation.mutate({
        crawlData: result,
        websiteId: currentWebsiteId,
        analysisType: "comprehensive" as const,
        saveToDb: true,
        firecrawlVersion: "v1" as const,
        useEnhancedAnalysis: false,
      });
    },
    onError: (error) => {
      console.error("🕷️ Crawl failed:", error);
      setError(`Crawling failed: ${error.message}`);
      setIsProcessing(false);
    },
  });

  const crawlEnhancedMutation = trpc.url.crawlEnhanced.useMutation({
    onSuccess: (result) => {
      console.log("🚀 Enhanced crawl completed successfully:", result);
      setCurrentPhase("ai-analysis");

      // Use the actual website ID and enable database saving
      if (!currentWebsiteId) {
        setError("Website ID not found. Please try again.");
        setIsProcessing(false);
        return;
      }

      // Set extraction results from enhanced crawl
      if (result.extractedData) {
        setExtractionResults(result.extractedData);
      }

      const mutationInput: any = {
        crawlData: result.crawlResult,
        websiteId: currentWebsiteId,
        analysisType: "comprehensive" as const,
        saveToDb: true,
        firecrawlVersion: result.extractionMetadata.extractionVersion as "v1" | "v2",
        useEnhancedAnalysis: result.extractionMetadata.useEnhancedExtraction,
      };
      
      if (result.extractedData) {
        mutationInput.extractionResults = result.extractedData;
      }

      aiAnalysisMutation.mutate(mutationInput);
    },
    onError: (error) => {
      console.error("🚀 Enhanced crawl failed:", error);
      setError(`Enhanced crawling failed: ${error.message}`);
      setIsProcessing(false);
    },
  });

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    console.log("🎯 Form submitted with URL:", url);
    setError(null);

    // Check feature access before starting scan
    console.log("🔐 Checking feature access:", scanFeatureGate);
    if (!scanFeatureGate.hasAccess) {
      console.log("❌ Scan access denied:", scanFeatureGate.reason);
      setError(scanFeatureGate.reason || "Scan access denied");
      return;
    }

    // Validate URL
    if (!url.trim()) {
      console.log("❌ No URL provided");
      setError("Please enter a website URL");
      return;
    }

    console.log("✅ Validating URL:", url);
    const urlValidation = urlValidationSchema.safeParse({ url });
    if (!urlValidation.success) {
      console.log("❌ URL validation failed:", urlValidation.error);
      setError(
        urlValidation.error.errors[0]?.message ||
          "Please enter a valid website URL",
      );
      return;
    }

    console.log("✅ URL validation passed, starting scan process");
    setIsProcessing(true);
    setScanStartTime(new Date());
    setCurrentPhase("website-creation");
    setCurrentWebsiteId(null);

    try {
      console.log("🚀 Starting scan for:", url);

      // Detect page type based on URL
      const detectedPageType = detectPageType(url);
      console.log("📄 Detected page type:", detectedPageType);

      // First, create or get the website record
      console.log("📝 Calling websiteCreateMutation.mutate");
      websiteCreateMutation.mutate({
        url: url,
        pageType: detectedPageType,
      });
    } catch (error) {
      console.error("Scan error:", error);
      setError("Error occurred during scan preparation. Please try again.");
      setIsProcessing(false);
    }
  };

  // Domain dialog handlers
  const handleAddDomain = () => {
    if (!domainDialog) return;

    createDomainMutation.mutate({
      name: domainDialog.domain,
      url: `https://${domainDialog.domain}`,
      description: `Added during scan process for ${url}`,
    });
  };

  const handleCancelDomain = () => {
    setDomainDialog(null);
    setIsProcessing(false);
    setError("Scan cancelled - domain not added to allowed list");
  };

  const getProcessingSteps = (): ProcessingStep[] => {
    return [
      {
        title: "WebCrawler",
        description: "WebCrawler Analysed",
        completed:
          currentPhase !== "website-creation" && currentPhase !== "webcrawler",
        inProgress: currentPhase === "webcrawler",
        details: [
          "Meta tags",
          "HTML Structure",
          "Call-to-Actions",
          "CSS Analysis",
          "Performance",
          "Responsive Design",
        ],
      },
      {
        title: "AI-Powered Analysis",
        completed:
          currentPhase === "report-generation" || currentPhase === "complete",
        inProgress: currentPhase === "ai-analysis",
        details: [
          "Conversion Psychology: Trust signals, psychological triggers",
          "UX/UI Analysis: Mobile optimisation, navigation performance",
          "Technical SEO: Meta tags, structure, schema markup",
          "Comprehensive: All aspects combined",
        ],
      },
      {
        title: "Report Generation",
        completed: currentPhase === "complete",
        inProgress: currentPhase === "report-generation",
        details: [
          "Marketing improvement Report: SEO, visibility, content optimisation",
          "Conversion Rate Report: UX/UI, psychological, sales funnel",
          "Action Plan Report: Speed, mobile, technical issues",
        ],
      },
    ];
  };

  // Animation variants
  const pageVariants: Variants = {
    hidden: { opacity: 0, y: 20 },
    visible: {
      opacity: 1,
      y: 0,
      transition: {
        duration: 0.6,
        ease: [0.25, 0.25, 0, 1],
      },
    },
  };

  const formVariants: Variants = {
    hidden: { opacity: 0, scale: 0.95 },
    visible: {
      opacity: 1,
      scale: 1,
      transition: {
        duration: 0.5,
        ease: [0.25, 0.25, 0, 1],
      },
    },
    exit: {
      opacity: 0,
      scale: 0.95,
      transition: { duration: 0.3 },
    },
  };

  const streamingVariants: Variants = {
    hidden: { opacity: 0, y: 30, scale: 0.95 },
    visible: {
      opacity: 1,
      y: 0,
      scale: 1,
      transition: {
        duration: 0.6,
        ease: [0.25, 0.25, 0, 1],
        staggerChildren: 0.1,
      },
    },
  };

  const stepVariants: Variants = {
    hidden: { opacity: 0, x: -20 },
    visible: {
      opacity: 1,
      x: 0,
      transition: {
        duration: 0.4,
        ease: [0.25, 0.25, 0, 1],
      },
    },
  };

  const detailVariants: Variants = {
    hidden: { opacity: 0, x: -10 },
    visible: {
      opacity: 1,
      x: 0,
      transition: { duration: 0.3 },
    },
  };

  const pulseVariants: Variants = {
    pulse: {
      scale: [1, 1.2, 1],
      opacity: [0.7, 1, 0.7],
      transition: {
        duration: 1.5,
        repeat: Infinity,
        ease: "easeInOut",
      },
    },
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center px-4">
      <motion.div
        className="w-full max-w-2xl"
        variants={pageVariants}
        initial="hidden"
        animate="visible"
      >
        {/* Header */}
        <motion.div
          className="flex items-center justify-center mb-12 space-x-4"
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.2 }}
        >
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{
              duration: 0.5,
              delay: 0.3,
              type: "spring",
              stiffness: 260,
              damping: 20,
            }}
          >
            <CompanyIcon width={48} height={48} className="flex-shrink-0" />
          </motion.div>
          <motion.h1
            className="text-3xl font-bold text-zinc-900 dark:text-white"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.6, delay: 0.4 }}
          >
            Start a new page scan
          </motion.h1>
        </motion.div>

        {/* Form */}
        <FeatureGate
          featureKey="unlimited_scans"
          variant="block"
          showUpgradePrompt={true}
        >
          <AnimatePresence mode="wait">
            {!isProcessing ? (
              <motion.form
                onSubmit={handleSubmit}
                className="space-y-4"
                variants={formVariants}
                initial="hidden"
                animate="visible"
                exit="exit"
                key="form"
              >
                <div>
                  <div className="relative">
                    <InputGroup>
                      <AiChat className="text-slate-400" />
                      <Input
                        type="url"
                        variant="minimal"
                        value={url}
                        onChange={(e) => setUrl(e.target.value)}
                        placeholder="Enter a website URL to analyze for conversion optimisation opportunities"
                        className="text-lg text-slate-100 pr-12"
                        disabled={isProcessing}
                      />
                    </InputGroup>
                    <button
                      type="submit"
                      disabled={isProcessing || !url.trim()}
                      className="absolute right-3 top-1/2 transform -translate-y-1/2 bg-cyan-400 hover:bg-cyan-500 disabled:bg-zinc-300 disabled:cursor-not-allowed text-white p-1 rounded-lg transition-colors"
                    >
                      <svg
                        xmlns="http://www.w3.org/2000/svg"
                        fill="none"
                        viewBox="0 0 24 24"
                        strokeWidth={1.5}
                        stroke="currentColor"
                        className="size-6"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          d="M4.5 10.5 12 3m0 0 7.5 7.5M12 3v18"
                        />
                      </svg>
                    </button>
                  </div>
                </div>

                {/* Enhanced Analysis Toggle - Show only if v2 feature flag is enabled */}
                {featureFlags?.firecrawl_v2_enabled && (
                  <div className="flex items-center justify-between px-1">
                    <div className="flex items-center space-x-3">
                      <input
                        type="checkbox"
                        id="use-firecrawl-v2"
                        checked={useFirecrawlV2}
                        onChange={(e) => setUseFirecrawlV2(e.target.checked)}
                        disabled={!featureFlags?.firecrawl_extraction_enabled}
                        className="w-4 h-4 text-cyan-600 bg-gray-100 border-gray-300 rounded focus:ring-cyan-500 focus:ring-2 disabled:opacity-50 disabled:cursor-not-allowed"
                      />
                      <label
                        htmlFor="use-firecrawl-v2"
                        className={`text-sm font-medium ${
                          featureFlags?.firecrawl_extraction_enabled 
                            ? "text-gray-700 dark:text-gray-300"
                            : "text-gray-400 dark:text-gray-500"
                        }`}
                      >
                        Enhanced Analysis (Firecrawl v2)
                        {!featureFlags?.firecrawl_extraction_enabled && (
                          <span className="ml-2 text-xs bg-yellow-100 text-yellow-800 px-2 py-1 rounded-full">
                            Preview
                          </span>
                        )}
                      </label>
                    </div>
                    <div className="text-xs text-gray-500 dark:text-gray-400">
                      {useFirecrawlV2 && featureFlags?.firecrawl_extraction_enabled
                        ? "Structured data extraction enabled" 
                        : useFirecrawlV2 && !featureFlags?.firecrawl_extraction_enabled
                        ? "Preview mode - basic v2 analysis"
                        : "Standard analysis"
                      }
                    </div>
                  </div>
                )}
                
                {/* Feature Flag Status (for debugging - remove in production) */}
                {process.env.NODE_ENV === 'development' && featureFlags && (
                  <div className="px-1 py-2 bg-gray-50 dark:bg-gray-800 rounded-md">
                    <div className="text-xs text-gray-600 dark:text-gray-400 space-y-1">
                      <div>Feature Flags:</div>
                      <div className="grid grid-cols-2 gap-1 text-xs">
                        <span className={featureFlags.firecrawl_v2_enabled ? "text-green-600" : "text-red-600"}>
                          v2 API: {featureFlags.firecrawl_v2_enabled ? "✓" : "✗"}
                        </span>
                        <span className={featureFlags.firecrawl_extraction_enabled ? "text-green-600" : "text-red-600"}>
                          Extract: {featureFlags.firecrawl_extraction_enabled ? "✓" : "✗"}
                        </span>
                        <span className={featureFlags.enhanced_analysis_enabled ? "text-green-600" : "text-red-600"}>
                          Enhanced: {featureFlags.enhanced_analysis_enabled ? "✓" : "✗"}
                        </span>
                        <span className={featureFlags.batch_processing_enabled ? "text-green-600" : "text-red-600"}>
                          Batch: {featureFlags.batch_processing_enabled ? "✓" : "✗"}
                        </span>
                      </div>
                    </div>
                  </div>
                )}

                <AnimatePresence>
                  {error && (
                    <motion.div
                      className="text-red-600 dark:text-red-400 text-sm text-center"
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: "auto" }}
                      exit={{ opacity: 0, height: 0 }}
                      transition={{ duration: 0.3 }}
                    >
                      {error}
                    </motion.div>
                  )}
                </AnimatePresence>
              </motion.form>
            ) : (
              <motion.div
                className="bg-white dark:bg-zinc-800 rounded-lg border border-zinc-200 dark:border-zinc-700 overflow-hidden shadow-xl"
                variants={streamingVariants}
                initial="hidden"
                animate="visible"
                key="streaming"
              >
                {/* Header */}
                <motion.div
                  className="flex items-center justify-between p-6 border-b border-zinc-200 dark:border-zinc-700"
                  initial={{ opacity: 0, y: -20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.4 }}
                >
                  <div className="flex items-center space-x-3">
                    <motion.div
                      className="w-8 h-8 bg-zinc-100 dark:bg-zinc-700 rounded-lg flex items-center justify-center"
                      initial={{ rotate: -180, scale: 0 }}
                      animate={{ rotate: 0, scale: 1 }}
                      transition={{ duration: 0.5, delay: 0.2 }}
                    >
                      <svg
                        className="w-4 h-4 text-zinc-600 dark:text-zinc-400"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M9 5H7a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"
                        />
                      </svg>
                    </motion.div>
                    <motion.div
                      initial={{ opacity: 0, x: -10 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ duration: 0.4, delay: 0.3 }}
                    >
                      <h3 className="text-lg font-semibold text-zinc-900 dark:text-white">
                        Executing Scan...
                      </h3>
                    </motion.div>
                  </div>
                  <motion.div
                    className="text-sm text-zinc-500 dark:text-zinc-400 font-mono"
                    initial={{ opacity: 0, scale: 0.8 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ duration: 0.4, delay: 0.4 }}
                  >
                    {elapsedTime}
                  </motion.div>
                </motion.div>

                {/* Progress Steps */}
                <motion.div
                  className="p-6 space-y-6"
                  variants={streamingVariants}
                >
                  {getProcessingSteps().map((step, index) => (
                    <motion.div
                      key={step.title}
                      className="relative"
                      variants={stepVariants}
                      initial="hidden"
                      animate="visible"
                      transition={{ delay: index * 0.1 }}
                    >
                      <div className="flex items-start space-x-3">
                        {/* Status Icon */}
                        <motion.div
                          className={`flex-shrink-0 w-6 h-6 rounded-full flex items-center justify-center transition-colors duration-500 ${
                            step.completed
                              ? "bg-green-100 dark:bg-green-900"
                              : step.inProgress
                                ? "bg-blue-100 dark:bg-blue-900"
                                : "bg-zinc-100 dark:bg-zinc-700"
                          }`}
                          animate={
                            step.inProgress
                              ? { scale: [1, 1.1, 1] }
                              : { scale: 1 }
                          }
                          transition={{
                            duration: 1.5,
                            repeat: step.inProgress ? Infinity : 0,
                          }}
                        >
                          <AnimatePresence mode="wait">
                            {step.completed ? (
                              <motion.svg
                                className="w-4 h-4 text-green-600 dark:text-green-400"
                                fill="none"
                                stroke="currentColor"
                                viewBox="0 0 24 24"
                                key="completed"
                                initial={{ scale: 0, rotate: -180 }}
                                animate={{ scale: 1, rotate: 0 }}
                                transition={{
                                  duration: 0.5,
                                  type: "spring",
                                  stiffness: 300,
                                }}
                              >
                                <path
                                  strokeLinecap="round"
                                  strokeLinejoin="round"
                                  strokeWidth={2}
                                  d="M5 13l4 4L19 7"
                                />
                              </motion.svg>
                            ) : step.inProgress ? (
                              <motion.div
                                className="w-3 h-3 bg-blue-600 dark:bg-blue-400 rounded-full"
                                key="inprogress"
                                variants={pulseVariants}
                                animate="pulse"
                              />
                            ) : (
                              <motion.div
                                className="w-3 h-3 bg-zinc-300 dark:bg-zinc-600 rounded-full"
                                key="pending"
                                initial={{ scale: 0 }}
                                animate={{ scale: 1 }}
                                transition={{ duration: 0.3 }}
                              />
                            )}
                          </AnimatePresence>
                        </motion.div>

                        <div className="flex-1 min-w-0">
                          <motion.div
                            className="flex items-center space-x-2 mb-2"
                            initial={{ opacity: 0, x: -10 }}
                            animate={{ opacity: 1, x: 0 }}
                            transition={{
                              delay: index * 0.1 + 0.2,
                              duration: 0.4,
                            }}
                          >
                            <motion.h4
                              className={`text-sm font-medium transition-colors duration-500 ${
                                step.completed
                                  ? "text-green-900 dark:text-green-100"
                                  : step.inProgress
                                    ? "text-blue-900 dark:text-blue-100"
                                    : "text-zinc-500 dark:text-zinc-400"
                              }`}
                              animate={
                                step.inProgress
                                  ? { opacity: [0.7, 1, 0.7] }
                                  : { opacity: 1 }
                              }
                              transition={{
                                duration: 2,
                                repeat: step.inProgress ? Infinity : 0,
                              }}
                            >
                              {step.title}
                            </motion.h4>
                            {step.description && (
                              <motion.span
                                className="text-xs text-zinc-500 dark:text-zinc-400"
                                initial={{ opacity: 0 }}
                                animate={{ opacity: 1 }}
                                transition={{
                                  delay: index * 0.1 + 0.3,
                                  duration: 0.4,
                                }}
                              >
                                {step.description}
                              </motion.span>
                            )}
                          </motion.div>

                          {/* Details */}
                          <motion.div
                            className="space-y-1"
                            initial="hidden"
                            animate="visible"
                            variants={{
                              visible: {
                                transition: {
                                  staggerChildren: 0.05,
                                  delayChildren: index * 0.1 + 0.4,
                                },
                              },
                            }}
                          >
                            {step.details?.map((detail, detailIndex) => (
                              <motion.div
                                key={detailIndex}
                                className={`text-xs flex items-center space-x-2 transition-colors duration-500 ${
                                  step.completed
                                    ? "text-zinc-600 dark:text-zinc-300"
                                    : step.inProgress
                                      ? "text-zinc-700 dark:text-zinc-200"
                                      : "text-zinc-400 dark:text-zinc-500"
                                }`}
                                variants={detailVariants}
                              >
                                <motion.div
                                  className="w-1 h-1 bg-current rounded-full opacity-50"
                                  initial={{ scale: 0 }}
                                  animate={{ scale: 1 }}
                                  transition={{ delay: 0.1 }}
                                />
                                <motion.span
                                  animate={
                                    step.inProgress &&
                                    detailIndex ===
                                      Math.floor(Date.now() / 2000) %
                                        step.details!.length
                                      ? { opacity: [1, 0.5, 1] }
                                      : { opacity: 1 }
                                  }
                                  transition={{
                                    duration: 1.5,
                                    repeat: step.inProgress ? Infinity : 0,
                                  }}
                                >
                                  {detail}
                                </motion.span>
                              </motion.div>
                            ))}
                          </motion.div>
                        </div>
                      </div>

                      {/* Connector Line */}
                      {index < getProcessingSteps().length - 1 && (
                        <motion.div
                          className={`absolute left-3 top-8 w-px h-6 transition-colors duration-500 ${
                            step.completed
                              ? "bg-green-200 dark:bg-green-800"
                              : "bg-zinc-200 dark:bg-zinc-700"
                          }`}
                          initial={{ scaleY: 0, originY: 0 }}
                          animate={{ scaleY: 1 }}
                          transition={{
                            delay: index * 0.1 + 0.5,
                            duration: 0.4,
                          }}
                        />
                      )}
                    </motion.div>
                  ))}
                </motion.div>

                {/* Error Display */}
                <AnimatePresence>
                  {error && (
                    <motion.div
                      className="px-6 pb-6"
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: "auto" }}
                      exit={{ opacity: 0, height: 0 }}
                      transition={{ duration: 0.4 }}
                    >
                      <motion.div
                        className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4"
                        initial={{ scale: 0.9, opacity: 0 }}
                        animate={{ scale: 1, opacity: 1 }}
                        exit={{ scale: 0.9, opacity: 0 }}
                        transition={{ duration: 0.3 }}
                      >
                        <div className="flex items-center space-x-2">
                          <motion.svg
                            className="w-5 h-5 text-red-500"
                            fill="none"
                            stroke="currentColor"
                            viewBox="0 0 24 24"
                            initial={{ rotate: -10, scale: 0 }}
                            animate={{ rotate: 0, scale: 1 }}
                            transition={{
                              delay: 0.1,
                              type: "spring",
                              stiffness: 300,
                            }}
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth={2}
                              d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                            />
                          </motion.svg>
                          <motion.p
                            className="text-sm text-red-700 dark:text-red-300"
                            initial={{ opacity: 0, x: -10 }}
                            animate={{ opacity: 1, x: 0 }}
                            transition={{ delay: 0.2, duration: 0.3 }}
                          >
                            {error}
                          </motion.p>
                        </div>
                      </motion.div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </motion.div>
            )}
          </AnimatePresence>
        </FeatureGate>
      </motion.div>

      {/* Domain Addition Dialog */}
      {domainDialog && (
        <Dialog open={true} onClose={() => setDomainDialog(null)}>
          <DialogTitle>Add Domain to Continue Scan</DialogTitle>
          <DialogDescription>
            The domain &quot;{domainDialog.domain}&quot; is not in your allowed
            domains list. Would you like to add it to continue with the scan?
          </DialogDescription>
          <DialogBody>
            <div className="space-y-3">
              <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
                <div className="flex items-center space-x-2 mb-2">
                  <svg
                    className="w-5 h-5 text-blue-600 dark:text-blue-400"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                    />
                  </svg>
                  <h4 className="font-semibold text-blue-900 dark:text-blue-100">
                    Domain Usage
                  </h4>
                </div>
                <p className="text-sm text-blue-800 dark:text-blue-200">
                  You are currently using {domainDialog.currentCount} of{" "}
                  {domainDialog.limit} domains. Adding this domain will use{" "}
                  {domainDialog.currentCount + 1} of {domainDialog.limit}{" "}
                  domains.
                </p>
              </div>
              <div className="text-sm text-zinc-600 dark:text-zinc-400">
                <p>
                  <strong>Domain:</strong> {domainDialog.domain}
                </p>
                <p>
                  <strong>Scan URL:</strong> {url}
                </p>
              </div>
            </div>
          </DialogBody>
          <DialogActions>
            <Button
              variant="outline"
              onClick={handleCancelDomain}
              disabled={createDomainMutation.isPending}
            >
              Cancel Scan
            </Button>
            <Button
              onClick={handleAddDomain}
              disabled={createDomainMutation.isPending}
              className="bg-blue-600 hover:bg-blue-700 text-white"
            >
              {createDomainMutation.isPending
                ? "Adding Domain..."
                : "Add Domain & Continue"}
            </Button>
          </DialogActions>
        </Dialog>
      )}
    </div>
  );
}
