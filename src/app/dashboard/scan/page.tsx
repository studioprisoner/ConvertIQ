'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Heading } from '@/components/heading';
import { Text } from '@/components/text';
import { UrlScanner } from '@/components/url-scanner';
import { trpc } from '@/lib/trpc/client';
import type { UrlValidationInput } from '@/lib/url-validation';

import type { CrawlResult } from '@/lib/crawler/types';
import type { AIAnalysisResult } from '@/lib/ai/types';

export default function ScanPage() {
  const router = useRouter();
  const [isProcessing, setIsProcessing] = useState(false);
  const [processingMessage, setProcessingMessage] = useState<string | null>(null);
  const [crawlResult, setCrawlResult] = useState<CrawlResult | null>(null);
  const [aiAnalysisResult, setAiAnalysisResult] = useState<AIAnalysisResult | null>(null);
  const [currentWebsiteId, setCurrentWebsiteId] = useState<string | null>(null);

  const websiteCreateMutation = trpc.websites.createOrGet.useMutation({
    onSuccess: (website) => {
      console.log('📝 Website created/found:', website);
      console.log('🔍 Setting websiteId:', website.id);
      setCurrentWebsiteId(website.id);
      setProcessingMessage('✅ Website registered! Starting content crawl...');
      
      // Now start the crawling process
      crawlMutation.mutate({
        url: website.url,
        options: {
          timeout: 30000,
          followRedirects: true,
          respectRobots: true,
          includeRawHtml: false, // Don't include raw HTML to save space
        },
      });
    },
    onError: (error) => {
      console.error('📝 Website creation failed:', error);
      setProcessingMessage(`❌ Website registration failed: ${error.message}`);
      setIsProcessing(false);
    },
  });

  const aiAnalysisMutation = trpc.ai.analyze.useMutation({
    onSuccess: (result) => {
      console.log('🤖 AI analysis completed successfully:', result);
      setAiAnalysisResult(result);
      setProcessingMessage('🎉 AI analysis complete! Redirecting to full dashboard...');
      setIsProcessing(false);
      
      // Automatically redirect to reports dashboard after 2 seconds
      setTimeout(() => {
        if (currentWebsiteId) {
          router.push(`/dashboard/reports?websiteId=${currentWebsiteId}`);
        } else {
          console.warn('No websiteId available for redirect');
          router.push('/dashboard/reports');
        }
      }, 2000);
    },
    onError: (error) => {
      console.error('🤖 AI analysis failed:', error);
      setProcessingMessage(`❌ AI analysis failed: ${error.message}`);
      setIsProcessing(false);
    },
  });

  const crawlMutation = trpc.url.crawl.useMutation({
    onSuccess: (result) => {
      console.log('🕷️ Crawl completed successfully:', result);
      setCrawlResult(result);
      setProcessingMessage('✅ Website crawling completed! Starting AI analysis...');
      
      // Use the actual website ID and enable database saving
      if (!currentWebsiteId) {
        setProcessingMessage('❌ Error: Website ID not found. Please try again.');
        setIsProcessing(false);
        return;
      }

      aiAnalysisMutation.mutate({
        crawlData: result,
        websiteId: currentWebsiteId,
        analysisType: 'comprehensive',
        saveToDb: true, // Enable DB save with real website ID
      });
    },
    onError: (error) => {
      console.error('🕷️ Crawl failed:', error);
      setProcessingMessage(`❌ Crawling failed: ${error.message}`);
      setIsProcessing(false);
    },
  });

  const handleScanStart = async (data: UrlValidationInput & { detectedPageType: string }) => {
    setIsProcessing(true);
    setProcessingMessage('📝 Registering website...');
    setCrawlResult(null);
    setAiAnalysisResult(null);
    setCurrentWebsiteId(null);

    try {
      console.log('🚀 Starting scan for:', data);
      
      // First, create or get the website record
      websiteCreateMutation.mutate({
        url: data.url,
        pageType: data.detectedPageType,
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
            
            {(crawlMutation.isPending || aiAnalysisMutation.isPending) && (
              <div className="flex items-center justify-center py-8">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                <span className="ml-3 text-sm text-zinc-600 dark:text-zinc-400">
                  {crawlMutation.isPending ? 'Crawling website...' : 'Running AI analysis...'}
                </span>
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

                {aiAnalysisResult && (
                  <div className="space-y-6">
                    <div className="border border-blue-200 bg-blue-50 rounded-lg p-4 dark:border-blue-800 dark:bg-blue-950">
                      <h4 className="font-semibold text-blue-900 dark:text-blue-100 mb-3">
                        🤖 AI Analysis Results
                      </h4>
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
                        <div className="text-center">
                          <div className="text-2xl font-bold text-blue-900 dark:text-blue-100">
                            {aiAnalysisResult.overallScore}/10
                          </div>
                          <div className="text-sm text-blue-700 dark:text-blue-200">Overall Score</div>
                        </div>
                        <div className="text-center">
                          <div className="text-2xl font-bold text-blue-900 dark:text-blue-100">
                            {aiAnalysisResult.recommendations.length}
                          </div>
                          <div className="text-sm text-blue-700 dark:text-blue-200">Recommendations</div>
                        </div>
                        <div className="text-center">
                          <div className="text-2xl font-bold text-blue-900 dark:text-blue-100">
                            {aiAnalysisResult.keyInsights.length}
                          </div>
                          <div className="text-sm text-blue-700 dark:text-blue-200">Key Insights</div>
                        </div>
                      </div>
                      <div className="text-sm text-blue-800 dark:text-blue-200">
                        <p><strong>Summary:</strong> {aiAnalysisResult.summary}</p>
                      </div>
                    </div>

                    {aiAnalysisResult.recommendations.length > 0 && (
                      <div className="bg-white dark:bg-zinc-900 rounded-lg border border-zinc-200 dark:border-zinc-800 p-6">
                        <h5 className="font-semibold text-zinc-900 dark:text-white mb-4">
                          🎯 Top Recommendations
                        </h5>
                        <div className="space-y-4">
                          {aiAnalysisResult.recommendations.slice(0, 3).map((rec) => (
                            <div key={rec.id} className="border border-zinc-200 dark:border-zinc-700 rounded-lg p-4">
                              <div className="flex items-start justify-between mb-2">
                                <h6 className="font-medium text-zinc-900 dark:text-white">{rec.title}</h6>
                                <div className="flex items-center space-x-2">
                                  <span className={`px-2 py-1 text-xs rounded-full ${
                                    rec.priority === 'high' ? 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200' :
                                    rec.priority === 'medium' ? 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200' :
                                    'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200'
                                  }`}>
                                    {rec.priority} priority
                                  </span>
                                </div>
                              </div>
                              <p className="text-sm text-zinc-600 dark:text-zinc-400 mb-3">{rec.description}</p>
                              <div className="grid grid-cols-2 gap-4 text-xs">
                                <div>
                                  <span className="font-medium">Impact:</span> {rec.impact.score}/10 ({rec.impact.category})
                                </div>
                                <div>
                                  <span className="font-medium">Effort:</span> {rec.effort.score}/10 ({rec.effort.category})
                                </div>
                              </div>
                              <div className="mt-3 text-sm text-zinc-700 dark:text-zinc-300">
                                <span className="font-medium">Why it matters:</span> {rec.whyItMatters}
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {aiAnalysisResult.keyInsights.length > 0 && (
                      <div className="bg-white dark:bg-zinc-900 rounded-lg border border-zinc-200 dark:border-zinc-800 p-6">
                        <h5 className="font-semibold text-zinc-900 dark:text-white mb-4">
                          💡 Key Insights
                        </h5>
                        <ul className="space-y-2">
                          {aiAnalysisResult.keyInsights.map((insight, index) => (
                            <li key={index} className="text-sm text-zinc-600 dark:text-zinc-400 flex items-start">
                              <span className="w-2 h-2 bg-blue-500 rounded-full mt-2 mr-3 flex-shrink-0"></span>
                              {insight}
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}

                    <div className="bg-green-50 dark:bg-green-950 rounded-lg border border-green-200 dark:border-green-800 p-4">
                      <p className="text-sm text-green-800 dark:text-green-200 text-center mb-4">
                        ✅ <strong>Analysis Complete!</strong> Your website has been analyzed by ConvertIQ AI. Implement the recommendations above to improve your conversion rates.
                      </p>
                      <div className="flex justify-center">
                        <button
                          onClick={() => {
                            console.log('Manual redirect clicked, websiteId:', currentWebsiteId);
                            if (currentWebsiteId) {
                              router.push(`/dashboard/reports?websiteId=${currentWebsiteId}`);
                            } else {
                              console.warn('No websiteId available, redirecting to general reports');
                              router.push('/dashboard/reports');
                            }
                          }}
                          className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-md text-sm font-medium"
                        >
                          View Full Dashboard
                          {currentWebsiteId && (
                            <span className="ml-2 text-xs opacity-75">
                              ({currentWebsiteId.slice(0, 8)}...)
                            </span>
                          )}
                        </button>
                      </div>
                    </div>
                  </div>
                )}

                {!aiAnalysisResult && crawlResult && (
                  <div className="bg-zinc-50 dark:bg-zinc-950 rounded-lg border border-zinc-200 dark:border-zinc-800 p-4">
                    <p className="text-sm text-zinc-600 dark:text-zinc-400 text-center">
                      🚀 <strong>Next:</strong> AI analysis is running to generate actionable recommendations for conversion optimization.
                    </p>
                  </div>
                )}
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