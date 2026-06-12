CREATE INDEX "websites_user_id_idx" ON "websites" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "reports_analysis_id_idx" ON "reports" USING btree ("analysis_id");--> statement-breakpoint
CREATE INDEX "recommendations_report_id_idx" ON "recommendations" USING btree ("report_id");--> statement-breakpoint
CREATE INDEX "recommendations_report_status_idx" ON "recommendations" USING btree ("report_id","status");--> statement-breakpoint
CREATE INDEX "feature_access_attempts_user_id_idx" ON "feature_access_attempts" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "feature_usage_user_id_idx" ON "feature_usage" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "plan_prices_plan_id_idx" ON "plan_prices" USING btree ("plan_id");--> statement-breakpoint
CREATE INDEX "subscription_events_subscription_id_idx" ON "subscription_events" USING btree ("subscription_id");--> statement-breakpoint
CREATE INDEX "subscriptions_user_id_idx" ON "subscriptions" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "subscriptions_user_status_idx" ON "subscriptions" USING btree ("user_id","status");--> statement-breakpoint
CREATE INDEX "usage_tracking_user_id_idx" ON "usage_tracking" USING btree ("user_id");