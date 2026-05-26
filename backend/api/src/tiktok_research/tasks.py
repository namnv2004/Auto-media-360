import asyncio
import uuid
from api.core.celery_app import celery_app
from api.core.config import settings
from api.core.logging import get_logger
from sqlalchemy.ext.asyncio import create_async_engine, async_sessionmaker

# Import services & repo
from api.src.tiktok_research.services.ai_service import generate_tiktok_trends
from api.src.tiktok_research.repository import save_trend_result, get_project

logger = get_logger(__name__)

# Create sessionmaker for background worker tasks
engine = create_async_engine(settings.DATABASE_URL)
SessionLocal = async_sessionmaker(engine, expire_on_commit=False)

async def run_tiktok_research_workflow(
    project_id: uuid.UUID,
    keyword: str,
    market: str,
    language: str,
    gemini_api_key: str = None,
    tiktok_api_key: str = None
):
    async with SessionLocal() as db:
        logger.info(f"Starting background TikTok research workflow for project: {project_id}")
        
        # Verify project exists
        project = await get_project(db, project_id)
        if not project:
            logger.error(f"TikTok Project {project_id} not found in database. Aborting workflow.")
            return {"status": "failed", "error": "Project not found"}
            
        try:
            # Generate trends using Gemini AI
            logger.info(f"Generating TikTok trends for keyword: '{keyword}' via Gemini AI")
            trends = await generate_tiktok_trends(
                api_key=gemini_api_key or settings.GEMINI_API_KEY,
                model_name=settings.GEMINI_MODEL,
                keyword=keyword,
                market=market,
                language=language
            )
            
            # Save results to PostgreSQL database
            logger.info(f"Saving {len(trends)} TikTok trend results to database")
            for t in trends:
                await save_trend_result(db, project_id, t)
                
            logger.info(f"Background TikTok research workflow successfully completed for project: {project_id}")
            return {"status": "success", "trends_count": len(trends)}
            
        except Exception as e:
            logger.error(f"Error executing TikTok research workflow: {str(e)}")
            return {"status": "failed", "error": str(e)}


@celery_app.task(name="tasks.run_tiktok_research")
def run_tiktok_research_task(
    project_id_str: str,
    keyword: str,
    market: str,
    language: str,
    gemini_api_key: str = None,
    tiktok_api_key: str = None
):
    project_id = uuid.UUID(project_id_str)
    
    # Run the async workflow inside Celery's synchronous wrapper
    loop = asyncio.get_event_loop()
    if loop.is_running():
        future = asyncio.ensure_future(
            run_tiktok_research_workflow(project_id, keyword, market, language, gemini_api_key, tiktok_api_key)
        )
        return loop.run_until_complete(future)
    else:
        return asyncio.run(
            run_tiktok_research_workflow(project_id, keyword, market, language, gemini_api_key, tiktok_api_key)
        )
