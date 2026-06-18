# Session Handoff — H2S Analytics Build

**Purpose:** Transfer full context from a planning/scoping session into the `adAutoDashboard/` Claude Code session so build work can continue without re-explanation.

**Date prepared:** 2026-05-18
**User:** Karan (dndesignsbfg@gmail.com)
**Original session location:** `c:\Users\Karan\Desktop\Projects\Digitally next_projects\Ai_Agent\`
**Target session location:** `c:\Users\Karan\Desktop\Projects\Digitally next_projects\Ai_Agent\adAutoDashboard\`

---

## 1. Who's asking and what we're building

**Organisation:** Digitally Next — a marketing agency. COO is Manpreet Jangra.

**Parent initiative:** AI Enablement Charter — Phase 1, a 4-module program to embed AI into agency operations. Original PDF: `DN_AI_Enablement_Charter_Phase1.pdf` in the Ai_Agent folder. Full PRD at `Ai_Agent/PRD.md`.

The 4 modules in the charter:
1. **Work Allocation AI** — KRA validation + weekly digest
2. **Daily Output Tracking** — EOD logs + classifier
3. **Calendar Automation** — Social/SEO/Paid/Web content across clients
4. **Analytics & Interpretation** — cross-channel insight reports

**Current decision (this session):** Skip Modules 1, 2, 3. Build **Module 4 first**, scoped to a **single pilot client (Hard2Soft / H2S)**, as a one-click cross-channel analytics tool.

**Why this order:** User explicitly asked to start with the analytics tool for H2S. Other modules deferred to Phase 1.5+.

---

## 2. Pilot client: Hard2Soft (H2S)

Full brand doc: `Brand Overview – Hard2Soft (1).pdf` shared in original session. Key facts that drive analytics design:

### Product
- **Single SKU:** Hard2Soft Water Conditioner (1500L Model)
- **MRP ₹3,999 / Offer ₹3,599**
- Borewell hard water conditioning, installed via overhead tank
- **Product life: 10–12 months** → replacement cycle is the LTV engine

### Brand
- Promise: "Scale Free, Stress Free"
- Industry: Home Water Treatment & Conditioning (NOT an RO / drinking water brand)
- Position: prevention over repair; whole-house solution

### Business model
- D2C primary (homeowners) + B2B secondary (builders, societies, hotels, hospitals, schools)

### Audience
- **Primary:** Women 22–50 (homemakers, mothers, working professionals, beauty-conscious)
- **Secondary:** Homeowners — villas, apartments, newly-married, premium residential
- **Tertiary:** Builders, architects, interior designers, housing societies

### Geography (critical for analytics)
- **Primary states:** Tamil Nadu, Gujarat, Andhra Pradesh, Maharashtra, Telangana, Puducherry
- **Secondary cities:** Delhi NCR, Gurgaon, Noida, Jaipur, Chandigarh, Pune, Ahmedabad, Surat, Bengaluru, Chennai, Hyderabad
- Driver: borewell water usage + high TDS levels

### Channels
- **Paid:** Meta Ads (IG + FB), Google Search Ads, Google Display, YouTube Ads, Retargeting
- **Organic:** SEO blogs, IG/FB organic, YouTube Shorts/Reels, UGC, influencers, society WhatsApp groups, referrals
- **Marketplace:** Amazon, Flipkart
- **Direct:** Shopify website + WhatsApp inquiry + COD via GoKwik

### Competitors
- **Direct:** D'Cal, D'scal Prime, Scale-O, WaterScience, Healthy Waters
- **Related:** Kent RO, Eureka Forbes, 3M India, Purifit, Pearl Water Tech, AO Smith

### Meta content strategy (4 quadrants — analytics must measure performance by quadrant)
- **#HardWaterIsCostingYou** — Pain/FOMO/Demand (35% of content)
- **#BuySmartNotRepeatedly** — Sales/Conversion (30%)
- **#RealPeopleRealSoftWater** — UGC/Trust (20%)
- **#WaterExpertOfTheHouse** — Authority/Community (15%)

### LTV segments (3 cohorts — analytics must track these)
- **0–3 months:** Recent buyers — review/referral activation
- **5–7 months:** Mid-cycle — family/society expansion campaigns
- **9–12 months:** Replacement window — reorder push (strongest LTV stage)

### Customer journey stages (for funnel analytics)
Awareness → Interest → Consideration → Decision → Purchase → Experience → Advocacy

---

## 3. Required data sources for the analytics tool

The user named these 7 sources. Status of each:

| # | Source | Status in AdAuto | Notes |
|---|---|---|---|
| 1 | Meta Ads | ✅ Built (`scripts/meta_extractor.py`) | Campaigns, spend, ROAS, CTR, CPM, conversions |
| 2 | Shopify | ✅ Built (`scripts/shopify_extractor.py` + auth) | Orders, revenue, AOV, products, variants |
| 3 | Google Analytics 4 | ❌ Need extractor | Sessions, events, conversions, traffic source, geo |
| 4 | Google Search Console | ❌ Need extractor | Queries, impressions, clicks, CTR, position |
| 5 | Microsoft Clarity | ❌ Need extractor | Data Export API — aggregate metrics only (sessions, rage clicks, dead clicks, scroll depth, JS errors). **Recordings + heatmaps not API-accessible.** |
| 6 | Looker Studio | ❌ **Unresolved** | Looker has no public data API. Almost certainly the user means *destination* (push results to existing Looker dashboard) not *source*. **Needs clarification before W2.** |
| 7 | GoKwik | ❌ Need extractor | Indian checkout/COD platform. Cart, checkout, RTO by pincode, prepaid conversion. **Docs may be sparse — risk.** |

**Bonus extractors already in AdAuto but not on H2S's named list (still useful — H2S sells on these):**
- Amazon Ads (`scripts/amazon_extractor.py` + auth)
- Flipkart Ads (`scripts/flipkart_extractor.py`)

**Original AdAuto PRD also planned Google Ads — extractor NOT built. Gap from spec.**

---

## 4. Existing infrastructure: AdAuto Dashboard

Location: `adAutoDashboard/`. This is a **working** dashboard, not a plan.

### Stack
- **Frontend:** Next.js 16.2.3 (App Router) + React 19.2.4 + Tailwind 4 + shadcn + @base-ui/react + Recharts
- **Backend:** Supabase (Postgres + Auth)
- **ETL:** Python scripts in `scripts/`, orchestrated by GitHub Actions cron (every 6h)
- **Deployment:** Vercel
- **Charting:** Recharts
- **Export:** xlsx

### Routes already built
- `/` dashboard home
- `/campaigns/[id]` campaign detail
- `/compare` platform comparison
- `/weekly` (already exists — H2S report likely fits here or adjacent)
- `/settings` sync status
- `/login` auth

### API routes already built
`/api/metrics`, `/api/campaigns`, `/api/shopify`, `/api/amazon`, `/api/flipkart`, `/api/creatives`, `/api/audience`, `/api/planned-spend`, `/api/sync-status`, `/api/auth`

### Supabase migrations (8 applied)
```
001_initial_schema.sql
002_phase2_expanded_metrics.sql
003_phase3_ad_creatives.sql
004_phase4_shopify.sql
005_shopify_variants.sql
006_video_avg_watch_time.sql
007_amazon_ads.sql
008_flipkart_ads.sql
```
H2S work should ship as **migration 009** at minimum.

### CRITICAL constraint
`AGENTS.md` and `CLAUDE.md` in the project root say:
> "This is NOT the Next.js you know. This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices."

**Always read `node_modules/next/dist/docs/` before writing frontend code in this project.** Do not assume Next 14/15 conventions.

---

## 5. The strategic decision made this session

**Do NOT build the H2S analytics tool from scratch. Extend AdAuto.**

The build becomes:
1. Add 4 new Python extractors (GA4, GSC, Clarity, GoKwik) using existing patterns
2. Add Claude API interpretation layer (new — the "one-click analysis" engine)
3. Add H2S-specific dashboard route `/h2s` with views:
   - ROAS by Indian state (TN/GJ/AP/MH/TG/PY priority)
   - Meta content quadrant performance
   - LTV cohort analysis (0–3 / 5–7 / 9–12 months)
   - Prepaid % + RTO % from GoKwik
4. One-click button → triggers full pipeline → Claude → posts report to Slack + Google Doc

This cuts the build from 4 weeks (from-scratch) to ~1.5–2 weeks of focused work on top of existing infra. This week's plan is **4 working days, Tue–Fri**.

---

## 6. Proposed report structure (Claude output)

Each weekly report should have these sections in this order:

1. **Headline KPIs** — Revenue, orders, blended CAC, blended ROAS, prepaid %, RTO % (WoW deltas)
2. **By geography** — Top 6 primary states with ROAS + CAC + order volume
3. **By channel** — Meta / Google / Amazon / Flipkart / Direct, with ROAS + revenue share
4. **Meta by quadrant** — Which of the 4 themes drove ROAS this week
5. **LTV cohorts** — 0–3 / 5–7 / 9–12 month behaviour + replacement rate
6. **Funnel health** — Clarity drop-offs, cart abandonment, WhatsApp inquiry conversion
7. **Search intent (GSC)** — Top converting queries + top-impression-but-not-converting (content gaps)
8. **Anomalies** — Plain-language root-cause hypothesis
9. **Recommended actions next week** (Claude-generated)

Format: "Power of Five" — referenced in the original DN charter. Plain-language, explains *why* not *what*.

---

## 7. Claude API design

- **Provider:** Anthropic
- **Model routing:**
  - **Opus 4.7** (`claude-opus-4-7`) for weekly synthesis — heavy reasoning across multi-source data
  - **Sonnet 4.6** (`claude-sonnet-4-6`) for medium drafting
  - **Haiku 4.5** (`claude-haiku-4-5-20251001`) for cheap classification (anomaly signal vs noise)
- **Prompt caching mandatory.** Cache:
  1. H2S brand brief (~10k tokens — converted from brand PDF)
  2. Power of Five report template
  3. Last 4 weeks of fact summaries
  - Expected savings: ~70–85% input token cost reduction after warm-up
- **Cost ledger:** Write every API call to a Supabase `claude_calls` table with token counts + $ spend. Alert at $50/day cap during build.

---

## 8. The 4-day build plan (Tue–Fri, May 19–22)

### **Tuesday, May 19 — Foundation + 2 New Extractors**
- Read `node_modules/next/dist/docs/` for Next.js 16 conventions
- Read `scripts/meta_extractor.py` + `scripts/shopify_extractor.py` to lock the extractor pattern
- Confirm API access: Meta, Shopify, GA4, GSC, GoKwik, Clarity credentials in `.env.local`
- New Supabase migration `009_h2s_pilot.sql`:
  - `h2s_clients` (single-row, H2S config)
  - `h2s_state_revenue` (state, date, orders, revenue, prepaid_count, cod_count, rto_count)
  - `h2s_content_quadrants` (campaign_id → quadrant tag)
  - `h2s_ltv_cohorts` (customer_id, first_order_date, segment, replacement_status)
  - `claude_calls` (cost ledger)
  - `h2s_reports` (markdown content + generated_at)
- Build **`scripts/ga4_extractor.py`** — sessions, conversions, traffic source, revenue, by-state
- Build **`scripts/gsc_extractor.py`** — queries, impressions, clicks, CTR, position
- Add both to `scripts/main.py` orchestrator
- Trigger GitHub Action manually → confirm data lands in Supabase

**EOD:** GA4 + GSC live. 4 of 6 sources operational.

### **Wednesday, May 20 — Last 2 Extractors + Claude Wrapper**
- Build **`scripts/gokwik_extractor.py`** — checkout, prepaid/COD, RTO by pincode (if docs sparse, defer ≤2hrs and mock fixture)
- Build **`scripts/clarity_extractor.py`** — sessions, rage clicks, dead clicks, scroll depth, JS errors (aggregate API only)
- Build **`src/lib/claude.ts`** — Anthropic SDK, model router, prompt cache, cost ledger to Supabase
- Build **`src/data/h2s_brief.md`** from H2S brand PDF (structured: voice, audience, geo, channels, quadrants, LTV)
- Tokenise brief → register as cached system block
- Smoke-test: call same prompt twice, confirm cache hit (~85% input cost saving)

**EOD:** All 6 extractors running. Claude wrapper tested. H2S brief cached.

### **Thursday, May 21 — Aggregation + Claude Synthesis + Delivery**
- Build **`src/lib/h2s/aggregate.ts`** — single function pulling last 7 days from all 6 source tables into one unified fact object: `{ revenue, orders, by_state, by_channel, by_quadrant, funnel, cohorts, prepaid_pct, rto_pct, top_queries, anomalies }`
- Build **rules-based anomaly pre-filter** — flag >2σ daily change on key metrics
- Build **`src/lib/h2s/prompts.ts`** — Opus synthesis prompt: system (cached brief + Power of Five template) + user (fact object + 4 weeks of prior summaries)
- Build **`POST /api/h2s/generate-report`** — runs aggregation → Claude → writes to `h2s_reports`, returns markdown + share URL
- **Slack webhook** posts summary to `#h2s-weekly`
- **Google Doc export** via Docs API (or HTML → PDF → Drive)

