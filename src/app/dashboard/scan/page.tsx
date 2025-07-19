'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Heading } from '@/components/heading';
import { Text } from '@/components/text';
import { UrlScanner } from '@/components/url-scanner';
import type { UrlValidationInput } from '@/lib/url-validation';

export default function ScanPage() {
  const router = useRouter();
  const [isProcessing, setIsProcessing] = useState(false);
  const [processingMessage, setProcessingMessage] = useState<string | null>(null);

  const handleScanStart = async (data: UrlValidationInput & { detectedPageType: string }) => {
    setIsProcessing(true);
    setProcessingMessage('Preparing to scan website...');

    try {
      // TODO: Implement actual scanning logic in future issues (CLD-64, CLD-65)
      // For now, we'll simulate the process and store the URL
      
      // Simulate processing delay
      await new Promise(resolve => setTimeout(resolve, 2000));
      setProcessingMessage('Website URL validated and stored. Scanning functionality coming soon!');
      
      // In the future, this will:
      // 1. Store the URL in the database
      // 2. Trigger the web crawling process (CLD-64)
      // 3. Run AI analysis (CLD-65)
      // 4. Generate reports (CLD-66)
      // 5. Redirect to results dashboard (CLD-67)
      
      console.log('Scan data:', data);
      
      // For now, redirect back to dashboard after a delay
      setTimeout(() => {
        router.push('/dashboard');
      }, 3000);
      
    } catch (error) {
      console.error('Scan error:', error);
      setProcessingMessage('Error occurred during scan preparation. Please try again.');
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
              <strong>Processing:</strong> {processingMessage}
            </div>
            <div className="flex items-center justify-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
            </div>
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