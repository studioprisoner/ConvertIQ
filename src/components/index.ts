// Centralized component exports following Firegeo patterns
// This enables cleaner imports throughout the application

// UI Components (shadcn/ui based)
export * from './ui/badge';
export * from './ui/button';
export * from './ui/card';
export * from './ui/progress';

// Base UI Components
export { default as Alert } from './alert';
export { default as Badge } from './badge';
export { default as Button } from './button';
export { default as Card } from './card';
export { default as Checkbox } from './checkbox';
export { default as Combobox } from './combobox';
export { default as DescriptionList } from './description-list';
export { default as Dialog } from './dialog';
export { default as Divider } from './divider';
export { default as Dropdown } from './dropdown';
export { default as Fieldset } from './fieldset';
export { default as Heading } from './heading';
export { default as Input } from './input';
export { default as Link } from './link';
export { default as Listbox } from './listbox';
export { default as Pagination } from './pagination';
export { default as Radio } from './radio';
export { default as Select } from './select';
export { default as Skeleton } from './skeleton';
export { default as Switch } from './switch';
export { default as Table } from './table';
export { default as Text } from './text';
export { default as Textarea } from './textarea';

// Layout Components
export { default as AuthLayout } from './layouts/auth-layout';
export { default as SidebarLayout } from './layouts/sidebar-layout';
export { default as StackedLayout } from './layouts/stacked-layout';
export { default as Navbar } from './layouts/navbar';
export { default as Sidebar } from './layouts/sidebar';

// Common Components
export { default as Avatar } from './common/avatar';
export { default as AvatarUpload } from './common/avatar-upload';
export { default as CompanyLogo } from './common/company-logo';
export { default as PrimaryDomainSetup } from './common/primary-domain-setup';
export { default as ProfileForm } from './common/profile-form';
export { default as SupportDialog } from './common/support-dialog';
export { default as URLScanner } from './common/url-scanner';
export { default as SentryErrorBoundary } from './sentry-error-boundary';

// Performance Components
export { default as WebVitalsReporter } from './common/performance/web-vitals-reporter';

// Feature Components
export * from './features';

// Re-export feature components individually for convenience
export * from './features/analysis';
export { default as BillingToggle } from './features/auth/BillingToggle';
export { default as PlanComparisonCard } from './features/auth/PlanComparisonCard';
export { default as PlanSelectionStep } from './features/auth/PlanSelectionStep';
export { default as RegistrationWizard } from './features/auth/RegistrationWizard';
export { default as FeatureGate } from './features/feature-gating/feature-gate';
export { default as UpgradePrompt } from './features/feature-gating/upgrade-prompt';

// Type exports
export type {
  ButtonProps,
  ButtonVariant,
  ButtonSize,
  CardProps,
  CardVariant,
  BadgeProps,
  BadgeVariant,
  BadgeSize,
  FormFieldProps,
  InputProps,
  TextareaProps,
  SelectProps,
  SelectOption,
  ModalProps,
  AlertProps,
  AlertVariant,
  ProgressProps,
  LoadingSpinnerProps,
  SkeletonProps,
} from '../types/ui';