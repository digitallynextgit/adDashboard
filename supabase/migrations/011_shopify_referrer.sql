-- Shopify sales-by-referrer (from order referring_site host).
-- Mirrors the "Total sales by referrer / social referrer" cards in Shopify's dashboard.

CREATE TABLE IF NOT EXISTS shopify_referrer_sales (
    id           BIGSERIAL PRIMARY KEY,
    date         DATE NOT NULL,
    referrer     TEXT NOT NULL DEFAULT 'direct',   -- host of referring_site, or 'direct'
    orders_count INT NOT NULL DEFAULT 0,
    revenue      NUMERIC(14,2) NOT NULL DEFAULT 0,
    UNIQUE(date, referrer)
);

CREATE INDEX IF NOT EXISTS idx_shopify_referrer_date ON shopify_referrer_sales(date);

ALTER TABLE shopify_referrer_sales ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Service role full access on shopify_referrer_sales" ON shopify_referrer_sales;
CREATE POLICY "Service role full access on shopify_referrer_sales"
    ON shopify_referrer_sales FOR ALL TO service_role USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "Anon read shopify_referrer_sales" ON shopify_referrer_sales;
CREATE POLICY "Anon read shopify_referrer_sales"
    ON shopify_referrer_sales FOR SELECT TO anon USING (true);
