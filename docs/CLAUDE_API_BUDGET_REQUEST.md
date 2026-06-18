# Claude API — Usage Workflow & Budget Request

**Project:** AdAuto Dashboard — H2S (Hard2Soft) Pilot
**Prepared by:** Karan Joshi
**Prepared for:** Manager review and credit approval
**Date:** 2026-05-20

---

## 1. Summary

We are extending the existing AdAuto dashboard with an AI-powered weekly + daily analytics layer for the Hard2Soft (H2S) pilot client. The AI component uses Anthropic's Claude API to read multi-channel marketing data (Meta, Google Analytics, Shopify, Amazon, Flipkart, GoKwik, Microsoft Clarity, Search Console) and turn it into plain-English performance reports.

**Recommended initial top-up: $10 USD (one-time)**
**Expected monthly run-rate: $5–10 USD**
**Annualised: $60–120 USD**

---

## 2. What the AI does (six jobs)

| # | Job | When it runs | Model | Why this model |
|---|---|---|---|---|
| 1 | **Weekly synthesis report** — 9-section Power-of-Five with KPIs, geography, channels, content quadrants, LTV cohorts, anomalies, recommended next actions | Every Monday 5:00 AM IST | Sonnet 4.6 | Heavy multi-source reasoning, runs once per week. Sonnet handles 8-source synthesis reliably at 5× lower cost than Opus. |
| 2 | **Daily summary** — short morning note covering yesterday's revenue, orders, and any unusual signals | Every morning | Sonnet 4.6 | Lighter scope than weekly, but runs 7× more often. Sonnet is fast enough and cheap enough for daily use. |
| 3 | **Client-facing rewrite** — polished version of the internal report for sharing with H2S leadership | On-demand, Phase 2 | Sonnet 4.6 | Tone/voice transformation is a writing task, not a reasoning task. |
| 4 | **Anomaly classification** — for each metric that moved >2σ vs the trailing 4-week mean, decide if it's signal or noise | Before each report | Haiku 4.5 | Repeated yes/no classification. 5× cheaper than Sonnet, 25× cheaper than Opus. |
| 5 | **Auto-tag Meta campaigns into 4 content quadrants** — assigns each new campaign to one of #HardWaterIsCostingYou / #BuySmartNotRepeatedly / #RealPeopleRealSoftWater / #WaterExpertOfTheHouse | When new campaigns appear | Haiku 4.5 | Pattern matching on campaign names + ad copy. Cheap classifier work. |
| 6 | **Ad-hoc exploration** — interactive Q&A on the dashboard (e.g., "Why did Tamil Nadu revenue drop last week?") | On-demand by the team | Sonnet 4.6 | Interactive use needs fast response (2–3 sec). Opus would be 8–15 sec — too slow for chat. |

### Important: We are NOT using Opus

The most powerful model (Claude Opus 4.7) is intentionally excluded from Phase 1. Sonnet 4.6 is sufficient for the H2S workload (8 data sources, not 50) and reduces our monthly cost by ~40%. We can upgrade the weekly report alone to Opus in Phase 2 if quality demands it (+ ~$1/month).

---

## 3. How Anthropic API billing works

