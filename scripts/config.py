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

# Config
LOOKBACK_DAYS = int(os.getenv("LOOKBACK_DAYS", "7"))
