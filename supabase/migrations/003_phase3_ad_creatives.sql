-- Phase 3: Ad-level creative performance and audience breakdown tables
-- Run this in Supabase SQL Editor (Dashboard > SQL Editor > New Query)

-- 1. Ad creatives table (per-ad daily metrics)
CREATE TABLE ad_creatives (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    campaign_id UUID NOT NULL REFERENCES campaigns(id) ON DELETE CASCADE,
    ad_id TEXT NOT NULL,
    ad_name TEXT NOT NULL,
    adset_id TEXT NOT NULL DEFAULT '',
    adset_name TEXT NOT NULL DEFAULT '',
    date DATE NOT NULL,
    spend DECIMAL(12,2) NOT NULL DEFAULT 0,
    impressions BIGINT NOT NULL DEFAULT 0,
    clicks INTEGER NOT NULL DEFAULT 0,
    ctr DECIMAL(8,4) NOT NULL DEFAULT 0,
    reach BIGINT NOT NULL DEFAULT 0,
    purchases INTEGER NOT NULL DEFAULT 0,
    purchase_value DECIMAL(12,2) NOT NULL DEFAULT 0,
    roas DECIMAL(10,4) NOT NULL DEFAULT 0,
    add_to_cart INTEGER NOT NULL DEFAULT 0,
    landing_page_views INTEGER NOT NULL DEFAULT 0,
    video_3s_views INTEGER NOT NULL DEFAULT 0,
    video_thruplay INTEGER NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE(ad_id, date)
);

-- 2. Audience breakdowns table (age/gender and region per campaign per day)
CREATE TABLE audience_breakdowns (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    campaign_id UUID NOT NULL REFERENCES campaigns(id) ON DELETE CASCADE,
    date DATE NOT NULL,
    breakdown_type TEXT NOT NULL,   -- 'age_gender' or 'region'
    breakdown_value TEXT NOT NULL,  -- e.g. '25-34|male' or 'Maharashtra'
    spend DECIMAL(12,2) NOT NULL DEFAULT 0,
    impressions BIGINT NOT NULL DEFAULT 0,
    clicks INTEGER NOT NULL DEFAULT 0,
    purchases INTEGER NOT NULL DEFAULT 0,
    purchase_value DECIMAL(12,2) NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE(campaign_id, date, breakdown_type, breakdown_value)
);

-- 3. Indexes
CREATE INDEX idx_ad_creatives_campaign_date ON ad_creatives(campaign_id, date);
CREATE INDEX idx_ad_creatives_date ON ad_creatives(date);
CREATE INDEX idx_ad_creatives_ad_id ON ad_creatives(ad_id);
CREATE INDEX idx_audience_breakdowns_campaign_date ON audience_breakdowns(campaign_id, date);
CREATE INDEX idx_audience_breakdowns_type ON audience_breakdowns(breakdown_type);

-- 4. Row Level Security
ALTER TABLE ad_creatives ENABLE ROW LEVEL SECURITY;
ALTER TABLE audience_breakdowns ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anon users can read ad_creatives"
    ON ad_creatives FOR SELECT TO anon USING (true);
CREATE POLICY "Authenticated users can read ad_creatives"
    ON ad_creatives FOR SELECT TO authenticated USING (true);
CREATE POLICY "Service role full access on ad_creatives"
    ON ad_creatives FOR ALL TO service_role USING (true) WITH CHECK (true);

CREATE POLICY "Anon users can read audience_breakdowns"
    ON audience_breakdowns FOR SELECT TO anon USING (true);
CREATE POLICY "Authenticated users can read audience_breakdowns"
    ON audience_breakdowns FOR SELECT TO authenticated USING (true);
CREATE POLICY "Service role full access on audience_breakdowns"
    ON audience_breakdowns FOR ALL TO service_role USING (true) WITH CHECK (true);
