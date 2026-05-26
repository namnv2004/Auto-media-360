import pytest
from unittest.mock import MagicMock, patch
from api.src.youtube_research.services.youtube_api import search_videos, YouTubeAPIError

@pytest.mark.asyncio
async def test_search_videos_success():
    mock_response = {
        "items": [
            {
                "id": {"videoId": "test_video_123"},
                "snippet": {
                    "channelId": "UCchannel123",
                    "channelTitle": "Test Channel",
                    "title": "Interesting Video Title",
                    "description": "Interesting video description",
                    "publishedAt": "2026-05-25T12:00:00Z",
                    "thumbnails": {
                        "high": {"url": "https://img.youtube.com/test.jpg"}
                    }
                }
            }
        ]
    }
    
    # Patch httpx.AsyncClient.get
    with patch("httpx.AsyncClient.get") as mock_get:
        mock_res = MagicMock()
        mock_res.status_code = 200
        # json() is a synchronous method, so use standard MagicMock
        mock_res.json = MagicMock(return_value=mock_response)
        
        # httpx.AsyncClient.get is async, patching it will make it return an awaitable
        # which yields mock_res.
        mock_get.return_value = mock_res
        
        results = await search_videos(
            api_keys=["key1"],
            keyword="psychology",
            max_results=5
        )
        
        assert len(results) == 1
        video = results[0]
        assert video["id"] == "test_video_123"
        assert video["channel_id"] == "UCchannel123"
        assert video["title"] == "Interesting Video Title"
        assert video["thumbnail_url"] == "https://img.youtube.com/test.jpg"
        assert video["url"] == "https://www.youtube.com/watch?v=test_video_123"


@pytest.mark.asyncio
async def test_youtube_key_rotation_on_quota():
    mock_res_quota = MagicMock()
    mock_res_quota.status_code = 403
    mock_res_quota.text = "quotaExceeded: Quota has been exceeded for this API key"
    
    mock_res_ok = MagicMock()
    mock_res_ok.status_code = 200
    mock_res_ok.json = MagicMock(return_value={
        "items": [
            {
                "id": {"videoId": "success_video"},
                "snippet": {"title": "Success Video"}
            }
        ]
    })
    
    with patch("httpx.AsyncClient.get") as mock_get:
        # side_effect for async functions can yield values sequentially when patched
        mock_get.side_effect = [mock_res_quota, mock_res_ok]
        
        results = await search_videos(
            api_keys=["expired_key", "good_key"],
            keyword="psychology"
        )
        
        assert len(results) == 1
        assert results[0]["id"] == "success_video"
        assert mock_get.call_count == 2
