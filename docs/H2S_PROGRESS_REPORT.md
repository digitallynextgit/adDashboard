# H2S Analytics Tool — Progress Report

## Project Objective

The task assigned was to build a one-click AI-powered weekly analytics tool for the **Hard2Soft (H2S)** pilot client, on top of our existing **AdAuto Dashboard** infrastructure.

For this experiment, the selected pilot was H2S — a borewell water conditioner brand running multi-channel marketing across Meta Ads, Google Ads, Shopify, Amazon, Flipkart, and GoKwik COD.

The objective was:

- Pull marketing performance data from 6+ sources into one place
- Use AI (large-language model) to convert raw numbers into plain-English weekly insight reports
- Deliver "Power of Five" weekly synthesis covering KPIs, geography, content quadrants, LTV cohorts, funnel health, and search intent
- Surface anomalies and recommended actions automatically
- Build a one-click "Generate Report" experience for the COO

---

## Tools & Platforms Explored

### 1. Supabase (PostgreSQL backend)
- **Purpose:** Single source of truth for all marketing data + generated reports + API cost ledger
- **Status:** Active and in use
- **Outcome:** All H2S-specific tables created and live (10 new tables added under migration `009_h2s_pilot.sql`)

### 2. Anthropic Claude API
- **Purpose:** Generate weekly synthesis reports using Sonnet 4.6, Haiku 4.5 for classification
- **Status:** Implementation complete, awaiting credit approval from management
- **Observation:** Estimated cost is $5–10/month under expected usage; full budget request document prepared separately
- **Outcome:** Code written and commented out; will activate once Anthropic API credits are purchased

### 3. Groq API (interim free alternative)
- **Purpose:** Free LLM provider for development and pre-launch testing — uses Llama 3.3 70B
- **Status:** Active and integrated
- **Observation:** Generous free tier (14,400 requests/day, no credit card required)
- **Outcome:** Used during the development phase so all pipeline work can be validated without spending on Claude credits

### 4. Google Analytics 4 API
- **Purpose:** Pull session, conversion, and revenue data broken down by Indian state
- **Status:** Extractor built; awaiting service account JSON from H2S team
- **Observation:** Service account approach allows headless server-side access without OAuth refresh-token complexity

### 5. Google Search Console API
- **Purpose:** Pull query × page performance for content-gap analysis
- **Status:** Extractor built; reuses GA4 service account; awaiting site verification

### 6. Microsoft Clarity API
- **Purpose:** Pull rage clicks, dead clicks, JavaScript errors, scroll depth for funnel health
- **Status:** Extractor built; awaiting Clarity API token from H2S team
- **Observation:** Clarity API only exposes aggregates — heatmaps and recordings are not API-accessible

### 7. GoKwik API
- **Purpose:** Pull COD-vs-prepaid split and RTO (Return-To-Origin) data by pincode
- **Status:** Extractor built with defensive fallbacks; awaiting credentials from GoKwik merchant team
- **Observation:** GoKwik has no public self-serve API portal — credentials must be issued by their support team

---

## Backend Workflow

### Step 1 — Database Schema Design
Designed and deployed a new Supabase migration (`009_h2s_pilot.sql`) creating 10 new tables:

- `h2s_clients` — single-row config per pilot client
- `h2s_state_revenue` — date × state × order/revenue/RTO rollup
- `h2s_content_quadrants` — Meta campaign → content-theme mapping
- `h2s_ltv_cohorts` — customer LTV bucket assignment
- `h2s_reports` — generated AI weekly reports (markdown + JSON facts)
- `claude_calls` — LLM cost ledger (every API call logged with cost in USD)
- `ga4_daily` — GA4 session/revenue metrics by state
- `gsc_daily_queries` — Search Console query performance
- `clarity_daily` — Clarity aggregate metrics
- `gokwik_daily` — GoKwik checkout & RTO data

All tables use Row Level Security with service-role write + anon read policies.

