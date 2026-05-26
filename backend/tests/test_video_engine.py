import pytest
import uuid
from unittest.mock import patch, MagicMock
from httpx import AsyncClient

@pytest.mark.asyncio
async def test_video_engine_crawl_keyword_success(client: AsyncClient):
    payload = {
        "source_type": "keyword",
        "custom_keyword": "artificial intelligence workflow"
    }
    
    mock_task = MagicMock()
    mock_task.id = "mock_celery_video_task_id_789"
    
    with patch("api.src.video_engine.routes.rewrite_script_task.delay", return_value=mock_task) as mock_delay:
        response = await client.post("/api/v1/video/rewrite-script", json=payload)
        
        assert response.status_code == 201
        data = response.json()
        assert "job_id" in data
        assert data["job_id"] is not None
        assert data["status"] == "pending"
        
        # Verify database record was created by fetching list of jobs
        list_response = await client.get("/api/v1/video/jobs")
        assert list_response.status_code == 200
        jobs = list_response.json()
        assert len(jobs) >= 1
        # Check if the job we created is in the list
        job_ids = [j["id"] for j in jobs]
        assert data["job_id"] in job_ids
        
        # Verify celery task was dispatched with correct args
        mock_delay.assert_called_once_with(
            job_id_str=data["job_id"],
            source_type="keyword",
            source_id_str=None,
            custom_keyword="artificial intelligence workflow"
        )


@pytest.mark.asyncio
async def test_video_engine_regenerate_segment_success(client: AsyncClient, session):
    from api.src.video_engine.models import VideoJob, ScriptSegment
    import datetime
    
    job_id = uuid.uuid4()
    job = VideoJob(
        id=job_id,
        keyword="Test Job",
        status="completed",
        job_type="keyword",
        full_script="Hello world",
        created_at=datetime.datetime.now(datetime.timezone.utc)
    )
    session.add(job)
    
    segment_id = uuid.uuid4()
    segment = ScriptSegment(
        id=segment_id,
        job_id=job_id,
        order_index=1,
        text="This is a test segment text.",
        keyword="initial keyword",
        image_url="http://example.com/initial.jpg"
    )
    session.add(segment)
    await session.commit()
    
    # Regenerate request
    payload = {
        "keyword": "new visual search keyword"
    }
    
    response = await client.post(f"/api/v1/video/segments/{segment_id}/regenerate", json=payload)
    
    assert response.status_code == 200
    data = response.json()
    assert data["id"] == str(segment_id)
    assert data["keyword"] == "new visual search keyword"
    assert "unsplash.com" in data["image_url"]
    
    # Fetch details to check db persisted changes
    details_res = await client.get(f"/api/v1/video/jobs/{job_id}")
    assert details_res.status_code == 200
    job_details = details_res.json()
    assert len(job_details["segments"]) == 1
    assert job_details["segments"][0]["keyword"] == "new visual search keyword"
    assert "unsplash.com" in job_details["segments"][0]["image_url"]
