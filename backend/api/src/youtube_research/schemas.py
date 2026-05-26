import uuid
from pydantic import BaseModel
from typing import Optional, List, Dict, Any
from datetime import datetime

class YouTubeResearchRequest(BaseModel):
    keyword: str
    market: str = "VN" # VN, US, JP, KR, DE, FR, TH, UK
    language: str = "vi"
    max_results: int = 10
    order: str = "relevance" # relevance, date, viewCount, rating
    video_duration: str = "any" # any, short, medium, long
    main_topic: Optional[str] = None
    gemini_api_key: Optional[str] = None
    youtube_api_key: Optional[str] = None


class YouTubeResearchResponse(BaseModel):
    project_id: uuid.UUID
    job_id: str
    status: str
    message: str


class ProjectResponse(BaseModel):
    id: uuid.UUID
    name: str
    market: Optional[str]
    language: Optional[str]
    main_topic: Optional[str]
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True


class AIAnalysisSchema(BaseModel):
    topic_summary: Optional[str] = None
    viewer_insight: Optional[str] = None
    title_analysis: Optional[str] = None
    thumbnail_analysis: Optional[str] = None
    reason_for_success: Optional[str] = None
    remake_advice: Optional[str] = None
    suggested_title: Optional[str] = None
    suggested_thumbnail_text: Optional[str] = None
    suggested_outline: Optional[str] = None
    suggested_prompt: Optional[str] = None
    conclusion: Optional[str] = None


class VideoResultSchema(BaseModel):
    id: str
    channel_id: str
    title: Optional[str] = None
    url: Optional[str] = None
    description: Optional[str] = None
    published_at: Optional[str] = None
    duration: Optional[str] = None
    view_count: int = 0
    like_count: int = 0
    comment_count: int = 0
    thumbnail_url: Optional[str] = None
    keyword_source: Optional[str] = None
    channel_title: Optional[str] = None
    channel_subscribers: int = 0
    performance_score: float = 0.0
    title_score: float = 0.0
    thumbnail_score: float = 0.0
    remake_score: float = 0.0
    production_difficulty: float = 0.0
    opportunity_score: float = 0.0
    vph: float = 0.0
    ai_analysis: Optional[AIAnalysisSchema] = None
