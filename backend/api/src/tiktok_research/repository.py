import uuid
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, delete
from typing import List, Optional
from api.src.tiktok_research.models import TikTokResearchProject, TikTokTrendResult

async def create_project(db: AsyncSession, keyword: str, market: str) -> TikTokResearchProject:
    project_name = f"TikTok Research: {keyword} ({market})"
    project = TikTokResearchProject(
        id=uuid.uuid4(),
        name=project_name,
        keyword=keyword
    )
    db.add(project)
    await db.commit()
    await db.refresh(project)
    return project

async def list_projects(db: AsyncSession) -> List[TikTokResearchProject]:
    result = await db.execute(
        select(TikTokResearchProject).order_by(TikTokResearchProject.created_at.desc())
    )
    return list(result.scalars().all())

async def get_project(db: AsyncSession, project_id: uuid.UUID) -> Optional[TikTokResearchProject]:
    result = await db.execute(
        select(TikTokResearchProject).where(TikTokResearchProject.id == project_id)
    )
    return result.scalar_one_or_none()

async def get_project_results(db: AsyncSession, project_id: uuid.UUID) -> List[TikTokTrendResult]:
    result = await db.execute(
        select(TikTokTrendResult)
        .where(TikTokTrendResult.project_id == project_id)
        .order_by(TikTokTrendResult.created_at.asc())
    )
    return list(result.scalars().all())

async def delete_project(db: AsyncSession, project_id: uuid.UUID) -> bool:
    project = await get_project(db, project_id)
    if not project:
        return False
    await db.execute(
        delete(TikTokResearchProject).where(TikTokResearchProject.id == project_id)
    )
    await db.commit()
    return True

async def save_trend_result(db: AsyncSession, project_id: uuid.UUID, data: dict) -> TikTokTrendResult:
    trend = TikTokTrendResult(
        id=uuid.uuid4(),
        project_id=project_id,
        title=data["title"],
        views=data.get("views"),
        likes=data.get("likes"),
        comments=data.get("comments"),
        engagement=data.get("engagement"),
        age_group=data.get("age_group"),
        script_hook=data.get("script_hook"),
        script_body=data.get("script_body"),
        script_cta=data.get("script_cta"),
        hashtags=data.get("hashtags"),
        music=data.get("music")
    )
    db.add(trend)
    await db.commit()
    await db.refresh(trend)
    return trend