**EOD:** Hit endpoint manually, get a real Claude report with H2S numbers in Slack + Google Doc.

### **Friday, May 22 — H2S Dashboard + One-Click UX + Demo**
- New route **`src/app/(app)/h2s/page.tsx`** — H2S pilot dashboard
- **"Generate Report" button** at top right → calls `/api/h2s/generate-report`, loading state, inline display + Slack + Doc
- **Panels (8):**
  1. Headline KPIs with WoW deltas
  2. ROAS by state (TN/GJ/AP/MH/TG/PY highlighted)
  3. Meta content quadrant performance (4 cards)
  4. LTV cohort table (0–3 / 5–7 / 9–12 months)
  5. Funnel health (Clarity + GoKwik)
  6. Search intent top 10 (GSC)
  7. Anomaly feed
  8. Latest report markdown render
- **Cron schedule:** Monday 9am IST auto-run
- **3pm: COO demo** (30 min)

**EOD deliverable:**
- H2S one-click analytics tool live at `/h2s`
- 6 data sources flowing
- Claude Opus weekly report auto-generated + Slack + Google Doc
- H2S-specific views operational

---

## 9. Realistic ship estimates (honest)

| Item | Likelihood Fri EOD |
|---|---|
| Meta + Shopify (existing) | 100% |
| GA4 extractor | ~95% |
| GSC extractor | ~90% (OAuth setup is the slow part) |
| Clarity extractor | ~75% (API rate-limited) |
| GoKwik extractor | ~60% (docs sparse + H2S access dependency) |
| Claude wrapper + cache | ~95% |
| One-click button + Slack/Doc | ~90% |
| All 8 dashboard panels | ~70% (Next.js 16 quirks may slow) |
| Quadrant tagging | ~50% (manual scheme needed; may ship "untagged" view first) |
| LTV cohort replacement tracking | ~50% (depends on Shopify customer history depth) |

