# AdAuto — Unified Ad Analytics Dashboard
## Product Requirements Document (PRD)

**Version:** 1.0
**Date:** 2026-04-10
**Author:** Karan
**Status:** Draft

---

## 1. Problem Statement

The native dashboards provided by Meta Ads Manager and Google Ads are information-dense and overwhelming. Campaign managers spend excessive time navigating through irrelevant metrics to find the 5-10 KPIs they actually care about. There is no single unified view to compare performance across both platforms.

## 2. Solution

**AdAuto** is a lightweight, custom analytics dashboard that:
- Automatically extracts key metrics from Meta Ads and Google Ads APIs
- Stores them in a centralized database
- Presents them in a clean, focused dashboard built for quick decision-making

## 3. Target Users

- **Primary:** Campaign/Ad managers who run ads on both Meta and Google
- **Secondary:** Business owners/stakeholders who need a quick performance overview

## 4. Architecture

```
┌─────────────────────────────────────────────────────┐
│                  GitHub Actions (Cron)               │
│                                                      │
│  ┌─────────────────┐    ┌──────────────────────┐    │
│  │  Python Script   │    │   Python Script       │    │
│  │  meta_extractor  │    │   google_extractor    │    │
│  └────────┬─────────┘    └──────────┬───────────┘    │
│           │                         │                 │
│           └────────┬────────────────┘                 │
│                    ▼                                  │
│           ┌───────────────┐                           │
│           │   Supabase    │                           │
│           │  (PostgreSQL) │                           │
│           └───────────────┘                           │
└─────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────┐
│              Vercel (Free Tier)                       │
│                                                      │
│  ┌──────────────────────────────────────────────┐   │
│  │           Next.js Application                 │   │
│  │                                               │   │
│  │  ┌─────────────┐    ┌─────────────────────┐  │   │
│  │  │  API Routes  │    │  Dashboard Pages     │  │   │
│  │  │  /api/*      │───▶│  Charts + Tables     │  │   │
│  │  └──────┬───────┘    └─────────────────────┘  │   │
│  │         │                                      │   │
│  │         ▼                                      │   │
│  │  ┌─────────────┐                               │   │
│  │  │  Supabase   │                               │   │
│  │  │  Client SDK │                               │   │
│  │  └─────────────┘                               │   │
│  └──────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────┘
```

## 5. Tech Stack

| Layer              | Technology              | Why                                      |
|--------------------|-------------------------|------------------------------------------|
| Data Extraction    | Python 3.11+            | Official SDKs for both ad platforms       |
| Meta Ads SDK       | `facebook-business`     | Official Meta Marketing API SDK           |
| Google Ads SDK     | `google-ads`            | Official Google Ads API SDK               |
| Scheduler          | GitHub Actions (cron)   | Free, reliable, no server needed          |
| Database           | Supabase (PostgreSQL)   | Free tier, built-in REST API, auth        |
| Frontend Framework | Next.js 14 (App Router) | Fast, Vercel-native, great DX             |
| UI Components      | shadcn/ui + Tailwind    | Clean, modern, customizable               |
| Charts             | Recharts                | React-native, composable, well-documented |
| Deployment         | Vercel (free tier)      | Zero-config Next.js deployment            |

## 6. Data Model

### 6.1 Tables

#### `campaigns`
| Column        | Type        | Description                          |
|---------------|-------------|--------------------------------------|
| id            | uuid (PK)   | Auto-generated                       |
| platform      | enum        | `meta` or `google`                   |
| campaign_id   | text        | Platform-specific campaign ID        |
| campaign_name | text        | Campaign display name                |
| status        | text        | `active`, `paused`, `completed`      |
| created_at    | timestamptz | Row creation time                    |
| updated_at    | timestamptz | Last update time                     |

