'use client';

import { useState } from 'react';
import { Button } from '@/components/button';
import { Input } from '@/components/input';
import { Fieldset, FieldGroup, Field, Label } from '@/components/fieldset';
import { Text } from '@/components/text';
import { Card, CardHeader, CardTitle, CardContent, CardFooter } from '@/components/card';
import { validatePrimaryDomain, getRootDomain } from '@/lib/domain-validation';
import { Globe, CheckCircle, AlertCircle } from 'lucide-react';

interface PrimaryDomainSetupProps {
  currentDomain?: string | null;
  suggestedDomain?: string;
  onDomainSet?: (domain: string) => void;
  onCancel?: () => void;
  isLoading?: boolean;
}

export function PrimaryDomainSetup({ 
  currentDomain, 
  suggestedDomain, 
  onDomainSet, 
  onCancel,
  isLoading = false 
}: PrimaryDomainSetupProps) {
  const [domain, setDomain] = useState(suggestedDomain || currentDomain || '');
  const [validationError, setValidationError] = useState<string | null>(null);
  const [isValidating, setIsValidating] = useState(false);

  const handleDomainChange = (value: string) => {
    setDomain(value);
    setValidationError(null);
  };

  const handleSubmit = async () => {
    if (!domain.trim()) {
      setValidationError('Please enter a domain');
      return;
    }

    setIsValidating(true);
    
    // Clean the domain (remove protocols, paths, etc.)
    let cleanDomain = domain.trim().toLowerCase();
    cleanDomain = cleanDomain.replace(/^https?:\/\//, '');
    cleanDomain = cleanDomain.replace(/\/.*$/, '');
    cleanDomain = getRootDomain(cleanDomain);

    // Validate the domain
    const validation = validatePrimaryDomain(cleanDomain);
    
    if (!validation.valid) {
      setValidationError(validation.error || 'Invalid domain');
      setIsValidating(false);
      return;
    }

    // Call the callback with the clean domain
    onDomainSet?.(cleanDomain);
    setIsValidating(false);
  };

  const isEditing = !!currentDomain;

  return (
    <Card className="max-w-md">
      <CardHeader className="text-center">
        <div className="mx-auto mb-4 p-3 bg-blue-100 rounded-full w-fit">
          <Globe className="h-8 w-8 text-blue-600" />
        </div>
        <CardTitle className="text-xl">
          {isEditing ? 'Update Primary Domain' : 'Set Your Primary Domain'}
        </CardTitle>
        <Text className="text-base text-gray-600">
          {isEditing 
            ? 'Change your primary website domain' 
            : 'Basic plan users can scan unlimited pages from one website domain'
          }
        </Text>
      </CardHeader>

      <CardContent>
        <Fieldset>
          <FieldGroup>
            <Field>
              <Label htmlFor="domain">Website Domain</Label>
              <Input
                id="domain"
                type="text"
                value={domain}
                onChange={(e) => handleDomainChange(e.target.value)}
                placeholder="example.com"
                invalid={!!validationError}
              />
              {validationError && (
                <div className="flex items-center gap-2 mt-2 text-red-600">
                  <AlertCircle className="h-4 w-4" />
                  <Text className="text-sm">{validationError}</Text>
                </div>
              )}
              {!validationError && domain && (
                <div className="flex items-center gap-2 mt-2 text-green-600">
                  <CheckCircle className="h-4 w-4" />
                  <Text className="text-sm">
                    You&apos;ll be able to scan all pages on {getRootDomain(domain.toLowerCase())}
                  </Text>
                </div>
              )}
            </Field>
          </FieldGroup>
        </Fieldset>

        {suggestedDomain && !isEditing && (
          <div className="mt-4 p-3 bg-blue-50 rounded-lg border border-blue-200">
            <Text className="text-sm text-blue-800">
              <strong>Suggestion:</strong> Based on your scan attempt, we suggest setting{' '}
              <code className="bg-blue-100 px-1 py-0.5 rounded">{suggestedDomain}</code>{' '}
              as your primary domain.
            </Text>
          </div>
        )}

        <div className="mt-4 p-3 bg-gray-50 rounded-lg">
          <Text className="text-sm text-gray-600">
            <strong>Note:</strong> You can scan any page within your domain (including subdomains).
            For example, if you set &ldquo;example.com&rdquo;, you can scan www.example.com, shop.example.com, 
            and any page like example.com/products.
          </Text>
        </div>
      </CardContent>

      <CardFooter className="flex gap-2">
        <Button 
          onClick={handleSubmit}
          disabled={!domain.trim() || isValidating || isLoading}
          className="flex-1"
        >
          {isValidating || isLoading ? 'Setting...' : isEditing ? 'Update Domain' : 'Set Domain'}
        </Button>
        {onCancel && (
          <Button 
            onClick={onCancel}
            outline
            disabled={isValidating || isLoading}
          >
            Cancel
          </Button>
        )}
      </CardFooter>
    </Card>
  );
}