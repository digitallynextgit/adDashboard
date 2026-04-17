-- Stores all Shopify product variants (regardless of whether they've had orders)
-- so the dashboard can always show the full product catalog.

create table if not exists shopify_variants (
  variant_id   text primary key,
  product_id   text not null default '',
  product_title text not null default '',
  variant_title text not null default '',
  sku          text not null default '',
  price        numeric(12, 2) not null default 0,
  updated_at   timestamptz not null default now()
);

alter table shopify_variants enable row level security;

create policy "Allow service role full access on shopify_variants"
  on shopify_variants for all using (true) with check (true);
