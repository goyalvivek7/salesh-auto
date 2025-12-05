"""
Timezone utilities for the application.
All datetime operations use IST (Indian Standard Time, UTC+5:30).
"""
from datetime import datetime, timedelta, timezone


# Define IST timezone (UTC+5:30)
IST = timezone(timedelta(hours=5, minutes=30))


def now_ist():
    """Get current datetime in IST timezone."""
    return datetime.now(IST)


def utc_to_ist(dt: datetime) -> datetime:
    """Convert UTC datetime to IST."""
    if dt.tzinfo is None:
        # If naive datetime, assume it's UTC
        dt = dt.replace(tzinfo=timezone.utc)
    return dt.astimezone(IST)


def ist_to_utc(dt: datetime) -> datetime:
    """Convert IST datetime to UTC."""
    if dt.tzinfo is None:
        # If naive datetime, assume it's IST
        dt = dt.replace(tzinfo=IST)
    return dt.astimezone(timezone.utc)