**Minimum acceptable Fri EOD:** 4 sources (Meta, Shopify, GA4, GSC), Claude report end-to-end, one-click button, headline + by-channel + funnel panels live. Quadrants and LTV deferred to following week.

---

## 10. Risks this week

| Risk | Mitigation |
|---|---|
| GoKwik API access not granted by H2S | Mock data Wed; chase access Tue 9am; if not unblocked by Thu, defer |
| Next.js 16 conventions trip up frontend | Read `node_modules/next/dist/docs/` Tue morning; copy from existing routes |
| Claude prompt produces generic insight | Tune Thu with ≥2 iterations on real H2S data |
| Service account access for GA4/GSC delayed | Request Tue 9am; H2S admin on standby |
| Quadrant tagging requires backfill | Ship "untagged" view first; tagging is Week 2 |
| Cost overrun if cache misconfigured | $50/day cap on cost-ledger alert; daily Lead review |

---

## 11. Open questions (still need user/COO answer before locking)

1. **Looker Studio role** — source or destination? (Strongly suspect destination — push results into an existing Looker dashboard. Confirm.)
2. **"One-click" UX** — button on `/h2s` page? Slack `/h2s-report` slash command? Both?
3. **Output format priority** — Slack + Google Doc + dashboard inline = all three? Or pick one to ship first?
4. **Time comparisons** — WoW only Phase 1, or also MoM and daily?
5. **Report audience** — Internal (COO + AM) only Phase 1, or also client-facing (H2S leadership)?
6. **API credentials status** — confirmed accessible for all 6 sources before Tue 9am?
7. **Anthropic API key budget** — initial $200 credit OK, or higher?
8. **Cron timing** — Monday 9am IST acceptable, or different cadence?

