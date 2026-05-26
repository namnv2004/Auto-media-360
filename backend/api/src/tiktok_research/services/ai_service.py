import json
import google.generativeai as genai
from typing import Dict, Any, List
from api.core.logging import get_logger

logger = get_logger(__name__)

def build_tiktok_prompt(keyword: str, market: str, language: str) -> str:
    return f"""
Bạn là chuyên gia sáng tạo nội dung và nhà phân tích xu hướng TikTok hàng đầu.
Hãy nghiên cứu từ khóa "{keyword}" trong thị trường "{market}" (ngôn ngữ: "{language}").
Dựa trên từ khóa này, hãy đề xuất 3 xu hướng video ngắn (TikTok News/Trends) đang cực kỳ thịnh hành hoặc có tiềm năng triệu view rất cao.

Mỗi xu hướng phải đi kèm các chỉ số thống kê giả lập thực tế và kịch bản chi tiết 3 phần: Hook (3s), Body (30s), CTA (5s), nhạc nền đề xuất, và hashtags.

Yêu cầu định dạng đầu ra phải là một JSON array chứa chính xác 3 đối tượng có cấu trúc như sau:
[
  {{
    "title": "Tiêu đề xu hướng (Hấp dẫn, đúng chủ đề)",
    "views": "Lượt xem (ví dụ: '2.5M', '1.2M')",
    "likes": "Lượt thích (ví dụ: '340k', '180k')",
    "comments": "Lượt bình luận (ví dụ: '12k', '8k')",
    "engagement": "Tỷ lệ tương tác % (ví dụ: '14.1%')",
    "age_group": "Độ tuổi người xem chủ đạo (ví dụ: '18-24 tuổi (65%)')",
    "script_hook": "Câu kịch bản 3 giây đầu tiên gây ấn tượng mạnh (Hook)",
    "script_body": "Nội dung chính chia sẻ giá trị hoặc kịch tính trong 30 giây (Body)",
    "script_cta": "Câu kêu gọi hành động tương tác hoặc follow trong 5 giây cuối (CTA)",
    "hashtags": "Dãy hashtags phù hợp cách nhau bởi dấu cách, bắt đầu bằng dấu # (ví dụ: '#tiktoknews #ai #productivity')",
    "music": "Tên bản nhạc trending đề xuất kèm số lượng video sử dụng (ví dụ: 'Chill Lofi Beats - Trending Sound (850k videos)')"
  }}
]

Lưu ý: Tất cả kịch bản và tiêu đề phải được viết bằng ngôn ngữ tương ứng với "{language}" (Ví dụ: Tiếng Việt nếu ngôn ngữ là "vi" hoặc "Tiếng Việt", Tiếng Anh nếu ngôn ngữ là "en" hoặc "Tiếng Anh").
"""

