-- Performance optimization indexes for ConvertIQ database
-- These indexes target the most commonly queried patterns

-- Auth table indexes
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_session_user_id ON session(user_id);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_session_token ON session(token);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_session_expires_at ON session(expires_at);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_account_user_id ON account(user_id);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_user_email ON user(email);

-- Websites table indexes
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_websites_user_id ON websites(user_id);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_websites_user_id_created_at ON websites(user_id, created_at DESC);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_websites_url ON websites(url);

-- Analyses table indexes (key performance bottleneck)
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_analyses_website_id ON analyses(website_id);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_analyses_status ON analyses(status);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_analyses_website_id_created_at ON analyses(website_id, created_at DESC);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_analyses_status_created_at ON analyses(status, created_at DESC);

-- Reports table indexes
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_reports_analysis_id ON reports(analysis_id);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_reports_type ON reports(type);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_reports_analysis_id_created_at ON reports(analysis_id, created_at DESC);

-- Recommendations table indexes
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_recommendations_report_id ON recommendations(report_id);

-- Subscription table indexes (critical for getUserSubscription performance)
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_subscriptions_user_id_status ON subscriptions(user_id, status);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_subscriptions_user_id_created_at ON subscriptions(user_id, created_at DESC);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_subscriptions_status ON subscriptions(status);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_subscriptions_polar_subscription_id ON subscriptions(polar_subscription_id);

-- Plan and pricing indexes
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_subscription_plans_slug ON subscription_plans(slug);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_plan_prices_plan_id_billing ON plan_prices(plan_id, billing_interval);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_plan_prices_polar_price_id ON plan_prices(polar_price_id);

-- Usage tracking indexes (frequently queried)
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_usage_tracking_user_subscription ON usage_tracking(user_id, subscription_id);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_usage_tracking_period ON usage_tracking(period_start, period_end);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_usage_tracking_user_period ON usage_tracking(user_id, period_start DESC);

-- Subscription events indexes
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_subscription_events_subscription_id ON subscription_events(subscription_id);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_subscription_events_created_at ON subscription_events(created_at DESC);

-- Feature usage and access indexes
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_feature_usage_user_id ON feature_usage(user_id);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_feature_access_attempts_user_id ON feature_access_attempts(user_id);

-- Partial indexes for common filtered queries
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_subscriptions_active_users ON subscriptions(user_id) WHERE status = 'active';
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_analyses_completed ON analyses(website_id, created_at DESC) WHERE status = 'completed';
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_websites_validated ON websites(user_id) WHERE is_validated = true;