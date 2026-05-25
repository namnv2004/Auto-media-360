import logging
import os
import uuid
from collections.abc import AsyncGenerator

import pytest
import pytest_asyncio
from httpx import ASGITransport, AsyncClient
from sqlalchemy.ext.asyncio import (
    AsyncSession,
    create_async_engine,
    async_sessionmaker,
)

from api.core.database import Base
from api.core.config import settings
from api.main import app as fastapi_app

# Test database URL for SQLite
TEST_DATABASE_URL = "sqlite+aiosqlite:///./test.db"

# Mock user data for testing
MOCK_USER_ID = uuid.UUID("a1b2c3d4-e5f6-7890-1234-567890abcdef")
MOCK_USER_ROLE_ADMIN = "admin"
MOCK_USER_ROLE_LEADER = "leader"
MOCK_USER_ROLE_STAFF = "staff"


@pytest_asyncio.fixture(scope="session")
async def test_engine():
    """Create test engine."""
    engine = create_async_engine(
        TEST_DATABASE_URL,
        echo=False,
    )
    yield engine
    await engine.dispose()


@pytest_asyncio.fixture(scope="session", autouse=True)
async def setup_test_db(test_engine) -> AsyncGenerator[None, None]:
    """Set up test database."""
    # Create all tables
    async with test_engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)

    yield

    # Drop all tables
    async with test_engine.begin() as conn:
        await conn.run_sync(Base.metadata.drop_all)


@pytest_asyncio.fixture(scope="function")
async def session(test_engine) -> AsyncGenerator[AsyncSession, None]:
    """Get a TestingSessionLocal instance."""
    # Create session factory
    TestingSessionLocal = async_sessionmaker(
        test_engine,
        class_=AsyncSession,
        expire_on_commit=False,
    )

    async with TestingSessionLocal() as session:
        # Start with a clean slate for each test
        async with test_engine.begin() as conn:
            for table in reversed(Base.metadata.sorted_tables):
                await conn.execute(table.delete())

        yield session
        # Rollback all changes after each test
        logging.critical("Rolling back transaction")
        await session.rollback()


@pytest_asyncio.fixture(scope="function")
async def client(session: AsyncSession) -> AsyncGenerator[AsyncClient, None]:
    """Get a TestClient instance."""
    from api.core.database import get_session

    # Override the database session
    async def override_get_session() -> AsyncGenerator[AsyncSession, None]:
        yield session

    fastapi_app.dependency_overrides[get_session] = override_get_session

    transport = ASGITransport(app=fastapi_app)
    async with AsyncClient(transport=transport, base_url="http://test") as aclient:
        aclient.headers.update({"Host": "localhost"})
        yield aclient

    fastapi_app.dependency_overrides.clear()


@pytest.fixture
def auth_settings():
    """Configure authentication settings for testing."""
    # Store original settings
    original_auth_enabled = settings.AUTH_ENABLED
    original_mock_user_id = settings.MOCK_USER_ID
    original_mock_user_role = settings.MOCK_USER_ROLE
    
    # Set test settings
    settings.AUTH_ENABLED = False
    settings.MOCK_USER_ID = MOCK_USER_ID
    settings.MOCK_USER_ROLE = MOCK_USER_ROLE_STAFF
    
    yield settings
    
    # Restore original settings
    settings.AUTH_ENABLED = original_auth_enabled
    settings.MOCK_USER_ID = original_mock_user_id
    settings.MOCK_USER_ROLE = original_mock_user_role


@pytest.fixture
def admin_settings():
    """Configure authentication settings for admin user testing."""
    # Store original settings
    original_auth_enabled = settings.AUTH_ENABLED
    original_mock_user_id = settings.MOCK_USER_ID
    original_mock_user_role = settings.MOCK_USER_ROLE
    
    # Set test settings
    settings.AUTH_ENABLED = False
    settings.MOCK_USER_ID = MOCK_USER_ID
    settings.MOCK_USER_ROLE = MOCK_USER_ROLE_ADMIN
    
    yield settings
    
    # Restore original settings
    settings.AUTH_ENABLED = original_auth_enabled
    settings.MOCK_USER_ID = original_mock_user_id
    settings.MOCK_USER_ROLE = original_mock_user_role


@pytest.fixture
def leader_settings():
    """Configure authentication settings for leader user testing."""
    # Store original settings
    original_auth_enabled = settings.AUTH_ENABLED
    original_mock_user_id = settings.MOCK_USER_ID
    original_mock_user_role = settings.MOCK_USER_ROLE
    
    # Set test settings
    settings.AUTH_ENABLED = False
    settings.MOCK_USER_ID = MOCK_USER_ID
    settings.MOCK_USER_ROLE = MOCK_USER_ROLE_LEADER
    
    yield settings
    
    # Restore original settings
    settings.AUTH_ENABLED = original_auth_enabled
    settings.MOCK_USER_ID = original_mock_user_id
    settings.MOCK_USER_ROLE = original_mock_user_role


@pytest.fixture
def staff_settings():
    """Configure authentication settings for staff user testing."""
    # Store original settings
    original_auth_enabled = settings.AUTH_ENABLED
    original_mock_user_id = settings.MOCK_USER_ID
    original_mock_user_role = settings.MOCK_USER_ROLE
    
    # Set test settings
    settings.AUTH_ENABLED = False
    settings.MOCK_USER_ID = MOCK_USER_ID
    settings.MOCK_USER_ROLE = MOCK_USER_ROLE_STAFF
    
    yield settings
    
    # Restore original settings
    settings.AUTH_ENABLED = original_auth_enabled
    settings.MOCK_USER_ID = original_mock_user_id
    settings.MOCK_USER_ROLE = original_mock_user_role