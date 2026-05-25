import pytest
from httpx import AsyncClient

pytestmark = [
    pytest.mark.asyncio,
    pytest.mark.core,
]


async def test_health_check(client: AsyncClient) -> None:
    """Test health check endpoint."""
    response = await client.get("/health")
    assert response.status_code == 200
    assert response.json() == {"status": "ok"}


async def test_root(client: AsyncClient) -> None:
    """Test root endpoint."""
    response = await client.get("/")
    assert response.status_code == 200
    assert response.json() == {"message": "Welcome to Keyword API!"} 