"""
Google Analytics 4 extractor — pulls daily sessions, conversions, traffic source,
revenue, and state-level breakdown for H2S.

Authentication: Service Account JSON file (set GA4_SERVICE_ACCOUNT_JSON to either
  the file path OR the JSON content directly). The service account email must be
  added as a Viewer on the GA4 property.

Credentials needed (scripts/.env):
  GA4_PROPERTY_ID            — e.g. '123456789' (numeric, from GA4 Admin)
  GA4_SERVICE_ACCOUNT_JSON   — path to JSON file OR raw JSON string

Skips gracefully if credentials are not configured.

Indian-state aware: GA4's `region` dimension returns full names (e.g. "Tamil Nadu").
We normalize to 2-letter codes (TN/GJ/AP/MH/TG/PY) used elsewhere in adauto.
"""

import json
import os
from typing import Optional

from utils import get_date_range, logger
from config import LOOKBACK_DAYS

GA4_PROPERTY_ID          = os.getenv("GA4_PROPERTY_ID", "")
GA4_SERVICE_ACCOUNT_JSON = os.getenv("GA4_SERVICE_ACCOUNT_JSON", "")

# Map GA4 full region names → 2-letter codes used by H2S analytics
REGION_TO_CODE = {
    "Tamil Nadu":      "TN",
    "Gujarat":         "GJ",
    "Andhra Pradesh":  "AP",
    "Maharashtra":     "MH",
    "Telangana":       "TG",
    "Puducherry":      "PY",
    "Delhi":           "DL",
    "Karnataka":       "KA",
    "Haryana":         "HR",
    "Rajasthan":       "RJ",
    "Uttar Pradesh":   "UP",
    "Chandigarh":      "CH",
    "Punjab":          "PB",
    "West Bengal":     "WB",
    "Kerala":          "KL",
    "Madhya Pradesh":  "MP",
}


def _credentials_configured() -> bool:
    return bool(GA4_PROPERTY_ID and GA4_SERVICE_ACCOUNT_JSON)


def _load_credentials():
    """Build a google.oauth2 Credentials object from env (path or raw JSON)."""
    from google.oauth2 import service_account

    if os.path.isfile(GA4_SERVICE_ACCOUNT_JSON):
        return service_account.Credentials.from_service_account_file(
            GA4_SERVICE_ACCOUNT_JSON,
            scopes=["https://www.googleapis.com/auth/analytics.readonly"],
        )
    # Treat the env var as raw JSON
    info = json.loads(GA4_SERVICE_ACCOUNT_JSON)
    return service_account.Credentials.from_service_account_info(
        info,
        scopes=["https://www.googleapis.com/auth/analytics.readonly"],
    )


def _normalize_state(region: Optional[str]) -> str:
    if not region:
        return "unknown"
    return REGION_TO_CODE.get(region, region[:2].upper() if len(region) >= 2 else "unknown")


def extract_ga4() -> int:
    """
    Pull last LOOKBACK_DAYS of GA4 data, broken down by date × state × traffic source.
    Returns number of rows synced.
    """
    if not _credentials_configured():
        logger.info("GA4 credentials not configured — skipping")
        return 0

    try:
        from google.analytics.data_v1beta import BetaAnalyticsDataClient
        from google.analytics.data_v1beta.types import (
            DateRange, Dimension, Metric, RunReportRequest,
        )
    except ImportError:
        logger.warning("google-analytics-data SDK not installed — run: pip install google-analytics-data")
        return 0

    from db import bulk_upsert_ga4_daily

    credentials = _load_credentials()
    client      = BetaAnalyticsDataClient(credentials=credentials)
    start_date, end_date = get_date_range(LOOKBACK_DAYS)

    logger.info(f"Fetching GA4 data {start_date} → {end_date} for property {GA4_PROPERTY_ID}")

    request = RunReportRequest(
        property=f"properties/{GA4_PROPERTY_ID}",
        date_ranges=[DateRange(start_date=start_date, end_date=end_date)],
        dimensions=[
            Dimension(name="date"),
            Dimension(name="region"),
            Dimension(name="sessionDefaultChannelGroup"),
        ],
        metrics=[
            Metric(name="sessions"),
            Metric(name="totalUsers"),
            Metric(name="newUsers"),
            Metric(name="engagedSessions"),
            Metric(name="conversions"),
            Metric(name="totalRevenue"),
        ],
    )

    response = client.run_report(request)
    rows = []

    for row in response.rows:
        ga4_date = row.dimension_values[0].value          # 'YYYYMMDD'
        region   = row.dimension_values[1].value
        channel  = row.dimension_values[2].value or "unknown"

        rows.append({
            "date":             f"{ga4_date[0:4]}-{ga4_date[4:6]}-{ga4_date[6:8]}",
            "state":            _normalize_state(region),
            "sessions":         int(row.metric_values[0].value or 0),
            "users":            int(row.metric_values[1].value or 0),
            "new_users":        int(row.metric_values[2].value or 0),
            "engaged_sessions": int(row.metric_values[3].value or 0),
            "conversions":      int(float(row.metric_values[4].value or 0)),
            "revenue":          float(row.metric_values[5].value or 0),
            "traffic_source":   channel,
        })

    bulk_upsert_ga4_daily(rows)
    logger.info(f"GA4 sync complete. Records: {len(rows)}")
    return len(rows)