#### `campaign_metrics`
| Column              | Type        | Description                        |
|---------------------|-------------|------------------------------------|
| id                  | uuid (PK)   | Auto-generated                     |
| campaign_id         | uuid (FK)   | References `campaigns.id`          |
| date                | date        | The reporting date                 |
| spend               | decimal     | Amount spent (in account currency) |
| impressions         | bigint      | Number of impressions              |
| clicks              | bigint      | Number of clicks                   |
| ctr                 | decimal     | Click-through rate (%)             |
| cpc                 | decimal     | Cost per click                     |
| conversions         | integer     | Number of conversions              |
| cost_per_conversion | decimal     | Cost per conversion                |
| roas                | decimal     | Return on ad spend                 |
| currency            | text        | Currency code (e.g., INR, USD)     |
| created_at          | timestamptz | Row creation time                  |

**Unique constraint:** (`campaign_id`, `date`) — one row per campaign per day.

#### `sync_log`
| Column      | Type        | Description                          |
|-------------|-------------|--------------------------------------|
| id          | uuid (PK)   | Auto-generated                       |
| platform    | enum        | `meta` or `google`                   |
| status      | text        | `success`, `failed`, `partial`       |
| records     | integer     | Number of records synced             |
| error       | text        | Error message if failed              |
| started_at  | timestamptz | Sync start time                      |
| finished_at | timestamptz | Sync end time                        |

## 7. Features & Pages

### 7.1 Dashboard (Home Page) — `/`

The main view the manager sees. Everything on one screen.

**Cards Row (top):**
| Card               | Value                     | Comparison          |
|--------------------|---------------------------|---------------------|
| Total Spend        | Sum of spend for period   | vs previous period  |
| Total Conversions  | Sum of conversions        | vs previous period  |
| Average CPC        | Weighted average CPC      | vs previous period  |
| Overall ROAS       | Revenue / Spend           | vs previous period  |

**Charts Section:**
- **Spend Over Time** — Line chart, daily spend, separate lines for Meta vs Google
- **Conversions Over Time** — Bar chart, daily conversions by platform
- **Platform Split** — Pie/donut chart showing spend distribution (Meta vs Google)

**Table Section:**
- Campaign performance table with columns: Name, Platform, Status, Spend, Clicks, CTR, CPC, Conversions, ROAS
- Sortable by any column
- Filterable by platform and status

### 7.2 Date Range Filter (Global)

Available on all pages:
- Preset options: Today, Last 7 days, Last 30 days, This Month, Last Month, Custom Range
- Default: Last 7 days
- Comparison toggle: compare with previous period of same length

### 7.3 Platform Comparison Page — `/compare`

Side-by-side comparison:
- Meta metrics on left, Google metrics on right
- Same date range, same metrics
- Highlights which platform is performing better per metric

### 7.4 Campaign Detail Page — `/campaigns/[id]`

Drill-down into a single campaign:
- Daily metrics chart for that campaign
- Key stats summary
- Performance trend (improving / declining)

### 7.5 Sync Status Page — `/settings`

- Last sync time for each platform
- Sync history (last 10 syncs)
- Manual sync trigger button (calls a Supabase edge function or GitHub Actions dispatch)
- API connection status

## 8. Python Extraction Scripts

### 8.1 Directory Structure

```
scripts/
├── requirements.txt
├── config.py              # Environment variable loading
├── meta_extractor.py      # Meta Ads API extraction
├── google_extractor.py    # Google Ads API extraction
├── db.py                  # Supabase client & upsert logic
├── main.py                # Orchestrator — runs both extractors
└── utils.py               # Date helpers, logging
```

### 8.2 Extraction Logic

**For both platforms:**

1. Connect to API using credentials from environment variables
2. Fetch campaign-level data for the last 7 days (configurable)
3. Extract only the fields defined in the data model
4. Upsert into Supabase (insert or update on conflict of `campaign_id` + `date`)
5. Log sync result to `sync_log` table

