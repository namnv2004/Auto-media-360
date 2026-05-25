from pydantic import BaseModel
from typing import Optional
import uuid

class RewriteRequest(BaseModel):
    source_url: str

class RewriteResponse(BaseModel):
    job_id: uuid.UUID
    message: str
    status: str

class MixVideoRequest(BaseModel):
    script_id: uuid.UUID

class MixVideoResponse(BaseModel):
    job_id: uuid.UUID
    message: str
    status: str
