-- Shopify analytics expansion — match the sales side of Shopify's own dashboard.
-- Adds: daily sales breakdown, sales-by-channel, and a customers table for
-- returning-customer rate + cohort analysis.

-- 1. Daily sales summary (order-level rollup, one row per day)
CREATE TABLE IF NOT EXISTS shopify_daily_summary (
    date                      DATE PRIMARY KEY,
    gross_sales               NUMERIC(14,2) NOT NULL DEFAULT 0,  -- Σ line_item price × qty (pre-discount)
    discounts                 NUMERIC(14,2) NOT NULL DEFAULT 0,
    returns                   NUMERIC(14,2) NOT NULL DEFAULT 0,  -- refunded line-item value
    net_sales                 NUMERIC(14,2) NOT NULL DEFAULT 0,  -- gross − discounts − returns
    shipping                  NUMERIC(14,2) NOT NULL DEFAULT 0,
    taxes                     NUMERIC(14,2) NOT NULL DEFAULT 0,
    total_sales               NUMERIC(14,2) NOT NULL DEFAULT 0,  -- net + shipping + taxes
    orders_count              INT NOT NULL DEFAULT 0,
    orders_fulfilled          INT NOT NULL DEFAULT 0,
    new_customer_orders       INT NOT NULL DEFAULT 0,
    returning_customer_orders INT NOT NULL DEFAULT 0,
    created_at                TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 2. Sales by channel (order.source_name) per day
CREATE TABLE IF NOT EXISTS shopify_channel_sales (
    id           BIGSERIAL PRIMARY KEY,
    date         DATE NOT NULL,
    channel      TEXT NOT NULL DEFAULT 'unknown',
    orders_count INT NOT NULL DEFAULT 0,
    revenue      NUMERIC(14,2) NOT NULL DEFAULT 0,
    UNIQUE(date, channel)
);

-- 3. Customers (for returning-customer rate + cohort analysis)
CREATE TABLE IF NOT EXISTS shopify_customers (
    customer_id      TEXT PRIMARY KEY,
    email            TEXT,
    first_order_date DATE,
    last_order_date  DATE,
    orders_count     INT NOT NULL DEFAULT 0,
    total_spent      NUMERIC(14,2) NOT NULL DEFAULT 0,
    state            TEXT,
    updated_at       TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ----- Indexes -----
CREATE INDEX IF NOT EXISTS idx_shopify_summary_date     ON shopify_daily_summary(date);
CREATE INDEX IF NOT EXISTS idx_shopify_channel_date     ON shopify_channel_sales(date);
CREATE INDEX IF NOT EXISTS idx_shopify_customers_first  ON shopify_customers(first_order_date);

-- ----- Row Level Security -----
ALTER TABLE shopify_daily_summary ENABLE ROW LEVEL SECURITY;
ALTER TABLE shopify_channel_sales ENABLE ROW LEVEL SECURITY;
ALTER TABLE shopify_customers     ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Service role full access on shopify_daily_summary"
    ON shopify_daily_summary FOR ALL TO service_role USING (true) WITH CHECK (true);
CREATE POLICY "Service role full access on shopify_channel_sales"
    ON shopify_channel_sales FOR ALL TO service_role USING (true) WITH CHECK (true);
CREATE POLICY "Service role full access on shopify_customers"
    ON shopify_customers FOR ALL TO service_role USING (true) WITH CHECK (true);

CREATE POLICY "Anon read shopify_daily_summary"
    ON shopify_daily_summary FOR SELECT TO anon USING (true);
CREATE POLICY "Anon read shopify_channel_sales"
    ON shopify_channel_sales FOR SELECT TO anon USING (true);
CREATE POLICY "Anon read shopify_customers"
    ON shopify_customers FOR SELECT TO anon USING (true);
