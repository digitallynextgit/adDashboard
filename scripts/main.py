"""
AdAuto — Main extraction orchestrator.
Runs all platform extractors and logs results.
"""

import sys

from db import log_sync
from utils import logger, now_iso
from meta_extractor import extract_meta_ads
from shopify_extractor import extract_shopify_sales, extract_shopify_variants
from amazon_extractor import extract_amazon_ads
from flipkart_extractor import extract_flipkart_ads
from ga4_extractor import extract_ga4
from gsc_extractor import extract_gsc
from gokwik_extractor import extract_gokwik
from clarity_extractor import extract_clarity


def run_meta():
    started_at = now_iso()
    try:
        records = extract_meta_ads()
        log_sync(
            platform="meta",
            status="success",
            records=records,
            error=None,
            started_at=started_at,
            finished_at=now_iso(),
        )
        logger.info(f"Meta sync completed successfully: {records} records")
    except Exception as e:
        logger.error(f"Meta sync failed: {e}")
        # Store only a safe error summary in the database, not full exception details
        safe_error = type(e).__name__
        if hasattr(e, "api_error_message"):
            safe_error = f"{safe_error}: {e.api_error_message()}"
        log_sync(
            platform="meta",
            status="failed",
            records=0,
            error=safe_error,
            started_at=started_at,
            finished_at=now_iso(),
        )
        raise


def run_shopify():
    started_at = now_iso()
    try:
        extract_shopify_variants()
        records = extract_shopify_sales()
        if records > 0:
            log_sync(
                platform="meta",  # logged under meta since it enriches the same report
                status="success",
                records=records,
                error=None,
                started_at=started_at,
                finished_at=now_iso(),
            )
        logger.info(f"Shopify sync completed: {records} records")
    except Exception as e:
        logger.error(f"Shopify sync failed: {e}")
        raise


def main():
    logger.info("=" * 50)
    logger.info("AdAuto Sync Starting")
    logger.info("=" * 50)

    errors = []

    # Run Meta Ads extraction
    try:
        run_meta()
    except Exception as e:
        errors.append(f"Meta: {e}")

    # Run Shopify extraction
    try:
        run_shopify()
    except Exception as e:
        errors.append(f"Shopify: {e}")

    # Run Amazon Ads extraction (skips gracefully if credentials not set)
    try:
        started_at = now_iso()
        records = extract_amazon_ads()
        if records > 0:
            log_sync(platform="amazon", status="success", records=records,
                     error=None, started_at=started_at, finished_at=now_iso())
    except Exception as e:
        errors.append(f"Amazon: {e}")
        log_sync(platform="amazon", status="failed", records=0,
                 error=type(e).__name__, started_at=now_iso(), finished_at=now_iso())

    # Run Flipkart Ads extraction (skips gracefully if credentials not set)
    try:
        started_at = now_iso()
        records = extract_flipkart_ads()
        if records > 0:
            log_sync(platform="flipkart", status="success", records=records,
                     error=None, started_at=started_at, finished_at=now_iso())
    except Exception as e:
        errors.append(f"Flipkart: {e}")
        log_sync(platform="flipkart", status="failed", records=0,
                 error=type(e).__name__, started_at=now_iso(), finished_at=now_iso())

    # H2S analytics extractors — each skips gracefully if creds missing.

    try:
        started_at = now_iso()
        records = extract_ga4()
        if records > 0:
            log_sync(platform="ga4", status="success", records=records,
                     error=None, started_at=started_at, finished_at=now_iso())
    except Exception as e:
        errors.append(f"GA4: {e}")
        log_sync(platform="ga4", status="failed", records=0,
                 error=type(e).__name__, started_at=now_iso(), finished_at=now_iso())

    try:
        started_at = now_iso()
        records = extract_gsc()
        if records > 0:
            log_sync(platform="gsc", status="success", records=records,
                     error=None, started_at=started_at, finished_at=now_iso())
    except Exception as e:
        errors.append(f"GSC: {e}")
        log_sync(platform="gsc", status="failed", records=0,
                 error=type(e).__name__, started_at=now_iso(), finished_at=now_iso())

    try:
        started_at = now_iso()
        records = extract_gokwik()
        if records > 0:
            log_sync(platform="gokwik", status="success", records=records,
                     error=None, started_at=started_at, finished_at=now_iso())
    except Exception as e:
        errors.append(f"GoKwik: {e}")
        log_sync(platform="gokwik", status="failed", records=0,
                 error=type(e).__name__, started_at=now_iso(), finished_at=now_iso())

    try:
        started_at = now_iso()
        records = extract_clarity()
        if records > 0:
            log_sync(platform="clarity", status="success", records=records,
                     error=None, started_at=started_at, finished_at=now_iso())
    except Exception as e:
        errors.append(f"Clarity: {e}")
        log_sync(platform="clarity", status="failed", records=0,
                 error=type(e).__name__, started_at=now_iso(), finished_at=now_iso())

    # Google Ads extraction will be added in a future phase
    # try:
    #     run_google()
    # except Exception as e:
    #     errors.append(f"Google: {e}")

    if errors:
        logger.error(f"Sync completed with errors: {errors}")
        sys.exit(1)
    else:
        logger.info("All syncs completed successfully!")


if __name__ == "__main__":
    main()
