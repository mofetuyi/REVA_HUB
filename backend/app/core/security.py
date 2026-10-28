"""Security utilities: JWT, password hashing, OTP generation."""

import secrets
import hashlib
from datetime import datetime, timedelta, timezone
from typing import Optional, Tuple
import redis.asyncio as aioredis
from jose import JWTError, jwt
from passlib.context import CryptContext
from app.core.config import settings

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

ALGORITHM = "HS256"
OTP_TTL_SECONDS = 600  # 10 minutes
OTP_PREFIX = "otp:"
REFRESH_TOKEN_PREFIX = "refresh:"


def hash_password(password: str) -> str:
    try:
        return pwd_context.hash(password)
    except Exception:
        import bcrypt
        return bcrypt.hashpw(password.encode("utf-8"), bcrypt.gensalt()).decode("utf-8")


def verify_password(plain: str, hashed: str) -> bool:
    try:
        return pwd_context.verify(plain, hashed)
    except Exception:
        try:
            import bcrypt
            return bcrypt.checkpw(plain.encode("utf-8"), hashed.encode("utf-8"))
        except Exception:
            return False


def create_access_token(subject: str, extra: dict | None = None) -> str:
    expire = datetime.now(timezone.utc) + timedelta(
        minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES
    )
    payload = {"sub": subject, "exp": expire, "type": "access"}
    if extra:
        payload.update(extra)
    return jwt.encode(payload, settings.SECRET_KEY, algorithm=ALGORITHM)


def create_refresh_token(subject: str) -> str:
    expire = datetime.now(timezone.utc) + timedelta(
        days=settings.REFRESH_TOKEN_EXPIRE_DAYS
    )
    payload = {"sub": subject, "exp": expire, "type": "refresh"}
    return jwt.encode(payload, settings.SECRET_KEY, algorithm=ALGORITHM)


def decode_token(token: str) -> dict:
    """Decode and validate a JWT. Raises JWTError on failure."""
    return jwt.decode(token, settings.SECRET_KEY, algorithms=[ALGORITHM])


def _hash_otp(otp: str, phone: str) -> str:
    """Hash OTP with phone as salt for Redis storage."""
    return hashlib.sha256(f"{phone}:{otp}".encode()).hexdigest()


MAX_OTP_ATTEMPTS = 5

async def generate_and_store_otp(phone: str, redis_client) -> str:
    """Generate a 6-digit OTP, store hashed in Redis/Cache, return plaintext."""
    otp = f"{secrets.randbelow(1_000_000):06d}"
    key = f"{OTP_PREFIX}{phone}"
    hashed = _hash_otp(otp, phone)
    await redis_client.setex(key, OTP_TTL_SECONDS, hashed)
    # Reset attempt counter on new OTP generation
    await redis_client.delete(f"otp_attempts:{phone}")
    return otp


async def verify_otp(phone: str, otp: str, redis_client) -> tuple[bool, str | None]:
    """Verify OTP with max 5 attempts limit against brute force.
    Returns (success, error_message).
    """
    attempt_key = f"otp_attempts:{phone}"
    attempts = await redis_client.incr(attempt_key)
    await redis_client.expire(attempt_key, OTP_TTL_SECONDS)

    if int(attempts) > MAX_OTP_ATTEMPTS:
        # Brute force prevention: invalidate the OTP entirely
        await redis_client.delete(f"{OTP_PREFIX}{phone}")
        return False, "Maximum verification attempts exceeded. Please request a new OTP code."

    key = f"{OTP_PREFIX}{phone}"
    stored = await redis_client.get(key)
    if not stored:
        return False, "OTP has expired or was not requested. Please request a new code."

    stored_str = stored if isinstance(stored, str) else stored.decode("utf-8")
    expected = _hash_otp(otp, phone)
    if secrets.compare_digest(stored_str, expected):
        await redis_client.delete(key)
        await redis_client.delete(attempt_key)
        return True, None

    remaining = MAX_OTP_ATTEMPTS - int(attempts)
    return False, f"Incorrect OTP code. {remaining} attempt{'s' if remaining != 1 else ''} remaining."


async def store_refresh_token(user_id: str, token: str, redis_client) -> None:
    ttl = settings.REFRESH_TOKEN_EXPIRE_DAYS * 86400
    await redis_client.setex(f"{REFRESH_TOKEN_PREFIX}{user_id}", ttl, token)


async def invalidate_refresh_token(user_id: str, redis_client) -> None:
    await redis_client.delete(f"{REFRESH_TOKEN_PREFIX}{user_id}")
