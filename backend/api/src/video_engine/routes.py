from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession
from api.core.database import get_session
from api.src.video_engine.models import VideoJob
from api.src.video_engine.schemas import RewriteRequest, RewriteResponse, MixVideoRequest, MixVideoResponse
from api.src.video_engine.tasks import rewrite_script_task, mix_video_task

router = APIRouter(tags=["Video Engine"])

@router.post("/rewrite-script", response_model=RewriteResponse)
async def rewrite_script(request: RewriteRequest, db: AsyncSession = Depends(get_session)):
    """Rewrite script using AI from a source URL"""
    job = VideoJob(source_url=request.source_url, job_type="rewrite")
    db.add(job)
    await db.commit()
    await db.refresh(job)
    
    rewrite_script_task.delay(str(job.id), request.source_url)
    return RewriteResponse(job_id=job.id, message="AI Script rewrite initiated", status="pending")

@router.post("/mix-video", response_model=MixVideoResponse)
async def mix_video(request: MixVideoRequest, db: AsyncSession = Depends(get_session)):
    """Mix video (AI + Real source) based on an existing script"""
    job = VideoJob(keyword=str(request.script_id), job_type="mix_video")
    db.add(job)
    await db.commit()
    await db.refresh(job)
    
    mix_video_task.delay(str(job.id))
    return MixVideoResponse(job_id=job.id, message="Video mixing initiated", status="pending")
