from datetime import datetime, timezone
import re
from typing import Dict, Any

def safe_div(a: float, b: float) -> float:
    try:
        if not b:
            return 0.0
        return a / b
    except Exception:
        return 0.0


def parse_date(date_text: str) -> datetime:
    if not date_text:
        return None
    try:
        return datetime.fromisoformat(date_text.replace("Z", "+00:00"))
    except Exception:
        return None


def calculate_vph(video: Dict[str, Any]) -> float:
    dt = parse_date(video.get("published_at", ""))
    if not dt:
        return 0.0
    
    now = datetime.now(timezone.utc)
    age_hours = max((now - dt).total_seconds() / 3600, 1.0) # Minimum 1 hour
    
    views = int(video.get("view_count", 0) or 0)
    return round(views / age_hours, 2)


def recency_score(published_at: str) -> float:
    dt = parse_date(published_at)
    if not dt:
        return 5.0

    now = datetime.now(timezone.utc)
    age_days = max((now - dt).days, 0)

    if age_days <= 7:
        return 10.0
    if age_days <= 30:
        return 8.0
    if age_days <= 90:
        return 6.0
    if age_days <= 365:
        return 4.0
    return 2.0


def calculate_performance_score(video: Dict[str, Any], channel: Dict[str, Any]) -> float:
    views = int(video.get("view_count", 0) or 0)
    likes = int(video.get("like_count", 0) or 0)
    comments = int(video.get("comment_count", 0) or 0)
    subs = int(channel.get("subscriber_count", 0) or 0)

    # View/Sub ratio is the most important metric for "Opportunity"
    # If a small channel gets many views, it's a huge sign of demand.
    view_sub_ratio = safe_div(views, subs)
    
    # Base view score
    view_score = min(view_sub_ratio * 30, 60.0) # Max 60
    
    # Engagement rates
    like_rate = safe_div(likes, views)
    comment_rate = safe_div(comments, views)
    
    like_score = min(like_rate * 1000, 15.0)
    comment_score = min(comment_rate * 2000, 15.0)
    
    # Recency is critical for trends
    recent_score = recency_score(video.get("published_at", ""))
    
    # Small Channel Bonus: if subs < 50k and views > subs * 5, add bonus
    bonus = 0.0
    if 500 < subs < 50000 and views > subs * 5:
        bonus = 10.0
    elif subs <= 500 and views > 2000: # Very small channel breakthrough
        bonus = 15.0

    return round(view_score + like_score + comment_score + recent_score + bonus, 2)


def calculate_title_score(title: str) -> float:
    if not title:
        return 0.0

    score = 40.0

    curiosity_words = [
        "why", "how", "reason", "secret", "truth", "never", "always",
        "なぜ", "理由", "本当", "秘密", "知らない", "心理",
        "왜", "이유", "진짜", "비密",
        "tại sao", "lý do", "bí mật", "sự thật",
    ]

    emotional_words = [
        "lonely", "silent", "smart", "toxic", "hurt", "success",
        "孤独", "沈黙", "賢い", "傷つく", "成功", "疲れる", "人間関係",
        "cô độc", "im lặng", "thành công", "tổn thương",
    ]

    if any(w.lower() in title.lower() for w in curiosity_words):
        score += 20.0

    if any(w.lower() in title.lower() for w in emotional_words):
        score += 20.0

    if 12 <= len(title) <= 80:
        score += 10.0

    if re.search(r"\d+", title):
        score += 5.0

    if "?" in title or "？" in title:
        score += 5.0

    return min(score, 100.0)


def calculate_thumbnail_score(video: Dict[str, Any]) -> float:
    # MVP check: thumbnail availability
    return 70.0 if video.get("thumbnail_url") else 40.0


def calculate_remake_score(video: Dict[str, Any], market: str = "", main_topic: str = "") -> float:
    title = (video.get("title") or "").lower()
    desc = (video.get("description") or "").lower()

    score = 50.0
    evergreen_terms = [
        "psychology", "human", "behavior", "relationship", "success",
        "心理", "人間", "行動", "人間関係", "深層心理", "成功", "孤独",
        "tâm lý", "hành vi", "quan hệ", "thành công",
    ]

    if any(t.lower() in title or t.lower() in desc for t in evergreen_terms):
        score += 25.0

    if len(video.get("title", "")) > 10:
        score += 10.0

    if market:
        score += 5.0

    if main_topic and main_topic.lower() in (title + " " + desc):
        score += 10.0

    return min(score, 100.0)


def estimate_production_difficulty(video: Dict[str, Any]) -> float:
    title = (video.get("title") or "").lower()
    hard_terms = ["interview", "vlog", "experiment", "travel", "documentary", "インタビュー", "実験", "旅行"]
    if any(t in title for t in hard_terms):
        return 7.0
    return 3.0


def calculate_opportunity_score(performance: float, title: float, thumbnail: float, remake: float, difficulty: float) -> float:
    production_speed_score = max(0.0, 100.0 - difficulty * 10.0)
    score = (
        performance * 0.35
        + title * 0.20
        + thumbnail * 0.15
        + remake * 0.20
        + production_speed_score * 0.10
    )
    return round(score, 2)


def calculate_all_scores(video: Dict[str, Any], channel: Dict[str, Any], market: str = "", main_topic: str = "") -> Dict[str, Any]:
    performance = calculate_performance_score(video, channel)
    title = calculate_title_score(video.get("title", ""))
    thumbnail = calculate_thumbnail_score(video)
    remake = calculate_remake_score(video, market, main_topic)
    difficulty = estimate_production_difficulty(video)
    opportunity = calculate_opportunity_score(performance, title, thumbnail, remake, difficulty)
    vph = calculate_vph(video)

    return {
        "performance_score": performance,
        "title_score": title,
        "thumbnail_score": thumbnail,
        "remake_score": remake,
        "production_difficulty": difficulty,
        "opportunity_score": opportunity,
        "vph": vph,
    }
