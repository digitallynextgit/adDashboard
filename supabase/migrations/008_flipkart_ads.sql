-- Flipkart Ads tables

CREATE TABLE IF NOT EXISTS flipkart_campaigns (
  id           BIGSERIAL PRIMARY KEY,
  campaign_id  TEXT NOT NULL UNIQUE,
  campaign_name TEXT NOT NULL,
  campaign_type TEXT NOT NULL DEFAULT '',
  status       TEXT NOT NULL DEFAULT 'active',
  daily_budget DECIMAL(12,2) NOT NULL DEFAULT 0,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS flipkart_metrics (
  id          BIGSERIAL PRIMARY KEY,
  campaign_id TEXT NOT NULL REFERENCES flipkart_campaigns(campaign_id) ON DELETE CASCADE,
  date        DATE NOT NULL,
  spend       DECIMAL(12,2) NOT NULL DEFAULT 0,
  impressions BIGINT NOT NULL DEFAULT 0,
  clicks      BIGINT NOT NULL DEFAULT 0,
  ctr         DECIMAL(8,4) NOT NULL DEFAULT 0,
  cpc         DECIMAL(10,4) NOT NULL DEFAULT 0,
  orders      BIGINT NOT NULL DEFAULT 0,
  units_sold  BIGINT NOT NULL DEFAULT 0,
  revenue     DECIMAL(12,2) NOT NULL DEFAULT 0,
  roas        DECIMAL(10,4) NOT NULL DEFAULT 0,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(campaign_id, date)
);

ALTER TABLE flipkart_campaigns ENABLE ROW LEVEL SECURITY;
ALTER TABLE flipkart_metrics   ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Service role full access on flipkart_campaigns"
  ON flipkart_campaigns FOR ALL TO service_role USING (true) WITH CHECK (true);

CREATE POLICY "Service role full access on flipkart_metrics"
  ON flipkart_metrics FOR ALL TO service_role USING (true) WITH CHECK (true);
