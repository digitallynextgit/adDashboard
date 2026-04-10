import hmac
import hashlib

from facebook_business.api import FacebookAdsApi
from facebook_business.adobjects.adaccount import AdAccount
from facebook_business.adobjects.campaign import Campaign

from config import META_APP_ID, META_APP_SECRET, META_ACCESS_TOKEN, META_AD_ACCOUNT_ID, LOOKBACK_DAYS
from db import upsert_campaign, upsert_metrics
from utils import get_date_range, logger

# Meta campaign status mapping
STATUS_MAP = {
    "ACTIVE": "active",
    "PAUSED": "paused",
    "DELETED": "completed",
    "ARCHIVED": "completed",
}


def extract_meta_ads() -> int:
    """Extract campaign metrics from Meta Ads API. Returns number of records synced."""
    logger.info("Initializing Meta Ads API...")
    FacebookAdsApi.init(META_APP_ID, META_APP_SECRET, META_ACCESS_TOKEN)

    account = AdAccount(f"act_{META_AD_ACCOUNT_ID}")
    start_date, end_date = get_date_range(LOOKBACK_DAYS)

    logger.info(f"Fetching campaigns for account {META_AD_ACCOUNT_ID}")
    logger.info(f"Date range: {start_date} to {end_date}")

    # Fetch all campaigns
    campaigns = account.get_campaigns(
        fields=[
            Campaign.Field.id,
            Campaign.Field.name,
            Campaign.Field.status,
        ],
    )

    records_synced = 0

    for campaign in campaigns:
        campaign_id = campaign[Campaign.Field.id]
        campaign_name = campaign[Campaign.Field.name]
        raw_status = campaign[Campaign.Field.status]
        status = STATUS_MAP.get(raw_status, "active")

        logger.info(f"Processing campaign: {campaign_name} ({campaign_id}) - {status}")

        # Upsert campaign record
        campaign_uuid = upsert_campaign(
            platform="meta",
            campaign_id=campaign_id,
            campaign_name=campaign_name,
            status=status,
        )

        # Fetch insights (metrics) for this campaign
        insights = campaign.get_insights(
            fields=[
                "spend",
                "impressions",
                "clicks",
                "ctr",
                "cpc",
                "actions",
                "cost_per_action_type",
                "action_values",
            ],
            params={
                "time_range": {"since": start_date, "until": end_date},
                "time_increment": 1,  # Daily breakdown
            },
        )

        for day in insights:
            date = day["date_start"]
            spend = float(day.get("spend", 0))
            impressions = int(day.get("impressions", 0))
            clicks = int(day.get("clicks", 0))
            ctr = float(day.get("ctr", 0))
            cpc = float(day.get("cpc", 0))

            # Extract conversions from actions array
            conversions = 0
            actions = day.get("actions", [])
            for action in actions:
                if action["action_type"] in ("lead", "purchase", "complete_registration", "offsite_conversion.fb_pixel_purchase"):
                    conversions += int(action.get("value", 0))

            # Extract cost per conversion
            cost_per_conversion = 0
            cost_per_actions = day.get("cost_per_action_type", [])
            for cpa in cost_per_actions:
                if cpa["action_type"] in ("lead", "purchase", "complete_registration"):
                    cost_per_conversion = float(cpa.get("value", 0))
                    break

            # Extract ROAS from action_values
            roas = 0
            action_values = day.get("action_values", [])
            for av in action_values:
                if av["action_type"] in ("purchase", "offsite_conversion.fb_pixel_purchase"):
                    revenue = float(av.get("value", 0))
                    roas = revenue / spend if spend > 0 else 0
                    break

            upsert_metrics(campaign_uuid, date, {
                "spend": spend,
                "impressions": impressions,
                "clicks": clicks,
                "ctr": ctr,
                "cpc": cpc,
                "conversions": conversions,
                "cost_per_conversion": cost_per_conversion,
                "roas": roas,
                "currency": "INR",
            })
            records_synced += 1

        logger.info(f"  Synced {len(list(insights))} days of data for {campaign_name}")

    logger.info(f"Meta Ads sync complete. Total records: {records_synced}")
    return records_synced
