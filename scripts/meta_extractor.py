import hmac
import hashlib

from facebook_business.api import FacebookAdsApi
from facebook_business.adobjects.adaccount import AdAccount
from facebook_business.adobjects.campaign import Campaign

from config import META_APP_ID, META_APP_SECRET, META_ACCESS_TOKEN, META_AD_ACCOUNT_ID, LOOKBACK_DAYS
from db import upsert_campaign, upsert_metrics, upsert_ad_creative, upsert_audience_breakdown
from utils import get_date_range, logger

# Meta campaign status mapping
STATUS_MAP = {
    "ACTIVE": "active",
    "PAUSED": "paused",
    "DELETED": "completed",
    "ARCHIVED": "completed",
}

# Action types to count as general conversions
CONVERSION_TYPES = {"lead", "purchase", "complete_registration", "offsite_conversion.fb_pixel_purchase"}

# Purchase-specific action types
PURCHASE_TYPES = {"purchase", "offsite_conversion.fb_pixel_purchase"}


def _get_action_value(actions: list, action_types: set) -> int:
    """Sum values from actions array for matching action types."""
    total = 0
    for action in actions:
        if action.get("action_type") in action_types:
            total += int(action.get("value", 0))
    return total


def _get_cost_per_action(cost_per_actions: list, action_type: str) -> float:
    """Get cost per action for a specific action type."""
    for cpa in cost_per_actions:
        if cpa.get("action_type") == action_type:
            return float(cpa.get("value", 0))
    return 0


def _get_action_revenue(action_values: list, action_types: set) -> float:
    """Get revenue value from action_values for matching action types."""
    for av in action_values:
        if av.get("action_type") in action_types:
            return float(av.get("value", 0))
    return 0


def _get_video_metric(video_actions: list) -> int:
    """Get total video metric count from video actions array."""
    total = 0
    for action in (video_actions or []):
        total += int(action.get("value", 0))
    return total


def _extract_ad_level(campaign, campaign_uuid: str, start_date: str, end_date: str) -> int:
    """Extract per-ad daily insights for a campaign. Returns number of records synced."""
    records = 0
    try:
        ad_insights = campaign.get_insights(
            fields=[
                "ad_id",
                "ad_name",
                "adset_id",
                "adset_name",
                "spend",
                "impressions",
                "clicks",
                "ctr",
                "reach",
                "actions",
                "action_values",
                "video_thruplay_watched_actions",
            ],
            params={
                "time_range": {"since": start_date, "until": end_date},
                "time_increment": 1,
                "level": "ad",
            },
        )

        for day in ad_insights:
            date = day["date_start"]
            ad_id = day.get("ad_id", "")
            ad_name = day.get("ad_name", "")
            adset_id = day.get("adset_id", "")
            adset_name = day.get("adset_name", "")

            spend = float(day.get("spend", 0))
            impressions = int(day.get("impressions", 0))
            clicks = int(day.get("clicks", 0))
            ctr = float(day.get("ctr", 0))
            reach = int(day.get("reach", 0))

            actions = day.get("actions", [])
            action_values = day.get("action_values", [])

            purchases = _get_action_value(actions, PURCHASE_TYPES)
            purchase_revenue = _get_action_revenue(action_values, PURCHASE_TYPES)
            add_to_cart = _get_action_value(actions, {"add_to_cart", "offsite_conversion.fb_pixel_add_to_cart"})
            landing_page_views = _get_action_value(actions, {"landing_page_view"})
            video_3s_views = _get_action_value(actions, {"video_view"})
            video_thruplay = _get_video_metric(day.get("video_thruplay_watched_actions", []))
            roas = purchase_revenue / spend if spend > 0 else 0

            upsert_ad_creative(campaign_uuid, ad_id, ad_name, adset_id, adset_name, date, {
                "spend": spend,
                "impressions": impressions,
                "clicks": clicks,
                "ctr": ctr,
                "reach": reach,
                "purchases": purchases,
                "purchase_value": purchase_revenue,
                "roas": roas,
                "add_to_cart": add_to_cart,
                "landing_page_views": landing_page_views,
                "video_3s_views": video_3s_views,
                "video_thruplay": video_thruplay,
            })
            records += 1

    except Exception as e:
        logger.warning(f"  Ad-level extraction failed for campaign {campaign_uuid}: {e}")

    return records


