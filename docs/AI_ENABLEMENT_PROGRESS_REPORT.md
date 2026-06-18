# AI Enablement — Progress Report

**Reporting period:** Phase 1 build week
**Prepared by:** Karan Joshi + team
**Status:** Two parallel AI experiments in active development

---

## Executive Summary

Two AI workstreams have been actively explored during this phase, both intended to validate whether AI can take over high-effort manual tasks currently consuming significant agency time:

| Workstream | Lead Tools | Status |
|---|---|---|
| **A. AI Avatar Video Generation** | Higgsfield AI, ChatGPT, Gemini, ElevenLabs | Proof-of-concept achieved; production blocked by paid subscriptions |
| **B. H2S Analytics & Reporting Tool** | Supabase, Groq / Claude API, Next.js | End-to-end pipeline live; awaiting source credentials + LLM credit approval |

Both experiments demonstrate viable AI workflows. Workstream B is closer to production readiness; Workstream A is closer to budget gating.

---

# Workstream A — AI Avatar Video Experimentation

## Project Objective

Explore whether AI-generated avatar systems can replicate or assist in creating talking-head videos for clients.

For this experiment, the selected subject/client was **Chetan Sir**, who regularly creates face-to-camera talking videos.

The objective was:
- To create a digital avatar representation of Chetan Sir
- To test AI-generated visuals and voice cloning
- To evaluate whether AI avatars can be used for scalable talking-head video production

## Tools & Platforms Explored

### 1. Higgsfield AI
Initially, the workflow experimentation started using Higgsfield AI for avatar video generation.

**Goal:**
- Create realistic AI avatars
- Generate talking avatar-style videos

**Observation:**
- The free version had no access
- No usable free credits were available
- Full experimentation required a paid subscription

**Outcome:**
Due to platform limitations, alternative workflows were explored using other AI tools.

## Image & Character Generation Workflow

### Step 1 — Reference Image Collection
Approximately 4–5 images of Chetan Sir were collected from different perspectives to help train and generate a more accurate AI visual representation.

The reference set included:
- Front-facing angles
- Slight side angles
- Different facial expressions
- LinkedIn profile image

### Step 2 — Character Sheet Creation using AI
The collected images were then uploaded into ChatGPT and Gemini. These AI models were instructed to generate character sheets, multi-angle references, and different facial perspectives.

**Generated outputs included:**
- Front view
- 45-degree left angle
- 45-degree right angle
- Side profile views
- Consistent costume references

**Purpose:** Maintain visual consistency while generating future avatar images.

### Step 3 — Portrait & Avatar Image Generation
The generated character sheets were then reused as references to create polished portrait images.

Using ChatGPT and Gemini:
- New portrait images were generated
- Different corporate outfits were tested
- Professional office/cabin backgrounds were added

**Visual goals:**
- Corporate professional appearance
- Clean office aesthetics
- Consistent facial identity
- Usable portrait frames for lip-sync avatar systems

**Output:** High-quality AI-generated corporate portraits suitable for avatar video workflows.

## Voice Cloning Workflow

### Step 4 — Voice Training using ElevenLabs AI
For voice replication, audio clips of Chetan Sir were uploaded into ElevenLabs.

**Objective:**
- Train an AI voice model
- Replicate speech tone and delivery style
- Create realistic AI narration capabilities

### Step 5 — AI Voice Model Generation
The uploaded samples were processed by ElevenLabs to create a cloned voice model.

**Result:**
- Approximately 90% voice similarity accuracy achieved
- Voice tone and cadence felt highly realistic
- The generated output closely matched Chetan Sir's natural speaking style

**Key success:** The voice cloning stage was one of the most successful parts of the experiment.

## Current Limitations Identified (Workstream A)

**Subscription restrictions** — Although the AI voice model was successfully trained:
- ElevenLabs required a paid subscription to download the trained voice, use the custom voice commercially, and export production-ready audio files
- Higgsfield AI also required paid credits for meaningful avatar generation usage

## Current Status (Workstream A)

### Successfully Achieved
✅ AI-based character sheet generation
✅ Multi-angle avatar reference creation
✅ Corporate-style portrait generation
✅ Consistent AI avatar visuals
✅ AI voice cloning with high accuracy
✅ Initial proof-of-concept workflow established

### Pending / Blocked Areas
⚠ Avatar video generation pipeline not fully completed
⚠ Paid subscriptions required for production-level exports
⚠ Lip-sync avatar integration yet to be fully tested
⚠ Final scalable workflow still under evaluation