**Meta Ads fields to extract:**
- `campaign_id`, `campaign_name`, `status`
- `spend`, `impressions`, `clicks`, `ctr`, `cpc`
- `actions` (filtered for conversions), `cost_per_action_type`
- `action_values` (for ROAS calculation)

**Google Ads fields to extract:**
- `campaign.id`, `campaign.name`, `campaign.status`
- `metrics.cost_micros` (divide by 1,000,000 for actual cost)
- `metrics.impressions`, `metrics.clicks`, `metrics.ctr`, `metrics.average_cpc`
- `metrics.conversions`, `metrics.cost_per_conversion`
- `metrics.conversions_value` (for ROAS calculation)

### 8.3 Environment Variables Required

```env
# Meta Ads
META_APP_ID=
META_APP_SECRET=
META_ACCESS_TOKEN=
META_AD_ACCOUNT_ID=

# Google Ads
GOOGLE_ADS_DEVELOPER_TOKEN=
GOOGLE_ADS_CLIENT_ID=
GOOGLE_ADS_CLIENT_SECRET=
GOOGLE_ADS_REFRESH_TOKEN=
GOOGLE_ADS_CUSTOMER_ID=

# Supabase
SUPABASE_URL=
SUPABASE_SERVICE_KEY=

# Config
LOOKBACK_DAYS=7
```

## 9. GitHub Actions Workflow

```yaml
# .github/workflows/sync-ads.yml
name: Sync Ad Metrics

on:
  schedule:
    - cron: '0 */6 * * *'   # Every 6 hours
  workflow_dispatch:          # Manual trigger

jobs:
  sync:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-python@v5
        with:
          python-version: '3.11'
      - run: pip install -r scripts/requirements.txt
      - run: python scripts/main.py
        env:
          META_APP_ID: ${{ secrets.META_APP_ID }}
          # ... all other secrets
```

**Frequency:** Every 6 hours (4 times/day)
- Covers morning, afternoon, evening, night refreshes
- Well within GitHub Actions free tier (2000 min/month)
- Each run should take < 2 minutes

## 10. Authentication & Security

### 10.1 Dashboard Access
- **Phase 1 (MVP):** Supabase Auth with email/password — only invited users can log in
- **Phase 2 (optional):** Google OAuth for team login

### 10.2 API Keys
- All API keys stored as GitHub Actions secrets (for extraction)
- Supabase anon key used in frontend (with Row Level Security enabled)
- Service key NEVER exposed to frontend

### 10.3 Row Level Security (RLS)
- Enable RLS on all tables
- Authenticated users can SELECT only
- Only the service role (used by Python scripts) can INSERT/UPDATE

## 11. Project Structure

```
adauto/
├── .github/
│   └── workflows/
│       └── sync-ads.yml
├── scripts/                    # Python extraction scripts
│   ├── requirements.txt
│   ├── config.py
│   ├── meta_extractor.py
│   ├── google_extractor.py
│   ├── db.py
│   ├── main.py
│   └── utils.py
├── src/                        # Next.js app
│   ├── app/
│   │   ├── layout.tsx
│   │   ├── page.tsx            # Dashboard home
│   │   ├── compare/
│   │   │   └── page.tsx        # Platform comparison
│   │   ├── campaigns/
│   │   │   └── [id]/
│   │   │       └── page.tsx    # Campaign detail
│   │   ├── settings/
│   │   │   └── page.tsx        # Sync status
│   │   └── api/
│   │       ├── metrics/
│   │       │   └── route.ts    # GET metrics with filters
│   │       ├── campaigns/
│   │       │   └── route.ts    # GET campaigns list
│   │       └── sync/
│   │           └── route.ts    # POST trigger manual sync
│   ├── components/
│   │   ├── ui/                 # shadcn components
│   │   ├── charts/
│   │   │   ├── spend-chart.tsx
│   │   │   ├── conversions-chart.tsx
│   │   │   └── platform-split.tsx
│   │   ├── dashboard/
│   │   │   ├── metric-card.tsx
│   │   │   ├── campaign-table.tsx
│   │   │   └── date-filter.tsx
│   │   └── layout/
│   │       ├── sidebar.tsx
│   │       └── header.tsx
│   └── lib/
│       ├── supabase.ts         # Supabase client
│       ├── types.ts            # TypeScript types
│       └── utils.ts            # Helpers
├── supabase/
│   └── migrations/
│       └── 001_initial_schema.sql
├── public/
├── .env.local                  # Local env vars (git-ignored)
├── .gitignore
├── next.config.js
├── tailwind.config.ts
├── tsconfig.json
├── package.json
├── PRD.md
└── README.md
```

