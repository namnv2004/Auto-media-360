import asyncio
import uuid
from typing import Dict, Any
from api.core.celery_app import celery_app
from api.core.config import settings
from api.core.logging import get_logger
from sqlalchemy.ext.asyncio import create_async_engine, async_sessionmaker

# Import services
from api.src.youtube_research.services.youtube_api import search_videos, get_videos, get_channels
from api.src.youtube_research.services.scoring import calculate_all_scores
from api.src.youtube_research.services.ai_analyzer import analyze_video_with_ai
from api.src.youtube_research.repository import upsert_channel, upsert_video, upsert_score, upsert_ai_analysis, get_project

logger = get_logger(__name__)

# Create sessionmaker for background worker tasks
engine = create_async_engine(settings.DATABASE_URL)
SessionLocal = async_sessionmaker(engine, expire_on_commit=False)

async def run_research_workflow(
    project_id: uuid.UUID,
    keyword: str,
    market: str,
    language: str,
    max_results: int,
    order: str,
    video_duration: str,
    main_topic: str,
    gemini_api_key: str = None,
    youtube_api_key: str = None
):
    async with SessionLocal() as db:
        logger.info(f"Starting background research workflow for project: {project_id}")
        
        # Verify project exists
        project = await get_project(db, project_id)
        if not project:
            logger.error(f"Project {project_id} not found in database. Aborting workflow.")
            return {"status": "failed", "error": "Project not found"}
            
        try:
            api_keys = [youtube_api_key] if youtube_api_key else settings.youtube_api_keys
            if not api_keys:
                raise ValueError("No YouTube API Keys configured in YOUTUBE_API_KEY environment variable.")

            # 1. Search videos on YouTube
            logger.info(f"Searching YouTube videos for keyword: '{keyword}'")
            raw_videos = await search_videos(
                api_keys=api_keys,
                keyword=keyword,
                max_results=max_results,
                region_code=market,
                relevance_language=language,
                order=order,
                video_duration=video_duration
            )
            
            if not raw_videos:
                logger.warning(f"No videos found for query: '{keyword}'")
                return {"status": "completed", "videos_found": 0}

            # 2. Get detailed video metrics (views, likes, comments, duration)
            video_ids = [v["id"] for v in raw_videos]
            detailed_videos = await get_videos(api_keys=api_keys, video_ids=video_ids)
            
            # Create mapping for easy merge
            detailed_map = {v["id"]: v for v in detailed_videos}
            
            # 3. Get detailed channel metrics (subs, view count)
            channel_ids = [v["channel_id"] for v in raw_videos]
            detailed_channels = await get_channels(api_keys=api_keys, channel_ids=channel_ids)
            channel_map = {c["id"]: c for c in detailed_channels}

            # 4. Calculate Scores
            scored_videos = []
            for v in raw_videos:
                vid_details = detailed_map.get(v["id"])
                if not vid_details:
                    continue # Skip if couldn't get statistics
                
                chan_details = channel_map.get(v["channel_id"])
                if not chan_details:
                    # Provide minimal channel fallback to calculate basic score
                    chan_details = {
                        "id": v["channel_id"],
                        "title": v["channel_title"],
                        "subscriber_count": 0,
                        "view_count": 0,
                        "video_count": 0
                    }
                    
                # Calculate
                scores = calculate_all_scores(
                    video=vid_details,
                    channel=chan_details,
                    market=market,
                    main_topic=main_topic or ""
                )
                
                # Merge into unified record
                scored_record = {
                    "video": vid_details,
                    "channel": chan_details,
                    "scores": scores
                }
                scored_videos.append(scored_record)

            # Sort by opportunity score descending
            scored_videos.sort(key=lambda x: x["scores"]["opportunity_score"], reverse=True)

            # 5. Save all channels and videos to PostgreSQL
            logger.info("Saving channel and video data to database")
            for record in scored_videos:
                await upsert_channel(db, project_id, record["channel"])
                await upsert_video(db, project_id, record["video"])
                await upsert_score(db, record["video"]["id"], record["scores"])

            # 6. Gemini AI Analysis on the top video
            if scored_videos:
                top_record = scored_videos[0]
                top_video = top_record["video"]
                top_channel = top_record["channel"]
                top_scores = top_record["scores"]
                
                logger.info(f"Top video selected for AI Analysis: {top_video['id']} ('{top_video['title']}')")
                
                # Run Gemini API call
                ai_result = await analyze_video_with_ai(
                    api_key=gemini_api_key or settings.GEMINI_API_KEY,
                    model_name=settings.GEMINI_MODEL,
                    video=top_video,
                    channel=top_channel,
                    scores=top_scores,
                    market=market,
                    language=language,
                    main_topic=main_topic or ""
                )
                
                # Save AI analysis to PostgreSQL
                await upsert_ai_analysis(db, top_video["id"], ai_result)
                
            logger.info(f"Background research workflow successfully completed for project: {project_id}")
            return {"status": "success", "videos_found": len(scored_videos)}
            
        except Exception as e:
            logger.error(f"Error executing YouTube research workflow: {str(e)}")
            return {"status": "failed", "error": str(e)}


@celery_app.task(name="tasks.run_youtube_research")
def run_youtube_research_task(
    project_id_str: str,
    keyword: str,
    market: str,
    language: str,
    max_results: int,
    order: str,
    video_duration: str,
    main_topic: str,
    gemini_api_key: str = None,
    youtube_api_key: str = None
):
    project_id = uuid.UUID(project_id_str)
    
    # Run the async workflow inside Celery's synchronous wrapper
    loop = asyncio.get_event_loop()
    if loop.is_running():
        # This shouldn't happen under celery, but safe fallback
        future = asyncio.ensure_future(
            run_research_workflow(project_id, keyword, market, language, max_results, order, video_duration, main_topic, gemini_api_key, youtube_api_key)
        )
        return loop.run_until_complete(future)
    else:
        return asyncio.run(
            run_research_workflow(project_id, keyword, market, language, max_results, order, video_duration, main_topic, gemini_api_key, youtube_api_key)
        )
