import uuid
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, delete
from sqlalchemy.orm import selectinload
from typing import List

from api.core.database import get_session
from api.src.video_engine.models import VideoJob, ScriptSegment
from api.src.video_engine.schemas import (
    RewriteRequest,
    RewriteResponse,
    VideoJobResponse,
    RegenerateSegmentRequest,
    RegenerateSegmentResponse
)
from api.src.video_engine.tasks import rewrite_script_task
from api.src.youtube_research.models import YouTubeVideo
from api.src.tiktok_research.models import TikTokTrendResult

router = APIRouter(tags=["Video Engine"])

@router.post("/rewrite-script", response_model=RewriteResponse, status_code=status.HTTP_201_CREATED)
async def rewrite_script(request: RewriteRequest, db: AsyncSession = Depends(get_session)):
    """
    Creates a new VideoJob and triggers the background Celery task
    to segment and crawl images for the kịch bản.
    """
    keyword = "Unnamed Script"
    source_url = None

    if request.source_type == "tiktok":
        if not request.source_id:
            raise HTTPException(status_code=400, detail="source_id is required for source_type 'tiktok'")
        try:
            trend_uuid = uuid.UUID(request.source_id)
        except ValueError:
            raise HTTPException(status_code=400, detail="Invalid UUID format for tiktok source_id")
        
        # Query the TikTok Trend title
        result = await db.execute(
            select(TikTokTrendResult).where(TikTokTrendResult.id == trend_uuid)
        )
        trend = result.scalar_one_or_none()
        if not trend:
            raise HTTPException(status_code=404, detail="TikTok Trend Result not found")
        keyword = f"TikTok: {trend.title}"
        source_url = f"tiktok-trend://{trend.id}"

    elif request.source_type == "youtube":
        if not request.source_id:
            raise HTTPException(status_code=400, detail="source_id is required for source_type 'youtube'")
        
        # Query the YouTube Video title
        result = await db.execute(
            select(YouTubeVideo).where(YouTubeVideo.id == request.source_id)
        )
        video = result.scalar_one_or_none()
        if not video:
            raise HTTPException(status_code=404, detail="YouTube Video not found")
        keyword = f"YouTube: {video.title}"
        source_url = video.url

    elif request.source_type == "keyword":
        if not request.custom_keyword or not request.custom_keyword.strip():
            raise HTTPException(status_code=400, detail="custom_keyword is required for source_type 'keyword'")
        keyword = request.custom_keyword.strip()
    else:
        raise HTTPException(status_code=400, detail="Invalid source_type. Must be 'tiktok', 'youtube', or 'keyword'")

    # Create the VideoJob
    job = VideoJob(
        id=uuid.uuid4(),
        keyword=keyword,
        source_url=source_url,
        status="pending",
        job_type=request.source_type
    )
    db.add(job)
    await db.commit()
    await db.refresh(job)

    # Dispatch Celery background task
    rewrite_script_task.delay(
        job_id_str=str(job.id),
        source_type=request.source_type,
        source_id_str=request.source_id,
        custom_keyword=request.custom_keyword,
        gemini_api_key=request.gemini_api_key
    )

    return RewriteResponse(
        job_id=job.id,
        message="AI Script rewrite and asset matching task successfully queued.",
        status="pending"
    )


@router.get("/jobs", response_model=List[VideoJobResponse])
async def list_jobs(db: AsyncSession = Depends(get_session)):
    """
    Returns a list of all script & asset matching jobs.
    """
    result = await db.execute(
        select(VideoJob)
        .options(selectinload(VideoJob.segments))
        .order_by(VideoJob.created_at.desc())
    )
    jobs = result.scalars().all()
    # Sort segments for each job
    for j in jobs:
        j.segments = sorted(j.segments, key=lambda s: s.order_index)
    return jobs


@router.get("/jobs/{job_id}", response_model=VideoJobResponse)
async def get_job_details(job_id: uuid.UUID, db: AsyncSession = Depends(get_session)):
    """
    Returns the details of a specific job and its segments.
    """
    result = await db.execute(
        select(VideoJob)
        .where(VideoJob.id == job_id)
        .options(selectinload(VideoJob.segments))
    )
    job = result.scalar_one_or_none()
    if not job:
        raise HTTPException(status_code=404, detail="Video job not found")
    
    # Sort segments by order index
    job.segments = sorted(job.segments, key=lambda s: s.order_index)
    return job


@router.delete("/jobs/{job_id}", status_code=status.HTTP_200_OK)
async def remove_job(job_id: uuid.UUID, db: AsyncSession = Depends(get_session)):
    """
    Deletes a video job and all its segments.
    """
    result = await db.execute(
        select(VideoJob).where(VideoJob.id == job_id)
    )
    job = result.scalar_one_or_none()
    if not job:
        raise HTTPException(status_code=404, detail="Video job not found")
        
    await db.delete(job)
    await db.commit()
    return {"message": "Job successfully deleted"}


@router.post("/segments/{segment_id}/regenerate", response_model=RegenerateSegmentResponse)
async def regenerate_segment_media(
    segment_id: uuid.UUID,
    request: RegenerateSegmentRequest,
    db: AsyncSession = Depends(get_session)
):
    """
    Updates a specific segment's keyword and crawls a new Unsplash image URL.
    """
    result = await db.execute(
        select(ScriptSegment).where(ScriptSegment.id == segment_id)
    )
    segment = result.scalar_one_or_none()
    if not segment:
        raise HTTPException(status_code=404, detail="Script segment not found")

    keyword = request.keyword.strip()
    if not keyword:
        raise HTTPException(status_code=400, detail="Keyword cannot be empty")

    # Fetch/set a new image URL from Unsplash using the search keyword
    # We replace spaces with commas to optimize Unsplash keyword matching
    clean_kw = keyword.replace(" ", ",")
    new_image_url = f"https://images.unsplash.com/featured/800x600/?{clean_kw}&sig={uuid.uuid4().hex[:6]}"

    segment.keyword = keyword
    segment.image_url = new_image_url

    await db.commit()
    await db.refresh(segment)

    return RegenerateSegmentResponse(
        id=segment.id,
        job_id=segment.job_id,
        order_index=segment.order_index,
        text=segment.text,
        keyword=segment.keyword,
        image_url=segment.image_url,
        message="Image successfully regenerated."
    )
