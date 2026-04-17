"""
Shopify extractor — pulls daily sales per SKU/variant from Shopify Orders API.
Skips gracefully if credentials are not configured.
"""

import requests
from collections import defaultdict

from config import SHOPIFY_STORE_URL, SHOPIFY_ACCESS_TOKEN, LOOKBACK_DAYS
from db import bulk_upsert_shopify_sales, bulk_upsert_shopify_variants
from utils import get_date_range, logger

SHOPIFY_API_VERSION = "2024-10"

# Only count orders with these financial statuses (exclude refunded/voided)
VALID_FINANCIAL_STATUSES = {"paid", "partially_paid", "partially_refunded", "pending"}


def _shopify_headers() -> dict:
    return {"X-Shopify-Access-Token": SHOPIFY_ACCESS_TOKEN}


def _fetch_orders(start_date: str, end_date: str):
    """Fetch all orders in date range with cursor-based pagination."""
    url = f"https://{SHOPIFY_STORE_URL}/admin/api/{SHOPIFY_API_VERSION}/orders.json"
    params = {
        "status": "any",
        "created_at_min": f"{start_date}T00:00:00+05:30",
        "created_at_max": f"{end_date}T23:59:59+05:30",
        "limit": 250,
        "fields": "id,created_at,financial_status,line_items",
    }

    while url:
        resp = requests.get(url, headers=_shopify_headers(), params=params)
        resp.raise_for_status()
        orders = resp.json().get("orders", [])
        yield from orders

        # Cursor-based pagination via Link header
        link = resp.headers.get("Link", "")
        url = None
        params = {}
        if 'rel="next"' in link:
            for part in link.split(","):
                if 'rel="next"' in part:
                    url = part.strip().split(";")[0].strip().strip("<>")
                    break


def extract_shopify_variants() -> int:
    """Fetch all product variants from Shopify and upsert into shopify_variants.
    Returns number of variants synced."""
    if not SHOPIFY_STORE_URL or not SHOPIFY_ACCESS_TOKEN:
        return 0

    url = f"https://{SHOPIFY_STORE_URL}/admin/api/{SHOPIFY_API_VERSION}/products.json"
    params = {"limit": 250, "fields": "id,title,variants"}
    rows = []

    while url:
        resp = requests.get(url, headers=_shopify_headers(), params=params)
        resp.raise_for_status()
        for product in resp.json().get("products", []):
            for v in product.get("variants", []):
                rows.append({
                    "variant_id": str(v["id"]),
                    "product_id": str(product["id"]),
                    "product_title": product.get("title", ""),
                    "variant_title": v.get("title") or "",
                    "sku": v.get("sku") or "",
                    "price": float(v.get("price", 0)),
                })

        link = resp.headers.get("Link", "")
        url = None
        params = {}
        if 'rel="next"' in link:
            for part in link.split(","):
                if 'rel="next"' in part:
                    url = part.strip().split(";")[0].strip().strip("<>")
                    break

    bulk_upsert_shopify_variants(rows)
    logger.info(f"Shopify variants sync complete. Variants: {len(rows)}")
    return len(rows)


def extract_shopify_sales() -> int:
    """Extract daily sales per SKU from Shopify. Returns number of records synced."""
    if not SHOPIFY_STORE_URL or not SHOPIFY_ACCESS_TOKEN:
        logger.info("Shopify credentials not configured — skipping")
        return 0

    start_date, end_date = get_date_range(LOOKBACK_DAYS)
    logger.info(f"Fetching Shopify orders: {start_date} to {end_date}")

    # Aggregate: {(date, variant_id): {fields}}
    agg = defaultdict(lambda: {
        "orders_count": 0,
        "units_sold": 0,
        "revenue": 0.0,
        "product_id": "",
        "product_title": "",
        "variant_title": "",
        "sku": "",
    })

    order_count = 0
    for order in _fetch_orders(start_date, end_date):
        financial_status = order.get("financial_status", "")
        if financial_status not in VALID_FINANCIAL_STATUSES:
            continue

        # Date in IST from created_at
        created_at = order.get("created_at", "")
        date = created_at[:10]  # YYYY-MM-DD portion

        for item in order.get("line_items", []):
            variant_id = str(item.get("variant_id") or item.get("id", ""))
            key = (date, variant_id)

            entry = agg[key]
            entry["orders_count"] += 1
            entry["units_sold"] += int(item.get("quantity", 0))
            entry["revenue"] += float(item.get("price", 0)) * int(item.get("quantity", 0))
            entry["product_id"] = str(item.get("product_id", ""))
            entry["product_title"] = item.get("title", "")
            entry["variant_title"] = item.get("variant_title") or ""
            entry["sku"] = item.get("sku") or ""

        order_count += 1

    logger.info(f"  Processed {order_count} orders → {len(agg)} SKU-day records")

    rows = [
        {
            "date": date,
            "variant_id": variant_id,
            "product_id": entry["product_id"],
            "product_title": entry["product_title"],
            "variant_title": entry["variant_title"],
            "sku": entry["sku"],
            "orders_count": entry["orders_count"],
            "units_sold": entry["units_sold"],
            "revenue": round(entry["revenue"], 2),
        }
        for (date, variant_id), entry in agg.items()
    ]

    bulk_upsert_shopify_sales(rows)
    logger.info(f"Shopify sync complete. Records: {len(rows)}")
    return len(rows)
