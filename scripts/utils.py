import logging
from datetime import datetime, timedelta, timezone

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(message)s",
)
logger = logging.getLogger("adauto")


def get_date_range(lookback_days: int) -> tuple[str, str]:
    """Return (start_date, end_date) strings for the lookback window."""
    today = datetime.now(timezone.utc).date()
    start = today - timedelta(days=lookback_days)
    return start.isoformat(), today.isoformat()


def now_iso() -> str:
    """Return current UTC time as ISO string."""
    return datetime.now(timezone.utc).isoformat()
