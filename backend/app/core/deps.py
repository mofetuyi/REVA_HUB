"""FastAPI dependencies for authentication and authorization."""

from fastapi import Depends, HTTPException, status, Header
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
import redis.asyncio as aioredis
from jose import JWTError

from app.core.database import get_db
from app.core.security import decode_token
from app.core.config import settings

import time
from typing import Any, Optional
import logging

logger = logging.getLogger(__name__)

bearer_scheme = HTTPBearer(auto_error=False)

class InMemoryCache:
    """In-memory key-value cache with TTL, fallback for environments without Redis."""
    def __init__(self):
        self._data: dict[str, str] = {}
        self._exp: dict[str, float] = {}

    def _purge(self, key: str):
        if key in self._exp and time.time() > self._exp[key]:
            self._data.pop(key, None)
            self._exp.pop(key, None)

    async def get(self, key: str):
        self._purge(key)
        return self._data.get(key)

    async def setex(self, key: str, time_sec: int, value: Any):
        self._data[key] = str(value)
        self._exp[key] = time.time() + float(time_sec)

    async def delete(self, key: str):
        self._data.pop(key, None)
        self._exp.pop(key, None)

    async def incr(self, key: str) -> int:
        self._purge(key)
        curr = int(self._data.get(key, 0)) + 1
        self._data[key] = str(curr)
        return curr

    async def expire(self, key: str, time_sec: int):
        if key in self._data:
            self._exp[key] = time.time() + float(time_sec)

class ResilientCache:
    """Wraps Redis with automatic fallback to memory cache if Redis is absent."""
    def __init__(self):
        self._redis: aioredis.Redis | None = None
        self._memory = InMemoryCache()
        self._redis_attempted = False

    async def _ensure_redis(self):
        if self._redis_attempted:
            return self._redis
        self._redis_attempted = True
        try:
            client = await aioredis.from_url(settings.REDIS_URL, decode_responses=True, socket_timeout=1.5)
            await client.ping()
            self._redis = client
            logger.info("Connected to Redis at %s", settings.REDIS_URL)
        except Exception:
            logger.warning("Redis not reachable at %s. Using resilient in-memory session cache.", settings.REDIS_URL)
            self._redis = None
        return self._redis

    async def get(self, key: str):
        r = await self._ensure_redis()
        if r:
            try:
                res = await r.get(key)
                if isinstance(res, bytes):
                    return res.decode("utf-8")
                return res
            except Exception:
                pass
        return await self._memory.get(key)

    async def setex(self, key: str, time_sec: int, value: Any):
        r = await self._ensure_redis()
        if r:
            try:
                return await r.setex(key, time_sec, value)
            except Exception:
                pass
        return await self._memory.setex(key, time_sec, value)

    async def delete(self, key: str):
        r = await self._ensure_redis()
        if r:
            try:
                return await r.delete(key)
            except Exception:
                pass
        return await self._memory.delete(key)

    async def incr(self, key: str) -> int:
        r = await self._ensure_redis()
        if r:
            try:
                return await r.incr(key)
            except Exception:
                pass
        return await self._memory.incr(key)

    async def expire(self, key: str, time_sec: int):
        r = await self._ensure_redis()
        if r:
            try:
                return await r.expire(key, time_sec)
            except Exception:
                pass
        return await self._memory.expire(key, time_sec)

_cache_instance = ResilientCache()

async def get_redis():
    return _cache_instance


async def verify_internal_key(
    x_internal_key: Optional[str] = Header(None, alias="X-Internal-Key"),
) -> bool:
    """Validate X-Internal-Key header for n8n automations & internal workflows."""
    if not x_internal_key or x_internal_key != settings.INTERNAL_API_KEY:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid or missing X-Internal-Key header",
            headers={"WWW-Authenticate": "X-Internal-Key"},
        )
    return True


async def get_current_user(
    credentials: HTTPAuthorizationCredentials | None = Depends(bearer_scheme),
    db: AsyncSession = Depends(get_db),
    x_internal_key: Optional[str] = Header(None, alias="X-Internal-Key"),
):
    """Require a valid JWT access token or valid X-Internal-Key for automation."""
    from app.models.user import User  # avoid circular import

    # Support n8n and internal automation via X-Internal-Key header
    if x_internal_key and x_internal_key == settings.INTERNAL_API_KEY:
        result = await db.execute(select(User).where(User.is_admin == True).limit(1))
        admin_user = result.scalar_one_or_none()
        if admin_user:
            return admin_user
        # Return fallback system automation user if no admin exists in DB yet
        return User(
            name="n8n System Automation",
            email="automation@reva-hub.internal",
            is_admin=True,
            is_staff=True,
            is_active=True,
            is_buyer=True,
            is_seller=True,
            current_mode="seller",
        )

    if not credentials:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Not authenticated",
            headers={"WWW-Authenticate": "Bearer"},
        )
    try:
        payload = decode_token(credentials.credentials)
        if payload.get("type") != "access":
            raise JWTError("Not an access token")
        user_id: str = payload["sub"]
    except (JWTError, KeyError):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid or expired token",
        )

    result = await db.execute(select(User).where(User.id == user_id))
    user = result.scalar_one_or_none()
    if not user or not user.is_active:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="User not found")
    return user


async def get_optional_user(
    credentials: HTTPAuthorizationCredentials | None = Depends(bearer_scheme),
    db: AsyncSession = Depends(get_db),
    x_internal_key: Optional[str] = Header(None, alias="X-Internal-Key"),
):
    """Return user if authenticated, else None."""
    if not credentials and not x_internal_key:
        return None
    try:
        return await get_current_user(credentials=credentials, db=db, x_internal_key=x_internal_key)
    except Exception:
        return None


def require_seller_mode(current_user=Depends(get_current_user)):
    if current_user.current_mode != "seller":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Switch to seller mode to perform this action",
        )
    return current_user


def require_buyer_mode(current_user=Depends(get_current_user)):
    if current_user.current_mode != "buyer":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Switch to buyer mode to perform this action",
        )
    return current_user


def require_admin(current_user=Depends(get_current_user)):
    if not current_user.is_admin:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Admin access required",
        )
    return current_user


def require_staff(current_user=Depends(get_current_user)):
    if not (current_user.is_staff or current_user.is_admin):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Staff access required",
        )
    return current_user


class PaginationParams:
    def __init__(self, page: int = 1, page_size: int = 20):
        if page < 1:
            page = 1
        if page_size < 1 or page_size > 100:
            page_size = 20
        self.page = page
        self.page_size = page_size
        self.offset = (page - 1) * page_size
