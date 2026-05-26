import uuid
from sqlalchemy import select, delete
from sqlalchemy.ext.asyncio import AsyncSession
from typing import List, Dict, Any
from api.src.youtube_research.models import ResearchProject, YouTubeChannel, YouTubeVideo, VideoScore, AIAnalysis

async def create_project(db: AsyncSession, name: str, market: str, language: str, main_topic: str) -> ResearchProject:
    project = ResearchProject(
        name=name,
        market=market,
        language=language,
        main_topic=main_topic
    )
    db.add(project)
    await db.commit()
    await db.refresh(project)
    return project


async def list_projects(db: AsyncSession) -> List[ResearchProject]:
    result = await db.execute(select(ResearchProject).order_by(ResearchProject.created_at.desc()))
    return list(result.scalars().all())


async def get_project(db: AsyncSession, project_id: uuid.UUID) -> ResearchProject:
    result = await db.execute(select(ResearchProject).where(ResearchProject.id == project_id))
    return result.scalar_one_or_none()


async def delete_project(db: AsyncSession, project_id: uuid.UUID) -> bool:
    project = await get_project(db, project_id)
    if not project:
        return False
    await db.delete(project)
    await db.commit()
    return True


async def upsert_channel(db: AsyncSession, project_id: uuid.UUID, channel: Dict[str, Any]) -> YouTubeChannel:
    channel_id = channel["id"]
    
    # Check if channel exists
    result = await db.execute(select(YouTubeChannel).where(YouTubeChannel.id == channel_id))
    db_channel = result.scalar_one_or_none()
    
    if db_channel:
        db_channel.title = channel.get("title", db_channel.title)
        db_channel.url = channel.get("url", db_channel.url)
        db_channel.description = channel.get("description", db_channel.description)
        db_channel.subscriber_count = channel.get("subscriber_count", db_channel.subscriber_count)
        db_channel.view_count = channel.get("view_count", db_channel.view_count)
        db_channel.video_count = channel.get("video_count", db_channel.video_count)
        db_channel.country = channel.get("country", db_channel.country)
    else:
        db_channel = YouTubeChannel(
            id=channel_id,
            project_id=project_id,
            title=channel.get("title"),
            url=channel.get("url"),
            description=channel.get("description"),
            subscriber_count=channel.get("subscriber_count", 0),
            view_count=channel.get("view_count", 0),
            video_count=channel.get("video_count", 0),
            country=channel.get("country")
        )
        db.add(db_channel)
        
    await db.commit()
    await db.refresh(db_channel)
    return db_channel


async def upsert_video(db: AsyncSession, project_id: uuid.UUID, video: Dict[str, Any]) -> YouTubeVideo:
    video_id = video["id"]
    
    # Check if video exists
    result = await db.execute(select(YouTubeVideo).where(YouTubeVideo.id == video_id))
    db_video = result.scalar_one_or_none()
    
    if db_video:
        db_video.project_id = project_id
        db_video.title = video.get("title", db_video.title)
        db_video.description = video.get("description", db_video.description)
        db_video.view_count = video.get("view_count", db_video.view_count)
        db_video.like_count = video.get("like_count", db_video.like_count)
        db_video.comment_count = video.get("comment_count", db_video.comment_count)
        db_video.thumbnail_url = video.get("thumbnail_url", db_video.thumbnail_url)
    else:
        db_video = YouTubeVideo(
            id=video_id,
            channel_id=video["channel_id"],
            project_id=project_id,
            title=video.get("title"),
            url=video.get("url"),
            description=video.get("description"),
            published_at=video.get("published_at"),
            duration=video.get("duration"),
            view_count=video.get("view_count", 0),
            like_count=video.get("like_count", 0),
            comment_count=video.get("comment_count", 0),
            thumbnail_url=video.get("thumbnail_url"),
            keyword_source=video.get("keyword_source")
        )
        db.add(db_video)
        
    await db.commit()
    await db.refresh(db_video)
    return db_video


async def upsert_score(db: AsyncSession, video_id: str, scores: Dict[str, Any]) -> VideoScore:
    result = await db.execute(select(VideoScore).where(VideoScore.video_id == video_id))
    db_score = result.scalar_one_or_none()
    
    if db_score:
        db_score.performance_score = scores.get("performance_score", db_score.performance_score)
        db_score.title_score = scores.get("title_score", db_score.title_score)
        db_score.thumbnail_score = scores.get("thumbnail_score", db_score.thumbnail_score)
        db_score.remake_score = scores.get("remake_score", db_score.remake_score)
        db_score.production_difficulty = scores.get("production_difficulty", db_score.production_difficulty)
        db_score.opportunity_score = scores.get("opportunity_score", db_score.opportunity_score)
        db_score.vph = scores.get("vph", db_score.vph)
    else:
        db_score = VideoScore(
            video_id=video_id,
            performance_score=scores.get("performance_score", 0.0),
            title_score=scores.get("title_score", 0.0),
            thumbnail_score=scores.get("thumbnail_score", 0.0),
            remake_score=scores.get("remake_score", 0.0),
            production_difficulty=scores.get("production_difficulty", 0.0),
            opportunity_score=scores.get("opportunity_score", 0.0),
            vph=scores.get("vph", 0.0)
        )
        db.add(db_score)
        
    await db.commit()
    await db.refresh(db_score)
    return db_score


