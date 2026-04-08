from unittest.mock import patch, MagicMock
from services.rss_service import parse_rss_feed, HEALTH_RSS_FEEDS


def test_parse_rss_returns_list():
    mock_feed = MagicMock()
    mock_feed.entries = [
        MagicMock(
            title="Mediterranean Diet Study",
            link="https://pubmed.example.com/1",
            summary="New study shows benefits of olive oil.",
            published="Mon, 07 Apr 2026 00:00:00 GMT"
        ),
        MagicMock(
            title="Omega-3 and Brain Health",
            link="https://pubmed.example.com/2",
            summary="Fish consumption linked to better cognition.",
            published="Sun, 06 Apr 2026 00:00:00 GMT"
        )
    ]
    with patch("services.rss_service.feedparser.parse", return_value=mock_feed):
        result = parse_rss_feed("https://pubmed.example.com/rss")
    assert isinstance(result, list)
    assert len(result) == 2
    assert result[0]["title"] == "Mediterranean Diet Study"
    assert result[0]["url"] == "https://pubmed.example.com/1"
    assert "summary" in result[0]


def test_health_rss_feeds_not_empty():
    assert len(HEALTH_RSS_FEEDS) > 0
    for feed in HEALTH_RSS_FEEDS:
        assert "name" in feed
        assert "url" in feed
