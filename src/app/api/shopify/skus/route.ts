import { NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";

// Returns all Shopify product variants from the shopify_variants table
// (synced from the Products API, not just from orders).
// This ensures all SKUs appear in the dashboard even if unsold.
export async function GET() {
  const EXCLUDED_TITLES = ["Gift wrap", "Shipping protection", "Test Product"];

  const { data: rows, error } = await supabase
    .from("shopify_variants")
    .select("variant_id, product_id, product_title, variant_title, sku, price")
    .not("product_title", "in", `(${EXCLUDED_TITLES.map((t) => `"${t}"`).join(",")})`)
    .order("sku");

  if (error) {
    return NextResponse.json({ error: "Failed to fetch SKUs" }, { status: 500 });
  }

  return NextResponse.json({ skus: rows ?? [] });
}
