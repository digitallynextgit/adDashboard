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
