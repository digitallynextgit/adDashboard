"""
AdAuto — Main extraction orchestrator.
Runs all platform extractors and logs results.
"""

import sys

from db import log_sync
from utils import logger, now_iso
from meta_extractor import extract_meta_ads
from shopify_extractor import extract_shopify_sales


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
