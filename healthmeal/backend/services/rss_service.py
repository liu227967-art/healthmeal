import feedparser

HEALTH_RSS_FEEDS = [
    {"name": "NutritionFacts.org", "url": "https://nutritionfacts.org/feed/", "lang": "en"},
    {"name": "NutritionFacts视频", "url": "https://nutritionfacts.org/feed/?post_type=video", "lang": "en"},
]


def parse_rss_feed(url: str, limit: int = 10) -> list[dict]:
    """
    解析 RSS feed，返回文章列表。
    每个条目：{"title": str, "url": str, "summary": str, "published_at": str}
    """
    feed = feedparser.parse(url)
    results = []
    for entry in feed.entries[:limit]:
        published = ""
        if hasattr(entry, "published"):
            try:
                from email.utils import parsedate_to_datetime
                dt = parsedate_to_datetime(entry.published)
                published = dt.strftime("%Y-%m-%d")
            except Exception:
                published = entry.published[:10] if len(entry.published) >= 10 else ""
        results.append({
            "title": getattr(entry, "title", ""),
            "url": getattr(entry, "link", ""),
            "summary": getattr(entry, "summary", ""),
            "published_at": published,
        })
    return results
