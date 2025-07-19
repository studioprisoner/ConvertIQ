'use client';

import { useState } from 'react';
import { Button } from '@/components/button';
import { Input } from '@/components/input';
import { Fieldset, FieldGroup, Field, Label } from '@/components/fieldset';
import { Select } from '@/components/select';
import { Text } from '@/components/text';
import { detectPageType, type UrlValidationInput } from '@/lib/url-validation';
import { trpc } from '@/lib/trpc/client';

interface UrlScannerProps {
  onScanStart?: (data: UrlValidationInput & { detectedPageType: string }) => void;
  onValidationResult?: (result: { isValid: boolean; message?: string; error?: string }) => void;
}

export function UrlScanner({ onScanStart, onValidationResult }: UrlScannerProps) {
  const [url, setUrl] = useState('');
  const [pageType, setPageType] = useState<string>('auto');
  const [validationMessage, setValidationMessage] = useState<string | null>(null);
  const [validationError, setValidationError] = useState<string | null>(null);
  const [detectedPageType, setDetectedPageType] = useState<string | null>(null);

  const pingQuery = trpc.url.ping.useQuery();
  
  // Debug ping query
  console.log('Ping query status:', pingQuery.status);
  console.log('Ping query data:', pingQuery.data);
  console.log('Ping query error:', pingQuery.error);
  
  const testMutation = trpc.url.test.useMutation({
    onSuccess: (result) => {
      console.log('Test mutation success:', result);
    },
    onError: (error) => {
      console.log('Test mutation error:', error);
    },
  });

  const validateUrlMutation = trpc.url.validate.useMutation({
    onSuccess: (result) => {
      if (result.isValid) {
        setValidationMessage(result.message || 'URL is valid and ready to scan');
        setDetectedPageType(result.pageType);
        setValidationError(null);
        onValidationResult?.({ isValid: true, message: result.message });
      } else {
        setValidationError(result.error || 'URL validation failed');
        setValidationMessage(null);
        onValidationResult?.({ isValid: false, error: result.error });
      }
    },
    onError: (error) => {
      const errorMessage = error.message || 'Failed to validate URL. Please try again.';
      setValidationError(errorMessage);
      setValidationMessage(null);
      onValidationResult?.({ isValid: false, error: errorMessage });
    },
  });


  const handleUrlChange = (value: string) => {
    setUrl(value);
    setValidationMessage(null);
    setValidationError(null);
    
    // Auto-detect page type when URL changes
    if (value && pageType === 'auto') {
      try {
        const detected = detectPageType(value);
        setDetectedPageType(detected);
      } catch {
        setDetectedPageType(null);
      }
    }
  };

  const handleValidation = async () => {
    // First test if tRPC is working at all
    console.log('Testing tRPC connection...');
    testMutation.mutate({ message: 'test' });

    // Client-side validation first
    const validationInput = {
      url,
      ...(pageType !== 'auto' && { pageType }),
    };

    console.log('Client validation input:', validationInput);

    // Simple client-side URL validation
    try {
      new URL(url);
    } catch {
      const error = 'Please enter a valid URL';
      console.log('Client validation failed:', error);
      setValidationError(error);
      onValidationResult?.({ isValid: false, error });
      return;
    }

    console.log('Client validation passed, sending to tRPC...');
    
    // Server-side validation using tRPC
    validateUrlMutation.mutate(validationInput);
  };

  const handleScanStart = () => {
    if (!url) return;
    
    const finalPageType = pageType === 'auto' ? (detectedPageType || 'other') : pageType;
    
    onScanStart?.({
      url,
      pageType: finalPageType as 'homepage' | 'product' | 'service' | 'landing' | 'other',
      detectedPageType: detectedPageType || 'unknown',
    });
  };

  const isValidUrl = validationMessage && !validationError;

  return (
    <div className="space-y-6">
      <Fieldset>
        <FieldGroup>
          <Field>
            <Label>Website URL</Label>
            <Input
              type="url"
              placeholder="https://example.com"
              value={url}
              onChange={(e) => handleUrlChange(e.target.value)}
            />
            <Text className="text-sm text-zinc-600 dark:text-zinc-400">
              Enter the full URL of the webpage you want to analyze
            </Text>
          </Field>

          <Field>
            <Label>Page Type</Label>
            <Select
              value={pageType}
              onChange={(e) => setPageType(e.target.value)}
            >
              <option value="auto">Auto-detect</option>
              <option value="homepage">Homepage</option>
              <option value="product">Product Page</option>
              <option value="service">Service Page</option>
              <option value="landing">Landing Page</option>
              <option value="other">Other</option>
            </Select>
            {detectedPageType && pageType === 'auto' && (
              <Text className="text-sm text-zinc-600 dark:text-zinc-400">
                Detected: {detectedPageType}
              </Text>
            )}
          </Field>
        </FieldGroup>
      </Fieldset>

      {validationError && (
        <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800 dark:border-red-800 dark:bg-red-950 dark:text-red-200">
          <strong>Validation Error:</strong> {validationError}
        </div>
      )}

      {validationMessage && (
        <div className="rounded-lg border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-800 dark:border-green-800 dark:bg-green-950 dark:text-green-200">
          <strong>Success:</strong> {validationMessage}
        </div>
      )}

      <div className="flex gap-3">
        <Button
          type="button"
          onClick={handleValidation}
          disabled={!url || validateUrlMutation.isPending}
          color="zinc"
        >
          {validateUrlMutation.isPending ? 'Validating...' : 'Validate URL'}
        </Button>

        <Button
          type="button"
          onClick={handleScanStart}
          disabled={!isValidUrl}
          color="blue"
        >
          Start Scan
        </Button>
      </div>
    </div>
  );
}