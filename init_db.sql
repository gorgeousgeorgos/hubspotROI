-- init_db.sql
-- PostgreSQL schema for HubSpot ROI Analyzer

-- Enable extensions for UUID generation (choose one based on availability)
CREATE EXTENSION IF NOT EXISTS pgcrypto;
-- CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Users table
CREATE TABLE IF NOT EXISTS users (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  email TEXT NOT NULL UNIQUE,
  password_hash TEXT NOT NULL,
  is_pro BOOLEAN NOT NULL DEFAULT FALSE,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Campaigns table (based on types.ts)
CREATE TABLE IF NOT EXISTS campaigns (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  utm_source TEXT,
  utm_medium TEXT,
  utm_campaign TEXT,
  tracking_id TEXT UNIQUE,
  destination_url TEXT,
  target_roi NUMERIC DEFAULT 2.0,
  asset_ids TEXT[] DEFAULT '{}',
  -- Optional helpful columns for storing computed results and estimates
  estimated_ad_spend NUMERIC DEFAULT 0,
  estimated_production_cost NUMERIC DEFAULT 0,
  clicks INTEGER DEFAULT 0,
  conversions INTEGER DEFAULT 0,
  revenue NUMERIC DEFAULT 0,
  last_true_roi NUMERIC,
  last_reported_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Customers / Lead table
CREATE TABLE IF NOT EXISTS customers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  email TEXT NOT NULL,
  campaign_id uuid REFERENCES campaigns(id) ON DELETE SET NULL,
  status TEXT DEFAULT 'LEAD',
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_campaigns_user_id ON campaigns(user_id);
CREATE INDEX IF NOT EXISTS idx_campaigns_utm_campaign ON campaigns(utm_campaign);

-- Stats table (daily campaign metrics from GA4)
CREATE TABLE IF NOT EXISTS stats (
  id TEXT PRIMARY KEY,
  user_id uuid REFERENCES users(id) ON DELETE CASCADE,
  campaign_id TEXT,
  revenue NUMERIC DEFAULT 0,
  conversions INTEGER DEFAULT 0,
  ad_spend NUMERIC DEFAULT 0,
  date TEXT,
  is_manual_override BOOLEAN DEFAULT FALSE,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_stats_user_id ON stats(user_id);
CREATE INDEX IF NOT EXISTS idx_stats_campaign_id ON stats(campaign_id);

-- Assets table (creative/production assets)
CREATE TABLE IF NOT EXISTS assets (
  id TEXT PRIMARY KEY,
  user_id uuid REFERENCES users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  type TEXT,
  cost_amount NUMERIC DEFAULT 0,
  cost_type TEXT,
  hubspot_id TEXT,
  created_at timestamptz NOT NULL DEFAULT now(),
  smart_map jsonb DEFAULT '{}'::jsonb
);
CREATE INDEX IF NOT EXISTS idx_assets_user_id ON assets(user_id);

-- Deals table
CREATE TABLE IF NOT EXISTS deals (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  campaign_id uuid REFERENCES campaigns(id) ON DELETE SET NULL,
  hubspot_deal_id TEXT UNIQUE,
  name TEXT,
  amount NUMERIC DEFAULT 0,
  status TEXT,
  closed_date timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_deals_campaign_id ON deals(campaign_id);

-- Settings table: store per-user integration credentials as JSONB
CREATE TABLE IF NOT EXISTS settings (
  user_id uuid PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
  integrations jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_settings_user_id ON settings(user_id);

-- Simple view to make campaign rollups easier
CREATE OR REPLACE VIEW campaign_rollup AS
SELECT
  c.id AS campaign_id,
  c.name,
  c.utm_campaign,
  COALESCE(SUM(d.amount), 0) AS total_revenue,
  c.estimated_ad_spend,
  c.estimated_production_cost,
  c.last_true_roi,
  c.last_reported_at
FROM campaigns c
LEFT JOIN deals d ON d.campaign_id = c.id
GROUP BY c.id;

-- Scheduler runs logging
CREATE TABLE IF NOT EXISTS scheduler_runs (
  id BIGSERIAL PRIMARY KEY,
  started_at timestamptz NOT NULL DEFAULT now(),
  finished_at timestamptz,
  status TEXT,
  message TEXT,
  meta jsonb DEFAULT '{}'::jsonb,
  created_by uuid REFERENCES users(id) ON DELETE SET NULL
);
CREATE INDEX IF NOT EXISTS idx_scheduler_runs_started_at ON scheduler_runs(started_at);

-- Intelligence reports: stores AI-generated reports per user
CREATE TABLE IF NOT EXISTS intel_reports (
  id BIGSERIAL PRIMARY KEY,
  user_id uuid REFERENCES users(id) ON DELETE CASCADE,
  campaign_data jsonb NOT NULL,
  report_json jsonb NOT NULL,
  generated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_intel_reports_user_id ON intel_reports(user_id);

-- Notification log: tracks sent emails to avoid duplicates
CREATE TABLE IF NOT EXISTS notification_log (
  id BIGSERIAL PRIMARY KEY,
  user_id uuid REFERENCES users(id) ON DELETE CASCADE,
  template TEXT NOT NULL,
  sent_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_notification_log_user_id ON notification_log(user_id);
CREATE INDEX IF NOT EXISTS idx_notification_log_template ON notification_log(template);

-- End of migration
