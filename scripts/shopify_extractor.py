"""
Shopify extractor — pulls daily sales from the Shopify Orders API.

Produces FOUR datasets:
  1. Per-SKU daily sales        → shopify_daily_sales
  2. Daily order-level summary  → shopify_daily_summary (gross/discount/return/net/ship/tax/total)
  3. Sales by channel per day   → shopify_channel_sales (order.source_name)
  4. Customers (lifetime)       → shopify_customers (returning rate + cohorts)

Skips gracefully if credentials are not configured.
Customer-derived fields (returning rate, cohorts) require the `read_customers`
scope on the custom app; if absent, those fields stay at 0 and the rest works.
"""

import requests
from collections import defaultdict
from urllib.parse import urlparse

from config import SHOPIFY_STORE_URL, SHOPIFY_ACCESS_TOKEN, LOOKBACK_DAYS
from db import (
    bulk_upsert_shopify_sales,
    bulk_upsert_shopify_variants,
    bulk_upsert_shopify_daily_summary,
    bulk_upsert_shopify_channel_sales,
    bulk_upsert_shopify_customers,
    bulk_upsert_shopify_referrer_sales,
)
from utils import get_date_range, logger


def _referrer_host(referring_site: str) -> str:
    """Extract a clean referrer host from referring_site, or 'direct' if empty."""
    if not referring_site:
        return "direct"
    host = urlparse(referring_site).netloc or referring_site
    return host[4:] if host.startswith("www.") else host

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
        "fields": (
            "id,created_at,financial_status,fulfillment_status,total_discounts,"
            "total_tax,line_items,refunds,shipping_lines,customer,source_name,"
            "shipping_address,referring_site"
        ),
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


def _line_items_gross(line_items: list) -> float:
    """Σ price × quantity across line items (gross sales, pre-discount)."""
    total = 0.0
    for item in line_items:
        total += float(item.get("price", 0)) * int(item.get("quantity", 0))
    return total


def _refund_total(refunds: list) -> float:
    """Σ refunded line-item subtotal across all refunds on the order."""
    total = 0.0
    for refund in refunds or []:
        for rli in refund.get("refund_line_items", []):
            total += float(rli.get("subtotal", 0))
    return total


def _shipping_total(shipping_lines: list) -> float:
    total = 0.0
    for sl in shipping_lines or []:
        total += float(sl.get("price", 0))
    return total


