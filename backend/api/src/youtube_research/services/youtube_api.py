import httpx
import re
from typing import List, Dict, Any, Union
from api.core.logging import get_logger

logger = get_logger(__name__)
YOUTUBE_BASE = "https://www.googleapis.com/youtube/v3"

class YouTubeAPIError(Exception):
    pass

async def _get(endpoint: str, params: Dict[str, Any]) -> Dict[str, Any]:
    url = f"{YOUTUBE_BASE}/{endpoint}"
    
    # Read API keys passed down
    api_keys = params.get("api_keys")
    if not api_keys:
        api_keys = [params.get("key")] if params.get("key") else []

    last_error = ""
    async with httpx.AsyncClient(timeout=30.0) as client:
        for key in api_keys:
            if not key:
                continue
            
            current_params = params.copy()
            current_params["key"] = key
            if "api_keys" in current_params:
                del current_params["api_keys"]
                
            try:
                response = await client.get(url, params=current_params)
                if response.status_code == 200:
                    return response.json()
                
                error_msg = response.text
                logger.warning(f"YouTube API Error {response.status_code} for key {key[:10]}...: {error_msg}")
                
                if response.status_code == 403:
                    if "quotaExceeded" in error_msg:
                        logger.warning(f"Quota exceeded for key: {key[:10]}... Switching to next key.")
                        last_error = "Tất cả API Keys đều đã hết hạn mức (Quota Exceeded)."
                        continue
                    else:
                        last_error = f"Lỗi truy cập API (403): {error_msg}"
                        continue
                else:
                    last_error = f"YouTube API error {response.status_code}: {error_msg}"
            except Exception as e:
                logger.error(f"HTTP request failed for key {key[:10]}: {str(e)}")
                last_error = f"HTTP Error: {str(e)}"
                continue
                
    raise YouTubeAPIError(last_error or "Không có API Key hợp lệ hoặc tất cả đều lỗi.")


async def search_channels(api_keys: Union[str, List[str]], keyword: str, max_results: int = 10, region_code: str = "", relevance_language: str = "") -> List[str]:
    """Searches for channels and returns a list of channel IDs."""
    params = {
        "part": "snippet",
        "q": keyword,
        "type": "channel",
        "maxResults": min(max_results, 50),
        "api_keys": [api_keys] if isinstance(api_keys, str) else api_keys,
    }
    if region_code:
        params["regionCode"] = region_code
    if relevance_language:
        params["relevanceLanguage"] = relevance_language

    try:
        data = await _get("search", params)
        items = data.get("items", [])
        return [item.get("id", {}).get("channelId") for item in items if item.get("id", {}).get("channelId")]
    except Exception as e:
        logger.error(f"Failed to search channels: {str(e)}")
        return []


async def search_videos(api_keys: Union[str, List[str]], keyword: str, max_results: int = 10, region_code: str = "", relevance_language: str = "", order: str = "relevance", video_duration: str = "any") -> List[Dict[str, Any]]:
    """Searches for videos using criteria and returns basic snippets."""
    params = {
        "part": "snippet",
        "q": keyword,
        "type": "video",
        "maxResults": min(max_results, 50),
        "api_keys": [api_keys] if isinstance(api_keys, str) else api_keys,
        "order": order,
    }
    if region_code:
        params["regionCode"] = region_code
    if relevance_language:
        params["relevanceLanguage"] = relevance_language
    if video_duration and video_duration != "any":
        params["videoDuration"] = video_duration

    try:
        data = await _get("search", params)
        items = data.get("items", [])
        results = []

        for item in items:
            video_id = item.get("id", {}).get("videoId")
            snippet = item.get("snippet", {})
            if not video_id:
                continue

            thumbnails = snippet.get("thumbnails", {})
            thumb = (
                thumbnails.get("maxres", {})
                or thumbnails.get("high", {})
                or thumbnails.get("medium", {})
                or thumbnails.get("default", {})
            )

            results.append({
                "id": video_id,
                "channel_id": snippet.get("channelId", ""),
                "channel_title": snippet.get("channelTitle", ""),
                "title": snippet.get("title", ""),
                "description": snippet.get("description", ""),
                "published_at": snippet.get("publishedAt", ""),
                "thumbnail_url": thumb.get("url", ""),
                "url": f"https://www.youtube.com/watch?v={video_id}",
                "keyword_source": keyword,
            })
        return results
    except Exception as e:
        logger.error(f"Failed to search videos: {str(e)}")
        raise e


