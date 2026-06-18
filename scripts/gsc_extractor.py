"""
Google Search Console extractor — pulls daily query × page performance.

Authentication: Reuses the GA4 service account JSON. The service account email
  must be added as a Verified Owner (or User) of the GSC property at
  https://search.google.com/search-console → Settings → Users and permissions.

Credentials needed (scripts/.env):
  GSC_SITE_URL              — e.g. 'sc-domain:hard2soft.com' (domain property)
                               or 'https://www.hard2soft.com/' (URL prefix)
  GA4_SERVICE_ACCOUNT_JSON  — reused from GA4 (same service account)

Skips gracefully if credentials are not configured.

Why date × query × page: lets us answer both "top queries by clicks" AND
"top impressions but no conversions" (content gap analysis).
"""

import json
import os

from utils import get_date_range, logger
from config import LOOKBACK_DAYS

GSC_SITE_URL             = os.getenv("GSC_SITE_URL", "")
GA4_SERVICE_ACCOUNT_JSON = os.getenv("GA4_SERVICE_ACCOUNT_JSON", "")

# GSC has a 50k rows/request limit; we paginate by date to stay safe
MAX_ROWS_PER_REQUEST = 25000


def _credentials_configured() -> bool:
    return bool(GSC_SITE_URL and GA4_SERVICE_ACCOUNT_JSON)


def _load_credentials():
    """Build a google.oauth2 Credentials object from env (path or raw JSON)."""
    from google.oauth2 import service_account

    if os.path.isfile(GA4_SERVICE_ACCOUNT_JSON):
        return service_account.Credentials.from_service_account_file(
            GA4_SERVICE_ACCOUNT_JSON,
            scopes=["https://www.googleapis.com/auth/webmasters.readonly"],
        )
    info = json.loads(GA4_SERVICE_ACCOUNT_JSON)
    return service_account.Credentials.from_service_account_info(
        info,
        scopes=["https://www.googleapis.com/auth/webmasters.readonly"],
    )


def _fetch_day(service, day: str) -> list[dict]:
    """Fetch all query×page rows for a single day. Returns normalized rows."""
    request_body = {
        "startDate":  day,
        "endDate":    day,
        "dimensions": ["query", "page"],
        "rowLimit":   MAX_ROWS_PER_REQUEST,
        "startRow":   0,
    }
    rows = []
    while True:
        resp = service.searchanalytics().query(siteUrl=GSC_SITE_URL, body=request_body).execute()
        api_rows = resp.get("rows", [])
        for r in api_rows:
            keys = r.get("keys", [])
            rows.append({
                "date":        day,
                "query":       keys[0] if len(keys) > 0 else "",
                "page":        keys[1] if len(keys) > 1 else "",
                "impressions": int(r.get("impressions", 0)),
                "clicks":      int(r.get("clicks", 0)),
                "ctr":         float(r.get("ctr", 0)),
                "position":    float(r.get("position", 0)),
            })
        if len(api_rows) < MAX_ROWS_PER_REQUEST:
            break
        request_body["startRow"] += MAX_ROWS_PER_REQUEST
    return rows


def extract_gsc() -> int:
    """
    Pull last LOOKBACK_DAYS of GSC data, day by day.
    Returns number of rows synced.
    """
    if not _credentials_configured():
        logger.info("GSC credentials not configured — skipping")
        return 0

    try:
        from googleapiclient.discovery import build
    except ImportError:
        logger.warning("google-api-python-client not installed — run: pip install google-api-python-client")
        return 0

    from db import bulk_upsert_gsc_queries

    credentials = _load_credentials()
    service     = build("searchconsole", "v1", credentials=credentials, cache_discovery=False)

    start_date, end_date = get_date_range(LOOKBACK_DAYS)
    logger.info(f"Fetching GSC data {start_date} → {end_date} for site {GSC_SITE_URL}")

    # Walk day by day so a bad day doesn't kill the whole sync
    from datetime import date, timedelta
    d0 = date.fromisoformat(start_date)
    d1 = date.fromisoformat(end_date)

    records_synced = 0
    current = d0
    while current <= d1:
        day_str = current.isoformat()
        try:
            rows = _fetch_day(service, day_str)
            if rows:
                bulk_upsert_gsc_queries(rows)
                records_synced += len(rows)
                logger.debug(f"  GSC {day_str}: {len(rows)} rows")
        except Exception as e:
            logger.warning(f"  GSC {day_str} failed: {e}")
        current += timedelta(days=1)

    logger.info(f"GSC sync complete. Records: {records_synced}")
    return records_synced