async def generate_tiktok_trends(api_key: str, model_name: str, keyword: str, market: str, language: str) -> List[Dict[str, Any]]:
    if not api_key:
        # Fallback list if key is missing
        return [
            {
                "title": f"Cách ứng dụng {keyword} đột phá năng suất làm việc gấp 10 lần",
                "views": "2.5M",
                "likes": "340k",
                "comments": "12k",
                "engagement": "14.1%",
                "age_group": "18-24 tuổi (65%)",
                "script_hook": f"Đừng bao giờ làm việc chăm chỉ nữa! Đây là cách giúp bạn làm việc nhàn hơn gấp 10 lần nhờ ứng dụng {keyword} mới này.",
                "script_body": f"Bước 1: Truy cập ngay vào công cụ liên quan đến {keyword}. Bước 2: Dùng câu lệnh này để bắt AI tự động sắp xếp lịch trình và viết email báo cáo. Bước 3: Xuất kết quả và tối ưu hóa trong vòng 3 phút thay vì 3 tiếng ngồi gõ tay như trước.",
                "script_cta": "Hãy thả tim và comment 'Tài liệu' phía dưới, mình sẽ gửi tặng bạn bộ câu lệnh tối ưu hoàn toàn miễn phí nhé!",
                "hashtags": f"#tiktoknews #ai #productivity #{keyword.lower().replace(' ', '')} #tips #worksmart",
                "music": "Chill Lofi Beats - Trending Sound (850k videos)"
            },
            {
                "title": f"Sai lầm nghiêm trọng khi mới bắt đầu với {keyword}",
                "views": "1.2M",
                "likes": "180k",
                "comments": "8k",
                "engagement": "15.6%",
                "age_group": "25-34 tuổi (52%)",
                "script_hook": "90% mọi người đang sử dụng công cụ này sai cách và đây là lý do tại sao bạn không đạt được kết quả như ý.",
                "script_body": "Đầu tiên, bạn thường bỏ qua bước định hình vai trò cho AI. Thứ hai, bạn viết câu lệnh quá chung chung. Hãy nhớ nguyên tắc: Càng chi tiết, AI trả lời càng chính xác.",
                "script_cta": "Follow kênh của mình để không bỏ lỡ các mẹo công nghệ cực hay mỗi ngày!",
                "hashtags": f"#tutorials #warning #{keyword.lower().replace(' ', '')} #hacks",
                "music": "Suspense Cinematic Sound - Background Hits"
            },
            {
                "title": f"Xu hướng tương lai: Khi {keyword} thay đổi toàn bộ thị trường",
                "views": "890k",
                "likes": "95k",
                "comments": "5k",
                "engagement": "11.2%",
                "age_group": "18-35 tuổi (72%)",
                "script_hook": "Thế giới đang thay đổi chóng mặt và nếu bạn không cập nhật xu hướng này ngay hôm nay, bạn sẽ bị bỏ lại phía sau vào năm sau!",
                "script_body": f"Các tập đoàn lớn đang đầu tư hàng tỷ USD vào {keyword}. Kỹ năng này sẽ trở thành tiêu chuẩn bắt buộc cho mọi nhân sự văn phòng thế hệ mới.",
                "script_cta": "Bạn nghĩ sao về xu hướng này? Comment suy nghĩ của bạn ở bên dưới để cùng thảo luận nhé!",
                "hashtags": f"#futuretrends #technology #{keyword.lower().replace(' ', '')} #economics",
                "music": "Epic Inspiring Orchestral - Modern Sound"
            }
        ]

    try:
        genai.configure(api_key=api_key)
        model_to_use = model_name if model_name else "gemini-1.5-flash"
        model = genai.GenerativeModel(model_to_use)
        
        prompt = build_tiktok_prompt(keyword, market, language)
        response = await model.generate_content_async(
            prompt,
            generation_config=genai.GenerationConfig(
                response_mime_type="application/json",
                temperature=0.7,
            )
        )
        
        content = response.text.strip()
        data = json.loads(content)
        if isinstance(data, list):
            return data
        return []
    except Exception as e:
        logger.error(f"TikTok Gemini Trend generation failed: {str(e)}")
        # Return fallback on error
        return [
            {
                "title": f"TikTok Trend: Mẹo sử dụng {keyword} hiệu quả",
                "views": "1.0M",
                "likes": "120k",
                "comments": "4k",
                "engagement": "12.0%",
                "age_group": "18-24 tuổi (60%)",
                "script_hook": f"Đây là cách sử dụng {keyword} hiệu quả nhất mà chưa ai nói cho bạn biết.",
                "script_body": "Đầu tiên hãy truy cập trang chủ, thiết lập profile và bắt đầu tạo chiến dịch tối ưu.",
                "script_cta": "Bấm tim và lưu lại video này để xem lại sau nhé!",
                "hashtags": f"#tiktoknews #trending #{keyword.lower().replace(' ', '')}",
                "music": "Upbeat Corporate Trend - (1.2M videos)"
            }
        ]
