# H2S Analytics — Services Reference

**Purpose:** Complete reference for every external service used in the H2S analytics pipeline. Covers (1) the credentials each service requires and (2) the specific data fields each service contributes to the dashboard.

**Prepared by:** Karan Joshi
**For:** Manager review + H2S team coordination + internal handoff

---

# PART 1 — Credential Parameters by Service

For each service: what env vars are needed, where to obtain them, what format they take, and where they live in the codebase.

## Legend

| Status | Meaning |
|---|---|
| ✅ | Already configured and working |
| ⚠ | Code ready, partial credentials |
| 🔴 | Code ready, credentials pending |

---

## 1. Meta Ads ✅

| Parameter | Description | Where to obtain | Format example |
|---|---|---|---|
| `META_APP_ID` | App ID from your Meta dev app | developers.facebook.com → My Apps → App Settings | `1626211811956203` |
| `META_APP_SECRET` | App secret (treat as password) | App Settings → Basic | `3fc8ee48621777c9e041a...` |
| `META_ACCESS_TOKEN` | Long-lived user access token (60-day) | Graph API Explorer → generate token → exchange via debug_token endpoint | `EAAXHBZCFhles...` |
| `META_AD_ACCOUNT_ID` | Ad account ID **without `act_` prefix** | Ads Manager → top-left account dropdown | `744544010578457` |

**Files:** `scripts/.env`, GitHub Actions secrets

---

## 2. Shopify ✅

| Parameter | Description | Where to obtain | Format example |
|---|---|---|---|
| `SHOPIFY_STORE_URL` | Store domain (no `https://`) | Shopify Admin → URL bar | `xxvjh8-ad.myshopify.com` |
| `SHOPIFY_ACCESS_TOKEN` | Admin API access token | Settings → Apps → Develop apps → Configure → Install | `shpat_35cb1233c49a7a...` |

**Files:** `scripts/.env`, GitHub Actions secrets

---

## 3. Amazon Ads ⚠

| Parameter | Description | Where to obtain | Format example |
|---|---|---|---|
| `AMAZON_CLIENT_ID` | LWA client ID | developer.amazon.com → Login with Amazon → Security Profile | `amzn1.application-oa2-client.2b8fc6...` |
| `AMAZON_CLIENT_SECRET` | LWA client secret | Same security profile | `amzn1.oa2-cs.v1.078b...` |
| `AMAZON_REFRESH_TOKEN` | OAuth refresh token | Run `python scripts/amazon_auth.py` (browser flow) | `Atzr|IwEBI...` |
| `AMAZON_PROFILE_ID` | India advertiser profile ID | Auto-detected by `amazon_auth.py` OR from advertising.amazon.in URL | `3284752096482156` |

**Files:** `scripts/.env`, GitHub Actions secrets
**Action required:** Run `amazon_auth.py` to obtain `REFRESH_TOKEN` and `PROFILE_ID`

---

## 4. Flipkart Ads 🔴

| Parameter | Description | Where to obtain | Format example |
|---|---|---|---|
| `FLIPKART_CLIENT_ID` | Self-access app client ID | Flipkart Seller Hub → Manage Profile → Developer Access → Create self-access app | UUID-style |
| `FLIPKART_CLIENT_SECRET` | Self-access app secret | Same screen | Base64-style string |

**Files:** `scripts/.env`, GitHub Actions secrets
**Note:** Flipkart has no public Ads API — only marketplace data (orders/listings) is available

---

## 5. Google Analytics 4 🔴

| Parameter | Description | Where to obtain | Format example |
|---|---|---|---|
| `GA4_PROPERTY_ID` | Numeric property ID | GA4 → Admin → Property Settings | `123456789` |
| `GA4_SERVICE_ACCOUNT_JSON` | Service account credentials | GCP Console → IAM → Service Accounts → Create → Keys → Add JSON Key | File path OR raw JSON content |

**Files:** `scripts/.env`, GitHub Actions secrets
**Action required:** Add the service account email (from the JSON) as a **Viewer** in GA4 → Property Access Management

---

## 6. Google Search Console 🔴

