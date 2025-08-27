'use client';

import { useState, useEffect } from 'react';
import { useSession } from '@/lib/auth-client';
import { 
  FeatureKey, 
  FeatureGateResult, 
  checkFeatureAccess,
  getUserFeatureMap 
} from '@/lib/feature-gate-client';
import { 
  isPostPayment, 
  clearPaymentCompleted, 
  getRetryDelay, 
  MAX_RETRIES 
} from '@/lib/payment-timing-utils';

/**
 * Hook for checking access to a specific feature
 */
export function useFeatureGate(featureKey: FeatureKey) {
  const { data: session } = useSession();
  const [featureAccess, setFeatureAccess] = useState<FeatureGateResult>({
    hasAccess: false,
    upgradeRequired: true,
    featureType: 'boolean',
  });
  const [loading, setLoading] = useState(true);
  const [retryCount, setRetryCount] = useState(0);

  useEffect(() => {
    async function checkAccess() {
      if (!session?.user?.id) {
        setFeatureAccess({
          hasAccess: false,
          upgradeRequired: true,
          reason: 'User not authenticated',
          featureType: 'boolean',
        });
        setLoading(false);
        return;
      }

      try {
        const result = await checkFeatureAccess(featureKey);
        setFeatureAccess(result);
        
        // If access is denied and we're coming from payment success, retry with delay
        if (!result.hasAccess && retryCount < MAX_RETRIES) {
          const postPaymentState = isPostPayment();
             
          if (postPaymentState) {
            console.log(`🔄 Post-payment feature check retry ${retryCount + 1}/${MAX_RETRIES} for ${featureKey}`);
            setTimeout(() => {
              setRetryCount(prev => prev + 1);
            }, getRetryDelay(retryCount));
            return;
          }
        }
        
        // Clear payment flag after successful access or max retries
        if (result.hasAccess || retryCount >= MAX_RETRIES) {
          clearPaymentCompleted();
        }
      } catch (error) {
        console.error('Error checking feature access:', error);
        setFeatureAccess({
          hasAccess: false,
          upgradeRequired: true,
          reason: 'Error checking access',
          featureType: 'boolean',
        });
      } finally {
        setLoading(false);
      }
    }

    checkAccess();
  }, [session?.user?.id, featureKey, session?.sessionId, retryCount]);

  return {
    ...featureAccess,
    loading,
    isAuthenticated: !!session?.user?.id,
  };
}

/**
 * Hook for getting access status for multiple features
 */
export function useFeatureMap() {
  const { data: session } = useSession();
  const [featureMap, setFeatureMap] = useState<Record<FeatureKey, FeatureGateResult>>({} as Record<FeatureKey, FeatureGateResult>);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadFeatureMap() {
      if (!session?.user?.id) {
        setLoading(false);
        return;
      }

      try {
        const map = await getUserFeatureMap();
        setFeatureMap(map);
      } catch (error) {
        console.error('Error loading feature map:', error);
      } finally {
        setLoading(false);
      }
    }

    loadFeatureMap();
  }, [session?.user?.id]);

  return {
    featureMap,
    loading,
    isAuthenticated: !!session?.user?.id,
    
    // Helper functions
    hasAccess: (featureKey: FeatureKey) => featureMap[featureKey]?.hasAccess || false,
    needsUpgrade: (featureKey: FeatureKey) => featureMap[featureKey]?.upgradeRequired || false,
    getUsage: (featureKey: FeatureKey) => featureMap[featureKey]?.currentUsage,
    getLimit: (featureKey: FeatureKey) => featureMap[featureKey]?.limit,
    getUsagePercentage: (featureKey: FeatureKey) => featureMap[featureKey]?.usagePercentage || 0,
  };
}

/**
 * Hook for subscription status and usage tracking
 */
export function useSubscriptionStatus() {
  const { data: session } = useSession();
  const [subscriptionData, setSubscriptionData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadSubscriptionStatus() {
      if (!session?.user?.id) {
        setLoading(false);
        return;
      }

      try {
        const response = await fetch('/api/subscription');
        if (response.ok) {
          const data = await response.json();
          setSubscriptionData(data);
        }
      } catch (error) {
        console.error('Error loading subscription status:', error);
      } finally {
        setLoading(false);
      }
    }

    loadSubscriptionStatus();
  }, [session?.user?.id]);

  return {
    subscription: subscriptionData?.subscription,
    stats: subscriptionData?.stats,
    loading,
    isAuthenticated: !!session?.user?.id,
    
    // Helper getters
    currentPlan: subscriptionData?.subscription?.plan?.slug,
    planName: subscriptionData?.subscription?.plan?.name,
    isTrialing: subscriptionData?.stats?.isTrialing,
    daysUntilRenewal: subscriptionData?.stats?.daysUntilRenewal,
    usage: subscriptionData?.stats?.usage,
    limits: subscriptionData?.stats?.limits,
  };
}

/**
 * Higher-order hook that combines feature gating with action tracking
 */
export function useFeatureAction(featureKey: FeatureKey) {
  const featureGate = useFeatureGate(featureKey);
  
  const executeAction = async (action: () => Promise<void> | void) => {
    if (!featureGate.hasAccess) {
      // Could trigger upgrade prompt here
      console.warn(`Feature ${featureKey} not accessible:`, featureGate.reason);
      return false;
    }

    try {
      await action();
      
      // Track feature usage if it's a usage-based feature
      if (featureGate.featureType === 'count' || featureGate.featureType === 'usage') {
        // This would need to be implemented on the server side
        // since we're tracking usage in the database
      }
      
      return true;
    } catch (error) {
      console.error(`Error executing action for feature ${featureKey}:`, error);
      return false;
    }
  };

  return {
    ...featureGate,
    executeAction,
  };
}