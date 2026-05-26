import asyncio
import uuid
import json
import httpx
import google.generativeai as genai
from sqlalchemy.ext.asyncio import create_async_engine, async_sessionmaker
from sqlalchemy import select

from api.core.celery_app import celery_app
from api.core.config import settings
from api.core.logging import get_logger
from api.src.video_engine.models import VideoJob, ScriptSegment
from api.src.youtube_research.models import YouTubeVideo
from api.src.tiktok_research.models import TikTokTrendResult

logger = get_logger(__name__)

# Create sessionmaker for background worker tasks
engine = create_async_engine(settings.DATABASE_URL)
SessionLocal = async_sessionmaker(engine, expire_on_commit=False)

def build_script_prompt(source_type: str, source_content: str) -> str:
    return f"""
You are an expert AI Video Producer. 
We need to generate a short-form video script based on the following input (type: {source_type}):
---
{source_content}
---

Your task is to write a cohesive, engaging short-form video script.
Then, break this script down into exactly 5 to 10 sequential sentences/voiceover segments.
For each segment, suggest a highly descriptive, search-engine friendly image search keyword (in English, e.g. "depressed businessman sitting at desk", "bitcoin gold coin close up", "modern robotic arm coding", "beautiful view of green mountains") that matches the visual context of that sentence.

You MUST respond with a valid JSON array containing objects structured exactly like this:
[
  {{
    "text": "The spoken voiceover text for this sentence/segment.",
    "keyword": "A descriptive, specific English keyword for image searching."
  }}
]

Make sure all text fields are written in the same language as the input (e.g. Vietnamese if the input is Vietnamese).
Do not include any other commentary, markdown wrappers, or explanations, only return the raw JSON array.
"""