### Account model
- **Pay-as-you-go with prepaid credits.** No subscription. No monthly minimum.
- New accounts receive **$5 of free credits** (one-time, for testing on Anthropic's web playground).
- To use the API from production code, the account must hold a **non-zero prepaid balance**.
- Credits are deducted on every API call based on actual token usage.
- When the balance reaches $0, API calls return a 402 error (no overdraft, no surprise bills).

### Pricing model (per million tokens)
Anthropic charges per token, not per request. Tokens are roughly 0.75 words.

| Model | Base Input | Cache Write (5-min) | Cache Read | Output |
|---|---|---|---|---|
| Claude Sonnet 4.6 | $3.00 | $3.75 | $0.30 | $15.00 |
| Claude Haiku 4.5 | $1.00 | $1.25 | $0.10 | $5.00 |

**Prompt caching** reduces costs significantly: instead of resending the H2S brand brief (~10,000 tokens) on every call, we send it once and pay only the cache-read rate (~10× cheaper) on subsequent calls within 5 minutes.

### Account tiers
| Tier | Trigger | Rate limit |
|---|---|---|
| Tier 1 (us) | After first $5 top-up | ~50 requests/minute |
| Tier 2 | After $40 total spent + 7 days | 1000 requests/minute |
| Tier 3+ | Enterprise volumes | Higher |

We will operate comfortably within Tier 1 throughout Phase 1.

### Billing safeguards
Anthropic provides built-in spending controls (configured in the Console → Settings → Limits):
1. **Monthly spending limit** — hard ceiling; API blocks when reached.
2. **Email alert threshold** — notification when crossed (no block).
3. **Auto-reload** — optional. We will **not** enable this.

---

## 4. Cost breakdown

### Assumptions
- Cached system block (brand brief + report template): ~12,000 tokens
- Cache TTL: 5-minute ephemeral (Anthropic default)
- Facts payload per weekly report: ~10,000 tokens; daily: ~5,000 tokens
- Output: ~5,000 tokens weekly; ~3,000 tokens daily

### Per-run cost

**Weekly Sonnet report (1× per week):**

| Component | Tokens | Rate | Cost |
|---|---:|---:|---:|
| Cache write | 12,000 | $3.75 / MTok | $0.045 |
| Base input (facts) | 10,000 | $3.00 / MTok | $0.030 |
| Output | 5,000 | $15.00 / MTok | $0.075 |
| **Total per weekly report** | | | **~$0.15** |

**Daily Sonnet report (1× per day):**

| Component | Tokens | Rate | Cost |
|---|---:|---:|---:|
| Cache write | 12,000 | $3.75 / MTok | $0.045 |
| Base input (facts) | 5,000 | $3.00 / MTok | $0.015 |
| Output | 3,000 | $15.00 / MTok | $0.045 |
| **Total per daily report** | | | **~$0.105** |

**Haiku anomaly classification batch (~30 calls per pipeline run):**

| Component | Total tokens | Rate | Cost |
|---|---:|---:|---:|
| Input | 15,000 | $1.00 / MTok | $0.015 |
| Output | 3,000 | $5.00 / MTok | $0.015 |
| **Total per batch** | | | **~$0.03** |

### Monthly totals

| Usage scenario | Breakdown | Monthly cost |
|---|---|---:|
| **Conservative** — Weekly reports only | 4 × $0.15 + Haiku tagging | ~$1 |
| **Realistic** — Weekly + daily reports + anomaly checks | 4 weekly + 30 daily + 30 Haiku batches | **~$5** |
| **Active** — Above + moderate ad-hoc exploration | + 20 interactive Sonnet queries | **~$6–8** |
| **Heavy** — Longer reports, lots of exploration | All ramped up 2× | ~$10–12 |

**Expected monthly run-rate: $5–10**

---

## 5. Budget request

| Item | Amount | Rationale |
|---|---:|---|
| **Initial top-up** | **$10 USD** | Covers ~1.5–2 months of expected usage at the realistic scenario. Includes buffer for early-week tuning and prompt iterations. |
| **Monthly recurring** | **$10 USD** | Steady-state after Phase 1 is live. Topped up manually at month-end based on actual `claude_calls` ledger numbers. |
| **Hard ceiling (built into our code)** | **$5 USD / day** | Environment variable `CLAUDE_DAILY_CAP_USD=5`. The system refuses to call the API once $5 of cost has been logged in a 24-hour window. Prevents runaway loops. |
| **Hard ceiling (built into Anthropic Console)** | **$25 USD / month** | Configured in Anthropic Settings → Limits. Provides a second independent ceiling. |

### Risk-adjusted maximum
If both safeguards failed and we ran every workload at the heavy-use rate continuously: ~$25/month, then the Anthropic Console hard cap blocks further calls. This is the absolute worst-case for the month.

### Why $10 and not $5
- Anthropic minimum top-up is $5.
- A $5 top-up could be consumed within 4 weeks if we run prompt-tuning iterations during the build week.
- A $10 top-up gives 2-month runway and avoids needing to top up mid-month for the first sprint.

---

## 6. Cost visibility & accountability

Every Claude API call is logged to a Supabase table (`claude_calls`) with the following fields:

| Field | Purpose |
|---|---|
| `occurred_at` | Exact timestamp |
| `model` | Which model was used |
| `purpose` | What job triggered it (`h2s_weekly`, `h2s_daily`, `h2s_anomaly_classify`, etc.) |
| `input_tokens` / `output_tokens` | Raw usage |
| `cache_read_tokens` / `cache_create_tokens` | Cache efficiency tracking |
| `cost_usd` | Computed cost in USD for that call |
| `duration_ms` | Latency |
| `request_id` | Anthropic's request ID for support tickets |
| `error` | Failure reason if applicable |

This means at any moment we can run:
```sql
SELECT date_trunc('day', occurred_at) AS day, model, SUM(cost_usd)
FROM claude_calls GROUP BY 1, 2 ORDER BY 1 DESC;
```

…and see exactly where the spend went, by day and by model.

---

## 7. Setup checklist (after approval)

| # | Step | Owner | Notes |
|---|---|---|---|
| 1 | Create Anthropic account at console.anthropic.com | Karan / Manager | Use a shared agency email if billing should sit with finance |
| 2 | Verify email + phone | — | Required before billing access |
| 3 | Add payment method (corporate card or invoice) | Finance / Manager | Card on file; will not be auto-charged |
| 4 | Top up $10 to Credits balance | Finance / Manager | Billing → Credits → Add |
| 5 | Set monthly spend cap to $25 | Karan | Settings → Limits |
| 6 | Set email alert threshold to $10 | Karan | Settings → Limits |
| 7 | Create API key labelled `adauto-h2s-prod` | Karan | API keys → Create |
| 8 | Add `ANTHROPIC_API_KEY` to `.env.local` and to Vercel + GitHub Actions secrets | Karan | Encrypted, server-side only |
| 9 | Run smoke test (1 Sonnet call, ~$0.001) to confirm the integration works | Karan | Verifies key + ledger write end-to-end |

---

## 8. Comparison to alternatives

| Approach | Estimated monthly cost | Why we did not choose it |
|---|---:|---|
| Claude Sonnet + Haiku (this proposal) | **$5–10** | Recommended |
| Claude Opus 4.7 for everything | ~$30–50 | 4–5× more expensive for marginal quality gain on our workload size |
| OpenAI GPT-5 / equivalent | Similar | Adds vendor diversity but H2S reports benefit from Claude's reasoning style and prompt-caching cost model |
| Manual analyst writing weekly reports | 4–6 analyst hours/week | At ~₹500/hr internal cost = ~₹2,000–3,000/week ≈ ₹8,000–12,000/month ≈ $96–144/month + lower frequency |
| Skip AI, dashboards only | $0 | Loses the interpretation layer — the dashboards are tables/charts, not insights with hypotheses |

**The AI layer pays for itself if it saves even 30 minutes of analyst time per week** (at $5–10/month vs $96+ of manual labor).

---

## 9. Approval requested

Please confirm:

- [ ] Approved to create an Anthropic API account under the agency
- [ ] Approved to top up **$10** initial credit
- [ ] Approved to set monthly recurring budget at **$10**
- [ ] Approved to set hard monthly cap at **$25** in Anthropic Console
- [ ] Approved to set per-day cap at **$5** in our code

After approval, the integration takes ~10 minutes to wire up and ~1 day to validate end-to-end against real H2S data.

---

**End of document.**
