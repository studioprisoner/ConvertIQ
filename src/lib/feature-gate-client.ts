// Client-side feature gating functions that call API routes

export type FeatureKey = 
  | 'multiple_websites'
  | 'task_management'
  | 'team_collaboration'
  | 'integrations'
  | 'advanced_reports'
  | 'custom_branding'
  | 'priority_support'
  | 'unlimited_scans'
  | 'api_access'
  | 'white_label';

export type FeatureType = 'boolean' | 'count' | 'usage';

export interface FeatureGateResult {
  hasAccess: boolean;
  upgradeRequired: boolean;
  currentUsage?: number;
  limit?: number;
  usagePercentage?: number;
  reason?: string;
  featureType: FeatureType;
}

/**
 * Client-side function to check feature access via API
 */
export async function checkFeatureAccess(featureKey: FeatureKey): Promise<FeatureGateResult> {
  try {
    const response = await fetch(`/api/feature-gate?feature=${featureKey}`);
    if (!response.ok) {
      throw new Error('Failed to check feature access');
    }
    
    const data = await response.json();
    return data.result;
  } catch (error) {
    console.error('Error checking feature access:', error);
    return {
      hasAccess: false,
      upgradeRequired: true,
      reason: 'Error checking access',
      featureType: 'boolean',
    };
  }
}

/**
 * Client-side function to get all feature access statuses via API
 */
export async function getUserFeatureMap(): Promise<Record<FeatureKey, FeatureGateResult>> {
  try {
    const response = await fetch('/api/feature-gate?all=true');
    if (!response.ok) {
      throw new Error('Failed to get feature map');
    }
    
    const data = await response.json();
    return data.featureMap;
  } catch (error) {
    console.error('Error getting feature map:', error);
    return {} as Record<FeatureKey, FeatureGateResult>;
  }
}