import pytest
import json
from unittest.mock import AsyncMock, MagicMock, patch
from api.src.youtube_research.services.ai_analyzer import analyze_video_with_ai

@pytest.mark.asyncio
async def test_analyze_video_with_ai_success():
    expected_response_json = {
        "topic_summary": "AI Docu",
        "viewer_insight": "Viewer insight info",
        "title_analysis": "Title analysis info",
        "thumbnail_analysis": "Thumbnail analysis info",
        "reason_for_success": "Core reason",
        "remake_advice": "Do X, Y, Z",
        "suggested_title": "Title 1, Title 2, Title 3",
        "suggested_thumbnail_text": "Click here",
        "suggested_outline": "Intro -> Body -> Outro",
        "suggested_prompt": "Write script using outline...",
        "conclusion": "Nên làm"
    }
    
    # Mock return value of model.generate_content_async
    mock_res = MagicMock()
    mock_res.text = json.dumps(expected_response_json)
    
    # Mock GenerativeModel
    mock_model_instance = MagicMock()
    mock_model_instance.generate_content_async = AsyncMock(return_value=mock_res)
    
    with patch("google.generativeai.GenerativeModel", return_value=mock_model_instance) as mock_model_class, \
         patch("google.generativeai.configure") as mock_configure:
         
        results = await analyze_video_with_ai(
            api_key="mock_gemini_key",
            model_name="gemini-1.5-flash",
            video={"title": "Test Video", "description": "Test Desc", "view_count": 1000, "like_count": 10},
            channel={"title": "Test Channel", "subscriber_count": 500},
            scores={"performance_score": 80.0, "opportunity_score": 75.0},
            market="US",
            language="en",
            main_topic="psychology"
        )
        
        mock_configure.assert_called_once_with(api_key="mock_gemini_key")
        mock_model_class.assert_called_once_with("gemini-1.5-flash")
        
        assert results["conclusion"] == "Nên làm"
        assert results["suggested_thumbnail_text"] == "Click here"
        assert results["topic_summary"] == "AI Docu"
        assert results["raw_output"] == json.dumps(expected_response_json)