async def upsert_ai_analysis(db: AsyncSession, video_id: str, analysis: Dict[str, Any]) -> AIAnalysis:
    result = await db.execute(select(AIAnalysis).where(AIAnalysis.video_id == video_id))
    db_analysis = result.scalar_one_or_none()
    
    if db_analysis:
        db_analysis.topic_summary = analysis.get("topic_summary", db_analysis.topic_summary)
        db_analysis.viewer_insight = analysis.get("viewer_insight", db_analysis.viewer_insight)
        db_analysis.title_analysis = analysis.get("title_analysis", db_analysis.title_analysis)
        db_analysis.thumbnail_analysis = analysis.get("thumbnail_analysis", db_analysis.thumbnail_analysis)
        db_analysis.reason_for_success = analysis.get("reason_for_success", db_analysis.reason_for_success)
        db_analysis.remake_advice = analysis.get("remake_advice", db_analysis.remake_advice)
        db_analysis.suggested_title = analysis.get("suggested_title", db_analysis.suggested_title)
        db_analysis.suggested_thumbnail_text = analysis.get("suggested_thumbnail_text", db_analysis.suggested_thumbnail_text)
        db_analysis.suggested_outline = analysis.get("suggested_outline", db_analysis.suggested_outline)
        db_analysis.suggested_prompt = analysis.get("suggested_prompt", db_analysis.suggested_prompt)
        db_analysis.conclusion = analysis.get("conclusion", db_analysis.conclusion)
        db_analysis.raw_output = analysis.get("raw_output", db_analysis.raw_output)
    else:
        db_analysis = AIAnalysis(
            video_id=video_id,
            topic_summary=analysis.get("topic_summary"),
            viewer_insight=analysis.get("viewer_insight"),
            title_analysis=analysis.get("title_analysis"),
            thumbnail_analysis=analysis.get("thumbnail_analysis"),
            reason_for_success=analysis.get("reason_for_success"),
            remake_advice=analysis.get("remake_advice"),
            suggested_title=analysis.get("suggested_title"),
            suggested_thumbnail_text=analysis.get("suggested_thumbnail_text"),
            suggested_outline=analysis.get("suggested_outline"),
            suggested_prompt=analysis.get("suggested_prompt"),
            conclusion=analysis.get("conclusion"),
            raw_output=analysis.get("raw_output")
        )
        db.add(db_analysis)
        
    await db.commit()
    await db.refresh(db_analysis)
    return db_analysis


async def fetch_video_table(db: AsyncSession, project_id: uuid.UUID) -> List[Dict[str, Any]]:
    """Joins YouTube videos, channels, scores and AI analysis for a project."""
    query = (
        select(
            YouTubeVideo,
            YouTubeChannel.title.label("channel_title"),
            YouTubeChannel.subscriber_count.label("channel_subscribers"),
            VideoScore.performance_score,
            VideoScore.title_score,
            VideoScore.thumbnail_score,
            VideoScore.remake_score,
            VideoScore.production_difficulty,
            VideoScore.opportunity_score,
            VideoScore.vph,
            AIAnalysis.suggested_title,
            AIAnalysis.suggested_thumbnail_text,
            AIAnalysis.conclusion,
            AIAnalysis.topic_summary,
            AIAnalysis.viewer_insight,
            AIAnalysis.title_analysis,
            AIAnalysis.thumbnail_analysis,
            AIAnalysis.reason_for_success,
            AIAnalysis.remake_advice,
            AIAnalysis.suggested_outline,
            AIAnalysis.suggested_prompt
        )
        .join(YouTubeChannel, YouTubeVideo.channel_id == YouTubeChannel.id)
        .outerjoin(VideoScore, YouTubeVideo.id == VideoScore.video_id)
        .outerjoin(AIAnalysis, YouTubeVideo.id == AIAnalysis.video_id)
        .where(YouTubeVideo.project_id == project_id)
        .order_by(VideoScore.opportunity_score.desc(), YouTubeVideo.view_count.desc())
    )
    
    result = await db.execute(query)
    rows = result.all()
    
    videos_list = []
    for r in rows:
        video_obj = r[0] # The YouTubeVideo instance
        
        # Merge properties into a flat dictionary
        video_dict = {
            "id": video_obj.id,
            "channel_id": video_obj.channel_id,
            "title": video_obj.title,
            "url": video_obj.url,
            "description": video_obj.description,
            "published_at": video_obj.published_at,
            "duration": video_obj.duration,
            "view_count": video_obj.view_count,
            "like_count": video_obj.like_count,
            "comment_count": video_obj.comment_count,
            "thumbnail_url": video_obj.thumbnail_url,
            "keyword_source": video_obj.keyword_source,
            
            "channel_title": r.channel_title,
            "channel_subscribers": r.channel_subscribers,
            
            "performance_score": r.performance_score or 0.0,
            "title_score": r.title_score or 0.0,
            "thumbnail_score": r.thumbnail_score or 0.0,
            "remake_score": r.remake_score or 0.0,
            "production_difficulty": r.production_difficulty or 0.0,
            "opportunity_score": r.opportunity_score or 0.0,
            "vph": r.vph or 0.0,
            
            "ai_analysis": {
                "suggested_title": r.suggested_title,
                "suggested_thumbnail_text": r.suggested_thumbnail_text,
                "conclusion": r.conclusion,
                "topic_summary": r.topic_summary,
                "viewer_insight": r.viewer_insight,
                "title_analysis": r.title_analysis,
                "thumbnail_analysis": r.thumbnail_analysis,
                "reason_for_success": r.reason_for_success,
                "remake_advice": r.remake_advice,
                "suggested_outline": r.suggested_outline,
                "suggested_prompt": r.suggested_prompt
            } if r.conclusion else None
        }
        videos_list.append(video_dict)
        
    return videos_list
