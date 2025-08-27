'use client';

import { useState } from 'react';
import { Button } from '@/components/button';
import { Input } from '@/components/input';
import { Fieldset, FieldGroup, Field, Label } from '@/components/fieldset';
import { Select } from '@/components/select';
import { Text } from '@/components/text';
import { detectPageType, type UrlValidationInput } from '@/lib/url-validation';
import { trpc } from '@/lib/trpc/client';
import { useSession } from '@/lib/auth-client';
import { useSubscriptionStatus } from '@/hooks/use-feature-gate';
import { PrimaryDomainSetup } from '@/components/primary-domain-setup';
import { extractDomain } from '@/lib/domain-validation';
import { AlertCircle, CheckCircle, Globe } from 'lucide-react';

interface UrlScannerProps {
  onScanStart?: (data: UrlValidationInput & { detectedPageType: string }) => void;
  onValidationResult?: (result: { isValid: boolean; message?: string; error?: string; requiresPrimaryDomain?: boolean }) => void;
}

export function UrlScanner({ onScanStart, onValidationResult }: UrlScannerProps) {
  const [url, setUrl] = useState('');
  const [pageType, setPageType] = useState<string>('auto');
  const [validationMessage, setValidationMessage] = useState<string | null>(null);
  const [validationError, setValidationError] = useState<string | null>(null);
  const [detectedPageType, setDetectedPageType] = useState<string | null>(null);
  const [showPrimaryDomainSetup, setShowPrimaryDomainSetup] = useState(false);
  const [suggestedDomain, setSuggestedDomain] = useState<string | null>(null);
  
  // Session and subscription data
  const { data: session } = useSession();
  const { currentPlan } = useSubscriptionStatus();
  const trpcUtils = trpc.useUtils();

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

  const validateUrlMutation = trpc.url.validateWithUser.useMutation({
    onSuccess: (result) => {
      if (result.isValid) {
        setValidationMessage(result.message || 'URL is valid and ready to scan');
        setDetectedPageType(result.pageType);
        setValidationError(null);
        setShowPrimaryDomainSetup(false);
        setSuggestedDomain(null);
        onValidationResult?.({ isValid: true, message: result.message });
      } else {
        setValidationError(result.error || 'URL validation failed');
        setValidationMessage(null);
        
        // Handle domain validation errors
        if (result.requiresPrimaryDomain && result.suggestedDomain) {
          setSuggestedDomain(result.suggestedDomain);
          setShowPrimaryDomainSetup(true);
        }
        
        onValidationResult?.({ 
          isValid: false, 
          error: result.error,
          requiresPrimaryDomain: result.requiresPrimaryDomain 
        });
      }
    },
    onError: (error) => {
      const errorMessage = error.message || 'Failed to validate URL. Please try again.';
      setValidationError(errorMessage);
      setValidationMessage(null);
      onValidationResult?.({ isValid: false, error: errorMessage });
    },
  });

  // Mutation for updating user's primary domain
  const updatePrimaryDomainMutation = trpc.user.updatePrimaryDomain.useMutation({
    onSuccess: (result) => {
      console.log('Primary domain updated successfully:', result);
      setShowPrimaryDomainSetup(false);
      setSuggestedDomain(null);
      
      // Invalidate user profile cache to ensure fresh data
      trpcUtils.user.getProfile.invalidate();
      
      // Add a small delay to ensure database transaction is committed
      setTimeout(() => {
        console.log('Re-validating URL after domain update...');
        if (url) {
          handleValidation();
        }
      }, 100);
    },
    onError: (error) => {
      console.error('Failed to set primary domain:', error);
      setValidationError(error.message || 'Failed to set primary domain');
    },
  });


  const handleUrlChange = (value: string) => {
    setUrl(value);
    setValidationMessage(null);
    setValidationError(null);
    setShowPrimaryDomainSetup(false);
    setSuggestedDomain(null);
    
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

  const handlePrimaryDomainSet = (domain: string) => {
    updatePrimaryDomainMutation.mutate({ primaryDomain: domain });
  };

  const handlePrimaryDomainCancel = () => {
    setShowPrimaryDomainSetup(false);
    setSuggestedDomain(null);
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
  const userPlan = currentPlan || 'basic';

  // Show primary domain setup if needed
  if (showPrimaryDomainSetup) {
    return (
      <div className="space-y-6">
        <div className="text-center">
          <Text className="text-lg font-medium">Set Your Primary Domain</Text>
          <Text className="text-sm text-gray-600 mt-1">
            Basic plan allows unlimited scans for one website domain
          </Text>
        </div>
        
        <div className="flex justify-center">
          <PrimaryDomainSetup
            suggestedDomain={suggestedDomain || undefined}
            onDomainSet={handlePrimaryDomainSet}
            onCancel={handlePrimaryDomainCancel}
            isLoading={updatePrimaryDomainMutation.isPending}
          />
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Plan and Domain Status */}
      {userPlan === 'basic' && session?.user && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <div className="flex items-center gap-3">
            <Globe className="h-5 w-5 text-blue-600" />
            <div>
              <Text className="font-medium text-blue-900">Basic Plan</Text>
              <Text className="text-sm text-blue-700">
                {session.user.primaryDomain 
                  ? `Scanning allowed for: ${session.user.primaryDomain}` 
                  : 'Unlimited scans for one domain - set your primary domain with your first scan'
                }
              </Text>
            </div>
          </div>
        </div>
      )}

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
          <div className="flex items-start gap-2">
            <AlertCircle className="h-4 w-4 mt-0.5 flex-shrink-0" />
            <div>
              <strong>Validation Error:</strong> {validationError}
              {suggestedDomain && (
                <div className="mt-2">
                  <Button
                    onClick={() => setShowPrimaryDomainSetup(true)}
                    color="red"
                    className="text-xs"
                  >
                    Set {suggestedDomain} as Primary Domain
                  </Button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {validationMessage && (
        <div className="rounded-lg border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-800 dark:border-green-800 dark:bg-green-950 dark:text-green-200">
          <div className="flex items-center gap-2">
            <CheckCircle className="h-4 w-4 flex-shrink-0" />
            <div>
              <strong>Success:</strong> {validationMessage}
            </div>
          </div>
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