### Step 2 — Data Extraction Scripts
Built 4 new Python extractors in `scripts/`, each following the same pattern as the existing Meta and Shopify extractors:

- `ga4_extractor.py`
- `gsc_extractor.py`
- `gokwik_extractor.py`
- `clarity_extractor.py`

Each extractor:
- Skips gracefully if credentials are not yet configured
- Logs to a sync log table for visibility
- Bulk-upserts data to the matching Supabase table
- Runs every 6 hours via GitHub Actions cron

### Step 3 — Authentication Layer
Built a single-user authentication system from scratch (Lucia-style sessions):

- Password hashing with `scrypt`
- Session stored in Supabase `sessions` table with 30-day expiry
- Httponly cookie + secure flags
- Rate limiting (5 attempts per IP per 15 minutes)
- Login page UI matching project theme
- Logout button in navbar
- Route protection via Next.js `proxy.ts` (Next 16 convention)

### Step 4 — LLM Wrapper
Built a unified LLM wrapper supporting both Groq (current) and Anthropic Claude (future):

- Model router (`opus` / `sonnet` / `haiku` keys map to underlying models)
- Cost ledger writes to `claude_calls` table on every call
- Daily spend cap (`$5/day` default, configurable)
- Prompt-caching infrastructure ready for Claude (saves ~85% on input tokens)
- Single API surface — call sites don't change when switching providers

### Step 5 — Aggregation & Anomaly Detection
Built two server-side libraries:

- `aggregate.ts` — pulls last 7 days vs previous 7 days from all source tables, rolls up into a unified facts object covering headline KPIs, by-state, by-channel, by-Meta-quadrant, LTV cohorts, funnel, GSC queries, prior weekly summaries
- `anomalies.ts` — rules-based detector flagging >2σ moves on daily spend & ROAS, RTO >5% threshold, primary-state revenue drops >20% WoW, quadrant ROAS imbalance

### Step 6 — Report Generation API
Built a single `POST /api/h2s/generate-report` endpoint that:
1. Aggregates 7-day facts
2. Detects anomalies
3. Calls the LLM with the cached H2S brand brief as system context
4. Saves the markdown report + JSON facts to `h2s_reports`
5. Returns the report inline

---

## Frontend Workflow

### Step 7 — H2S Pilot Dashboard
Built a new dashboard route at `/h2s` containing 8 panels:

1. **Headline KPIs** — Revenue, Orders, Spend, Blended CAC, ROAS, Prepaid % with week-over-week deltas
2. **By Geography** — State-by-state table with primary states (TN/GJ/AP/MH/TG/PY) highlighted
3. **Meta Content Quadrants** — 4 cards showing performance of each content theme
4. **LTV Cohorts** — Table of all 4 customer cohorts with replacement rates
5. **Funnel Health** — Sessions → Add-to-Cart → Checkout → Purchase + Clarity rage/dead/JS-error counts
6. **Search Intent** — Top converting queries + content gaps (high impressions, low clicks)
7. **Anomaly Feed** — Auto-flagged unusual movements with plain-English hypotheses
8. **Latest AI Report** — Inline markdown render of the most recent weekly synthesis, with download-as-`.md` button

### Step 8 — "Generate Report" Button
One-click button at the top of `/h2s`:
- Triggers the full pipeline (aggregate → anomaly check → LLM → save)
- Shows loading state with spinner
- Inline display of the new report below the dashboard
- Downloadable as markdown file

---

## Documentation & Approvals

- Prepared a manager-ready **Claude API Budget Request** document (`CLAUDE_API_BUDGET_REQUEST.docx`) covering:
  - 6 LLM jobs and which model to use for each
  - How Anthropic billing works (prepaid credits, no subscription)
  - Per-run + monthly cost breakdown ($5–10/month expected)
  - Setup checklist with owners (Karan / Finance / Manager)
  - Comparison to alternatives (Opus / GPT / manual analyst)
  - Approval checklist

