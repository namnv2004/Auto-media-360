import uuid
from sqlalchemy import Column, String, Text, ForeignKey, Integer, Float, DateTime, BigInteger
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.sql import func
from sqlalchemy.orm import relationship
from api.core.database import Base

class ResearchProject(Base):
    __tablename__ = "research_projects"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    name = Column(String(255), nullable=False) # e.g. "psychology search"
    market = Column(String(50), nullable=True) # e.g. "US"
    language = Column(String(50), nullable=True) # e.g. "en"
    main_topic = Column(String(255), nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now(), server_default=func.now())

    channels = relationship("YouTubeChannel", back_populates="project", cascade="all, delete-orphan")
    videos = relationship("YouTubeVideo", back_populates="project", cascade="all, delete-orphan")


class YouTubeChannel(Base):
    __tablename__ = "youtube_channels"

    id = Column(String(255), primary_key=True) # YT Channel ID (starts with UC)
    project_id = Column(UUID(as_uuid=True), ForeignKey("research_projects.id", ondelete="CASCADE"), nullable=False)
    title = Column(String(255), nullable=True)
    url = Column(String(1024), nullable=True)
    description = Column(Text, nullable=True)
    subscriber_count = Column(BigInteger, default=0)
    view_count = Column(BigInteger, default=0)
    video_count = Column(Integer, default=0)
    country = Column(String(50), nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now(), server_default=func.now())

    project = relationship("ResearchProject", back_populates="channels")
    videos = relationship("YouTubeVideo", back_populates="channel", cascade="all, delete-orphan")


class YouTubeVideo(Base):
    __tablename__ = "youtube_videos"

    id = Column(String(255), primary_key=True) # YT Video ID
    channel_id = Column(String(255), ForeignKey("youtube_channels.id", ondelete="CASCADE"), nullable=False)
    project_id = Column(UUID(as_uuid=True), ForeignKey("research_projects.id", ondelete="CASCADE"), nullable=False)
    title = Column(String(255), nullable=True)
    url = Column(String(1024), nullable=True)
    description = Column(Text, nullable=True)
    published_at = Column(String(100), nullable=True) # YT ISO-8601 published date
    duration = Column(String(50), nullable=True) # ISO duration like PT4M12S
    view_count = Column(BigInteger, default=0)
    like_count = Column(BigInteger, default=0)
    comment_count = Column(BigInteger, default=0)
    thumbnail_url = Column(String(1024), nullable=True)
    keyword_source = Column(String(255), nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now(), server_default=func.now())

    project = relationship("ResearchProject", back_populates="videos")
    channel = relationship("YouTubeChannel", back_populates="videos")
    
    score = relationship("VideoScore", back_populates="video", uselist=False, cascade="all, delete-orphan")
    ai_analysis = relationship("AIAnalysis", back_populates="video", uselist=False, cascade="all, delete-orphan")


class VideoScore(Base):
    __tablename__ = "video_scores"

    video_id = Column(String(255), ForeignKey("youtube_videos.id", ondelete="CASCADE"), primary_key=True)
    performance_score = Column(Float, default=0.0)
    title_score = Column(Float, default=0.0)
    thumbnail_score = Column(Float, default=0.0)
    remake_score = Column(Float, default=0.0)
    production_difficulty = Column(Float, default=0.0)
    opportunity_score = Column(Float, default=0.0)
    vph = Column(Float, default=0.0)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    video = relationship("YouTubeVideo", back_populates="score")


class AIAnalysis(Base):
    __tablename__ = "ai_analyses"

    video_id = Column(String(255), ForeignKey("youtube_videos.id", ondelete="CASCADE"), primary_key=True)
    topic_summary = Column(Text, nullable=True)
    viewer_insight = Column(Text, nullable=True)
    title_analysis = Column(Text, nullable=True)
    thumbnail_analysis = Column(Text, nullable=True)
    reason_for_success = Column(Text, nullable=True)
    remake_advice = Column(Text, nullable=True)
    suggested_title = Column(Text, nullable=True)
    suggested_thumbnail_text = Column(Text, nullable=True)
    suggested_outline = Column(Text, nullable=True)
    suggested_prompt = Column(Text, nullable=True)
    conclusion = Column(Text, nullable=True)
    raw_output = Column(Text, nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    video = relationship("YouTubeVideo", back_populates="ai_analysis")
