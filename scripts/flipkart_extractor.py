"""
Flipkart Ads extractor — pulls campaign metrics from Flipkart Advertising API.

Authentication: OAuth2 client_credentials flow (no browser needed — just
  FLIPKART_CLIENT_ID and FLIPKART_CLIENT_SECRET in scripts/.env).

Credentials needed (add to scripts/.env):
  FLIPKART_CLIENT_ID     — from Flipkart Seller Hub → My Account → API Access
  FLIPKART_CLIENT_SECRET — from Flipkart Seller Hub → My Account → API Access

API Reference: https://seller.flipkart.com/api-docs/
Skips gracefully if credentials are not configured.
"""

import os
import requests
from datetime import datetime, timedelta

from config import LOOKBACK_DAYS
from utils import get_date_range, logger

FLIPKART_CLIENT_ID     = os.getenv("FLIPKART_CLIENT_ID", "")
FLIPKART_CLIENT_SECRET = os.getenv("FLIPKART_CLIENT_SECRET", "")

FLIPKART_TOKEN_URL = "https://api.flipkart.com/oauth-service/oauth/token"
FLIPKART_ADS_BASE  = "https://seller-api.flipkart.com/v3"


def _credentials_configured() -> bool:
    return bool(FLIPKART_CLIENT_ID and FLIPKART_CLIENT_SECRET)


def _get_access_token() -> str:
    """Exchange client credentials for a short-lived access token."""
    resp = requests.post(
        FLIPKART_TOKEN_URL,
        params={"grant_type": "client_credentials"},
        auth=(FLIPKART_CLIENT_ID, FLIPKART_CLIENT_SECRET),
        timeout=30,
    )
    resp.raise_for_status()
    return resp.json()["access_token"]


def _headers(access_token: str) -> dict:
    return {
        "Authorization": f"Bearer {access_token}",
        "Content-Type":  "application/json",
    }


def _fetch_campaigns(access_token: str) -> list:
    """Fetch all ad campaigns from Flipkart Ads API."""
    resp = requests.get(
        f"{FLIPKART_ADS_BASE}/ads/campaigns",
        headers=_headers(access_token),
        timeout=30,
    )
    if resp.status_code == 404:
        return []
    resp.raise_for_status()
    return resp.json().get("campaigns", [])


def _fetch_campaign_metrics(access_token: str, campaign_id: str, start_date: str, end_date: str) -> list:
    """Fetch daily performance metrics for a single campaign."""
    resp = requests.get(
        f"{FLIPKART_ADS_BASE}/ads/campaigns/{campaign_id}/metrics",
        headers=_headers(access_token),
        params={
            "startDate":   start_date,
            "endDate":     end_date,
            "granularity": "daily",
        },
        timeout=30,
    )
    if resp.status_code == 404:
        return []
    resp.raise_for_status()
    return resp.json().get("metrics", [])


def extract_flipkart_ads() -> int:
    """
    Extract Flipkart Ads campaign metrics.
    Returns number of records synced.
    Skips gracefully if credentials are not configured.
    """
    if not _credentials_configured():
        logger.info("Flipkart Ads credentials not configured — skipping")
        return 0

    from db import upsert_flipkart_campaign, bulk_upsert_flipkart_metrics

    start_date, end_date = get_date_range(LOOKBACK_DAYS)
    logger.info(f"Fetching Flipkart Ads data: {start_date} to {end_date}")

    access_token   = _get_access_token()
    campaigns      = _fetch_campaigns(access_token)
    records_synced = 0

    for campaign in campaigns:
        campaign_id   = str(campaign.get("campaignId", ""))
        campaign_name = campaign.get("campaignName", "")
        campaign_type = campaign.get("campaignType", "")
        status        = campaign.get("status", "active").lower()
        daily_budget  = float(campaign.get("dailyBudget", 0))

        if not campaign_id:
            continue

        upsert_flipkart_campaign({
            "campaign_id":   campaign_id,
            "campaign_name": campaign_name,
            "campaign_type": campaign_type,
            "status":        status,
            "daily_budget":  daily_budget,
        })

        daily_rows  = _fetch_campaign_metrics(access_token, campaign_id, start_date, end_date)
        metric_rows = []

        for row in daily_rows:
            spend      = float(row.get("spend", 0))
            clicks     = int(row.get("clicks", 0))
            imps       = int(row.get("impressions", 0))
            orders     = int(row.get("orders", 0))
            units_sold = int(row.get("unitsSold", orders))
            revenue    = float(row.get("revenue", 0))

            metric_rows.append({
                "campaign_id": campaign_id,
                "date":        row.get("date", ""),
                "spend":       spend,
                "impressions": imps,
                "clicks":      clicks,
                "ctr":         (clicks / imps * 100) if imps > 0 else 0,
                "cpc":         (spend / clicks)       if clicks > 0 else 0,
                "orders":      orders,
                "units_sold":  units_sold,
                "revenue":     revenue,
                "roas":        (revenue / spend)       if spend > 0 else 0,
            })

        if metric_rows:
            bulk_upsert_flipkart_metrics(metric_rows)
            records_synced += len(metric_rows)
            logger.debug(f"  {campaign_name}: {len(metric_rows)} days synced")

    logger.info(f"Flipkart Ads sync complete. Records: {records_synced}")
    return records_synced
