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
