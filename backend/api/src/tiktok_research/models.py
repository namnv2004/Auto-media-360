import uuid
from sqlalchemy import Column, String, Text, ForeignKey, DateTime
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.sql import func
from sqlalchemy.orm import relationship
from api.core.database import Base

class TikTokResearchProject(Base):
    __tablename__ = "tiktok_research_projects"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    name = Column(String(255), nullable=False) # e.g. "TikTok Research: AI (VN)"
    keyword = Column(String(255), nullable=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now(), server_default=func.now())

    trends = relationship("TikTokTrendResult", back_populates="project", cascade="all, delete-orphan")


class TikTokTrendResult(Base):
    __tablename__ = "tiktok_trend_results"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    project_id = Column(UUID(as_uuid=True), ForeignKey("tiktok_research_projects.id", ondelete="CASCADE"), nullable=False)
    title = Column(String(255), nullable=False)
    views = Column(String(50), nullable=True) # e.g. "2.5M"
    likes = Column(String(50), nullable=True) # e.g. "340k"
    comments = Column(String(50), nullable=True) # e.g. "12k"
    engagement = Column(String(50), nullable=True) # e.g. "14.1%"
    age_group = Column(String(100), nullable=True) # e.g. "18-24 tuổi (65%)"
    
    script_hook = Column(Text, nullable=True)
    script_body = Column(Text, nullable=True)
    script_cta = Column(Text, nullable=True)
    hashtags = Column(Text, nullable=True)
    music = Column(String(255), nullable=True)
    
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    project = relationship("TikTokResearchProject", back_populates="trends")
