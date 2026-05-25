import time
from api.core.celery_app import celery_app
from api.core.logging import get_logger

logger = get_logger(__name__)

@celery_app.task(name="tasks.rewrite_script")
def rewrite_script_task(job_id: str, source_url: str):
    logger.info(f"Started script rewrite for job {job_id} using source {source_url}")
    time.sleep(2) # Mock LLM rewrite
    logger.info(f"Completed script rewrite for job {job_id}")
    return {"status": "success", "source_url": source_url}

@celery_app.task(name="tasks.mix_video")
def mix_video_task(job_id: str):
    logger.info(f"Started video mixing for job {job_id}")
    time.sleep(3) # Mock video mix
    logger.info(f"Completed video mixing for job {job_id}")
    return {"status": "success", "job_id": job_id}
