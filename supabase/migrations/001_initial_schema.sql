-- AdAuto: Initial Schema
-- Run this in your Supabase SQL Editor (Dashboard > SQL Editor > New Query)

-- 1. Create enum for platform
CREATE TYPE platform_type AS ENUM ('meta', 'google');

-- 2. Campaigns table
CREATE TABLE campaigns (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    platform platform_type NOT NULL,
    campaign_id TEXT NOT NULL,
    campaign_name TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'active',
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE(platform, campaign_id)
);

-- 3. Campaign metrics table (one row per campaign per day)
CREATE TABLE campaign_metrics (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    campaign_id UUID NOT NULL REFERENCES campaigns(id) ON DELETE CASCADE,
    date DATE NOT NULL,
    spend DECIMAL(12, 2) NOT NULL DEFAULT 0,
    impressions BIGINT NOT NULL DEFAULT 0,
    clicks BIGINT NOT NULL DEFAULT 0,
    ctr DECIMAL(8, 4) NOT NULL DEFAULT 0,
    cpc DECIMAL(10, 2) NOT NULL DEFAULT 0,
    conversions INTEGER NOT NULL DEFAULT 0,
    cost_per_conversion DECIMAL(10, 2) NOT NULL DEFAULT 0,
    roas DECIMAL(10, 2) NOT NULL DEFAULT 0,
    currency TEXT NOT NULL DEFAULT 'INR',
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE(campaign_id, date)
);

-- 4. Sync log table
CREATE TABLE sync_log (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    platform platform_type NOT NULL,
    status TEXT NOT NULL DEFAULT 'success',
    records INTEGER NOT NULL DEFAULT 0,
    error TEXT,
    started_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    finished_at TIMESTAMPTZ
);

-- 5. Indexes for common queries
CREATE INDEX idx_campaign_metrics_date ON campaign_metrics(date);
CREATE INDEX idx_campaign_metrics_campaign_date ON campaign_metrics(campaign_id, date);
CREATE INDEX idx_campaigns_platform ON campaigns(platform);
CREATE INDEX idx_sync_log_platform ON sync_log(platform);

-- 6. Updated_at trigger for campaigns
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER campaigns_updated_at
    BEFORE UPDATE ON campaigns
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at();

-- 7. Row Level Security
ALTER TABLE campaigns ENABLE ROW LEVEL SECURITY;
ALTER TABLE campaign_metrics ENABLE ROW LEVEL SECURITY;
ALTER TABLE sync_log ENABLE ROW LEVEL SECURITY;

-- Allow authenticated users to read all data
CREATE POLICY "Authenticated users can read campaigns"
    ON campaigns FOR SELECT
    TO authenticated
    USING (true);

CREATE POLICY "Authenticated users can read metrics"
    ON campaign_metrics FOR SELECT
    TO authenticated
    USING (true);

CREATE POLICY "Authenticated users can read sync log"
    ON sync_log FOR SELECT
    TO authenticated
    USING (true);

-- Allow service role (Python scripts) full access
CREATE POLICY "Service role full access on campaigns"
    ON campaigns FOR ALL
    TO service_role
    USING (true)
    WITH CHECK (true);

CREATE POLICY "Service role full access on metrics"
    ON campaign_metrics FOR ALL
    TO service_role
    USING (true)
    WITH CHECK (true);

CREATE POLICY "Service role full access on sync log"
    ON sync_log FOR ALL
    TO service_role
    USING (true)
    WITH CHECK (true);

-- Also allow anon read access (for dashboard without auth in Phase 1)
CREATE POLICY "Anon users can read campaigns"
    ON campaigns FOR SELECT
    TO anon
    USING (true);

CREATE POLICY "Anon users can read metrics"
    ON campaign_metrics FOR SELECT
    TO anon
    USING (true);

CREATE POLICY "Anon users can read sync log"
    ON sync_log FOR SELECT
    TO anon
    USING (true);