async def get_videos(api_keys: Union[str, List[str]], video_ids: List[str]) -> List[Dict[str, Any]]:
    """Gets detailed statistics and details for list of video IDs in chunks of 50."""
    if not video_ids:
        return []

    output = []
    keys_list = [api_keys] if isinstance(api_keys, str) else api_keys
    
    for i in range(0, len(video_ids), 50):
        chunk = video_ids[i:i+50]
        params = {
            "part": "snippet,statistics,contentDetails",
            "id": ",".join(chunk),
            "api_keys": keys_list,
        }
        try:
            data = await _get("videos", params)
            for item in data.get("items", []):
                snippet = item.get("snippet", {})
                stats = item.get("statistics", {})
                details = item.get("contentDetails", {})
                thumbnails = snippet.get("thumbnails", {})
                thumb = (
                    thumbnails.get("maxres", {})
                    or thumbnails.get("high", {})
                    or thumbnails.get("medium", {})
                    or thumbnails.get("default", {})
                )

                output.append({
                    "id": item.get("id", ""),
                    "channel_id": snippet.get("channelId", ""),
                    "title": snippet.get("title", ""),
                    "description": snippet.get("description", ""),
                    "published_at": snippet.get("publishedAt", ""),
                    "duration": details.get("duration", ""),
                    "view_count": int(stats.get("viewCount", 0)) if stats.get("viewCount") else 0,
                    "like_count": int(stats.get("likeCount", 0)) if stats.get("likeCount") else 0,
                    "comment_count": int(stats.get("commentCount", 0)) if stats.get("commentCount") else 0,
                    "thumbnail_url": thumb.get("url", "") if thumb else "",
                    "url": f"https://www.youtube.com/watch?v={item.get('id', '')}",
                })
        except Exception as e:
            logger.error(f"Failed to fetch videos details: {str(e)}")
            
    return output


async def get_channels(api_keys: Union[str, List[str]], channel_ids: List[str]) -> List[Dict[str, Any]]:
    """Gets detailed statistics for channel IDs in chunks of 50."""
    if not channel_ids:
        return []

    output = []
    unique_ids = list(dict.fromkeys(channel_ids))
    keys_list = [api_keys] if isinstance(api_keys, str) else api_keys

    for i in range(0, len(unique_ids), 50):
        chunk = unique_ids[i:i+50]
        params = {
            "part": "snippet,statistics",
            "id": ",".join(chunk),
            "api_keys": keys_list,
        }
        try:
            data = await _get("channels", params)
            for item in data.get("items", []):
                snippet = item.get("snippet", {})
                stats = item.get("statistics", {})

                output.append({
                    "id": item.get("id", ""),
                    "title": snippet.get("title", ""),
                    "description": snippet.get("description", ""),
                    "country": snippet.get("country", ""),
                    "subscriber_count": int(stats.get("subscriberCount", 0)) if stats.get("subscriberCount") and not stats.get("hiddenSubscriberCount", False) else 0,
                    "view_count": int(stats.get("viewCount", 0)) if stats.get("viewCount") else 0,
                    "video_count": int(stats.get("videoCount", 0)) if stats.get("videoCount") else 0,
                    "url": f"https://www.youtube.com/channel/{item.get('id', '')}",
                })
        except Exception as e:
            logger.error(f"Failed to fetch channel details: {str(e)}")
            
    return output


async def get_channel_id_from_url(api_keys: Union[str, List[str]], url: str) -> str:
    """Extracts channel ID from various YouTube URL formats."""
    # Pattern for Channel ID
    m = re.search(r"youtube\.com/channel/(UC[\w-]+)", url)
    if m:
        return m.group(1)
    
    # Pattern for Handle (@handle)
    m = re.search(r"youtube\.com/@([\w.-]+)", url)
    if m:
        return await get_channel_id_by_handle(api_keys, m.group(1))
    
    # Pattern for Custom URL (c/name or user/name)
    m = re.search(r"youtube\.com/(c|user)/([\w-]+)", url)
    if m:
        return await get_channel_id_by_name(api_keys, m.group(2))
        
    return ""


async def get_channel_id_by_handle(api_keys: Union[str, List[str]], handle: str) -> str:
    """Resolves a handle (e.g. @name) to a channel ID."""
    params = {
        "part": "snippet",
        "q": f"@{handle}",
        "type": "channel",
        "api_keys": [api_keys] if isinstance(api_keys, str) else api_keys,
        "maxResults": 1,
    }
    try:
        data = await _get("search", params)
        items = data.get("items", [])
        if items:
            return items[0].get("id", {}).get("channelId", "")
    except Exception as e:
        logger.error(f"Failed to resolve channel handle @{handle}: {str(e)}")
    return ""


async def get_channel_id_by_name(api_keys: Union[str, List[str]], name: str) -> str:
    """Resolves a channel name to a channel ID via search."""
    params = {
        "part": "snippet",
        "q": name,
        "type": "channel",
        "api_keys": [api_keys] if isinstance(api_keys, str) else api_keys,
        "maxResults": 1,
    }
    try:
        data = await _get("search", params)
        items = data.get("items", [])
        if items:
            return items[0].get("id", {}).get("channelId", "")
    except Exception as e:
        logger.error(f"Failed to resolve channel name {name}: {str(e)}")
    return ""


async def test_api_key(api_key: str) -> bool:
    """Simple check to see if the API key is valid."""
    try:
        url = "https://www.googleapis.com/youtube/v3/videos"
        params = {"part": "id", "id": "Ks-_Mh1QhMc", "key": api_key}
        async with httpx.AsyncClient(timeout=10.0) as client:
            r = await client.get(url, params=params)
            return r.status_code == 200
    except Exception:
        return False
