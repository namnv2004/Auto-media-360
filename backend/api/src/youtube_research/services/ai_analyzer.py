import json
import google.generativeai as genai
from typing import Dict, Any, List
from api.core.logging import get_logger

logger = get_logger(__name__)

def build_video_analysis_prompt(video: Dict[str, Any], channel: Dict[str, Any], scores: Dict[str, Any], market: str, language: str, main_topic: str) -> str:
    return f"""
Bạn là chuyên gia Content Strategy và AI Video Production trên YouTube.
Hãy phân tích video đối thủ cực kỳ chi tiết dựa trên dữ liệu cung cấp. Đừng viết chung chung, hãy đi sâu vào TẠI SAO video này thành công và NGƯỜI DÙNG CẦN LÀM GÌ để vượt qua nó.

THỊ TRƯỜNG: {market}
NGÔN NGỮ: {language}
CHỦ ĐỀ KÊNH NGƯỜI DÙNG: {main_topic}

DỮ LIỆU KÊNH & VIDEO:
- Kênh: {channel.get("title", "")} ({channel.get("subscriber_count", 0)} subs)
- Video: {video.get("title", "")}
- Mô tả: {video.get("description", "")[:1000]}
- View: {video.get("view_count", 0)} | Like: {video.get("like_count", 0)}

ĐIỂM HỆ THỐNG (Tham khảo):
- Performance: {scores.get("performance_score", 0)}
- Opportunity: {scores.get("opportunity_score", 0)}

Hãy trả về JSON với các nội dung sâu sắc sau:
{{
  "topic_summary": "Tóm tắt ngắn gọn chủ đề và định dạng video (ví dụ: phim tài liệu AI, video listicle, kể chuyện...) ",
  "viewer_insight": "Tại sao khán giả lại xem video này? Họ tìm thấy giá trị gì? (Nỗi sợ, sự tò mò, kiến thức...)",
  "title_analysis": "Phân tích cấu trúc tiêu đề: Có dùng keyword ngách không? Có gây tò mò (clickbait sạch) không?",
  "thumbnail_analysis": "Phân tích yếu tố thị giác qua mô tả tiêu đề: Màu sắc, nhân vật, văn bản trên ảnh.",
  "reason_for_success": "Yếu tố cốt lõi tạo nên triệu view (Ví dụ: Nhịp độ nhanh, kịch bản gây cấn, chủ đề đang trend...)",
  "remake_advice": "Lời khuyên thực tế để làm lại: Cần cải thiện gì? Góc nhìn mới là gì?",
  "suggested_title": "3 gợi ý tiêu đề tối ưu hơn, hấp dẫn hơn cho người dùng.",
  "suggested_thumbnail_text": "Text ngắn gọn, kích thích click nhất để đưa lên thumbnail.",
  "suggested_outline": "Cấu trúc kịch bản 3 hồi gợi ý để người dùng bắt đầu sản xuất.",
  "suggested_prompt": "Prompt AI (ChatGPT/Claude) để viết kịch bản chi tiết dựa trên format này.",
  "conclusion": "Nên làm / Cân nhắc / Không ưu tiên (Kèm lý do ngắn)"
}}
"""


async def analyze_video_with_ai(api_key: str, model_name: str, video: Dict[str, Any], channel: Dict[str, Any], scores: Dict[str, Any], market: str, language: str, main_topic: str) -> Dict[str, Any]:
    if not api_key:
        return {
            "topic_summary": "",
            "viewer_insight": "",
            "title_analysis": "",
            "thumbnail_analysis": "",
            "reason_for_success": "",
            "remake_advice": "",
            "suggested_title": "",
            "suggested_thumbnail_text": "",
            "suggested_outline": "",
            "suggested_prompt": "",
            "conclusion": "Chưa phân tích AI vì thiếu GEMINI_API_KEY",
            "raw_output": "",
        }

    try:
        genai.configure(api_key=api_key)
        
        # Default fallback to flash if configured model doesn't work or is standard gemini-1.5-flash
        model_to_use = model_name if model_name else "gemini-1.5-flash"
        model = genai.GenerativeModel(model_to_use)
        
        prompt = build_video_analysis_prompt(video, channel, scores, market, language, main_topic)
        
        response = await model.generate_content_async(
            prompt,
            generation_config=genai.GenerationConfig(
                response_mime_type="application/json",
                temperature=0.4,
            )
        )

        content = response.text.strip()
        data = json.loads(content)
        data["raw_output"] = content
        return data

    except Exception as e:
        logger.error(f"Gemini Analysis failed: {str(e)}")
        return {
            "topic_summary": "",
            "viewer_insight": "",
            "title_analysis": "",
            "thumbnail_analysis": "",
            "reason_for_success": "",
            "remake_advice": "",
            "suggested_title": "",
            "suggested_thumbnail_text": "",
            "suggested_outline": "",
            "suggested_prompt": "",
            "conclusion": f"Lỗi AI: {str(e)}",
            "raw_output": str(e),
        }


async def suggest_competitor_search_queries(api_key: str, model_name: str, channel_data: Dict[str, Any], target_language: str = "English") -> List[str]:
    """Analyzes a channel and suggests search keywords to find similar format channels."""
    if not api_key:
        return []

    prompt = f"""
Phân tích kênh YouTube sau và xác định:
1. Chủ đề cốt lõi (Niche).
2. Định dạng nội dung (Content Format).
3. Phong cách thể hiện (Vibe/Style).

Dựa trên phân tích đó, hãy gợi ý 5-7 từ khóa tìm kiếm (SEARCH QUERIES) hiệu quả nhất để tìm các kênh KHÁC có CÙNG PHONG CÁCH VÀ ĐỊNH DẠNG này. 
CHÚ Ý: Chỉ sử dụng ngôn ngữ '{target_language}' và một ít tiếng Anh chuyên ngành. Ưu tiên các cụm từ mà người bản địa {target_language} thường dùng để tìm kiếm nội dung này.

Kênh tham chiếu: {channel_data.get("title", "")}
Mô tả: {channel_data.get("description", "")[:800]}

Trả về JSON array các string.
"""

    try:
        genai.configure(api_key=api_key)
        model_to_use = model_name if model_name else "gemini-1.5-flash"
        model = genai.GenerativeModel(model_to_use)
        
        response = await model.generate_content_async(
            prompt,
            generation_config=genai.GenerationConfig(
                response_mime_type="application/json",
                temperature=0.4,
            )
        )
        
        keywords = json.loads(response.text.strip())
        if isinstance(keywords, list):
            return keywords
        return []
    except Exception as e:
        logger.error(f"Gemini keyword suggestion failed: {str(e)}")
        return []
