import feedparser

HEALTH_RSS_FEEDS = [
    {"name": "PubMed Nutrition", "url": "https://pubmed.ncbi.nlm.nih.gov/rss/search/?term=nutrition+diet&format=rss"},
    {"name": "PubMed Anti-inflammatory", "url": "https://pubmed.ncbi.nlm.nih.gov/rss/search/?term=anti-inflammatory+food&format=rss"},
    {"name": "Harvard Health", "url": "https://www.health.harvard.edu/blog/feed"},
    {"name": "Nutrition.gov", "url": "https://www.nutrition.gov/rss.xml"},
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
