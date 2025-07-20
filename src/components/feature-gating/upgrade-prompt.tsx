'use client';

import { Button } from '@/components/ui/button';
import { 
  Card, 
  CardContent, 
  CardDescription, 
  CardFooter, 
  CardHeader, 
  CardTitle 
} from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { 
  Zap, 
  Users, 
  BarChart3, 
  Globe, 
  CheckCircle, 
  ArrowRight,
  Star,
  Lock
} from 'lucide-react';
import { FeatureKey } from '@/lib/feature-gate';
import Link from 'next/link';

interface UpgradePromptProps {
  featureKey: FeatureKey;
  title?: string;
  description?: string;
  size?: 'sm' | 'md' | 'lg';
  variant?: 'card' | 'banner' | 'modal' | 'inline';
  showFeatureList?: boolean;
  className?: string;
}

const FEATURE_METADATA: Record<FeatureKey, {
  title: string;
  description: string;
  icon: React.ComponentType<{ className?: string }>;
  benefits: string[];
  planRequired: string;
}> = {
  multiple_websites: {
    title: 'Multiple Websites',
    description: 'Track and optimize unlimited websites with Pro',
    icon: Globe,
    benefits: ['Unlimited website tracking', 'Compare performance across sites', 'Centralized dashboard'],
    planRequired: 'Pro',
  },
  task_management: {
    title: 'Task Management',
    description: 'Track implementation progress with our Pro task system',
    icon: CheckCircle,
    benefits: ['Recommendation tracking', 'Progress monitoring', 'Implementation roadmaps'],
    planRequired: 'Pro',
  },
  team_collaboration: {
    title: 'Team Collaboration',
    description: 'Collaborate with team members and share insights',
    icon: Users,
    benefits: ['Team member invites', 'Shared dashboards', 'Role-based permissions'],
    planRequired: 'Pro',
  },
  integrations: {
    title: 'Advanced Integrations',
    description: 'Connect with GA4, Shopify, and other platforms',
    icon: Zap,
    benefits: ['Google Analytics 4 integration', 'E-commerce platform sync', 'CRM connections'],
    planRequired: 'Pro',
  },
  advanced_reports: {
    title: 'Advanced Reports',
    description: 'Get detailed insights and custom branding',
    icon: BarChart3,
    benefits: ['12-month report history', 'Custom branded reports', 'Advanced analytics'],
    planRequired: 'Pro',
  },
  custom_branding: {
    title: 'Custom Branding',
    description: 'White-label reports with your brand',
    icon: Star,
    benefits: ['Custom logo and colors', 'Branded report exports', 'Client-ready presentations'],
    planRequired: 'Pro',
  },
  priority_support: {
    title: 'Priority Support',
    description: 'Get priority email and chat support',
    icon: Zap,
    benefits: ['Priority email support', 'Live chat access', 'Phone support'],
    planRequired: 'Pro',
  },
  unlimited_scans: {
    title: 'Unlimited Scans',
    description: 'Run unlimited website scans and analyses',
    icon: BarChart3,
    benefits: ['Unlimited monthly scans', 'Real-time monitoring', 'Automated scheduling'],
    planRequired: 'Pro',
  },
  api_access: {
    title: 'API Access',
    description: 'Integrate with your existing tools and workflows',
    icon: Zap,
    benefits: ['REST API access', 'Webhook notifications', 'Custom integrations'],
    planRequired: 'Pro',
  },
  white_label: {
    title: 'White Label',
    description: 'Completely rebrand the platform for your agency',
    icon: Star,
    benefits: ['Complete white labeling', 'Custom domain', 'Agency dashboard'],
    planRequired: 'Enterprise',
  },
};

