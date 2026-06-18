-- H2S (Hard2Soft) pilot — H2S-specific analytics tables
-- Adds: brand config, state-level revenue, content quadrant tagging,
-- LTV cohort tracking, generated reports, and a Claude cost ledger.

-- 1. Client brand config (single row for Phase 1 — H2S only)
CREATE TABLE IF NOT EXISTS h2s_clients (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    slug            TEXT NOT NULL UNIQUE,           -- 'hard2soft'
    brand_name      TEXT NOT NULL,                  -- 'Hard2Soft'
    shopify_store   TEXT,                            -- 'xxvjh8-ad.myshopify.com'
    meta_account_id TEXT,                            -- ad account
    primary_states  TEXT[] NOT NULL DEFAULT '{}',   -- ['TN','GJ','AP','MH','TG','PY']
    product_life_months INT NOT NULL DEFAULT 11,    -- LTV cycle anchor
    created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 2. State-level revenue + COD/RTO (Shopify orders + GoKwik enrichment)
CREATE TABLE IF NOT EXISTS h2s_state_revenue (
    id              BIGSERIAL PRIMARY KEY,
    date            DATE NOT NULL,
    state           TEXT NOT NULL,                  -- 'TN', 'GJ', etc.
    orders          INT NOT NULL DEFAULT 0,
    revenue         DECIMAL(12,2) NOT NULL DEFAULT 0,
    prepaid_count   INT NOT NULL DEFAULT 0,
    cod_count       INT NOT NULL DEFAULT 0,
    rto_count       INT NOT NULL DEFAULT 0,         -- delivered then returned to origin
    created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE(date, state)
);

-- 3. Meta content quadrant tagging
-- Maps each Meta campaign to one of the 4 H2S content themes.
-- Quadrant values: 'hardwater_costs', 'buy_smart', 'real_people', 'water_expert'
CREATE TABLE IF NOT EXISTS h2s_content_quadrants (
    id              BIGSERIAL PRIMARY KEY,
    campaign_id     TEXT NOT NULL UNIQUE,           -- Meta campaign_id (not UUID)
    quadrant        TEXT NOT NULL,
    tagged_by       TEXT NOT NULL DEFAULT 'manual', -- 'manual' or 'auto'
    confidence      DECIMAL(4,2) NOT NULL DEFAULT 1.0,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 4. LTV cohort assignment per Shopify customer
-- Cohort values: 'new_0_3', 'mid_5_7', 'replace_9_12', 'lapsed_12_plus'
CREATE TABLE IF NOT EXISTS h2s_ltv_cohorts (
    id                 BIGSERIAL PRIMARY KEY,
    customer_id        TEXT NOT NULL UNIQUE,        -- Shopify customer ID
    customer_email     TEXT,
    first_order_date   DATE NOT NULL,
    last_order_date    DATE,
    order_count        INT NOT NULL DEFAULT 1,
    total_revenue      DECIMAL(12,2) NOT NULL DEFAULT 0,
    cohort             TEXT NOT NULL,
    replacement_status TEXT NOT NULL DEFAULT 'pending',  -- 'pending' | 'reordered' | 'lapsed'
    state              TEXT,
    pincode            TEXT,
    updated_at         TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 5. Generated reports (Claude markdown output)
CREATE TABLE IF NOT EXISTS h2s_reports (
    id              BIGSERIAL PRIMARY KEY,
    week_start      DATE NOT NULL,                  -- ISO week start (Monday)
    week_end        DATE NOT NULL,
    markdown        TEXT NOT NULL,
    fact_object     JSONB NOT NULL,                 -- the aggregated facts fed to Claude
    google_doc_url  TEXT,
    model_used      TEXT NOT NULL DEFAULT 'claude-opus-4-7',
    generated_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE(week_start)
);

-- 6. Claude API cost ledger (every call logged)
CREATE TABLE IF NOT EXISTS claude_calls (
    id                  BIGSERIAL PRIMARY KEY,
    occurred_at         TIMESTAMPTZ NOT NULL DEFAULT now(),
    model               TEXT NOT NULL,
    purpose             TEXT NOT NULL,             -- 'h2s_weekly' | 'h2s_anomaly' | etc.
    input_tokens        INT NOT NULL DEFAULT 0,
    output_tokens       INT NOT NULL DEFAULT 0,
    cache_read_tokens   INT NOT NULL DEFAULT 0,
    cache_create_tokens INT NOT NULL DEFAULT 0,
    cost_usd            DECIMAL(10,6) NOT NULL DEFAULT 0,
    duration_ms         INT,
    request_id          TEXT,                       -- Anthropic request_id for debugging
    error               TEXT
);

-- 7. GA4 daily metrics (by state)
CREATE TABLE IF NOT EXISTS ga4_daily (
    id                BIGSERIAL PRIMARY KEY,
    date              DATE NOT NULL,
    state             TEXT NOT NULL DEFAULT 'unknown',
    sessions          INT NOT NULL DEFAULT 0,
    users             INT NOT NULL DEFAULT 0,
    new_users         INT NOT NULL DEFAULT 0,
    engaged_sessions  INT NOT NULL DEFAULT 0,
    conversions       INT NOT NULL DEFAULT 0,
    revenue           DECIMAL(12,2) NOT NULL DEFAULT 0,
    traffic_source    TEXT NOT NULL DEFAULT 'unknown',
    UNIQUE(date, state, traffic_source)
);

-- 8. GSC daily metrics (by query)
CREATE TABLE IF NOT EXISTS gsc_daily_queries (
    id           BIGSERIAL PRIMARY KEY,
    date         DATE NOT NULL,
    query        TEXT NOT NULL,
    page         TEXT NOT NULL DEFAULT '',
    impressions  INT NOT NULL DEFAULT 0,
    clicks       INT NOT NULL DEFAULT 0,
    ctr          DECIMAL(8,4) NOT NULL DEFAULT 0,
    position     DECIMAL(6,2) NOT NULL DEFAULT 0,
    UNIQUE(date, query, page)
);

-- 9. Microsoft Clarity aggregate daily metrics
CREATE TABLE IF NOT EXISTS clarity_daily (
    id            BIGSERIAL PRIMARY KEY,
    date          DATE NOT NULL UNIQUE,
    sessions      INT NOT NULL DEFAULT 0,
    rage_clicks   INT NOT NULL DEFAULT 0,
    dead_clicks   INT NOT NULL DEFAULT 0,
    quick_back    INT NOT NULL DEFAULT 0,
    scroll_depth  DECIMAL(5,2) NOT NULL DEFAULT 0,
    js_errors     INT NOT NULL DEFAULT 0
);

-- 10. GoKwik daily metrics
CREATE TABLE IF NOT EXISTS gokwik_daily (
    id                 BIGSERIAL PRIMARY KEY,
    date               DATE NOT NULL,
    pincode            TEXT NOT NULL DEFAULT 'all',
    state              TEXT NOT NULL DEFAULT 'unknown',
    checkouts_started  INT NOT NULL DEFAULT 0,
    checkouts_complete INT NOT NULL DEFAULT 0,
    prepaid_orders     INT NOT NULL DEFAULT 0,
    cod_orders         INT NOT NULL DEFAULT 0,
    rto_orders         INT NOT NULL DEFAULT 0,
    revenue            DECIMAL(12,2) NOT NULL DEFAULT 0,
    UNIQUE(date, pincode)
);

-- ----- Indexes -----
CREATE INDEX IF NOT EXISTS idx_h2s_state_revenue_date  ON h2s_state_revenue(date);
CREATE INDEX IF NOT EXISTS idx_h2s_state_revenue_state ON h2s_state_revenue(state);
CREATE INDEX IF NOT EXISTS idx_h2s_quadrants_quadrant  ON h2s_content_quadrants(quadrant);
CREATE INDEX IF NOT EXISTS idx_h2s_cohorts_cohort      ON h2s_ltv_cohorts(cohort);
CREATE INDEX IF NOT EXISTS idx_h2s_cohorts_state       ON h2s_ltv_cohorts(state);
CREATE INDEX IF NOT EXISTS idx_h2s_reports_week        ON h2s_reports(week_start DESC);
CREATE INDEX IF NOT EXISTS idx_claude_calls_occurred   ON claude_calls(occurred_at DESC);
CREATE INDEX IF NOT EXISTS idx_ga4_daily_date          ON ga4_daily(date);
CREATE INDEX IF NOT EXISTS idx_gsc_queries_date        ON gsc_daily_queries(date);
CREATE INDEX IF NOT EXISTS idx_gokwik_date             ON gokwik_daily(date);

-- ----- Row Level Security -----
ALTER TABLE h2s_clients            ENABLE ROW LEVEL SECURITY;
ALTER TABLE h2s_state_revenue      ENABLE ROW LEVEL SECURITY;
ALTER TABLE h2s_content_quadrants  ENABLE ROW LEVEL SECURITY;
ALTER TABLE h2s_ltv_cohorts        ENABLE ROW LEVEL SECURITY;
ALTER TABLE h2s_reports            ENABLE ROW LEVEL SECURITY;
ALTER TABLE claude_calls           ENABLE ROW LEVEL SECURITY;
ALTER TABLE ga4_daily              ENABLE ROW LEVEL SECURITY;
ALTER TABLE gsc_daily_queries      ENABLE ROW LEVEL SECURITY;
ALTER TABLE clarity_daily          ENABLE ROW LEVEL SECURITY;
ALTER TABLE gokwik_daily           ENABLE ROW LEVEL SECURITY;

-- Service role full access (sync scripts)
CREATE POLICY "Service role full access on h2s_clients"
    ON h2s_clients FOR ALL TO service_role USING (true) WITH CHECK (true);
CREATE POLICY "Service role full access on h2s_state_revenue"
    ON h2s_state_revenue FOR ALL TO service_role USING (true) WITH CHECK (true);
CREATE POLICY "Service role full access on h2s_content_quadrants"
    ON h2s_content_quadrants FOR ALL TO service_role USING (true) WITH CHECK (true);
CREATE POLICY "Service role full access on h2s_ltv_cohorts"
    ON h2s_ltv_cohorts FOR ALL TO service_role USING (true) WITH CHECK (true);
CREATE POLICY "Service role full access on h2s_reports"
    ON h2s_reports FOR ALL TO service_role USING (true) WITH CHECK (true);
CREATE POLICY "Service role full access on claude_calls"
    ON claude_calls FOR ALL TO service_role USING (true) WITH CHECK (true);
CREATE POLICY "Service role full access on ga4_daily"
    ON ga4_daily FOR ALL TO service_role USING (true) WITH CHECK (true);
CREATE POLICY "Service role full access on gsc_daily_queries"
    ON gsc_daily_queries FOR ALL TO service_role USING (true) WITH CHECK (true);
CREATE POLICY "Service role full access on clarity_daily"
    ON clarity_daily FOR ALL TO service_role USING (true) WITH CHECK (true);
CREATE POLICY "Service role full access on gokwik_daily"
    ON gokwik_daily FOR ALL TO service_role USING (true) WITH CHECK (true);

-- Anon read for dashboard
CREATE POLICY "Anon read h2s_clients"
    ON h2s_clients FOR SELECT TO anon USING (true);
CREATE POLICY "Anon read h2s_state_revenue"
    ON h2s_state_revenue FOR SELECT TO anon USING (true);
CREATE POLICY "Anon read h2s_content_quadrants"
    ON h2s_content_quadrants FOR SELECT TO anon USING (true);
CREATE POLICY "Anon read h2s_ltv_cohorts"
    ON h2s_ltv_cohorts FOR SELECT TO anon USING (true);
CREATE POLICY "Anon read h2s_reports"
    ON h2s_reports FOR SELECT TO anon USING (true);
CREATE POLICY "Anon read ga4_daily"
    ON ga4_daily FOR SELECT TO anon USING (true);
CREATE POLICY "Anon read gsc_daily_queries"
    ON gsc_daily_queries FOR SELECT TO anon USING (true);
CREATE POLICY "Anon read clarity_daily"
    ON clarity_daily FOR SELECT TO anon USING (true);
CREATE POLICY "Anon read gokwik_daily"
    ON gokwik_daily FOR SELECT TO anon USING (true);

-- ----- Seed H2S client row -----
INSERT INTO h2s_clients (slug, brand_name, shopify_store, primary_states, product_life_months)
VALUES (
    'hard2soft',
    'Hard2Soft',
    'xxvjh8-ad.myshopify.com',
    ARRAY['TN','GJ','AP','MH','TG','PY'],
    11
) ON CONFLICT (slug) DO NOTHING;
