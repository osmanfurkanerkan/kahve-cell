from datetime import datetime, timedelta, timezone
from typing import Optional
from jose import jwt, JWTError

SECRET_KEY = "kahvecell-secret-2026-change-in-prod"
ALGORITHM = "HS256"


def _utc_now() -> datetime:
    return datetime.now(timezone.utc)


def create_access_token(subject: str, expires_minutes: int = 60 * 24) -> str:
    expire = _utc_now() + timedelta(minutes=expires_minutes)
    payload = {"sub": str(subject), "exp": int(expire.timestamp()), "type": "access"}
    return jwt.encode(payload, SECRET_KEY, algorithm=ALGORITHM)


def create_refresh_token(subject: str, expires_days: int = 30) -> str:
    expire = _utc_now() + timedelta(days=expires_days)
    payload = {"sub": str(subject), "exp": int(expire.timestamp()), "type": "refresh"}
    return jwt.encode(payload, SECRET_KEY, algorithm=ALGORITHM)


def decode_token(token: str) -> Optional[dict]:
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        return payload
    except JWTError:
        return None