def _extract_audience(campaign, campaign_uuid: str, start_date: str, end_date: str) -> int:
    """Extract audience breakdowns (age/gender and region) for a campaign. Returns records synced."""
    records = 0

    breakdown_configs = [
        ("age_gender", ["age", "gender"]),
        ("region", ["region"]),
    ]

    for breakdown_type, breakdown_params in breakdown_configs:
        try:
            insights = campaign.get_insights(
                fields=[
                    "spend",
                    "impressions",
                    "clicks",
                    "actions",
                    "action_values",
                ],
                params={
                    "time_range": {"since": start_date, "until": end_date},
                    "time_increment": 1,
                    "breakdowns": breakdown_params,
                },
            )

            for day in insights:
                date = day["date_start"]
                spend = float(day.get("spend", 0))
                impressions = int(day.get("impressions", 0))
                clicks = int(day.get("clicks", 0))
                actions = day.get("actions", [])
                action_values = day.get("action_values", [])
                purchases = _get_action_value(actions, PURCHASE_TYPES)
                purchase_value = _get_action_revenue(action_values, PURCHASE_TYPES)

                if breakdown_type == "age_gender":
                    age = day.get("age", "unknown")
                    gender = day.get("gender", "unknown")
                    breakdown_value = f"{age}|{gender}"
                else:
                    breakdown_value = day.get("region", "unknown")

                upsert_audience_breakdown(campaign_uuid, date, breakdown_type, breakdown_value, {
                    "spend": spend,
                    "impressions": impressions,
                    "clicks": clicks,
                    "purchases": purchases,
                    "purchase_value": purchase_value,
                })
                records += 1

        except Exception as e:
            logger.warning(f"  Audience breakdown ({breakdown_type}) failed for campaign {campaign_uuid}: {e}")

    return records


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

        # --- Campaign-level daily insights ---
        insights = campaign.get_insights(
            fields=[
                "spend",
                "impressions",
                "clicks",
                "ctr",
                "cpc",
                "reach",
                "frequency",
                "cpm",
                "actions",
                "cost_per_action_type",
                "action_values",
                "video_thruplay_watched_actions",
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
            reach = int(day.get("reach", 0))
            frequency = float(day.get("frequency", 0))
            cpm = float(day.get("cpm", 0))

            actions = day.get("actions", [])
            cost_per_actions = day.get("cost_per_action_type", [])
            action_values = day.get("action_values", [])

            # General conversions (lead + purchase + registration)
            conversions = _get_action_value(actions, CONVERSION_TYPES)

            # Cost per conversion (first matching)
            cost_per_conversion = 0
            for action_type in ("purchase", "lead", "complete_registration"):
                cost_per_conversion = _get_cost_per_action(cost_per_actions, action_type)
                if cost_per_conversion > 0:
                    break

            # ROAS from purchase revenue
            purchase_revenue = _get_action_revenue(action_values, PURCHASE_TYPES)
            roas = purchase_revenue / spend if spend > 0 else 0

            # Purchases (separate from general conversions)
            purchases = _get_action_value(actions, PURCHASE_TYPES)
            cost_per_purchase = _get_cost_per_action(cost_per_actions, "purchase")

            # Funnel metrics
            add_to_cart = _get_action_value(actions, {"add_to_cart", "offsite_conversion.fb_pixel_add_to_cart"})
            cost_per_add_to_cart = _get_cost_per_action(cost_per_actions, "add_to_cart")

            initiate_checkout = _get_action_value(actions, {"initiate_checkout", "offsite_conversion.fb_pixel_initiate_checkout"})
            cost_per_initiate_checkout = _get_cost_per_action(cost_per_actions, "initiate_checkout")

            landing_page_views = _get_action_value(actions, {"landing_page_view"})

            # Video metrics
            video_3s_views = _get_action_value(actions, {"video_view"})
            video_thruplay = _get_video_metric(day.get("video_thruplay_watched_actions", []))

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
                "reach": reach,
                "frequency": frequency,
                "cpm": cpm,
                "purchases": purchases,
                "purchase_value": purchase_revenue,
                "cost_per_purchase": cost_per_purchase,
                "add_to_cart": add_to_cart,
                "cost_per_add_to_cart": cost_per_add_to_cart,
                "initiate_checkout": initiate_checkout,
                "cost_per_initiate_checkout": cost_per_initiate_checkout,
                "landing_page_views": landing_page_views,
                "video_thruplay": video_thruplay,
                "video_3s_views": video_3s_views,
            })
            records_synced += 1

        # --- Ad-level insights ---
        ad_records = _extract_ad_level(campaign, campaign_uuid, start_date, end_date)
        records_synced += ad_records
        logger.info(f"  Ad-level: {ad_records} records")

        # --- Audience breakdowns ---
        audience_records = _extract_audience(campaign, campaign_uuid, start_date, end_date)
        records_synced += audience_records
        logger.info(f"  Audience breakdowns: {audience_records} records")

        logger.info(f"  Synced data for {campaign_name}")

    logger.info(f"Meta Ads sync complete. Total records: {records_synced}")
    return records_synced
