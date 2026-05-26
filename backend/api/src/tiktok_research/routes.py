import uuid
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from typing import List

from api.core.database import get_session
from api.src.tiktok_research.schemas import TikTokResearchRequest, TikTokResearchResponse, ProjectResponse, TrendResultSchema
from api.src.tiktok_research.repository import create_project, list_projects, get_project, delete_project, get_project_results
from api.src.tiktok_research.tasks import run_tiktok_research_task

router = APIRouter(tags=["TikTok Research"])

@router.post("/crawl", response_model=TikTokResearchResponse, status_code=status.HTTP_201_CREATED)
async def crawl_tiktok_market(request: TikTokResearchRequest, db: AsyncSession = Depends(get_session)):
    """
    Creates a new TikTok research project and triggers the background Celery task
    to generate trending topic scripts using Gemini AI.
    """
    # 1. Save project metadata to PostgreSQL
    project = await create_project(
        db=db,
        keyword=request.keyword,
        market=request.market
    )
    
    # 2. Dispatch the background Celery task
    task = run_tiktok_research_task.delay(
        project_id_str=str(project.id),
        keyword=request.keyword,
        market=request.market,
        language=request.language,
        gemini_api_key=request.gemini_api_key,
        tiktok_api_key=request.tiktok_api_key
    )
    
    return TikTokResearchResponse(
        project_id=project.id,
        job_id=task.id,
        status="pending",
        message="TikTok Research task has been successfully queued."
    )


@router.get("/projects", response_model=List[ProjectResponse])
async def get_all_projects(db: AsyncSession = Depends(get_session)):
    """
    Returns a list of all TikTok research projects.
    """
    projects = await list_projects(db)
    return projects


@router.get("/projects/{project_id}/results", response_model=List[TrendResultSchema])
async def get_project_details(project_id: uuid.UUID, db: AsyncSession = Depends(get_session)):
    """
    Returns all generated trends and scripts for a specific research project.
    """
    project = await get_project(db, project_id)
    if not project:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Research project not found"
        )
        
    results = await get_project_results(db, project_id)
    return results


@router.delete("/projects/{project_id}", status_code=status.HTTP_200_OK)
async def remove_project(project_id: uuid.UUID, db: AsyncSession = Depends(get_session)):
    """
    Deletes a research project and all related trend results from the database.
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
    Queries trend results for a project, formats them into a clean CSV layout 
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
        
    trends = await get_project_results(db, project_id)
    if not trends:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="No crawled data available for this project yet."
        )
        
    # Format data list for dataframe
    data = []
    for t in trends:
        data.append({
            "Tiêu đề xu hướng": t.title,
            "Views": t.views,
            "Likes": t.likes,
            "Bình luận": t.comments,
            "Tỷ lệ tương tác": t.engagement,
            "Độ tuổi chủ đạo": t.age_group,
            "Kịch bản Hook (3s)": t.script_hook,
            "Kịch bản Body (30s)": t.script_body,
            "Kịch bản CTA (5s)": t.script_cta,
            "Hashtags": t.hashtags,
            "Nhạc đề xuất": t.music
        })
        
    df = pd.DataFrame(data)
    
    # Save to a memory stream
    stream = io.StringIO()
    df.to_csv(stream, index=False, encoding="utf-8-sig") # utf-8-sig helper for Vietnamese text in Excel
    response = StreamingResponse(
        iter([stream.getvalue()]),
        media_type="text/csv"
    )
    
    filename = f"tiktok_research_{project.name.replace(' ', '_').lower()}.csv"
    response.headers["Content-Disposition"] = f"attachment; filename={filename}"
    return response
