"""
Amazon Ads extractor — pulls campaign metrics from Amazon Advertising API.

Amazon Advertising API uses OAuth 2.0 (Login with Amazon).
Credentials needed (add to scripts/.env):
  AMAZON_CLIENT_ID       — from your Amazon Ads developer app
  AMAZON_CLIENT_SECRET   — from your Amazon Ads developer app
  AMAZON_REFRESH_TOKEN   — obtained via OAuth flow (run amazon_auth.py)
  AMAZON_PROFILE_ID      — your advertiser profile ID (found in Ads console URL)

API Docs: https://advertising.amazon.com/API/docs/en-us
Reports use an async pattern: request → poll → download.

Skips gracefully if credentials are not configured.
"""

import os
import time
import requests
from datetime import datetime, timedelta

from config import LOOKBACK_DAYS
from utils import get_date_range, logger

# ── Load credentials from environment ────────────────────────
AMAZON_CLIENT_ID      = os.getenv("AMAZON_CLIENT_ID", "")
AMAZON_CLIENT_SECRET  = os.getenv("AMAZON_CLIENT_SECRET", "")
AMAZON_REFRESH_TOKEN  = os.getenv("AMAZON_REFRESH_TOKEN", "")
AMAZON_PROFILE_ID     = os.getenv("AMAZON_PROFILE_ID", "")

AMAZON_ADS_API_BASE   = "https://advertising-api.amazon.in"   # India endpoint
AMAZON_TOKEN_URL      = "https://api.amazon.in/auth/o2/token"  # India token endpoint
AMAZON_API_VERSION    = "v2"


def _credentials_configured() -> bool:
    return all([AMAZON_CLIENT_ID, AMAZON_CLIENT_SECRET, AMAZON_REFRESH_TOKEN, AMAZON_PROFILE_ID])


def _get_access_token() -> str:
    """Exchange refresh token for a short-lived access token."""
    resp = requests.post(AMAZON_TOKEN_URL, data={
        "grant_type":    "refresh_token",
        "refresh_token": AMAZON_REFRESH_TOKEN,
        "client_id":     AMAZON_CLIENT_ID,
        "client_secret": AMAZON_CLIENT_SECRET,
    })
    resp.raise_for_status()
    return resp.json()["access_token"]


def _headers(access_token: str) -> dict:
    return {
        "Authorization":          f"Bearer {access_token}",
        "Amazon-Advertising-API-ClientId": AMAZON_CLIENT_ID,
        "Amazon-Advertising-API-Scope":    AMAZON_PROFILE_ID,
        "Content-Type":           "application/json",
    }


def _request_report(access_token: str, start_date: str, end_date: str) -> str:
    """
    Request an async Sponsored Products campaign report.
    Returns the reportId to poll.
    Amazon reports cover one date at a time — we loop per day externally.
    This function requests a date-range summary report.
    """
    url = f"{AMAZON_ADS_API_BASE}/{AMAZON_API_VERSION}/reports"
    payload = {
        "reportDate":  start_date.replace("-", ""),   # YYYYMMDD
        "metrics":     "campaignName,campaignId,impressions,clicks,cost,attributedSales30d,attributedUnitsOrdered30d,attributedConversions30d",
        "segment":     "campaign",
    }
    resp = requests.post(
        f"{AMAZON_ADS_API_BASE}/{AMAZON_API_VERSION}/sp/campaigns/report",
        headers=_headers(access_token),
        json=payload,
    )
    resp.raise_for_status()
    return resp.json()["reportId"]


def _poll_report(access_token: str, report_id: str, max_wait: int = 60) -> list:
    """Poll until the report is ready, then download and return rows."""
    url = f"{AMAZON_ADS_API_BASE}/{AMAZON_API_VERSION}/reports/{report_id}"
    waited = 0
    while waited < max_wait:
        resp = requests.get(url, headers=_headers(access_token))
        resp.raise_for_status()
        data = resp.json()
        if data["status"] == "SUCCESS":
            dl_resp = requests.get(data["location"], headers=_headers(access_token))
            dl_resp.raise_for_status()
            return dl_resp.json()
        if data["status"] == "FAILURE":
            raise RuntimeError(f"Amazon report failed: {data}")
        time.sleep(5)
        waited += 5
    raise TimeoutError(f"Amazon report {report_id} did not complete in {max_wait}s")


def extract_amazon_ads() -> int:
    """
    Extract Amazon Ads campaign metrics.
    Returns number of records synced.
    Skips gracefully if credentials are not configured.
    """
    if not _credentials_configured():
        logger.info("Amazon Ads credentials not configured — skipping")
        return 0

    # TODO: import db functions once tables are confirmed live
    # from db import upsert_amazon_campaign, bulk_upsert_amazon_metrics

    start_date, end_date = get_date_range(LOOKBACK_DAYS)
    logger.info(f"Fetching Amazon Ads data: {start_date} to {end_date}")

    access_token = _get_access_token()
    records_synced = 0

    # Amazon reports are per-day — iterate over the date range
    current = datetime.strptime(start_date, "%Y-%m-%d")
    end_dt  = datetime.strptime(end_date,   "%Y-%m-%d")

    while current <= end_dt:
        date_str = current.strftime("%Y-%m-%d")
        try:
            report_id = _request_report(access_token, date_str, date_str)
            rows      = _poll_report(access_token, report_id)

            for row in rows:
                spend  = float(row.get("cost", 0))
                sales  = float(row.get("attributedSales30d", 0))
                clicks = int(row.get("clicks", 0))
                imps   = int(row.get("impressions", 0))

                metric = {
                    "date":          date_str,
                    "campaign_id":   str(row.get("campaignId", "")),
                    "campaign_name": row.get("campaignName", ""),
                    "spend":         spend,
                    "impressions":   imps,
                    "clicks":        clicks,
                    "ctr":           (clicks / imps * 100) if imps > 0 else 0,
                    "cpc":           (spend / clicks)      if clicks > 0 else 0,
                    "orders":        int(row.get("attributedConversions30d", 0)),
                    "units_ordered": int(row.get("attributedUnitsOrdered30d", 0)),
                    "sales":         sales,
                    "acos":          (spend / sales * 100) if sales > 0 else 0,
                    "roas":          (sales / spend)       if spend > 0 else 0,
                }
                # TODO: bulk_upsert_amazon_metrics([metric])
                logger.debug(f"  [{date_str}] {metric['campaign_name']}: spend={spend}, sales={sales}")
                records_synced += 1

        except Exception as e:
            logger.warning(f"  Amazon report failed for {date_str}: {e}")

        current += timedelta(days=1)

    logger.info(f"Amazon Ads sync complete. Records: {records_synced}")
    return records_synced
