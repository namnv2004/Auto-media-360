from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession
from api.core.database import get_session
from api.src.video_engine.models import VideoJob
from api.src.crawler.schemas import CrawlerRequest, CrawlerResponse
from api.src.crawler.tasks import crawl_tiktok_task, crawl_vidiq_task, crawl_youtube_task

router = APIRouter(tags=["Crawler"])

@router.post("/tiktok", response_model=CrawlerResponse)
async def crawl_tiktok(request: CrawlerRequest, db: AsyncSession = Depends(get_session)):
    """Crawl real-time news from Tiktok"""
    job = VideoJob(keyword=request.keyword, job_type="tiktok")
    db.add(job)
    await db.commit()
    await db.refresh(job)
    
    crawl_tiktok_task.delay(str(job.id), request.keyword)
    return CrawlerResponse(job_id=job.id, message="Tiktok crawling initiated", status="pending")

@router.post("/vidiq", response_model=CrawlerResponse)
async def crawl_vidiq(request: CrawlerRequest, db: AsyncSession = Depends(get_session)):
    """Crawl Dream 100 via VidIQ"""
    job = VideoJob(keyword=request.keyword, job_type="vidiq")
    db.add(job)
    await db.commit()
    await db.refresh(job)
    
    crawl_vidiq_task.delay(str(job.id), request.keyword, request.country, request.language)
    return CrawlerResponse(job_id=job.id, message="VidIQ crawling initiated", status="pending")

@router.post("/youtube", response_model=CrawlerResponse)
async def crawl_youtube(request: CrawlerRequest, db: AsyncSession = Depends(get_session)):
    """Crawl sources from Youtube"""
    job = VideoJob(keyword=request.keyword, job_type="youtube")
    db.add(job)
    await db.commit()
    await db.refresh(job)
    
    crawl_youtube_task.delay(str(job.id), request.keyword)
    return CrawlerResponse(job_id=job.id, message="Youtube crawling initiated", status="pending")