async def run_rewrite_script_workflow(
    job_id: uuid.UUID,
    source_type: str,
    source_id_str: str | None = None,
    custom_keyword: str | None = None,
    gemini_api_key: str | None = None
):
    async with SessionLocal() as db:
        logger.info(f"Starting background script rewrite workflow for job: {job_id}")
        
        # Verify job exists
        result = await db.execute(select(VideoJob).where(VideoJob.id == job_id))
        job = result.scalar_one_or_none()
        if not job:
            logger.error(f"VideoJob {job_id} not found. Aborting workflow.")
            return {"status": "failed", "error": "Job not found"}
            
        job.status = "rewriting"
        await db.commit()

        source_content = ""
        try:
            # 1. Fetch source content from DB or user parameters
            if source_type == "tiktok" and source_id_str:
                trend_uuid = uuid.UUID(source_id_str)
                tiktok_res = await db.execute(select(TikTokTrendResult).where(TikTokTrendResult.id == trend_uuid))
                trend = tiktok_res.scalar_one_or_none()
                if trend:
                    source_content = (
                        f"TikTok Trend: {trend.title}\n"
                        f"Hook: {trend.script_hook or ''}\n"
                        f"Body: {trend.script_body or ''}\n"
                        f"CTA: {trend.script_cta or ''}\n"
                        f"Hashtags: {trend.hashtags or ''}"
                    )
            elif source_type == "youtube" and source_id_str:
                yt_res = await db.execute(select(YouTubeVideo).where(YouTubeVideo.id == source_id_str))
                video = yt_res.scalar_one_or_none()
                if video:
                    # Let's check if there is an AI analysis
                    from api.src.youtube_research.models import AIAnalysis
                    ai_res = await db.execute(select(AIAnalysis).where(AIAnalysis.video_id == source_id_str))
                    ai_analysis = ai_res.scalar_one_or_none()
                    ai_outline = ai_analysis.suggested_outline if ai_analysis else ""
                    conclusion = ai_analysis.conclusion if ai_analysis else ""
                    
                    source_content = (
                        f"YouTube Video: {video.title}\n"
                        f"Channel: {video.channel_id}\n"
                        f"Description: {video.description or ''}\n"
                        f"AI Outline: {ai_outline}\n"
                        f"AI Conclusion: {conclusion}"
                    )
            elif source_type == "keyword" and custom_keyword:
                source_content = f"Generate a script about this topic/keyword: {custom_keyword}"
            
            if not source_content:
                source_content = f"Topic: {job.keyword or 'AI Productivity tools'}"

            # 2. Call Gemini AI to rewrite and segment
            segments_data = []
            full_script_text = ""

            active_api_key = gemini_api_key or settings.GEMINI_API_KEY
            if active_api_key:
                try:
                    genai.configure(api_key=active_api_key)
                    model_to_use = settings.GEMINI_MODEL if settings.GEMINI_MODEL else "gemini-1.5-flash"
                    model = genai.GenerativeModel(model_to_use)
                    prompt = build_script_prompt(source_type, source_content)
                    
                    response = await model.generate_content_async(
                        prompt,
                        generation_config=genai.GenerationConfig(
                            response_mime_type="application/json",
                            temperature=0.7,
                        )
                    )
                    
                    content = response.text.strip()
                    segments_data = json.loads(content)
                except Exception as ex:
                    logger.error(f"Gemini call failed: {str(ex)}. Using fallback script.")
            
            # Fallback if Gemini failed or key is missing
            if not segments_data:
                kw_str = job.keyword or "AI"
                segments_data = [
                    {"text": f"Bạn đã bao giờ tự hỏi làm sao để làm việc hiệu quả hơn gấp 10 lần với {kw_str} chưa?", "keyword": f"{kw_str} technology concept"},
                    {"text": "Bí quyết chính là ứng dụng các công cụ trí tuệ nhân tạo thế hệ mới.", "keyword": "artificial intelligence robot brain"},
                    {"text": "Đầu tiên, AI giúp bạn xử lý đống email và báo cáo phức tạp chỉ trong 5 giây.", "keyword": "fast computer coding typing"},
                    {"text": "Tiếp theo, nó tự động lên lịch trình tối ưu và phân công công việc thông minh.", "keyword": "calendar planner productivity agenda"},
                    {"text": "Hãy bắt đầu áp dụng ngay hôm nay để giải phóng 80% sức lao động của bạn nhé!", "keyword": "relaxed happy professional worker"}
                ]

            # Reconstruct the full script text from segments
            full_script_text = "\n\n".join([s.get("text", "") for s in segments_data])

            # Update the VideoJob
            job.full_script = full_script_text
            await db.commit()

            # 3. Create ScriptSegments and crawl image URLs
            logger.info(f"Saving {len(segments_data)} script segments and fetching images.")
            for idx, seg in enumerate(segments_data):
                seg_text = seg.get("text", "")
                seg_keyword = seg.get("keyword", "")
                if not seg_keyword:
                    seg_keyword = job.keyword or "generic topic"

                # Generate high quality Unsplash featured URL
                # Replace spaces with commas to help Unsplash fetch relevant categories
                clean_kw = seg_keyword.replace(" ", ",")
                image_url = f"https://images.unsplash.com/featured/800x600/?{clean_kw}&sig={job_id.hex[:4]}_{idx}"

                segment = ScriptSegment(
                    id=uuid.uuid4(),
                    job_id=job_id,
                    order_index=idx + 1,
                    text=seg_text,
                    keyword=seg_keyword,
                    image_url=image_url
                )
                db.add(segment)

            job.status = "completed"
            await db.commit()
            logger.info(f"Successfully completed script rewrite and matching for job: {job_id}")
            return {"status": "success", "segments_count": len(segments_data)}
            
        except Exception as e:
            logger.error(f"Error in video rewrite script workflow: {str(e)}")
            job.status = "failed"
            await db.commit()
            return {"status": "failed", "error": str(e)}


@celery_app.task(name="tasks.rewrite_script")
def rewrite_script_task(
    job_id_str: str,
    source_type: str,
    source_id_str: str | None = None,
    custom_keyword: str | None = None,
    gemini_api_key: str | None = None
):
    job_id = uuid.UUID(job_id_str)
    
    # Run the async workflow in event loop
    loop = asyncio.get_event_loop()
    if loop.is_running():
        future = asyncio.ensure_future(
            run_rewrite_script_workflow(job_id, source_type, source_id_str, custom_keyword, gemini_api_key)
        )
        return loop.run_until_complete(future)
    else:
        return asyncio.run(
            run_rewrite_script_workflow(job_id, source_type, source_id_str, custom_keyword, gemini_api_key)
        )
