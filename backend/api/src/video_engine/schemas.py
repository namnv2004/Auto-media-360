from pydantic import BaseModel, Field
from typing import Optional, List
import uuid
from datetime import datetime

class RewriteRequest(BaseModel):
    source_type: str = Field(..., description="Source type: 'tiktok', 'youtube', or 'keyword'")
    source_id: Optional[str] = Field(None, description="ID of the selected TikTok Trend (UUID string) or YouTube Video (string)")
    custom_keyword: Optional[str] = Field(None, description="Custom keyword if source_type is 'keyword'")
    gemini_api_key: Optional[str] = Field(None, description="Custom Gemini API Key if configured")

class RewriteResponse(BaseModel):
    job_id: uuid.UUID
    message: str
    status: str

class ScriptSegmentSchema(BaseModel):
    id: uuid.UUID
    job_id: uuid.UUID
    order_index: int
    text: str
    keyword: Optional[str] = None
    image_url: Optional[str] = None

    class Config:
        from_attributes = True

class VideoJobResponse(BaseModel):
    id: uuid.UUID
    keyword: Optional[str] = None
    source_url: Optional[str] = None
    status: str
    job_type: str
    full_script: Optional[str] = None
    created_at: datetime
    updated_at: Optional[datetime] = None
    segments: List[ScriptSegmentSchema] = []

    class Config:
        from_attributes = True

class RegenerateSegmentRequest(BaseModel):
    keyword: str = Field(..., description="New keyword to search for images")

class RegenerateSegmentResponse(BaseModel):
    id: uuid.UUID
    job_id: uuid.UUID
    order_index: int
    text: str
    keyword: str
    image_url: Optional[str] = None
    message: str
