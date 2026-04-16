-- Phase 4: Shopify sales data and planned spend
-- Run this in Supabase SQL Editor (Dashboard > SQL Editor > New Query)

-- 1. Shopify daily sales per SKU/variant
CREATE TABLE shopify_daily_sales (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    date DATE NOT NULL,
    product_id TEXT NOT NULL,
    product_title TEXT NOT NULL,
    variant_id TEXT NOT NULL,
    variant_title TEXT NOT NULL DEFAULT '',
    sku TEXT NOT NULL DEFAULT '',
    orders_count INTEGER NOT NULL DEFAULT 0,
    units_sold INTEGER NOT NULL DEFAULT 0,
    revenue DECIMAL(12,2) NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE(date, variant_id)
);

-- 2. Weekly planned spend (set manually via Settings page)
CREATE TABLE planned_spend (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    week_start DATE NOT NULL UNIQUE,  -- Always a Monday
    planned_spend DECIMAL(12,2) NOT NULL DEFAULT 0,
    notes TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 3. Indexes
CREATE INDEX idx_shopify_daily_sales_date ON shopify_daily_sales(date);
CREATE INDEX idx_shopify_daily_sales_variant ON shopify_daily_sales(variant_id);
CREATE INDEX idx_shopify_daily_sales_product ON shopify_daily_sales(product_id);
CREATE INDEX idx_planned_spend_week ON planned_spend(week_start);

-- 4. Updated_at trigger for planned_spend
CREATE TRIGGER planned_spend_updated_at
    BEFORE UPDATE ON planned_spend
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at();

-- 5. Row Level Security
ALTER TABLE shopify_daily_sales ENABLE ROW LEVEL SECURITY;
ALTER TABLE planned_spend ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anon users can read shopify_daily_sales"
    ON shopify_daily_sales FOR SELECT TO anon USING (true);
CREATE POLICY "Authenticated users can read shopify_daily_sales"
    ON shopify_daily_sales FOR SELECT TO authenticated USING (true);
CREATE POLICY "Service role full access on shopify_daily_sales"
    ON shopify_daily_sales FOR ALL TO service_role USING (true) WITH CHECK (true);

CREATE POLICY "Anon users can read planned_spend"
    ON planned_spend FOR SELECT TO anon USING (true);
CREATE POLICY "Anon users can write planned_spend"
    ON planned_spend FOR ALL TO anon USING (true) WITH CHECK (true);
CREATE POLICY "Authenticated users can manage planned_spend"
    ON planned_spend FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Service role full access on planned_spend"
    ON planned_spend FOR ALL TO service_role USING (true) WITH CHECK (true);
