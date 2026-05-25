import uuid
from sqlalchemy import Column, String, Text, ForeignKey, Integer, DateTime
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.sql import func
from sqlalchemy.orm import relationship
from api.core.database import Base

class VideoJob(Base):
    __tablename__ = "video_jobs"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    keyword = Column(String(255), nullable=True)
    source_url = Column(String(1024), nullable=True)
    status = Column(String(50), default="pending")  # pending, crawling, rewriting, mixing, completed, failed
    job_type = Column(String(50), nullable=False) # tiktok, vidiq, youtube
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())

    segments = relationship("ScriptSegment", back_populates="job", cascade="all, delete-orphan")

class ScriptSegment(Base):
    __tablename__ = "script_segments"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    job_id = Column(UUID(as_uuid=True), ForeignKey("video_jobs.id"), nullable=False)
    order_index = Column(Integer, nullable=False)
    text = Column(Text, nullable=False)
    image_url = Column(String(1024), nullable=True)
    video_url = Column(String(1024), nullable=True)
    
    job = relationship("VideoJob", back_populates="segments")