## Project Assets (Workstream A)

**Google Drive Folder** — All generated assets, experiments, and supporting files related to the AI avatar workflow have been organized in the Drive folder shared separately.

---

# Workstream B — H2S Analytics & Reporting Tool

## Project Objective

The task assigned was to build a **one-click AI-powered weekly analytics tool** for the **Hard2Soft (H2S)** pilot client, on top of our existing **AdAuto Dashboard** infrastructure.

For this experiment, the selected pilot was H2S — a borewell water conditioner brand running multi-channel marketing across Meta Ads, Google Ads, Shopify, Amazon, Flipkart, and GoKwik COD.

The objective was:
- Pull marketing performance data from 6+ sources into one place
- Use AI (large-language model) to convert raw numbers into plain-English weekly insight reports
- Deliver "Power of Five" weekly synthesis covering KPIs, geography, content quadrants, LTV cohorts, funnel health, and search intent
- Surface anomalies and recommended actions automatically
- Build a one-click "Generate Report" experience for the COO

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

## Documentation & Approvals (Workstream B)

Prepared a manager-ready **Claude API Budget Request** document (`CLAUDE_API_BUDGET_REQUEST.docx`) covering:
- 6 LLM jobs and which model to use for each
- How Anthropic billing works (prepaid credits, no subscription)
- Per-run + monthly cost breakdown ($5–10/month expected)
- Setup checklist with owners (Karan / Finance / Manager)
- Comparison to alternatives (Opus / GPT / manual analyst)
- Approval checklist

## Current Limitations Identified (Workstream B)

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

## Current Status (Workstream B)

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

## Working Demo Available (Workstream B)

The complete pipeline is currently runnable locally:

1. Open `http://localhost:3000/h2s` after signing in
2. Click **Generate Report**
3. System pulls available data → calls Groq → returns AI-generated markdown report inline
4. Report saved to Supabase for audit trail
5. Cost logged to ledger ($0 on Groq during development)

The dashboard renders gracefully for empty source tables with "*No <source> data this week — integration in progress*" placeholders, so it's demo-ready before all credentials arrive.

## Estimated Timeline to Full Production (Workstream B)

| Milestone | ETA after credentials arrive |
|---|---|
| All 4 source extractors confirmed running with real data | 1 day |
| First end-to-end weekly report with real H2S data | 2 days |
| Quadrant tagging completed for top 20 Meta campaigns | 1 day |
| LTV cohort backfill from Shopify customer history | 2 days |
| Switch from Groq (free) to Claude (paid) once credits approved | 30 minutes (uncomment one code block) |
| COO demo of the live pipeline | Day 5 |

## Project Assets & Reference Files (Workstream B)

### Repository
- All code lives in the existing **AdAuto Dashboard** repository
- H2S-specific code under `src/lib/h2s/`, `src/app/(app)/h2s/`, `src/app/api/h2s/`, `supabase/migrations/009_h2s_pilot.sql`

### Documents
- `CLAUDE_API_BUDGET_REQUEST.docx` — manager-facing budget approval document
- `H2S_SESSION_HANDOFF.md` — full project context and decisions made
- `src/data/h2s_brief.md` — the brand brief used as cached LLM system context (~10K tokens)

### Live Dashboard
- Route: `/h2s` (single-user auth gated)
- Local URL: `http://localhost:3000/h2s`

---

# Combined Decisions Needed

| # | Decision | Owner | Blocking |
|---|---|---|---|
| 1 | Approve paid subscription for **ElevenLabs** (voice export) and **Higgsfield AI** (avatar video) | Manager | Workstream A production |
| 2 | Approve **$10 top-up** for Anthropic API credits | Manager / Finance | Workstream B switch from Groq → Claude |
| 3 | Coordinate with H2S team to provide **GA4 / GSC / Clarity / GoKwik** credentials | Account team | Workstream B real-data demo |
| 4 | Confirm date for **COO live demo** of H2S analytics tool | Account team | Workstream B presentation |

# Combined Next Steps

| Step | Owner | Timeline |
|---|---|---|
| Lock paid tools budget (ElevenLabs + Higgsfield + Anthropic) | Manager | Week 1 |
| Source credentials handover from H2S | Account team | Week 1 |
| Avatar lip-sync integration test | Workstream A lead | Week 2 |
| First H2S weekly AI report with real data | Workstream B lead | Week 2 |
| Joint COO demo (avatar + analytics) | Both leads | Week 3 |

---

**End of report.**