export function UpgradePrompt({ 
  featureKey, 
  title, 
  description, 
  size = 'md',
  variant = 'card',
  showFeatureList = true,
  className = '' 
}: UpgradePromptProps) {
  const feature = FEATURE_METADATA[featureKey];
  const displayTitle = title || feature.title;
  const displayDescription = description || feature.description;
  const IconComponent = feature.icon;

  if (variant === 'banner') {
    return (
      <div className={`bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200 rounded-lg p-4 ${className}`}>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-blue-100 rounded-lg">
              <IconComponent className="h-5 w-5 text-blue-600" />
            </div>
            <div>
              <h4 className="font-medium text-gray-900">{displayTitle}</h4>
              <p className="text-sm text-gray-600">{displayDescription}</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Badge variant="secondary" className="bg-blue-100 text-blue-800">
              {feature.planRequired} Feature
            </Badge>
            <Button asChild size="sm">
              <Link href="/dashboard/billing">
                Upgrade <ArrowRight className="ml-1 h-4 w-4" />
              </Link>
            </Button>
          </div>
        </div>
      </div>
    );
  }

  if (variant === 'inline') {
    return (
      <div className={`flex items-center gap-2 p-3 bg-gray-50 rounded-lg border ${className}`}>
        <Lock className="h-4 w-4 text-gray-400" />
        <span className="text-sm text-gray-600">{displayDescription}</span>
        <Button asChild size="sm" variant="outline">
          <Link href="/dashboard/billing">Upgrade</Link>
        </Button>
      </div>
    );
  }

  const cardSize = {
    sm: 'max-w-sm',
    md: 'max-w-md',
    lg: 'max-w-lg',
  }[size];

  return (
    <Card className={`${cardSize} ${className}`}>
      <CardHeader className="text-center">
        <div className="mx-auto mb-4 p-3 bg-blue-100 rounded-full w-fit">
          <IconComponent className="h-8 w-8 text-blue-600" />
        </div>
        <CardTitle className="text-xl">{displayTitle}</CardTitle>
        <CardDescription className="text-base">
          {displayDescription}
        </CardDescription>
        <Badge variant="secondary" className="w-fit mx-auto bg-blue-100 text-blue-800">
          {feature.planRequired} Feature
        </Badge>
      </CardHeader>
      
      {showFeatureList && (
        <CardContent>
          <div className="space-y-2">
            <h4 className="font-medium text-sm text-gray-900 mb-3">What you&apos;ll get:</h4>
            <ul className="space-y-2">
              {feature.benefits.map((benefit, index) => (
                <li key={index} className="flex items-center gap-2">
                  <CheckCircle className="h-4 w-4 text-green-500" />
                  <span className="text-sm text-gray-700">{benefit}</span>
                </li>
              ))}
            </ul>
          </div>
        </CardContent>
      )}
      
      <CardFooter className="flex flex-col gap-2">
        <Button asChild className="w-full">
          <Link href="/dashboard/billing">
            Upgrade to {feature.planRequired}
            <ArrowRight className="ml-2 h-4 w-4" />
          </Link>
        </Button>
        <Button asChild variant="outline" size="sm" className="w-full">
          <Link href="/dashboard/billing">
            Compare Plans
          </Link>
        </Button>
      </CardFooter>
    </Card>
  );
}

interface FeaturePreviewProps {
  featureKey: FeatureKey;
  children: React.ReactNode;
  fallback?: React.ReactNode;
  showUpgradePrompt?: boolean;
}

export function FeaturePreview({ 
  featureKey, 
  children, 
  fallback,
  showUpgradePrompt = true 
}: FeaturePreviewProps) {
  const feature = FEATURE_METADATA[featureKey];
  
  return (
    <div className="relative">
      {/* Blurred preview content */}
      <div className="filter blur-sm pointer-events-none opacity-50">
        {children}
      </div>
      
      {/* Overlay with upgrade prompt */}
      <div className="absolute inset-0 flex items-center justify-center bg-white/80 backdrop-blur-sm">
        {showUpgradePrompt ? (
          <UpgradePrompt 
            featureKey={featureKey}
            size="sm"
            showFeatureList={false}
          />
        ) : (
          fallback || (
            <div className="text-center p-4">
              <Lock className="h-8 w-8 text-gray-400 mx-auto mb-2" />
              <h3 className="font-medium text-gray-900">{feature.title}</h3>
              <p className="text-sm text-gray-600 mb-3">{feature.description}</p>
              <Button asChild>
                <Link href="/dashboard/billing">Unlock Feature</Link>
              </Button>
            </div>
          )
        )}
      </div>
    </div>
  );
}