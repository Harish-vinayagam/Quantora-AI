"""
Quantora AI — Database Engine & Session
========================================
Async SQLAlchemy with SQLite (dev) or PostgreSQL (prod).
"""

from sqlalchemy.ext.asyncio import create_async_engine, async_sessionmaker, AsyncSession
from sqlalchemy.orm import DeclarativeBase
from app.config import get_settings


class Base(DeclarativeBase):
    pass


_settings = get_settings()

# Auto-fix PostgreSQL URL for asyncpg driver
_db_url = _settings.database_url
if _db_url.startswith("postgresql://"):
    _db_url = _db_url.replace("postgresql://", "postgresql+asyncpg://", 1)
elif _db_url.startswith("postgres://"):
    _db_url = _db_url.replace("postgres://", "postgresql+asyncpg://", 1)

engine = create_async_engine(
    _db_url,
    echo=_settings.debug,
    connect_args={"check_same_thread": False} if "sqlite" in _db_url else {},
)

async_session = async_sessionmaker(engine, expire_on_commit=False)


async def init_db():
    """Create all tables. Called on startup."""
    async with engine.begin() as conn:
        from app.models import transaction, alert, user, bank_connection  # noqa: F401
        await conn.run_sync(Base.metadata.create_all)


async def get_db() -> AsyncSession:
    """Dependency injection for FastAPI endpoints."""
    async with async_session() as session:
        try:
            yield session
        finally:
            await session.close()
