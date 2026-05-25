import time
from api.core.celery_app import celery_app
from api.core.logging import get_logger

logger = get_logger(__name__)

@celery_app.task(name="tasks.crawl_tiktok")
def crawl_tiktok_task(job_id: str, keyword: str):
    logger.info(f"Started TikTok crawl for job {job_id}")
    time.sleep(2) # Mock crawling process
    logger.info(f"Completed TikTok crawl for job {job_id}")
    return {"status": "success", "keyword": keyword}

@celery_app.task(name="tasks.crawl_vidiq")
def crawl_vidiq_task(job_id: str, keyword: str, country: str, language: str):
    logger.info(f"Started VidIQ crawl for job {job_id}")
    time.sleep(2)
    logger.info(f"Completed VidIQ crawl for job {job_id}")
    return {"status": "success", "keyword": keyword}

@celery_app.task(name="tasks.crawl_youtube")
def crawl_youtube_task(job_id: str, keyword: str):
    logger.info(f"Started Youtube crawl for job {job_id}")
    time.sleep(2)
    logger.info(f"Completed Youtube crawl for job {job_id}")
    return {"status": "success", "keyword": keyword}
