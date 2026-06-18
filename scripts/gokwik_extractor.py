"""
GoKwik extractor — pulls checkout, prepaid/COD split, and RTO by pincode.

GoKwik has no public self-serve API portal — credentials are issued by their
merchant success team. Until docs are confirmed we use a defensive fetch that
gracefully handles 404/403/missing endpoints.

Credentials needed (scripts/.env):
  GOKWIK_API_KEY      — issued by GoKwik
  GOKWIK_MERCHANT_ID  — your store identifier on GoKwik
  GOKWIK_API_BASE     — base URL, defaults to https://api.gokwik.co (override if different)

Skips gracefully if credentials are not configured.

Note: when docs are unverified, the request payload here is a best-effort guess
based on common Indian checkout API patterns. Tune the field names below once
GoKwik's docs/API responses are confirmed.
"""

import os
import requests
from datetime import date, timedelta

from utils import get_date_range, logger
from config import LOOKBACK_DAYS

GOKWIK_API_KEY     = os.getenv("GOKWIK_API_KEY", "")
GOKWIK_MERCHANT_ID = os.getenv("GOKWIK_MERCHANT_ID", "")
GOKWIK_API_BASE    = os.getenv("GOKWIK_API_BASE", "https://api.gokwik.co")


def _credentials_configured() -> bool:
    return bool(GOKWIK_API_KEY and GOKWIK_MERCHANT_ID)


def _headers() -> dict:
    return {
        "Authorization": f"Bearer {GOKWIK_API_KEY}",
        "x-merchant-id": GOKWIK_MERCHANT_ID,
        "Content-Type":  "application/json",
    }


def _fetch_day(day: str) -> list[dict]:
    """
    Fetch one day of checkout/RTO data, grouped by pincode.

    Endpoint and fields are best-guess until docs are confirmed.
    Returns [] on any error so the orchestrator keeps moving.
    """
    url = f"{GOKWIK_API_BASE}/v1/analytics/checkouts"
    try:
        resp = requests.get(
            url,
            headers=_headers(),
            params={"date": day, "groupBy": "pincode"},
            timeout=30,
        )
    except requests.RequestException as e:
        logger.warning(f"  GoKwik {day}: request error: {e}")
        return []

    if resp.status_code == 404:
        return []
    if resp.status_code in (401, 403):
        logger.warning(f"  GoKwik {day}: auth failed ({resp.status_code})")
        return []
    if not resp.ok:
        logger.warning(f"  GoKwik {day}: HTTP {resp.status_code}: {resp.text[:200]}")
        return []

    try:
        payload = resp.json()
    except ValueError:
        return []

    items = payload.get("data") or payload.get("results") or []
    rows  = []
    for item in items:
        rows.append({
            "date":               day,
            "pincode":            str(item.get("pincode") or "all"),
            "state":              str(item.get("state") or "unknown"),
            "checkouts_started":  int(item.get("checkouts_started",  0)),
            "checkouts_complete": int(item.get("checkouts_completed", 0)),
            "prepaid_orders":     int(item.get("prepaid_orders",     0)),
            "cod_orders":         int(item.get("cod_orders",         0)),
            "rto_orders":         int(item.get("rto_orders",         0)),
            "revenue":            float(item.get("revenue",          0)),
        })
    return rows


def extract_gokwik() -> int:
    """
    Pull last LOOKBACK_DAYS of GoKwik checkout/RTO data.
    Returns number of rows synced.
    """
    if not _credentials_configured():
        logger.info("GoKwik credentials not configured — skipping")
        return 0

    from db import bulk_upsert_gokwik_daily

    start_date, end_date = get_date_range(LOOKBACK_DAYS)
    logger.info(f"Fetching GoKwik data {start_date} → {end_date}")

    d0 = date.fromisoformat(start_date)
    d1 = date.fromisoformat(end_date)

    records_synced = 0
    current = d0
    while current <= d1:
        day_str = current.isoformat()
        rows = _fetch_day(day_str)
        if rows:
            bulk_upsert_gokwik_daily(rows)
            records_synced += len(rows)
            logger.debug(f"  GoKwik {day_str}: {len(rows)} rows")
        current += timedelta(days=1)

    logger.info(f"GoKwik sync complete. Records: {records_synced}")
    return records_synced
