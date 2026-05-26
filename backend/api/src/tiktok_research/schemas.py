from pydantic import BaseModel, ConfigDict
from typing import Optional, List
import uuid
from datetime import datetime

class TikTokResearchRequest(BaseModel):
    keyword: str
    market: Optional[str] = "VN"
    language: Optional[str] = "vi"
    gemini_api_key: Optional[str] = None
    tiktok_api_key: Optional[str] = None

class TikTokResearchResponse(BaseModel):
    project_id: uuid.UUID
    job_id: str
    status: str
    message: str

class TrendResultSchema(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    project_id: uuid.UUID
    title: str
    views: Optional[str] = None
    likes: Optional[str] = None
    comments: Optional[str] = None
    engagement: Optional[str] = None
    age_group: Optional[str] = None
    
    script_hook: Optional[str] = None
    script_body: Optional[str] = None
    script_cta: Optional[str] = None
    hashtags: Optional[str] = None
    music: Optional[str] = None
    
    created_at: datetime

class ProjectResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    name: str
    keyword: str
    created_at: datetime
    updated_at: datetime
