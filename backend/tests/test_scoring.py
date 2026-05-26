from datetime import datetime, timedelta, timezone
from api.src.youtube_research.services.scoring import (
    calculate_vph,
    calculate_performance_score,
    calculate_title_score,
    calculate_opportunity_score,
    calculate_all_scores
)

def test_calculate_vph():
    # Video published 2 hours ago with 100 views -> VPH should be 50.0
    now_utc = datetime.now(timezone.utc)
    published_dt = now_utc - timedelta(hours=2)
    published_str = published_dt.isoformat().replace("+00:00", "Z")
    
    video = {
        "published_at": published_str,
        "view_count": 100
    }
    
    vph = calculate_vph(video)
    assert vph == 50.0


def test_calculate_performance_score_small_channel_bonus():
    # 5000 views, 500 subs -> View/Sub ratio = 10 -> View score = min(10*30, 60) = 60.0
    # Subs = 1000 (which is >500 and <50000), views = 6000 (> subs * 5) -> Small Channel Bonus = 10.0
    # Published 10 days ago (recency score = 8.0)
    now_utc = datetime.now(timezone.utc)
    published_dt = now_utc - timedelta(days=10)
    published_str = published_dt.isoformat().replace("+00:00", "Z")
    
    video = {
        "view_count": 6000,
        "like_count": 60,
        "comment_count": 30,
        "published_at": published_str
    }
    
    channel = {
        "subscriber_count": 1000
    }
    
    score = calculate_performance_score(video, channel)
    
    # view_score = min((6000/1000) * 30, 60.0) = 60.0
    # like_rate = 60/6000 = 0.01 -> like_score = min(0.01 * 1000, 15) = 10.0
    # comment_rate = 30/6000 = 0.005 -> comment_score = min(0.005 * 2000, 15) = 10.0
    # recency = 8.0 (since 10 days is between 7 and 30 days)
    # bonus = 10.0 (since subs=1000 and views=6000 > 5000)
    # Total = 60.0 + 10.0 + 10.0 + 8.0 + 10.0 = 98.0
    assert score == 98.0


def test_calculate_title_score():
    # Title containing curiosity and emotional words
    title = "Why silent people are toxic? The secret truth"
    score = calculate_title_score(title)
    
    # base = 40.0
    # curiosity ("why", "secret", "truth") -> +20.0
    # emotional ("silent", "toxic") -> +20.0
    # length (44 chars is between 12 and 80) -> +10.0
    # question mark "?" -> +5.0
    # Total = 40.0 + 20.0 + 20.0 + 10.0 + 5.0 = 95.0
    assert score == 95.0


def test_calculate_opportunity_score():
    # weights: performance*0.35 + title*0.20 + thumbnail*0.15 + remake*0.20 + production_speed*0.10
    # difficulty = 3 -> production_speed = 100 - 30 = 70.0
    opp = calculate_opportunity_score(
        performance=80.0,
        title=90.0,
        thumbnail=70.0,
        remake=60.0,
        difficulty=3.0
    )
    
    expected = (80.0 * 0.35) + (90.0 * 0.20) + (70.0 * 0.15) + (60.0 * 0.20) + (70.0 * 0.10)
    # 28.0 + 18.0 + 10.5 + 12.0 + 7.0 = 75.5
    assert opp == 75.5