def extract_shopify_sales() -> int:
    """Extract Shopify sales (per-SKU + summary + channel + customers).
    Returns number of per-SKU records synced."""
    if not SHOPIFY_STORE_URL or not SHOPIFY_ACCESS_TOKEN:
        logger.info("Shopify credentials not configured — skipping")
        return 0

    start_date, end_date = get_date_range(LOOKBACK_DAYS)
    logger.info(f"Fetching Shopify orders: {start_date} to {end_date}")

    # 1. Per-SKU aggregation: {(date, variant_id): {fields}}
    sku_agg = defaultdict(lambda: {
        "orders_count": 0, "units_sold": 0, "revenue": 0.0,
        "product_id": "", "product_title": "", "variant_title": "", "sku": "",
    })

    # 2. Daily summary: {date: {fields}}
    summary = defaultdict(lambda: {
        "gross_sales": 0.0, "discounts": 0.0, "returns": 0.0,
        "shipping": 0.0, "taxes": 0.0,
        "orders_count": 0, "orders_fulfilled": 0,
        "new_customer_orders": 0, "returning_customer_orders": 0,
    })

    # 3. Channel: {(date, channel): {orders, revenue}}
    channel_agg = defaultdict(lambda: {"orders_count": 0, "revenue": 0.0})

    # 4. Customers: {customer_id: {fields}}
    customers: dict[str, dict] = {}

    # 5. Referrer: {(date, referrer): {orders, revenue}}
    referrer_agg = defaultdict(lambda: {"orders_count": 0, "revenue": 0.0})

    order_count = 0
    for order in _fetch_orders(start_date, end_date):
        financial_status = order.get("financial_status", "")
        if financial_status not in VALID_FINANCIAL_STATUSES:
            continue

        created_at = order.get("created_at", "")
        date = created_at[:10]  # YYYY-MM-DD (IST from created_at)
        line_items = order.get("line_items", [])

        # --- order-level money ---
        gross    = _line_items_gross(line_items)
        discount = float(order.get("total_discounts", 0))
        returned = _refund_total(order.get("refunds", []))
        shipping = _shipping_total(order.get("shipping_lines", []))
        taxes    = float(order.get("total_tax", 0))
        order_total = (gross - discount - returned) + shipping + taxes

        s = summary[date]
        s["gross_sales"] += gross
        s["discounts"]   += discount
        s["returns"]     += returned
        s["shipping"]    += shipping
        s["taxes"]       += taxes
        s["orders_count"] += 1
        if order.get("fulfillment_status") == "fulfilled":
            s["orders_fulfilled"] += 1

        # --- new vs returning (lifetime orders_count proxy) ---
        customer = order.get("customer")
        if customer:
            lifetime = int(customer.get("orders_count", 0) or 0)
            if lifetime > 1:
                s["returning_customer_orders"] += 1
            else:
                s["new_customer_orders"] += 1

            cid = str(customer["id"])
            addr = customer.get("default_address") or order.get("shipping_address") or {}
            existing = customers.get(cid, {})
            customers[cid] = {
                "customer_id": cid,
                "email": customer.get("email"),
                "first_order_date": (customer.get("created_at") or created_at)[:10],
                "last_order_date": max(date, existing.get("last_order_date", date)),
                "orders_count": lifetime,
                "total_spent": float(customer.get("total_spent", 0) or 0),
                "state": addr.get("province") or addr.get("province_code"),
            }

        # --- channel ---
        channel = order.get("source_name") or "unknown"
        ch = channel_agg[(date, channel)]
        ch["orders_count"] += 1
        ch["revenue"] += order_total

        # --- referrer ---
        referrer = _referrer_host(order.get("referring_site", ""))
        rf = referrer_agg[(date, referrer)]
        rf["orders_count"] += 1
        rf["revenue"] += order_total

        # --- per-SKU ---
        for item in line_items:
            variant_id = str(item.get("variant_id") or item.get("id", ""))
            entry = sku_agg[(date, variant_id)]
            entry["orders_count"] += 1
            entry["units_sold"]   += int(item.get("quantity", 0))
            entry["revenue"]      += float(item.get("price", 0)) * int(item.get("quantity", 0))
            entry["product_id"]    = str(item.get("product_id", ""))
            entry["product_title"] = item.get("title", "")
            entry["variant_title"] = item.get("variant_title") or ""
            entry["sku"]           = item.get("sku") or ""

        order_count += 1

    logger.info(f"  Processed {order_count} orders → {len(sku_agg)} SKU-day records, "
                f"{len(summary)} day summaries, {len(customers)} customers")

    # ---- Build + upsert per-SKU rows ----
    sku_rows = [
        {
            "date": date, "variant_id": variant_id,
            "product_id": e["product_id"], "product_title": e["product_title"],
            "variant_title": e["variant_title"], "sku": e["sku"],
            "orders_count": e["orders_count"], "units_sold": e["units_sold"],
            "revenue": round(e["revenue"], 2),
        }
        for (date, variant_id), e in sku_agg.items()
    ]
    bulk_upsert_shopify_sales(sku_rows)

    # ---- Build + upsert daily summary ----
    summary_rows = []
    for date, s in summary.items():
        net = s["gross_sales"] - s["discounts"] - s["returns"]
        total = net + s["shipping"] + s["taxes"]
        summary_rows.append({
            "date": date,
            "gross_sales": round(s["gross_sales"], 2),
            "discounts":   round(s["discounts"], 2),
            "returns":     round(s["returns"], 2),
            "net_sales":   round(net, 2),
            "shipping":    round(s["shipping"], 2),
            "taxes":       round(s["taxes"], 2),
            "total_sales": round(total, 2),
            "orders_count": s["orders_count"],
            "orders_fulfilled": s["orders_fulfilled"],
            "new_customer_orders": s["new_customer_orders"],
            "returning_customer_orders": s["returning_customer_orders"],
        })
    bulk_upsert_shopify_daily_summary(summary_rows)

    # ---- Build + upsert channel rows ----
    channel_rows = [
        {"date": date, "channel": channel,
         "orders_count": c["orders_count"], "revenue": round(c["revenue"], 2)}
        for (date, channel), c in channel_agg.items()
    ]
    bulk_upsert_shopify_channel_sales(channel_rows)

    # ---- Upsert customers ----
    if customers:
        bulk_upsert_shopify_customers(list(customers.values()))

    # ---- Build + upsert referrer rows ----
    referrer_rows = [
        {"date": date, "referrer": referrer,
         "orders_count": r["orders_count"], "revenue": round(r["revenue"], 2)}
        for (date, referrer), r in referrer_agg.items()
    ]
    bulk_upsert_shopify_referrer_sales(referrer_rows)

    logger.info(f"Shopify sync complete. SKU rows: {len(sku_rows)}, "
                f"summary days: {len(summary_rows)}, channels: {len(channel_rows)}, "
                f"customers: {len(customers)}, referrers: {len(referrer_rows)}")
    return len(sku_rows)