## 12. Implementation Phases

### Phase 1 — Foundation (MVP)
1. Set up Next.js project with shadcn/ui and Tailwind
2. Set up Supabase project and create tables
3. Build Python extraction script for **Meta Ads only** (start with one platform)
4. Build dashboard home page with metric cards + spend chart + campaign table
5. Set up GitHub Actions cron workflow
6. Deploy to Vercel
7. **Deliverable:** Working dashboard showing Meta Ads data, auto-refreshing every 6h

### Phase 2 — Google Ads Integration
8. Build Python extraction script for Google Ads
9. Update dashboard to show combined data with platform filter
10. Build platform comparison page
11. **Deliverable:** Both platforms live, side-by-side comparison working

### Phase 3 — Polish & Features
12. Add date range filter with presets
13. Add campaign detail page
14. Add period-over-period comparison (% change cards)
15. Add sync status page
16. Add Supabase Auth (login page)
17. **Deliverable:** Full-featured, secured dashboard

### Phase 4 — Nice to Have (Future)
- Email/Slack alerts when ROAS drops below threshold
- PDF report generation (weekly summary)
- Multi-account support
- Budget pacing tracker
- Custom metric definitions

## 13. API Endpoints (Next.js API Routes)

### `GET /api/metrics`
**Query params:** `start_date`, `end_date`, `platform` (optional), `campaign_id` (optional)
**Returns:** Aggregated metrics for the period

### `GET /api/campaigns`
**Query params:** `platform` (optional), `status` (optional)
**Returns:** List of campaigns with latest metrics

### `GET /api/campaigns/[id]/metrics`
**Query params:** `start_date`, `end_date`
**Returns:** Daily metrics for a specific campaign

### `GET /api/sync-status`
**Returns:** Latest sync log entries for each platform

### `POST /api/sync/trigger`
**Action:** Triggers GitHub Actions workflow via API
**Returns:** Workflow run ID

## 14. Success Metrics

- Manager can get a performance overview in **< 30 seconds** (vs 5+ min on native dashboards)
- Data is never more than **6 hours stale**
- Dashboard loads in **< 2 seconds**
- Zero monthly hosting cost

## 15. Risks & Mitigations

| Risk | Impact | Mitigation |
|------|--------|------------|
| Meta API token expires (every 60 days) | Data sync stops | Add token expiry check, alert via sync status page |
| Google Ads developer token rejected | Can't access Google data | Apply early, use test account while waiting |
| GitHub Actions free tier exceeded | Sync stops | 4 runs/day * 2 min = ~240 min/month (well under 2000) |
| Supabase free tier DB limit (500MB) | Storage full | Daily data for 100 campaigns ~ 1MB/month, years of headroom |
| API rate limits hit | Incomplete data | Implement retry with exponential backoff |

## 16. Prerequisites Before Starting

- [ ] Meta Business Manager access with ad account permissions
- [ ] Meta App created (developers.facebook.com) with Marketing API access
- [ ] Google Ads manager account with API access
- [ ] Google Ads developer token (apply at ads.google.com/aw/apicenter)
- [ ] Supabase account created (supabase.com)
- [ ] Vercel account created (vercel.com)
- [ ] GitHub repository created

---

**Next step:** Once this PRD is approved, begin Phase 1 implementation.