---

## Current Limitations Identified

### Credential Dependencies

| Source | Dependency | Owner |
|---|---|---|
| GA4 | Service account JSON + Viewer access in GA4 admin | H2S team |
| GSC | Same service account verified as User in GSC settings | H2S team |
| Microsoft Clarity | API token from Clarity dashboard | H2S team |
| GoKwik | API key + Merchant ID (requires GoKwik support email) | H2S team |
| Claude API | Top up $10 in Anthropic Console | Manager / Finance |

### Manual Configuration Pending

- Meta campaigns need to be manually tagged with their content quadrant (one-time setup, can be automated later via Haiku)
- Shopify customer history needs to be backfilled to assign LTV cohorts (`new_0_3`, `mid_5_7`, `replace_9_12`, `lapsed_12_plus`)

---

## Current Experiment Status

### Successfully Achieved

✅ Full Supabase schema for H2S analytics (10 new tables, RLS configured)
✅ 4 new Python extractors built (GA4, GSC, Clarity, GoKwik)
✅ Single-user authentication system (login + logout + middleware protection)
✅ LLM wrapper supporting both Groq and Anthropic Claude
✅ Free Groq integration for pre-launch development
✅ 7-day fact aggregator pulling from all source tables
✅ Rules-based anomaly detector
✅ Cached system block with H2S brand brief
✅ Weekly report generation API end-to-end
✅ H2S pilot dashboard with all 8 panels
✅ One-click "Generate Report" button with inline + downloadable output
✅ Cost ledger logs every LLM call with token usage and USD cost
✅ Monday 5:00 AM IST cron schedule wired up in GitHub Actions
✅ Manager-ready budget request documentation (PDF + Word format)

### Pending / Blocked Areas

⚠ Source credentials (GA4, GSC, Clarity, GoKwik) awaiting H2S team
⚠ Anthropic API credits awaiting management approval (~$10 one-time)
⚠ Meta campaign quadrant tagging requires one-time manual entry
⚠ Customer LTV cohort assignment job not yet automated
⚠ Google Docs export deferred (replaced with `.md` download for Phase 1)

---

## Working Demo Available

The complete pipeline is currently runnable locally:

1. Open `http://localhost:3000/h2s` after signing in
2. Click **Generate Report**
3. System pulls available data → calls Groq → returns AI-generated markdown report inline
4. Report saved to Supabase for audit trail
5. Cost logged to ledger ($0 on Groq during development)

The dashboard renders gracefully for empty source tables with "*No <source> data this week — integration in progress*" placeholders, so it's demo-ready before all credentials arrive.

---

## Estimated Timeline to Full Production

| Milestone | ETA after credentials arrive |
|---|---|
| All 4 source extractors confirmed running with real data | 1 day |
| First end-to-end weekly report with real H2S data | 2 days |
| Quadrant tagging completed for top 20 Meta campaigns | 1 day |
| LTV cohort backfill from Shopify customer history | 2 days |
| Switch from Groq (free) to Claude (paid) once credits approved | 30 minutes (uncomment one code block) |
| COO demo of the live pipeline | Day 5 |

---

## Project Assets & Reference Files

### Repository
- All code lives in the existing **AdAuto Dashboard** repository
- H2S-specific code under `src/lib/h2s/`, `src/app/(app)/h2s/`, `src/app/api/h2s/`, `supabase/migrations/009_h2s_pilot.sql`

### Documents
- `CLAUDE_API_BUDGET_REQUEST.md` / `.docx` — manager-facing budget approval document
- `H2S_SESSION_HANDOFF.md` — full project context and decisions made
- `src/data/h2s_brief.md` — the brand brief used as cached LLM system context (~10K tokens)

### Live Dashboard
- Route: `/h2s` (single-user auth gated)
- Local URL: `http://localhost:3000/h2s`
