import os
from dotenv import load_dotenv

load_dotenv()

# Meta Ads
META_APP_ID = os.environ["META_APP_ID"]
META_APP_SECRET = os.environ["META_APP_SECRET"]
META_ACCESS_TOKEN = os.environ["META_ACCESS_TOKEN"]
META_AD_ACCOUNT_ID = os.environ["META_AD_ACCOUNT_ID"]

# Supabase
SUPABASE_URL = os.environ["SUPABASE_URL"]
SUPABASE_SERVICE_KEY = os.environ["SUPABASE_SERVICE_KEY"]

# Shopify (optional — Phase 4)
SHOPIFY_STORE_URL = os.getenv("SHOPIFY_STORE_URL", "")       # e.g. your-store.myshopify.com
SHOPIFY_ACCESS_TOKEN = os.getenv("SHOPIFY_ACCESS_TOKEN", "") # Admin API access token

# Amazon Ads (optional)
AMAZON_CLIENT_ID      = os.getenv("AMAZON_CLIENT_ID", "")
AMAZON_CLIENT_SECRET  = os.getenv("AMAZON_CLIENT_SECRET", "")
AMAZON_REFRESH_TOKEN  = os.getenv("AMAZON_REFRESH_TOKEN", "")
AMAZON_PROFILE_ID     = os.getenv("AMAZON_PROFILE_ID", "")

# Flipkart Ads (optional)
FLIPKART_CLIENT_ID     = os.getenv("FLIPKART_CLIENT_ID", "")
FLIPKART_CLIENT_SECRET = os.getenv("FLIPKART_CLIENT_SECRET", "")

# Google Analytics 4 (optional — H2S pilot)
GA4_PROPERTY_ID          = os.getenv("GA4_PROPERTY_ID", "")
GA4_SERVICE_ACCOUNT_JSON = os.getenv("GA4_SERVICE_ACCOUNT_JSON", "")

# Google Search Console (optional — H2S pilot; reuses GA4 service account)
GSC_SITE_URL = os.getenv("GSC_SITE_URL", "")

# Microsoft Clarity (optional — H2S pilot)
CLARITY_PROJECT_ID = os.getenv("CLARITY_PROJECT_ID", "")
CLARITY_API_TOKEN  = os.getenv("CLARITY_API_TOKEN",  "")

# GoKwik (optional — H2S pilot)
GOKWIK_API_KEY     = os.getenv("GOKWIK_API_KEY",     "")
GOKWIK_MERCHANT_ID = os.getenv("GOKWIK_MERCHANT_ID", "")
GOKWIK_API_BASE    = os.getenv("GOKWIK_API_BASE",    "https://api.gokwik.co")

# Config
LOOKBACK_DAYS = int(os.getenv("LOOKBACK_DAYS", "7"))