| Parameter | Description | Where to obtain | Format example |
|---|---|---|---|
| `GSC_SITE_URL` | Verified property URL | Search Console → Settings → Property | `sc-domain:hard2soft.com` or `https://www.hard2soft.com/` |

**Files:** `scripts/.env`, GitHub Actions secrets
**Reuses:** GA4 service account JSON (no separate key needed)
**Action required:** Add the service account email as a **User** with **Full** permission in Search Console → Settings → Users and permissions

---

## 7. Microsoft Clarity 🔴

| Parameter | Description | Where to obtain | Format example |
|---|---|---|---|
| `CLARITY_PROJECT_ID` | Clarity project identifier | clarity.microsoft.com → Settings → Project ID | Short hash string |
| `CLARITY_API_TOKEN` | Data Export API token | Clarity → Settings → Data Export → Generate API Token | Bearer token string |

**Files:** `scripts/.env`, GitHub Actions secrets
**Note:** API is rate-limited (1 request / 10 seconds) — extractor handles this automatically

---

## 8. GoKwik 🔴

| Parameter | Description | Where to obtain | Format example |
|---|---|---|---|
| `GOKWIK_API_KEY` | API key | Email GoKwik merchant support (no self-serve portal) | Bearer token |
| `GOKWIK_MERCHANT_ID` | Merchant identifier | Same support email | Numeric / UUID |
| `GOKWIK_API_BASE` | API base URL | Defaults to `https://api.gokwik.co`, override if instructed | `https://api.gokwik.co` |

**Files:** `scripts/.env`, GitHub Actions secrets
**Note:** Endpoint paths in extractor are best-guess until validated against actual API responses

---

## 9. Supabase ✅

| Parameter | Description | Where to obtain | Format example |
|---|---|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | Project REST endpoint | Supabase → Project Settings → API | `https://hucooqzlwayorjkvyopk.supabase.co` |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Public anon JWT (safe in browser) | Same page | `eyJ...role:anon...` |
| `SUPABASE_SERVICE_KEY` | Service role JWT (bypasses RLS) | Same page → **Reveal** | `eyJ...role:service_role...` |

**Files:** `.env.local` (Next.js), `scripts/.env` (Python), GitHub Actions secrets

---

## 10. Groq ✅

| Parameter | Description | Where to obtain | Format example |
|---|---|---|---|
| `GROQ_API_KEY` | API key (free tier) | console.groq.com → API Keys → Create | `gsk_...` |

**Files:** `.env.local`, Vercel env
**Note:** No credit card required. Free tier covers all H2S development work.

---

## 11. Anthropic Claude 🔴

| Parameter | Description | Where to obtain | Format example |
|---|---|---|---|
| `ANTHROPIC_API_KEY` | API key | console.anthropic.com → API Keys → Create (after $10 top-up) | `sk-ant-api03-...` |
| `CLAUDE_DAILY_CAP_USD` | Per-day spend ceiling (optional, defaults to 5) | Manually set | `5` |

**Files:** `.env.local`, Vercel env
**Pre-req:** $10 prepaid credit top-up via Billing → Credits

---

## 12. Internal Auth ✅

| Parameter | Description | Where to obtain | Format example |
|---|---|---|---|
| `AUTH_PASSWORD_HASH` | scrypt hash of the login password | Run `node scripts/hash-password.js "your-password"` | `salt:hash` (hex) |

**Files:** `.env.local`, Vercel env

---

## Where each env file lives

| File | Used by | What lives here |
|---|---|---|
| `.env.local` (project root) | Next.js app, API routes, auth, LLM wrapper | Supabase keys · AUTH_PASSWORD_HASH · GROQ_API_KEY · ANTHROPIC_API_KEY |
| `scripts/.env` | Python sync extractors | All ad platform + Shopify + GA4/GSC/Clarity/GoKwik credentials |
| **GitHub Actions secrets** | Scheduled sync job (cron) | Mirror of `scripts/.env` |
| **Vercel env vars** | Production Next.js app | Mirror of `.env.local` |

---

# PART 2 — Data Fields We Pull from Each Service

For each service: dimensions (slice-by axes), metrics (numbers), and calculated values.

