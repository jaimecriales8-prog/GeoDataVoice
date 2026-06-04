from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession, async_sessionmaker
from sqlalchemy.orm import DeclarativeBase
from sqlalchemy.pool import NullPool
from app.core.config import settings


def _make_engine():
    url = settings.DATABASE_URL
    # Embed statement_cache_size=0 in the URL for asyncpg to pick it up reliably
    if "?" not in url:
        url += "?statement_cache_size=0"
    else:
        url += "&statement_cache_size=0"
    return create_async_engine(
        url,
        echo=False,
        poolclass=NullPool,
    )


engine = _make_engine()
AsyncSessionLocal = async_sessionmaker(engine, expire_on_commit=False)


class Base(DeclarativeBase):
    pass


async def get_db() -> AsyncSession:
    async with AsyncSessionLocal() as session:
        yield session
