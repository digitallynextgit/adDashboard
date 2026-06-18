from supabase import create_client
from config import SUPABASE_URL, SUPABASE_SERVICE_KEY

supabase = create_client(SUPABASE_URL, SUPABASE_SERVICE_KEY)


def upsert_campaign(platform: str, campaign_id: str, campaign_name: str, status: str) -> str:
    """Upsert a campaign and return the internal UUID."""
    result = (
        supabase.table("campaigns")
        .select("id")
        .eq("platform", platform)
        .eq("campaign_id", campaign_id)
        .execute()
    )

    if result.data:
        internal_id = result.data[0]["id"]
        supabase.table("campaigns").update({
            "campaign_name": campaign_name,
            "status": status,
        }).eq("id", internal_id).execute()
        return internal_id
    else:
        result = (
            supabase.table("campaigns")
            .insert({
                "platform": platform,
                "campaign_id": campaign_id,
                "campaign_name": campaign_name,
                "status": status,
            })
            .execute()
        )
        return result.data[0]["id"]


def upsert_metrics(campaign_uuid: str, date: str, metrics: dict):
    """Upsert daily metrics for a campaign."""
    row = {"campaign_id": campaign_uuid, "date": date, **metrics}
    supabase.table("campaign_metrics").upsert(row, on_conflict="campaign_id,date").execute()


def bulk_upsert_ad_creatives(rows: list[dict]):
    """Bulk upsert ad creative daily metrics. Single DB call for all rows."""
    if rows:
        supabase.table("ad_creatives").upsert(rows, on_conflict="ad_id,date").execute()


def bulk_upsert_audience_breakdowns(rows: list[dict]):
    """Bulk upsert audience breakdown rows. Single DB call for all rows."""
    if rows:
        supabase.table("audience_breakdowns").upsert(
            rows, on_conflict="campaign_id,date,breakdown_type,breakdown_value"
        ).execute()


def bulk_upsert_shopify_sales(rows: list[dict]):
    """Bulk upsert Shopify daily sales per SKU. Single DB call for all rows."""
    if rows:
        supabase.table("shopify_daily_sales").upsert(rows, on_conflict="date,variant_id").execute()


def bulk_upsert_shopify_variants(rows: list[dict]):
    """Bulk upsert Shopify product variants (full catalog). Single DB call."""
    if rows:
        supabase.table("shopify_variants").upsert(rows, on_conflict="variant_id").execute()


def bulk_upsert_shopify_daily_summary(rows: list[dict]):
    """Bulk upsert Shopify daily order-level summary. One row per day."""
    if rows:
        supabase.table("shopify_daily_summary").upsert(rows, on_conflict="date").execute()


def bulk_upsert_shopify_channel_sales(rows: list[dict]):
    """Bulk upsert Shopify sales-by-channel rows. Single DB call."""
    if rows:
        supabase.table("shopify_channel_sales").upsert(rows, on_conflict="date,channel").execute()


def bulk_upsert_shopify_customers(rows: list[dict]):
    """Bulk upsert Shopify customers (for returning rate + cohorts). Single DB call."""
    if rows:
        supabase.table("shopify_customers").upsert(rows, on_conflict="customer_id").execute()


def bulk_upsert_shopify_referrer_sales(rows: list[dict]):
    """Bulk upsert Shopify sales-by-referrer rows. Single DB call."""
    if rows:
        supabase.table("shopify_referrer_sales").upsert(rows, on_conflict="date,referrer").execute()


def upsert_flipkart_campaign(row: dict):
    """Upsert a single Flipkart campaign."""
    supabase.table("flipkart_campaigns").upsert(row, on_conflict="campaign_id").execute()


def bulk_upsert_flipkart_metrics(rows: list[dict]):
    """Bulk upsert Flipkart daily metrics. Single DB call for all rows."""
    if rows:
        supabase.table("flipkart_metrics").upsert(rows, on_conflict="campaign_id,date").execute()


def bulk_upsert_ga4_daily(rows: list[dict]):
    """Bulk upsert GA4 daily metrics. Single DB call for all rows."""
    if rows:
        supabase.table("ga4_daily").upsert(
            rows, on_conflict="date,state,traffic_source"
        ).execute()


def bulk_upsert_gsc_queries(rows: list[dict]):
    """Bulk upsert GSC daily query metrics. Single DB call for all rows."""
    if rows:
        supabase.table("gsc_daily_queries").upsert(
            rows, on_conflict="date,query,page"
        ).execute()


def bulk_upsert_clarity_daily(rows: list[dict]):
    """Bulk upsert Clarity daily aggregate metrics. Single DB call for all rows."""
    if rows:
        supabase.table("clarity_daily").upsert(rows, on_conflict="date").execute()


def bulk_upsert_gokwik_daily(rows: list[dict]):
    """Bulk upsert GoKwik daily metrics. Single DB call for all rows."""
    if rows:
        supabase.table("gokwik_daily").upsert(
            rows, on_conflict="date,pincode"
        ).execute()


def bulk_upsert_h2s_state_revenue(rows: list[dict]):
    """Bulk upsert state-level revenue rows for H2S. Single DB call for all rows."""
    if rows:
        supabase.table("h2s_state_revenue").upsert(
            rows, on_conflict="date,state"
        ).execute()


def bulk_upsert_h2s_ltv_cohorts(rows: list[dict]):
    """Bulk upsert H2S LTV cohort rows. Single DB call for all rows."""
    if rows:
        supabase.table("h2s_ltv_cohorts").upsert(
            rows, on_conflict="customer_id"
        ).execute()


def log_sync(platform: str, status: str, records: int, error: str | None, started_at: str, finished_at: str):
    """Log a sync run."""
    supabase.table("sync_log").insert({
        "platform": platform,
        "status": status,
        "records": records,
        "error": error,
        "started_at": started_at,
        "finished_at": finished_at,
    }).execute()
