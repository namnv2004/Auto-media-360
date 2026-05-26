import pytest
import uuid
from unittest.mock import patch, MagicMock
from httpx import AsyncClient

@pytest.mark.asyncio
async def test_crawl_endpoint_success(client: AsyncClient):
    payload = {
        "keyword": "psychology",
        "market": "US",
        "language": "en",
        "max_results": 5,
        "order": "relevance",
        "video_duration": "any"
    }
    
    # Mock the celery task delay call
    mock_task = MagicMock()
    mock_task.id = "mock_celery_task_id_123"
    
    with patch("api.src.youtube_research.tasks.run_youtube_research_task.delay", return_value=mock_task) as mock_delay:
        response = await client.post("/api/v1/youtube-research/crawl", json=payload)
        
        assert response.status_code == 201
        data = response.json()
        assert "project_id" in data
        assert data["job_id"] == "mock_celery_task_id_123"
        assert data["status"] == "pending"
        
        # Verify database record was created by fetching list of projects
        list_response = await client.get("/api/v1/youtube-research/projects")
        assert list_response.status_code == 200
        projects = list_response.json()
        assert len(projects) == 1
        assert "Research: psychology (US)" in projects[0]["name"]
        
        # Verify celery task was dispatched with correct args
        mock_delay.assert_called_once_with(
            project_id_str=data["project_id"],
            keyword="psychology",
            market="US",
            language="en",
            max_results=5,
            order="relevance",
            video_duration="any",
            main_topic=None
        )


@pytest.mark.asyncio
async def test_export_csv_success(client: AsyncClient, session):
    from api.src.youtube_research.models import ResearchProject, YouTubeChannel, YouTubeVideo, VideoScore
    
    # 1. Manually insert mock data into SQLite test database
    project = ResearchProject(
        id=uuid.uuid4(),
        name="Test Export Project",
        market="VN",
        language="vi"
    )
    session.add(project)
    
    channel = YouTubeChannel(
        id="UCmock_channel_id",
        project_id=project.id,
        title="Mock Channel",
        url="https://youtube.com/channel/UCmock_channel_id",
        subscriber_count=1000
    )
    session.add(channel)
    
    video = YouTubeVideo(
        id="mock_video_id",
        channel_id=channel.id,
        project_id=project.id,
        title="Tiếng Việt Có Dấu",
        url="https://youtube.com/watch?v=mock_video_id",
        view_count=5000,
        published_at="2026-05-25T12:00:00Z"
    )
    session.add(video)
    
    score = VideoScore(
        video_id=video.id,
        performance_score=80.0,
        opportunity_score=85.5,
        vph=25.0
    )
    session.add(score)
    
    await session.commit()
    
    # 2. Call the CSV export endpoint
    response = await client.get(f"/api/v1/youtube-research/projects/{project.id}/export/csv")
    
    assert response.status_code == 200
    assert "text/csv" in response.headers["content-type"]
    assert "Content-Disposition" in response.headers
    
    content = response.content.decode("utf-8-sig") # Decode with signature (BOM)
    assert "Tiếng Việt Có Dấu" in content
    assert "Mock Channel" in content
    assert "opportunity_score" not in content.lower() # Verify column names are translated
    assert "Opportunity Score" in content

