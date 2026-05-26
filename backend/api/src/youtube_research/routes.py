import uuid
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from typing import List

from api.core.database import get_session
from api.src.youtube_research.schemas import YouTubeResearchRequest, YouTubeResearchResponse, ProjectResponse, VideoResultSchema
from api.src.youtube_research.repository import create_project, list_projects, get_project, delete_project, fetch_video_table
from api.src.youtube_research.tasks import run_youtube_research_task

router = APIRouter(tags=["YouTube Research"])

@router.post("/crawl", response_model=YouTubeResearchResponse, status_code=status.HTTP_201_CREATED)
async def crawl_youtube_market(request: YouTubeResearchRequest, db: AsyncSession = Depends(get_session)):
    """
    Creates a new research project and triggers the background Celery task
    to search YouTube, score videos, and perform AI Analysis on top opportunity.
    """
    # Use keyword as the project name
    project_name = f"Research: {request.keyword} ({request.market})"
    
    # 1. Save project metadata to PostgreSQL
    project = await create_project(
        db=db,
        name=project_name,
        market=request.market,
        language=request.language,
        main_topic=request.main_topic
    )
    
    # 2. Dispatch the background Celery task
    task = run_youtube_research_task.delay(
        project_id_str=str(project.id),
        keyword=request.keyword,
        market=request.market,
        language=request.language,
        max_results=request.max_results,
        order=request.order,
        video_duration=request.video_duration,
        main_topic=request.main_topic,
        gemini_api_key=request.gemini_api_key,
        youtube_api_key=request.youtube_api_key
    )
    
    return YouTubeResearchResponse(
        project_id=project.id,
        job_id=task.id,
        status="pending",
        message="YouTube Research task has been successfully queued."
    )


@router.get("/projects", response_model=List[ProjectResponse])
async def get_all_projects(db: AsyncSession = Depends(get_session)):
    """
    Returns a list of all YouTube research projects.
    """
    projects = await list_projects(db)
    return projects


@router.get("/projects/{project_id}/results", response_model=List[VideoResultSchema])
async def get_project_details(project_id: uuid.UUID, db: AsyncSession = Depends(get_session)):
    """
    Returns all channels, videos, scores, and AI analysis for a specific research project.
    """
    project = await get_project(db, project_id)
    if not project:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Research project not found"
        )
        
    results = await fetch_video_table(db, project_id)
    return results


@router.delete("/projects/{project_id}", status_code=status.HTTP_200_OK)
async def remove_project(project_id: uuid.UUID, db: AsyncSession = Depends(get_session)):
    """
    Deletes a research project and all related video statistics, channel data, 
    and AI analyses from the database.
    """
    deleted = await delete_project(db, project_id)
    if not deleted:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Research project not found"
        )
    return {"message": "Project successfully deleted"}


@router.get("/projects/{project_id}/export/csv")
async def export_project_csv(project_id: uuid.UUID, db: AsyncSession = Depends(get_session)):
    """
    Queries video results for a project, formats them into a clean CSV layout 
    using pandas, and streams the file as a downloadable response.
    """
    from fastapi.responses import StreamingResponse
    import io
    import pandas as pd
    
    project = await get_project(db, project_id)
    if not project:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Research project not found"
        )
        
    videos = await fetch_video_table(db, project_id)
    if not videos:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="No crawled data available for this project yet."
        )
        
    # Format data list for dataframe
    data = []
    for v in videos:
        ai_conclusion = v["ai_analysis"]["conclusion"] if v.get("ai_analysis") else "N/A"
        data.append({
            "Video ID": v["id"],
            "Tiêu đề": v["title"],
            "URL Video": v["url"],
            "Kênh": v["channel_title"],
            "Subs Kênh": v["channel_subscribers"],
            "Views": v["view_count"],
            "Likes": v["like_count"],
            "Comments": v["comment_count"],
            "VPH (Views/Hour)": v["vph"],
            "Opportunity Score": v["opportunity_score"],
            "Performance Score": v["performance_score"],
            "Title Score": v["title_score"],
            "Thumbnail Score": v["thumbnail_score"],
            "Remake Score": v["remake_score"],
            "Độ khó sản xuất": v["production_difficulty"],
            "Đánh giá AI": ai_conclusion
        })
        
    df = pd.DataFrame(data)
    
    # Save to a memory stream
    stream = io.StringIO()
    df.to_csv(stream, index=False, encoding="utf-8-sig") # utf-8-sig helper for Vietnamese text in Excel
    response = StreamingResponse(
        iter([stream.getvalue()]),
        media_type="text/csv"
    )
    
    filename = f"youtube_research_{project.name.replace(' ', '_').lower()}.csv"
    response.headers["Content-Disposition"] = f"attachment; filename={filename}"
    return response

