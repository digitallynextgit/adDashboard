-- Phase 7: Amazon Ads tables
-- Run this in Supabase SQL Editor

-- Amazon campaigns
create table if not exists amazon_campaigns (
  id                uuid primary key default gen_random_uuid(),
  campaign_id       text not null unique,
  campaign_name     text not null,
  campaign_type     text not null default 'sponsoredProducts', -- sponsoredProducts | sponsoredBrands | sponsoredDisplay
  targeting_type    text not null default 'manual',            -- manual | auto
  status            text not null default 'active',
  daily_budget      numeric(12,2) not null default 0,
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now()
);

-- Amazon daily metrics per campaign
create table if not exists amazon_metrics (
  id                    uuid primary key default gen_random_uuid(),
  campaign_id           uuid not null references amazon_campaigns(id) on delete cascade,
  date                  date not null,

  -- Spend & traffic
  spend                 numeric(12,2) not null default 0,
  impressions           bigint        not null default 0,
  clicks                bigint        not null default 0,
  ctr                   numeric(8,4)  not null default 0,  -- %
  cpc                   numeric(10,2) not null default 0,

  -- Conversions
  orders                integer       not null default 0,
  units_ordered         integer       not null default 0,
  sales                 numeric(12,2) not null default 0,  -- attributed revenue

  -- Amazon-specific KPIs
  acos                  numeric(8,4)  not null default 0,  -- Advertising Cost of Sale (%)
  roas                  numeric(10,4) not null default 0,  -- Sales / Spend

  unique (campaign_id, date)
);

alter table amazon_campaigns enable row level security;
alter table amazon_metrics    enable row level security;

create policy "Allow service role full access on amazon_campaigns"
  on amazon_campaigns for all using (true) with check (true);

create policy "Allow service role full access on amazon_metrics"
  on amazon_metrics for all using (true) with check (true);

-- Index for fast date-range queries
create index if not exists amazon_metrics_date_idx on amazon_metrics(date);
