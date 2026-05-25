from pydantic import BaseModel
from typing import Optional
import uuid

class CrawlerRequest(BaseModel):
    keyword: Optional[str] = None
    country: Optional[str] = "VN"
    language: Optional[str] = "vi"
    
class CrawlerResponse(BaseModel):
    job_id: uuid.UUID
    message: str
    status: str
