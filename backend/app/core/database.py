"""Async SQLAlchemy database setup for Reva."""

from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession, async_sessionmaker
from sqlalchemy.orm import DeclarativeBase
from typing import AsyncGenerator
import ssl
from app.core.config import settings

connect_args = {}
if "asyncpg" in settings.async_database_url:
    ctx = ssl.create_default_context()
    ctx.check_hostname = False
    ctx.verify_mode = ssl.CERT_NONE
    connect_args["ssl"] = ctx
    # Neon pooled connections (PgBouncer in transaction mode) require disabling prepared statement cache
    if "pooler" in settings.async_database_url or "neon.tech" in settings.async_database_url:
        connect_args["statement_cache_size"] = 0
        connect_args["prepared_statement_cache_size"] = 0

engine = create_async_engine(
    settings.async_database_url,
    connect_args=connect_args,
    echo=settings.is_development,
    pool_pre_ping=True,
    pool_recycle=300,
    pool_timeout=30,
    pool_size=15,
    max_overflow=25,
)

AsyncSessionLocal = async_sessionmaker(
    engine,
    class_=AsyncSession,
    expire_on_commit=False,
    autocommit=False,
    autoflush=False,
)


class Base(DeclarativeBase):
    """Base class for all SQLAlchemy models."""
    pass


async def get_db() -> AsyncGenerator[AsyncSession, None]:
    """FastAPI dependency that yields a database session."""
    async with AsyncSessionLocal() as session:
        try:
            yield session
            await session.commit()
        except Exception:
            await session.rollback()
            raise
        finally:
            await session.close()
