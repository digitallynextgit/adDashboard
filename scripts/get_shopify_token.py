"""
One-time script to get a Shopify access token via OAuth.

Usage:
  1. Fill in API_KEY, API_SECRET, and SHOP below
  2. Make sure http://localhost:8080/callback is added as a redirect URI in your Dev Dashboard app
  3. Run: python get_shopify_token.py
  4. Authorize in the browser that opens
  5. Copy the token printed in the terminal into your .env file
"""

import webbrowser
import secrets
import requests
from urllib.parse import urlencode, urlparse, parse_qs
from http.server import HTTPServer, BaseHTTPRequestHandler

# ── Fill these in ──────────────────────────────────────────────
API_KEY    = ""   # From Dev Dashboard → AdAuto → Client credentials
API_SECRET = ""   # From Dev Dashboard → AdAuto → Client credentials
SHOP       = "xxvjh8-ad.myshopify.com"
# ───────────────────────────────────────────────────────────────

REDIRECT_URI = "http://localhost:8080/callback"
SCOPES = "read_orders,read_products"

state = secrets.token_hex(16)
access_token_holder = []

auth_url = (
    f"https://{SHOP}/admin/oauth/authorize?"
    + urlencode({
        "client_id": API_KEY,
        "scope": SCOPES,
        "redirect_uri": REDIRECT_URI,
        "state": state,
    })
)


class CallbackHandler(BaseHTTPRequestHandler):
    def do_GET(self):
        parsed = urlparse(self.path)
        params = parse_qs(parsed.query)

        returned_state = params.get("state", [None])[0]
        code = params.get("code", [None])[0]

        if returned_state != state:
            self.send_response(400)
            self.end_headers()
            self.wfile.write(b"State mismatch - try again.")
            return

        resp = requests.post(
            f"https://{SHOP}/admin/oauth/access_token",
            json={
                "client_id": API_KEY,
                "client_secret": API_SECRET,
                "code": code,
            },
        )
        data = resp.json()
        token = data.get("access_token", "")
        access_token_holder.append(token)

        self.send_response(200)
        self.end_headers()
        self.wfile.write(b"Authorization successful! You can close this tab.")

    def log_message(self, format, *args):
        pass  # Silence request logs


if __name__ == "__main__":
    if not API_KEY or not API_SECRET:
        print("ERROR: Fill in API_KEY and API_SECRET at the top of this file first.")
        exit(1)

    print(f"Opening browser to authorize AdAuto on {SHOP}...")
    webbrowser.open(auth_url)

    print("Waiting for callback on http://localhost:8080 ...")
    server = HTTPServer(("localhost", 8080), CallbackHandler)
    server.handle_request()

    if access_token_holder:
        token = access_token_holder[0]
        print("\n" + "=" * 50)
        print("SUCCESS! Add this to your scripts/.env file:")
        print("=" * 50)
        print(f"SHOPIFY_STORE_URL={SHOP}")
        print(f"SHOPIFY_ACCESS_TOKEN={token}")
        print("=" * 50)
    else:
        print("ERROR: No token received. Check your API_KEY/SECRET and try again.")
