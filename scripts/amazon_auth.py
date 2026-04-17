"""
One-time script to get Amazon Ads OAuth credentials (refresh token + profile ID).

Usage:
  1. Add AMAZON_CLIENT_ID and AMAZON_CLIENT_SECRET to scripts/.env
  2. Add  http://localhost:8080/callback  as an Allowed Return URL in your
     Login with Amazon security profile (developer.amazon.com)
  3. Run:  python amazon_auth.py
  4. Log in with Amazon in the browser that opens
  5. Copy AMAZON_REFRESH_TOKEN and AMAZON_PROFILE_ID printed at the end into .env

Scopes granted: advertising::campaign_management
"""

import os
import secrets
import webbrowser
import requests
from dotenv import load_dotenv
from urllib.parse import urlencode, urlparse, parse_qs
from http.server import HTTPServer, BaseHTTPRequestHandler

load_dotenv()

CLIENT_ID     = os.getenv("AMAZON_CLIENT_ID", "")
CLIENT_SECRET = os.getenv("AMAZON_CLIENT_SECRET", "")

REDIRECT_URI   = "http://localhost:8080/callback"
SCOPE          = "advertising::campaign_management"
AUTH_URL       = "https://www.amazon.in/ap/oa"          # India login endpoint
TOKEN_URL      = "https://api.amazon.in/auth/o2/token"  # India token endpoint
PROFILES_URL   = "https://advertising-api.amazon.in/v2/profiles"  # India API

state = secrets.token_hex(16)
result_holder = {}


class CallbackHandler(BaseHTTPRequestHandler):
    def do_GET(self):
        parsed = urlparse(self.path)
        params = parse_qs(parsed.query)

        returned_state = params.get("state", [None])[0]
        code = params.get("code", [None])[0]
        error = params.get("error", [None])[0]

        if error:
            self.send_response(400)
            self.end_headers()
            self.wfile.write(f"Error: {error}".encode())
            result_holder["error"] = error
            return

        if returned_state != state:
            self.send_response(400)
            self.end_headers()
            self.wfile.write(b"State mismatch - possible CSRF. Try again.")
            return

        # Exchange authorization code for tokens
        resp = requests.post(TOKEN_URL, data={
            "grant_type":    "authorization_code",
            "code":          code,
            "redirect_uri":  REDIRECT_URI,
            "client_id":     CLIENT_ID,
            "client_secret": CLIENT_SECRET,
        })
        data = resp.json()

        if "refresh_token" not in data:
            self.send_response(400)
            self.end_headers()
            self.wfile.write(f"Token exchange failed: {data}".encode())
            result_holder["error"] = data
            return

        result_holder["access_token"]  = data["access_token"]
        result_holder["refresh_token"] = data["refresh_token"]

        self.send_response(200)
        self.end_headers()
        self.wfile.write(b"Authorization successful! You can close this tab and return to the terminal.")

    def log_message(self, format, *args):
        pass  # Silence HTTP request logs


def _fetch_profiles(access_token: str) -> list:
    """Return all advertiser profiles accessible with this token."""
    resp = requests.get(
        PROFILES_URL,
        headers={
            "Authorization": f"Bearer {access_token}",
            "Amazon-Advertising-API-ClientId": CLIENT_ID,
        },
    )
    if resp.status_code != 200:
        return []
    return resp.json()


def _find_india_profile(profiles: list) -> dict | None:
    """Return the first India (IN) marketplace profile, or None."""
    for p in profiles:
        country = p.get("countryCode", "")
        if country == "IN":
            return p
    return None


if __name__ == "__main__":
    if not CLIENT_ID or not CLIENT_SECRET:
        print("ERROR: AMAZON_CLIENT_ID and AMAZON_CLIENT_SECRET must be set in scripts/.env")
        print()
        print("Add these lines to scripts/.env:")
        print("  AMAZON_CLIENT_ID=amzn1.application-oa2-client.XXXX")
        print("  AMAZON_CLIENT_SECRET=your-client-secret")
        exit(1)

    # Build the authorization URL
    auth_url = (
        AUTH_URL + "?"
        + urlencode({
            "client_id":     CLIENT_ID,
            "scope":         SCOPE,
            "response_type": "code",
            "redirect_uri":  REDIRECT_URI,
            "state":         state,
        })
    )

    print("Opening browser to authorize AdAuto on Amazon Ads...")
    print("(If the browser does not open, paste this URL manually:)")
    print(f"  {auth_url}")
    print()
    webbrowser.open(auth_url)

    print("Waiting for callback on http://localhost:8080 ...")
    server = HTTPServer(("localhost", 8080), CallbackHandler)
    server.handle_request()

    if "error" in result_holder:
        print(f"\nERROR: {result_holder['error']}")
        exit(1)

    if "refresh_token" not in result_holder:
        print("\nERROR: No token received. Check your CLIENT_ID/SECRET and try again.")
        exit(1)

    access_token  = result_holder["access_token"]
    refresh_token = result_holder["refresh_token"]

    print("\nTokens obtained. Fetching your Amazon Ads profiles...")
    profiles = _fetch_profiles(access_token)

    profile_id = ""
    if profiles:
        india_profile = _find_india_profile(profiles)
        if india_profile:
            profile_id = str(india_profile["profileId"])
            print(f"Found India profile: {india_profile.get('accountInfo', {}).get('name', 'Unknown')} (ID: {profile_id})")
        else:
            print("\nAvailable profiles (pick the one for your India account):")
            for i, p in enumerate(profiles):
                acct = p.get("accountInfo", {})
                print(f"  [{i+1}] profileId={p['profileId']}  country={p.get('countryCode','')}  name={acct.get('name','')}  type={acct.get('type','')}")
            choice = input("\nEnter number of your profile: ").strip()
            try:
                profile_id = str(profiles[int(choice) - 1]["profileId"])
            except Exception:
                print("Invalid choice. Set AMAZON_PROFILE_ID manually from the list above.")
    else:
        print("Could not fetch profiles automatically. Find your Profile ID in the Amazon Ads console URL:")
        print("  Go to advertising.amazon.com → the URL will contain /profiles/XXXXXXXXXX/")

    print()
    print("=" * 60)
    print("SUCCESS! Add these 4 lines to your scripts/.env file:")
    print("=" * 60)
    print(f"AMAZON_CLIENT_ID={CLIENT_ID}")
    print(f"AMAZON_CLIENT_SECRET={CLIENT_SECRET}")
    print(f"AMAZON_REFRESH_TOKEN={refresh_token}")
    print(f"AMAZON_PROFILE_ID={profile_id or '<paste from console URL>'}")
    print("=" * 60)

    if profile_id:
        print("\nAll credentials retrieved. You're ready to sync Amazon Ads data.")
    else:
        print("\nSet AMAZON_PROFILE_ID manually, then you're ready to sync.")
