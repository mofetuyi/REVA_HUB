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
    return pwd_context.hash(password)


def verify_password(plain: str, hashed: str) -> bool:
    return pwd_context.verify(plain, hashed)


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


async def generate_and_store_otp(phone: str, redis_client: aioredis.Redis) -> str:
    """Generate a 6-digit OTP, store hashed in Redis, return plaintext."""
    otp = f"{secrets.randbelow(1_000_000):06d}"
    key = f"{OTP_PREFIX}{phone}"
    hashed = _hash_otp(otp, phone)
    await redis_client.setex(key, OTP_TTL_SECONDS, hashed)
    return otp


async def verify_otp(phone: str, otp: str, redis_client: aioredis.Redis) -> bool:
    """Verify OTP; returns True and deletes the key on success."""
    key = f"{OTP_PREFIX}{phone}"
    stored = await redis_client.get(key)
    if not stored:
        return False
    expected = _hash_otp(otp, phone)
    if secrets.compare_digest(stored.decode(), expected):
        await redis_client.delete(key)
        return True
    return False


async def store_refresh_token(user_id: str, token: str, redis_client: aioredis.Redis) -> None:
    ttl = settings.REFRESH_TOKEN_EXPIRE_DAYS * 86400
    await redis_client.setex(f"{REFRESH_TOKEN_PREFIX}{user_id}", ttl, token)


async def invalidate_refresh_token(user_id: str, redis_client: aioredis.Redis) -> None:
    await redis_client.delete(f"{REFRESH_TOKEN_PREFIX}{user_id}")
