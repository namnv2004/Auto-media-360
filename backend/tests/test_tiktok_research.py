import pytest
import uuid
from unittest.mock import patch, MagicMock
from httpx import AsyncClient

@pytest.mark.asyncio
async def test_tiktok_crawl_endpoint_success(client: AsyncClient):
    payload = {
        "keyword": "AI technology",
        "market": "VN",
        "language": "vi"
    }
    
    mock_task = MagicMock()
    mock_task.id = "mock_celery_tiktok_task_id_456"
    
    with patch("api.src.tiktok_research.tasks.run_tiktok_research_task.delay", return_value=mock_task) as mock_delay:
        response = await client.post("/api/v1/tiktok-research/crawl", json=payload)
        
        assert response.status_code == 201
        data = response.json()
        assert "project_id" in data
        assert data["job_id"] == "mock_celery_tiktok_task_id_456"
        assert data["status"] == "pending"
        
        # Verify database record was created by fetching list of projects
        list_response = await client.get("/api/v1/tiktok-research/projects")
        assert list_response.status_code == 200
        projects = list_response.json()
        assert len(projects) == 1
        assert "TikTok Research: AI technology (VN)" in projects[0]["name"]
        
        # Verify celery task was dispatched with correct args
        mock_delay.assert_called_once_with(
            project_id_str=data["project_id"],
            keyword="AI technology",
            market="VN",
            language="vi"
        )


@pytest.mark.asyncio
async def test_tiktok_export_csv_success(client: AsyncClient, session):
    from api.src.tiktok_research.models import TikTokResearchProject, TikTokTrendResult
    
    project = TikTokResearchProject(
        id=uuid.uuid4(),
        name="TikTok Research: Test Project (US)",
        keyword="Test Project"
    )
    session.add(project)
    
    trend = TikTokTrendResult(
        id=uuid.uuid4(),
        project_id=project.id,
        title="Cách ứng dụng AI",
        views="2.5M",
        likes="340k",
        comments="12k",
        engagement="14.1%",
        age_group="18-24 tuổi (65%)",
        script_hook="Xem ngay công cụ này",
        script_body="Sử dụng chatbot AI",
        script_cta="Hãy thả tim nhé",
        hashtags="#ai #productivity",
        music="Trending beats"
    )
    session.add(trend)
    await session.commit()
    
    response = await client.get(f"/api/v1/tiktok-research/projects/{project.id}/export/csv")
    
    assert response.status_code == 200
    assert "text/csv" in response.headers["content-type"]
    assert "Content-Disposition" in response.headers
    
    content = response.content.decode("utf-8-sig")
    assert "Cách ứng dụng AI" in content
    assert "Xem ngay công cụ này" in content
    assert "Tiêu đề xu hướng" in content
