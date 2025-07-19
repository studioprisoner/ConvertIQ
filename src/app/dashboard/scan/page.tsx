'use client';

import { useState } from 'react';
import { Heading } from '@/components/heading';
import { Text } from '@/components/text';
import { UrlScanner } from '@/components/url-scanner';
import { trpc } from '@/lib/trpc/client';
import type { UrlValidationInput } from '@/lib/url-validation';

import type { CrawlResult } from '@/lib/crawler/types';

export default function ScanPage() {
  const [isProcessing, setIsProcessing] = useState(false);
  const [processingMessage, setProcessingMessage] = useState<string | null>(null);
  const [crawlResult, setCrawlResult] = useState<CrawlResult | null>(null);

  const crawlMutation = trpc.url.crawl.useMutation({
    onSuccess: (result) => {
      console.log('🕷️ Crawl completed successfully:', result);
      setCrawlResult(result);
      setProcessingMessage('✅ Website crawling completed! Analyzing content...');
      
      // TODO: In future issues, this will trigger:
      // - AI analysis (CLD-65)
      // - Report generation (CLD-66)
      // - Redirect to results dashboard (CLD-67)
      
      // For now, show results after a delay
      setTimeout(() => {
        setProcessingMessage('🎉 Analysis complete! Review your results below.');
      }, 2000);
    },
    onError: (error) => {
      console.error('🕷️ Crawl failed:', error);
      setProcessingMessage(`❌ Crawling failed: ${error.message}`);
      setIsProcessing(false);
    },
  });

  const handleScanStart = async (data: UrlValidationInput & { detectedPageType: string }) => {
    setIsProcessing(true);
    setProcessingMessage('🔍 Starting website crawl...');
    setCrawlResult(null);

    try {
      console.log('🚀 Starting scan for:', data);
      
      // Start the actual crawling process
      crawlMutation.mutate({
        url: data.url,
        options: {
          timeout: 30000,
          followRedirects: true,
          respectRobots: true,
          includeRawHtml: false, // Don't include raw HTML to save space
        },
      });
      
    } catch (error) {
      console.error('Scan error:', error);
      setProcessingMessage('❌ Error occurred during scan preparation. Please try again.');
      setIsProcessing(false);
    }
  };

  const handleValidationResult = (result: { isValid: boolean; message?: string; error?: string }) => {
    // Handle validation feedback if needed
    console.log('Validation result:', result);
  };

  return (
    <div className="space-y-8">
      <div>
        <Heading>Website Scan</Heading>
        <Text className="mt-4">
          Enter a website URL to analyze for conversion optimization opportunities. 
          Our system will examine the page structure, content, and user experience to provide actionable recommendations.
        </Text>
      </div>

      <div className="bg-white dark:bg-zinc-900 rounded-lg border border-zinc-200 dark:border-zinc-800 p-6">
        <h3 className="text-lg font-semibold text-zinc-900 dark:text-white mb-4">
          URL Input & Validation
        </h3>
        
        {!isProcessing ? (
          <UrlScanner 
            onScanStart={handleScanStart}
            onValidationResult={handleValidationResult}
          />
        ) : (
          <div className="space-y-4">
            <div className="rounded-lg border border-blue-200 bg-blue-50 px-4 py-3 text-sm text-blue-800 dark:border-blue-800 dark:bg-blue-950 dark:text-blue-200">
              <strong>Status:</strong> {processingMessage}
            </div>
            
            {crawlMutation.isPending && (
              <div className="flex items-center justify-center py-8">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
              </div>
            )}
            
            {crawlResult && (
              <div className="space-y-6 mt-6">
                <div className="border border-green-200 bg-green-50 rounded-lg p-4 dark:border-green-800 dark:bg-green-950">
                  <h4 className="font-semibold text-green-900 dark:text-green-100 mb-2">
                    🎉 Crawl Completed Successfully!
                  </h4>
                  <div className="text-sm text-green-800 dark:text-green-200">
                    <p><strong>URL:</strong> {crawlResult.url}</p>
                    <p><strong>Status:</strong> {crawlResult.statusCode}</p>
                    <p><strong>Load Time:</strong> {crawlResult.performance.loadTime}ms</p>
                    <p><strong>Page Size:</strong> {(crawlResult.performance.htmlSize / 1024).toFixed(1)}KB</p>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  <div className="bg-white dark:bg-zinc-900 rounded-lg border border-zinc-200 dark:border-zinc-800 p-4">
                    <h5 className="font-semibold text-zinc-900 dark:text-white mb-2">📄 Page Info</h5>
                    <div className="text-sm space-y-1">
                      <p><strong>Title:</strong> {crawlResult.htmlAnalysis.meta.title || 'No title'}</p>
                      <p><strong>Headings:</strong> {crawlResult.htmlAnalysis.headings.length}</p>
                      <p><strong>Word Count:</strong> {crawlResult.htmlAnalysis.structure.wordCount}</p>
                    </div>
                  </div>

                  <div className="bg-white dark:bg-zinc-900 rounded-lg border border-zinc-200 dark:border-zinc-800 p-4">
                    <h5 className="font-semibold text-zinc-900 dark:text-white mb-2">🖼️ Media</h5>
                    <div className="text-sm space-y-1">
                      <p><strong>Images:</strong> {crawlResult.htmlAnalysis.images.length}</p>
                      <p><strong>Without Alt:</strong> {crawlResult.performance.imagesWithoutAlt}</p>
                      <p><strong>Links:</strong> {crawlResult.htmlAnalysis.links.length}</p>
                    </div>
                  </div>

                  <div className="bg-white dark:bg-zinc-900 rounded-lg border border-zinc-200 dark:border-zinc-800 p-4">
                    <h5 className="font-semibold text-zinc-900 dark:text-white mb-2">📝 Structure</h5>
                    <div className="text-sm space-y-1">
                      <p><strong>Forms:</strong> {crawlResult.htmlAnalysis.forms.length}</p>
                      <p><strong>CTAs:</strong> {crawlResult.htmlAnalysis.ctas.length}</p>
                      <p><strong>Sections:</strong> {crawlResult.htmlAnalysis.structure.sectionsCount}</p>
                    </div>
                  </div>
                </div>

                {crawlResult.htmlAnalysis.meta.description && (
                  <div className="bg-white dark:bg-zinc-900 rounded-lg border border-zinc-200 dark:border-zinc-800 p-4">
                    <h5 className="font-semibold text-zinc-900 dark:text-white mb-2">📋 Meta Description</h5>
                    <p className="text-sm text-zinc-600 dark:text-zinc-400">
                      {crawlResult.htmlAnalysis.meta.description}
                    </p>
                  </div>
                )}

                <div className="bg-zinc-50 dark:bg-zinc-950 rounded-lg border border-zinc-200 dark:border-zinc-800 p-4">
                  <p className="text-sm text-zinc-600 dark:text-zinc-400 text-center">
                    🚀 <strong>Next:</strong> This crawl data will be used by AI analysis (CLD-65) to generate actionable recommendations for conversion optimization.
                  </p>
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      <div className="bg-blue-50 dark:bg-blue-950 rounded-lg border border-blue-200 dark:border-blue-800 p-6">
        <h4 className="text-md font-semibold text-blue-900 dark:text-blue-100 mb-2">
          What happens next?
        </h4>
        <div className="text-sm text-blue-800 dark:text-blue-200 space-y-2">
          <p>1. <strong>URL Validation:</strong> We check if your URL is accessible and determine the page type</p>
          <p>2. <strong>Content Analysis:</strong> Our system scans the page structure, content, and design elements</p>
          <p>3. <strong>AI-Powered Insights:</strong> Advanced AI analyzes conversion psychology and UX opportunities</p>
          <p>4. <strong>Actionable Reports:</strong> You&apos;ll receive detailed recommendations with implementation guidance</p>
        </div>
      </div>
    </div>
  );
}