---

## 1. Meta Ads
**Granularity:** date × campaign · date × ad · date × campaign × audience breakdown

| Type | Fields |
|---|---|
| **Dimensions** | date · campaign_id · campaign_name · status · ad_id · ad_name · adset_id · adset_name · age · gender · region (Indian state) |
| **Volume metrics** | spend · impressions · clicks · reach · frequency · cpm · cpc · ctr |
| **Conversion metrics** | conversions · purchases · purchase_value · add_to_cart · initiate_checkout · landing_page_views |
| **Cost metrics** | cost_per_conversion · cost_per_purchase · cost_per_add_to_cart · cost_per_initiate_checkout |
| **Video metrics** | video_3s_views · video_thruplay · video_avg_watch_time |
| **Calculated** | **ROAS** = purchase_value / spend · **CTR** = clicks / impressions · **CPC** = spend / clicks |

---

## 2. Shopify
**Granularity:** date × variant (SKU) + customer-level rollup

| Type | Fields |
|---|---|
| **Dimensions** | date · product_id · product_title · variant_id · variant_title · sku |
| **Sales metrics** | orders_count · units_sold · revenue |
| **Catalog metrics** | price · inventory_quantity |
| **LTV-derived (after backfill)** | customer_id · first_order_date · last_order_date · order_count · total_revenue · state · pincode |
| **Calculated** | **AOV** = revenue / orders · **Reorder rate** = customers w/ order_count > 1 ÷ total customers |

---

## 3. Amazon Ads
**Granularity:** date × campaign

| Type | Fields |
|---|---|
| **Dimensions** | date · campaign_id · campaign_name · status · daily_budget |
| **Volume metrics** | spend · impressions · clicks · ctr · cpc |
| **Conversion metrics** | orders · units_sold · revenue |
| **Calculated** | **ROAS** = revenue / spend · **ACoS** = spend / revenue (Amazon-specific) |

---

## 4. Flipkart Ads
**Granularity:** date × campaign (PLA / PCA)

| Type | Fields |
|---|---|
| **Dimensions** | date · campaign_id · campaign_name · campaign_type · status · daily_budget |
| **Volume metrics** | spend · impressions · clicks · ctr · cpc |
| **Conversion metrics** | orders · units_sold · revenue |
| **Calculated** | **ROAS** = revenue / spend |

---

## 5. Google Analytics 4
**Granularity:** date × state × traffic source

| Type | Fields |
|---|---|
| **Dimensions** | date · state (region) · traffic_source (sessionDefaultChannelGroup) |
| **Audience metrics** | sessions · users (totalUsers) · new_users · engaged_sessions |
| **Conversion metrics** | conversions · revenue (totalRevenue) |
| **Calculated** | **Engagement rate** = engaged_sessions / sessions · **Conversion rate** = conversions / sessions |

---

## 6. Google Search Console
**Granularity:** date × query × page

| Type | Fields |
|---|---|
| **Dimensions** | date · query · page (URL) |
| **Search metrics** | impressions · clicks · ctr · position (average) |
| **Calculated** | **Content gaps** = queries with impressions ≥ 100 AND clicks = 0 |

---

## 7. Microsoft Clarity
**Granularity:** date (aggregate only — per-session data not exposed via API)

| Type | Fields |
|---|---|
| **Dimensions** | date |
| **Behavior metrics** | sessions · rage_clicks · dead_clicks · quick_back · scroll_depth · js_errors |
| **Calculated** | **Frustration rate** = (rage_clicks + dead_clicks) / sessions |
| ⚠ **NOT available via API** | Heatmaps · session recordings · individual user journeys (dashboard only) |

---

## 8. GoKwik
**Granularity:** date × pincode (+ state where available)

| Type | Fields |
|---|---|
| **Dimensions** | date · pincode · state |
| **Checkout metrics** | checkouts_started · checkouts_complete |
| **Order-type split** | prepaid_orders · cod_orders · rto_orders |
| **Revenue** | revenue |
| **Calculated** | **Prepaid %** = prepaid / (prepaid + cod) · **RTO %** = rto / total_orders · **Checkout completion** = complete / started |

