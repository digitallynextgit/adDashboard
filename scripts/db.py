from supabase import create_client
from config import SUPABASE_URL, SUPABASE_SERVICE_KEY

supabase = create_client(SUPABASE_URL, SUPABASE_SERVICE_KEY)


def upsert_campaign(platform: str, campaign_id: str, campaign_name: str, status: str) -> str:
    """Upsert a campaign and return the internal UUID."""
    # Check if campaign exists
    result = (
        supabase.table("campaigns")
        .select("id")
        .eq("platform", platform)
        .eq("campaign_id", campaign_id)
        .execute()
    )

    if result.data:
        # Update existing
        internal_id = result.data[0]["id"]
        supabase.table("campaigns").update({
            "campaign_name": campaign_name,
            "status": status,
        }).eq("id", internal_id).execute()
        return internal_id
    else:
        # Insert new
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
    # Check if row exists for this campaign + date
    result = (
        supabase.table("campaign_metrics")
        .select("id")
        .eq("campaign_id", campaign_uuid)
        .eq("date", date)
        .execute()
    )

    row = {
        "campaign_id": campaign_uuid,
        "date": date,
        **metrics,
    }

    if result.data:
        supabase.table("campaign_metrics").update(row).eq("id", result.data[0]["id"]).execute()
    else:
        supabase.table("campaign_metrics").insert(row).execute()


def upsert_ad_creative(campaign_uuid: str, ad_id: str, ad_name: str, adset_id: str, adset_name: str, date: str, metrics: dict):
    """Upsert daily metrics for an ad creative."""
    result = (
        supabase.table("ad_creatives")
        .select("id")
        .eq("ad_id", ad_id)
        .eq("date", date)
        .execute()
    )

    row = {
        "campaign_id": campaign_uuid,
        "ad_id": ad_id,
        "ad_name": ad_name,
        "adset_id": adset_id,
        "adset_name": adset_name,
        "date": date,
        **metrics,
    }

    if result.data:
        supabase.table("ad_creatives").update(row).eq("id", result.data[0]["id"]).execute()
    else:
        supabase.table("ad_creatives").insert(row).execute()


def upsert_audience_breakdown(campaign_uuid: str, date: str, breakdown_type: str, breakdown_value: str, metrics: dict):
    """Upsert audience breakdown data."""
    result = (
        supabase.table("audience_breakdowns")
        .select("id")
        .eq("campaign_id", campaign_uuid)
        .eq("date", date)
        .eq("breakdown_type", breakdown_type)
        .eq("breakdown_value", breakdown_value)
        .execute()
    )

    row = {
        "campaign_id": campaign_uuid,
        "date": date,
        "breakdown_type": breakdown_type,
        "breakdown_value": breakdown_value,
        **metrics,
    }

    if result.data:
        supabase.table("audience_breakdowns").update(row).eq("id", result.data[0]["id"]).execute()
    else:
        supabase.table("audience_breakdowns").insert(row).execute()


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