---

## 12. Memory files (persist across Claude sessions)

Located at `C:\Users\Karan\.claude\projects\c--Users-Karan-Desktop-Projects-Digitally-next-projects-Ai-Agent\memory\`:

- `MEMORY.md` — Index
- `project_h2s_analytics.md` — H2S brand + analytics tool specifics (load-bearing)
- `project_adauto_dashboard.md` — Existing AdAuto codebase context + Next.js 16 warning

The new session should auto-load these. If not, read them first.

---

## 13. What the new Claude Code session should do first

In this order:

1. **Confirm working directory** is `adAutoDashboard/`
2. **Read `AGENTS.md` and `CLAUDE.md`** in the project root (the Next.js 16 warning)
3. **Read `PRD.md`** in the project root (original AdAuto spec, 433 lines)
4. **Read memory files** (`project_h2s_analytics.md` and `project_adauto_dashboard.md`)
5. **Read `node_modules/next/dist/docs/`** index/relevant files for Next.js 16 conventions
6. **Read existing extractor pattern:** `scripts/meta_extractor.py`, `scripts/shopify_extractor.py`, `scripts/main.py`, `scripts/db.py`, `scripts/config.py`
7. **Read existing schema:** `supabase/migrations/004_phase4_shopify.sql` (most recent ecom-related) + `008_flipkart_ads.sql` (most recent)
8. **Read existing route pattern:** `src/app/(app)/page.tsx` and `src/app/api/shopify/route.ts`
9. **Confirm with user before writing code** — answer the 8 open questions in §11
10. **Begin Tuesday's tasks** — see §8

---

## 14. Tone / working-style notes

- User prefers concrete action items over high-level narrative (asked twice in original session for "buy VPS + n8n style" lists)
- User wants honest reality checks — they explicitly removed an earlier "5-day reality check" section but then asked for a realistic timeline anyway
- User values plain-English summaries — asked twice for "layman terms" / "1–2 line summary"
- User pivots scope aggressively — went from 4-module charter → Modules 1+2 first → Module 4 only → H2S pilot only in one session
- Today's date in original session: 2026-05-18 (Monday). Build week is Tue May 19 → Fri May 22.

---

## 15. Files / artifacts produced in original session

- `Ai_Agent/PRD.md` — Full Phase 1 PRD (4 modules, charter context)
- `Ai_Agent/H2S_SESSION_HANDOFF.md` — This document
- Memory updates in `~/.claude/projects/.../memory/`

PDFs referenced (not produced):
- `Ai_Agent/DN_AI_Enablement_Charter_Phase1.pdf` — Original charter from COO
- `Brand Overview – Hard2Soft (1).pdf` — H2S brand doc (uploaded mid-session)

---

**End of handoff. New session: start at §13.**
