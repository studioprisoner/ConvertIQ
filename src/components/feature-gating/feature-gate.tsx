'use client';

import { useFeatureGate } from '@/hooks/use-feature-gate';
import { UpgradePrompt, FeaturePreview } from './upgrade-prompt';
import { FeatureKey } from '@/lib/feature-gate';
import { Skeleton } from '@/components/ui/skeleton';

interface FeatureGateProps {
  featureKey: FeatureKey;
  children: React.ReactNode;
  fallback?: React.ReactNode;
  showUpgradePrompt?: boolean;
  variant?: 'block' | 'preview' | 'redirect';
  loadingComponent?: React.ReactNode;
}

/**
 * Feature gate component that conditionally renders content based on user's plan
 */
export function FeatureGate({ 
  featureKey, 
  children, 
  fallback,
  showUpgradePrompt = true,
  variant = 'block',
  loadingComponent
}: FeatureGateProps) {
  const { hasAccess, loading } = useFeatureGate(featureKey);

  // Show loading state
  if (loading) {
    return loadingComponent || (
      <div className="space-y-3">
        <Skeleton className="h-4 w-3/4" />
        <Skeleton className="h-4 w-1/2" />
        <Skeleton className="h-8 w-32" />
      </div>
    );
  }

  // User has access - render children
  if (hasAccess) {
    return <>{children}</>;
  }

  // User doesn't have access - handle different variants
  if (variant === 'preview') {
    return (
      <FeaturePreview 
        featureKey={featureKey} 
        showUpgradePrompt={showUpgradePrompt}
        fallback={fallback}
      >
        {children}
      </FeaturePreview>
    );
  }

  if (variant === 'redirect') {
    // For navigation guards - could redirect or show different content
    return fallback || (
      <div className="text-center py-8">
        <h2 className="text-xl font-semibold mb-2">Access Restricted</h2>
        <p className="text-gray-600 mb-4">This feature requires a higher plan.</p>
        {showUpgradePrompt && (
          <UpgradePrompt 
            featureKey={featureKey} 
            size="sm"
          />
        )}
      </div>
    );
  }

  // Default 'block' variant
  return showUpgradePrompt ? (
    <UpgradePrompt 
      featureKey={featureKey}
      variant="banner"
    />
  ) : (
    fallback || null
  );
}

interface UsageMeterProps {
  featureKey: FeatureKey;
  className?: string;
}

/**
 * Display usage meter for count/usage-based features
 */
export function UsageMeter({ featureKey, className = '' }: UsageMeterProps) {
  const { currentUsage, limit, usagePercentage, hasAccess, loading } = useFeatureGate(featureKey);

  if (loading) {
    return <Skeleton className={`h-2 w-full ${className}`} />;
  }

  if (!hasAccess || limit === null || limit === undefined) {
    return null;
  }

  const percentage = usagePercentage || 0;
  const isNearLimit = percentage >= 80;
  const isAtLimit = percentage >= 100;

  return (
    <div className={`space-y-1 ${className}`}>
      <div className="flex justify-between text-xs text-gray-600">
        <span>{currentUsage || 0} used</span>
        <span>{limit} limit</span>
      </div>
      <div className="w-full bg-gray-200 rounded-full h-2">
        <div 
          className={`h-2 rounded-full transition-all duration-300 ${
            isAtLimit 
              ? 'bg-red-500' 
              : isNearLimit 
                ? 'bg-yellow-500' 
                : 'bg-green-500'
          }`}
          style={{ width: `${Math.min(percentage, 100)}%` }}
        />
      </div>
      {isNearLimit && (
        <p className={`text-xs ${isAtLimit ? 'text-red-600' : 'text-yellow-600'}`}>
          {isAtLimit 
            ? 'Limit reached - upgrade to continue' 
            : 'Approaching limit'
          }
        </p>
      )}
    </div>
  );
}

interface FeatureListProps {
  features: FeatureKey[];
  title?: string;
  className?: string;
}

/**
 * Display a list of features with their access status
 */
export function FeatureList({ features, title, className = '' }: FeatureListProps) {
  return (
    <div className={`space-y-3 ${className}`}>
      {title && <h3 className="font-medium text-gray-900">{title}</h3>}
      <div className="space-y-2">
        {features.map((featureKey) => (
          <FeatureStatus key={featureKey} featureKey={featureKey} />
        ))}
      </div>
    </div>
  );
}

interface FeatureStatusProps {
  featureKey: FeatureKey;
  showUsage?: boolean;
}

function FeatureStatus({ featureKey, showUsage = true }: FeatureStatusProps) {
  const { hasAccess, currentUsage, limit, loading } = useFeatureGate(featureKey);

  if (loading) {
    return <Skeleton className="h-4 w-full" />;
  }

  const featureNames: Record<FeatureKey, string> = {
    multiple_websites: 'Multiple Websites',
    task_management: 'Task Management',
    team_collaboration: 'Team Collaboration',
    integrations: 'Integrations',
    advanced_reports: 'Advanced Reports',
    custom_branding: 'Custom Branding',
    priority_support: 'Priority Support',
    unlimited_scans: 'Unlimited Scans',
    api_access: 'API Access',
    white_label: 'White Label',
  };

  return (
    <div className="flex items-center justify-between">
      <span className="text-sm text-gray-700">{featureNames[featureKey]}</span>
      <div className="flex items-center gap-2">
        {showUsage && (currentUsage !== undefined && limit !== null) && (
          <span className="text-xs text-gray-500">
            {currentUsage}/{limit === -1 ? '∞' : limit}
          </span>
        )}
        <span className={`text-xs px-2 py-1 rounded-full ${
          hasAccess 
            ? 'bg-green-100 text-green-800' 
            : 'bg-gray-100 text-gray-800'
        }`}>
          {hasAccess ? 'Available' : 'Upgrade Required'}
        </span>
      </div>
    </div>
  );
}