---

## 9. AI-generated content (Groq / Claude → `h2s_reports`)

| Type | Fields |
|---|---|
| **Output** | markdown (full 9-section weekly report) · fact_object (JSON of inputs) · model_used · generated_at · week_start · week_end |
| **Sections in markdown** | 1. Headline KPIs · 2. By geography · 3. By channel · 4. Meta quadrants · 5. LTV cohorts · 6. Funnel health · 7. Search intent · 8. Anomalies · 9. Recommended actions |

---

## 10. H2S-derived tables (rolled up from above sources)

| Table | Fields |
|---|---|
| **h2s_state_revenue** | date · state · orders · revenue · prepaid_count · cod_count · rto_count |
| **h2s_content_quadrants** | campaign_id · quadrant (`hardwater_costs` / `buy_smart` / `real_people` / `water_expert`) · tagged_by · confidence |
| **h2s_ltv_cohorts** | customer_id · first_order_date · last_order_date · order_count · total_revenue · cohort (`new_0_3` / `mid_5_7` / `replace_9_12` / `lapsed_12_plus`) · replacement_status (`pending` / `reordered` / `lapsed`) · state · pincode |

---

# PART 3 — Master Metric → Source Map

Every number displayed on the `/h2s` dashboard, traced back to its source.

| Dashboard metric | Source field(s) |
|---|---|
| Revenue (headline) | `h2s_state_revenue.revenue` (rolled up from Shopify orders) |
| Orders (headline) | `h2s_state_revenue.orders` (rolled up from Shopify orders) |
| Spend (headline) | `campaign_metrics.spend` (Meta + Amazon + Flipkart combined) |
| Blended CAC | total spend ÷ total orders |
| Blended ROAS | total revenue ÷ total spend |
| Prepaid % | GoKwik `prepaid_orders` ÷ (prepaid + cod) |
| RTO % | GoKwik `rto_orders` ÷ total orders |
| Sessions | `ga4_daily.sessions` |
| Add-to-Cart count | Meta `campaign_metrics.add_to_cart` |
| Checkouts initiated | Meta `campaign_metrics.initiate_checkout` + GoKwik `checkouts_complete` |
| Purchases | Meta `campaign_metrics.purchases` |
| Rage / dead clicks | `clarity_daily.rage_clicks` · `clarity_daily.dead_clicks` |
| JS errors | `clarity_daily.js_errors` |
| Top converting queries | `gsc_daily_queries` where clicks > 0 |
| Content gap queries | `gsc_daily_queries` where impressions ≥ 100 AND clicks = 0 |
| Quadrant ROAS | Meta `purchase_value / spend` joined to `h2s_content_quadrants.quadrant` |
| Cohort replacement rate | `h2s_ltv_cohorts` count of `replacement_status = 'reordered'` ÷ total in cohort |
| Geography ROAS | per-state revenue ÷ per-state spend attribution |

---

# PART 4 — At-a-glance Status Summary

| Service | Credentials status | Data flowing | Panels affected |
|---|---|---|---|
| Meta Ads | ✅ Live | ✅ Yes | KPIs · Channel · Quadrants · Funnel |
| Shopify | ✅ Live | ✅ Yes | KPIs · Geography · LTV cohorts |
| Amazon Ads | ⚠ Partial (need refresh token) | ❌ No | KPIs · Channel |
| Flipkart Ads | 🔴 Pending | ❌ No | KPIs · Channel |
| Google Analytics 4 | 🔴 Pending H2S | ❌ No | KPIs · Geography · Funnel |
| Google Search Console | 🔴 Pending H2S | ❌ No | Search Intent |
| Microsoft Clarity | 🔴 Pending H2S | ❌ No | Funnel Health |
| GoKwik | 🔴 Pending H2S | ❌ No | KPIs · Geography · Funnel |
| Supabase | ✅ Live | ✅ Yes | All (storage backbone) |
| Groq | ✅ Live | ✅ Yes | Latest Report · Anomaly Feed |
| Anthropic Claude | 🔴 Pending budget | ❌ No | (Replaces Groq when active) |

---

**End of reference document.**
