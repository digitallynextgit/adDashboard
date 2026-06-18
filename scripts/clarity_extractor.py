"""
Microsoft Clarity extractor — aggregate daily metrics only.

Clarity Data Export API is rate-limited (1 request / 10 sec for some plans) and
returns aggregates over a date range, not per-session. We fetch ONE call per day
to get the daily breakdown.

Credentials needed (scripts/.env):
  CLARITY_PROJECT_ID  — from Clarity Dashboard → Settings → Project
  CLARITY_API_TOKEN   — generated via Settings → Data Export → Generate API token

Skips gracefully if credentials are not configured.

What we DON'T get from the API: session recordings, heatmaps, individual user
journeys. The dashboard at clarity.microsoft.com is still needed for those.
"""

import os
import time
import requests
from datetime import date, timedelta

from utils import get_date_range, logger
from config import LOOKBACK_DAYS

CLARITY_PROJECT_ID = os.getenv("CLARITY_PROJECT_ID", "")
CLARITY_API_TOKEN  = os.getenv("CLARITY_API_TOKEN",  "")
CLARITY_API_BASE   = "https://www.clarity.ms/export-data/api/v1"
# Be polite to the rate limit
SLEEP_BETWEEN_CALLS = 11


def _credentials_configured() -> bool:
    return bool(CLARITY_PROJECT_ID and CLARITY_API_TOKEN)


def _fetch_day(day: str) -> dict | None:
    """Fetch aggregate metrics for a single day from Clarity Data Export API."""
    url = f"{CLARITY_API_BASE}/project-live-insights"
    try:
        resp = requests.get(
            url,
            headers={"Authorization": f"Bearer {CLARITY_API_TOKEN}"},
            params={
                "numOfDays": 1,
                "startDate": day,
            },
            timeout=30,
        )
    except requests.RequestException as e:
        logger.warning(f"  Clarity {day}: request error: {e}")
        return None

    if resp.status_code == 404:
        return None
    if resp.status_code in (401, 403):
        logger.warning(f"  Clarity {day}: auth failed ({resp.status_code})")
        return None
    if resp.status_code == 429:
        logger.warning(f"  Clarity {day}: rate-limited — backing off")
        time.sleep(30)
        return None
    if not resp.ok:
        logger.warning(f"  Clarity {day}: HTTP {resp.status_code}: {resp.text[:200]}")
        return None

    try:
        payload = resp.json()
    except ValueError:
        return None

    # Clarity returns a list of metric blocks; flatten to single dict
    metrics = {}
    if isinstance(payload, list):
        for block in payload:
            metric_name = block.get("metricName") or ""
            info = block.get("information", [])
            if not info:
                continue
            first = info[0]
            for key in ("sessionsCount", "totalSessionCount", "pagesPerSession", "scrollDepth", "rageClickCount", "deadClickCount", "quickbackClickCount", "scriptErrorCount"):
                if key in first:
                    metrics[f"{metric_name}.{key}"] = first[key]

    if not metrics:
        return None

    def _num(key_suffix: str, default=0):
        for k, v in metrics.items():
            if k.endswith(key_suffix):
                try:
                    return type(default)(v)
                except (ValueError, TypeError):
                    return default
        return default

    return {
        "date":         day,
        "sessions":     _num("sessionsCount", 0) or _num("totalSessionCount", 0),
        "rage_clicks":  _num("rageClickCount", 0),
        "dead_clicks":  _num("deadClickCount", 0),
        "quick_back":   _num("quickbackClickCount", 0),
        "scroll_depth": float(_num("scrollDepth", 0.0)),
        "js_errors":    _num("scriptErrorCount", 0),
    }


def extract_clarity() -> int:
    """
    Pull last LOOKBACK_DAYS of Clarity aggregate metrics (1 call per day).
    Returns number of rows synced.
    """
    if not _credentials_configured():
        logger.info("Clarity credentials not configured — skipping")
        return 0

    from db import bulk_upsert_clarity_daily

    start_date, end_date = get_date_range(LOOKBACK_DAYS)
    logger.info(f"Fetching Clarity data {start_date} → {end_date}")

    d0 = date.fromisoformat(start_date)
    d1 = date.fromisoformat(end_date)

    rows = []
    current = d0
    while current <= d1:
        day_str = current.isoformat()
        row = _fetch_day(day_str)
        if row:
            rows.append(row)
            logger.debug(f"  Clarity {day_str}: ok")
        current += timedelta(days=1)
        time.sleep(SLEEP_BETWEEN_CALLS)

    if rows:
        bulk_upsert_clarity_daily(rows)

    logger.info(f"Clarity sync complete. Records: {len(rows)}")
    return len(rows)
