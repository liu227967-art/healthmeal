# HealthMeal Phase 4 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 实现健康知识中心，包括 RSS 文章抓取、YouTube/B站视频管理、Claude AI 摘要生成、用户收藏，以及知识内容一键生成餐谱。

**Architecture:** 后端新增 HealthContent 和 Bookmark 数据模型，新增 knowledge 路由处理文章/视频的 CRUD 和 RSS 拉取，Claude 服务层新增摘要生成函数。前端新增「知识库」Tab，展示文章卡片和视频卡片，支持收藏和一键生成餐谱。

**Tech Stack:** FastAPI, SQLAlchemy, feedparser（RSS 解析）, httpx（已安装）, anthropic SDK（已安装）, React Native + Expo, expo-web-browser（视频链接跳转）

---

## 文件结构

```
healthmeal/backend/
├── models/
│   └── knowledge.py                 # HealthContent, Bookmark 模型（新建）
├── schemas/
│   └── knowledge.py                 # 文章/视频/收藏 schema（新建）
├── services/
│   ├── claude_service.py            # 新增 summarize_article 函数（修改）
│   └── rss_service.py               # RSS 拉取与解析（新建）
├── routers/
│   └── knowledge.py                 # /health-content, /bookmarks 路由（新建）
├── tests/
│   ├── test_knowledge.py            # 知识内容 API 测试（新建）
│   └── test_rss_service.py          # RSS 服务测试（新建）
├── models/user.py                   # 新增 bookmarks relationship（修改）
├── models/__init__.py               # 导出新模型（修改）
└── main.py                          # 注册 knowledge 路由（修改）

healthmeal/frontend/
├── app/(tabs)/
│   └── knowledge.tsx                # 知识库页面（新建）
├── services/
│   └── knowledge.ts                 # 知识库 API 调用（新建）
├── i18n/
│   ├── zh.ts                        # 新增 knowledge 字段（修改）
│   └── en.ts                        # 新增 knowledge 字段（修改）
└── app/(tabs)/_layout.tsx           # 新增「知识库」Tab（修改）
```

---

## Task 1: 后端数据模型 — HealthContent & Bookmark

**Files:**
- Create: `healthmeal/backend/models/knowledge.py`
- Modify: `healthmeal/backend/models/__init__.py`
- Modify: `healthmeal/backend/models/user.py`

- [ ] **Step 1: 编写失败测试**

创建 `healthmeal/backend/tests/test_knowledge_models.py`：

```python
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from models.knowledge import HealthContent, Bookmark
from models.user import Base, User
import pytest

TEST_DB = "sqlite:///./test_knowledge_models.db"

@pytest.fixture
def db():
    engine = create_engine(TEST_DB, connect_args={"check_same_thread": False})
    Base.metadata.create_all(bind=engine)
    Session = sessionmaker(bind=engine)
    session = Session()
    yield session
    session.close()
    Base.metadata.drop_all(bind=engine)

def test_create_article(db):
    content = HealthContent(
        type="article",
        title="地中海饮食与心脏健康",
        url="https://pubmed.ncbi.nlm.nih.gov/example",
        source="PubMed",
        summary_zh="地中海饮食能降低心脏病风险30%。",
        summary_en="Mediterranean diet reduces heart disease risk by 30%.",
        tags='["heart","mediterranean","anti-inflammatory"]',
        published_at="2026-04-01"
    )
    db.add(content); db.commit()
    result = db.query(HealthContent).filter_by(type="article").first()
    assert result.title == "地中海饮食与心脏健康"
    assert result.source == "PubMed"

def test_create_video(db):
    content = HealthContent(
        type="video",
        title="如何正确减脂饮食",
        url="https://www.youtube.com/watch?v=example",
        source="YouTube",
        summary_zh="专业营养师讲解减脂饮食要点。",
        summary_en="Nutritionist explains key points of fat-loss diet.",
        tags='["reduce_fat","nutrition"]',
        published_at="2026-04-01"
    )
    db.add(content); db.commit()
    result = db.query(HealthContent).filter_by(type="video").first()
    assert result.url == "https://www.youtube.com/watch?v=example"

def test_create_bookmark(db):
    user = User(email="bk@bk.com", password_hash="h", role="trial", language="zh")
    db.add(user); db.commit()
    content = HealthContent(
        type="article", title="Test", url="https://test.com",
        source="Test", summary_zh="测试", summary_en="test",
        tags='[]', published_at="2026-04-01"
    )
    db.add(content); db.commit()
    bookmark = Bookmark(user_id=user.id, content_id=content.id)
    db.add(bookmark); db.commit()
    result = db.query(Bookmark).filter_by(user_id=user.id).first()
    assert result.content_id == content.id
```

- [ ] **Step 2: 运行测试，确认失败**

```bash
cd healthmeal/backend && source venv/bin/activate
python -m pytest tests/test_knowledge_models.py -v
```

预期：`ModuleNotFoundError: No module named 'models.knowledge'`

- [ ] **Step 3: 创建 models/knowledge.py**

```python
from sqlalchemy import Column, Integer, String, DateTime, ForeignKey, Text, Boolean
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from database import Base


class HealthContent(Base):
    __tablename__ = "health_contents"
    id = Column(Integer, primary_key=True, index=True)
    type = Column(String, nullable=False)          # article / video
    title = Column(String, nullable=False)
    url = Column(String, nullable=False)
    source = Column(String, nullable=False)        # PubMed / YouTube / Bilibili / manual
    summary_zh = Column(Text)
    summary_en = Column(Text)
    tags = Column(Text, default="[]")              # JSON array of strings
    published_at = Column(String)                  # YYYY-MM-DD
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    bookmarks = relationship("Bookmark", back_populates="content")


class Bookmark(Base):
    __tablename__ = "bookmarks"
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    content_id = Column(Integer, ForeignKey("health_contents.id"), nullable=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    user = relationship("User", back_populates="bookmarks")
    content = relationship("HealthContent", back_populates="bookmarks")
```

- [ ] **Step 4: 更新 models/__init__.py**

```python
from .user import User, Profile, ExerciseLog, UsageQuota
from .meal import Ingredient, MealPlan
from .tracking import FoodLog, BodyMetric
from .knowledge import HealthContent, Bookmark
```

- [ ] **Step 5: 在 models/user.py 的 body_metrics 行后添加**

```python
    bookmarks = relationship("Bookmark", back_populates="user")
```

- [ ] **Step 6: 运行测试，确认通过**

```bash
python -m pytest tests/test_knowledge_models.py -v
```

预期：3 个测试全部 PASS

- [ ] **Step 7: Commit**

```bash
cd /Users/liuying/Desktop/lilyproject
git add healthmeal/backend/models/
git commit -m "feat: add HealthContent and Bookmark models"
```

---

## Task 2: RSS 服务 + Claude 摘要生成

**Files:**
- Create: `healthmeal/backend/services/rss_service.py`
- Modify: `healthmeal/backend/services/claude_service.py`
- Create: `healthmeal/backend/tests/test_rss_service.py`
- Modify: `healthmeal/backend/tests/test_claude_service.py`

- [ ] **Step 1: 安装 feedparser**

```bash
cd healthmeal/backend && source venv/bin/activate
pip install feedparser==6.0.11
echo "feedparser==6.0.11" >> requirements.txt
```

- [ ] **Step 2: 编写失败测试**

创建 `healthmeal/backend/tests/test_rss_service.py`：

```python
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
```

在 `test_claude_service.py` 末尾添加：

```python
def test_summarize_article_returns_bilingual():
    mock_response = MagicMock()
    mock_response.content = [MagicMock(text='{"zh":"地中海饮食能降低心脏病风险，富含Omega-3和多酚。","en":"Mediterranean diet reduces heart disease risk through Omega-3 and polyphenols."}')]
    with patch("services.claude_service.client.messages.create", return_value=mock_response):
        result = summarize_article("Mediterranean Diet Study", "New study shows benefits of olive oil and fish consumption for cardiovascular health.")
    assert "zh" in result
    assert "en" in result
    assert len(result["zh"]) > 10
```

同时更新 `test_claude_service.py` 第一行 import：

```python
from services.claude_service import identify_ingredients_from_image, generate_meal_plan, analyze_food_photo, summarize_article
```

- [ ] **Step 3: 运行测试，确认失败**

```bash
python -m pytest tests/test_rss_service.py tests/test_claude_service.py::test_summarize_article_returns_bilingual -v
```

预期：`ModuleNotFoundError` 或 `ImportError`

- [ ] **Step 4: 创建 services/rss_service.py**

```python
import feedparser
from datetime import datetime
from typing import Optional

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
```

- [ ] **Step 5: 在 services/claude_service.py 末尾添加**

```python
def summarize_article(title: str, content: str) -> dict:
    """
    为文章生成中英文摘要。
    返回：{"zh": str, "en": str}
    """
    response = client.messages.create(
        model=MODEL,
        max_tokens=512,
        messages=[{
            "role": "user",
            "content": (
                f"请为以下健康/营养研究文章生成简短摘要（中英文各一句话，80字以内）。\n\n"
                f"标题：{title}\n内容：{content[:1000]}\n\n"
                "只返回 JSON，格式：{\"zh\": \"中文摘要\", \"en\": \"English summary\"}"
            )
        }]
    )
    raw = response.content[0].text.strip()
    start = raw.find("{")
    end = raw.rfind("}") + 1
    return json.loads(raw[start:end])
```

- [ ] **Step 6: 运行测试，确认通过**

```bash
python -m pytest tests/test_rss_service.py tests/test_claude_service.py -v
```

预期：全部 PASS（5 个 Claude 测试 + 2 个 RSS 测试）

- [ ] **Step 7: Commit**

```bash
cd /Users/liuying/Desktop/lilyproject
git add healthmeal/backend/services/ healthmeal/backend/tests/test_rss_service.py healthmeal/backend/tests/test_claude_service.py healthmeal/backend/requirements.txt
git commit -m "feat: rss service and article summarization"
```

---

## Task 3: 知识内容 API

**Files:**
- Create: `healthmeal/backend/schemas/knowledge.py`
- Create: `healthmeal/backend/routers/knowledge.py`
- Create: `healthmeal/backend/tests/test_knowledge.py`
- Modify: `healthmeal/backend/main.py`

- [ ] **Step 1: 编写失败测试**

创建 `healthmeal/backend/tests/test_knowledge.py`：

```python
import pytest, json
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from main import app
from database import get_db, Base
from models.knowledge import HealthContent

TEST_DB = "sqlite:///./test_knowledge_api.db"
engine = create_engine(TEST_DB, connect_args={"check_same_thread": False})
TestSession = sessionmaker(bind=engine)

def override_db():
    db = TestSession()
    try:
        yield db
    finally:
        db.close()

@pytest.fixture(autouse=True)
def setup():
    app.dependency_overrides[get_db] = override_db
    Base.metadata.create_all(bind=engine)
    yield
    Base.metadata.drop_all(bind=engine)
    app.dependency_overrides.pop(get_db, None)

client = TestClient(app)

def get_token():
    client.post("/auth/register", json={"email": "kn@kn.com", "password": "p", "language": "zh"})
    res = client.post("/auth/login", json={"email": "kn@kn.com", "password": "p"})
    return res.json()["access_token"]

def get_owner_token(db_session):
    import routers.auth as auth_router
    auth_router.OWNER_EMAIL = "owner_kn@kn.com"
    client.post("/auth/register", json={"email": "owner_kn@kn.com", "password": "p", "language": "zh"})
    res = client.post("/auth/login", json={"email": "owner_kn@kn.com", "password": "p"})
    return res.json()["access_token"]

def seed_content(db_session):
    """直接插入测试数据到数据库"""
    article = HealthContent(
        type="article", title="地中海饮食研究", url="https://example.com/1",
        source="PubMed", summary_zh="地中海饮食有益心脏。", summary_en="Mediterranean diet is good for heart.",
        tags='["heart","mediterranean"]', published_at="2026-04-01"
    )
    video = HealthContent(
        type="video", title="减脂饮食指南", url="https://youtube.com/watch?v=abc",
        source="YouTube", summary_zh="专业减脂饮食建议。", summary_en="Professional fat-loss diet tips.",
        tags='["reduce_fat"]', published_at="2026-04-02"
    )
    db_session.add_all([article, video])
    db_session.commit()
    return article.id, video.id

def test_get_all_content():
    db = TestSession()
    seed_content(db)
    db.close()
    token = get_token()
    res = client.get("/health-content", headers={"Authorization": f"Bearer {token}"})
    assert res.status_code == 200
    assert len(res.json()) == 2

def test_filter_content_by_type():
    db = TestSession()
    seed_content(db)
    db.close()
    token = get_token()
    res = client.get("/health-content?type=video", headers={"Authorization": f"Bearer {token}"})
    assert res.status_code == 200
    assert all(item["type"] == "video" for item in res.json())

def test_add_bookmark():
    db = TestSession()
    article_id, _ = seed_content(db)
    db.close()
    token = get_token()
    res = client.post(f"/health-content/{article_id}/bookmark",
                      headers={"Authorization": f"Bearer {token}"})
    assert res.status_code == 201

def test_remove_bookmark():
    db = TestSession()
    article_id, _ = seed_content(db)
    db.close()
    token = get_token()
    client.post(f"/health-content/{article_id}/bookmark",
                headers={"Authorization": f"Bearer {token}"})
    res = client.delete(f"/health-content/{article_id}/bookmark",
                        headers={"Authorization": f"Bearer {token}"})
    assert res.status_code == 204

def test_get_bookmarks():
    db = TestSession()
    article_id, _ = seed_content(db)
    db.close()
    token = get_token()
    client.post(f"/health-content/{article_id}/bookmark",
                headers={"Authorization": f"Bearer {token}"})
    res = client.get("/health-content/bookmarks",
                     headers={"Authorization": f"Bearer {token}"})
    assert res.status_code == 200
    assert len(res.json()) == 1
```

- [ ] **Step 2: 运行测试，确认失败**

```bash
python -m pytest tests/test_knowledge.py -v
```

预期：404 错误

- [ ] **Step 3: 创建 schemas/knowledge.py**

```python
from pydantic import BaseModel
from typing import Optional, List
from datetime import datetime


class HealthContentResponse(BaseModel):
    id: int
    type: str
    title: str
    url: str
    source: str
    summary_zh: Optional[str]
    summary_en: Optional[str]
    tags: List[str]
    published_at: Optional[str]
    created_at: datetime
    is_bookmarked: bool = False

    class Config:
        from_attributes = True


class AddContentRequest(BaseModel):
    type: str           # article / video
    title: str
    url: str
    source: str
    summary_zh: Optional[str] = None
    summary_en: Optional[str] = None
    tags: List[str] = []
    published_at: Optional[str] = None
```

- [ ] **Step 4: 创建 routers/knowledge.py**

```python
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List, Optional
import json
from database import get_db
from models.user import User
from models.knowledge import HealthContent, Bookmark
from schemas.knowledge import HealthContentResponse, AddContentRequest
from dependencies import get_current_user, require_owner

router = APIRouter()


def _build_response(content: HealthContent, user_id: int, db: Session) -> HealthContentResponse:
    is_bookmarked = db.query(Bookmark).filter_by(
        user_id=user_id, content_id=content.id
    ).first() is not None
    tags = json.loads(content.tags) if content.tags else []
    return HealthContentResponse(
        id=content.id,
        type=content.type,
        title=content.title,
        url=content.url,
        source=content.source,
        summary_zh=content.summary_zh,
        summary_en=content.summary_en,
        tags=tags,
        published_at=content.published_at,
        created_at=content.created_at,
        is_bookmarked=is_bookmarked
    )


@router.get("/health-content", response_model=List[HealthContentResponse])
def get_health_content(
    type: Optional[str] = None,
    tag: Optional[str] = None,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    query = db.query(HealthContent)
    if type:
        query = query.filter(HealthContent.type == type)
    if tag:
        query = query.filter(HealthContent.tags.contains(tag))
    contents = query.order_by(HealthContent.created_at.desc()).limit(50).all()
    return [_build_response(c, current_user.id, db) for c in contents]


@router.get("/health-content/bookmarks", response_model=List[HealthContentResponse])
def get_bookmarks(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    bookmarks = db.query(Bookmark).filter_by(user_id=current_user.id).all()
    result = []
    for bm in bookmarks:
        content = db.query(HealthContent).filter_by(id=bm.content_id).first()
        if content:
            result.append(_build_response(content, current_user.id, db))
    return result


@router.post("/health-content/{content_id}/bookmark", status_code=201)
def add_bookmark(
    content_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    if not db.query(HealthContent).filter_by(id=content_id).first():
        raise HTTPException(status_code=404, detail="Content not found")
    if db.query(Bookmark).filter_by(user_id=current_user.id, content_id=content_id).first():
        raise HTTPException(status_code=409, detail="Already bookmarked")
    bm = Bookmark(user_id=current_user.id, content_id=content_id)
    db.add(bm)
    db.commit()
    return {"status": "bookmarked"}


@router.delete("/health-content/{content_id}/bookmark", status_code=204)
def remove_bookmark(
    content_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    bm = db.query(Bookmark).filter_by(
        user_id=current_user.id, content_id=content_id
    ).first()
    if not bm:
        raise HTTPException(status_code=404, detail="Bookmark not found")
    db.delete(bm)
    db.commit()


@router.post("/health-content", response_model=HealthContentResponse, status_code=201)
def add_content(
    body: AddContentRequest,
    current_user: User = Depends(require_owner),
    db: Session = Depends(get_db)
):
    """管理员手动添加内容（文章或视频）"""
    content = HealthContent(
        type=body.type,
        title=body.title,
        url=body.url,
        source=body.source,
        summary_zh=body.summary_zh,
        summary_en=body.summary_en,
        tags=json.dumps(body.tags, ensure_ascii=False),
        published_at=body.published_at
    )
    db.add(content)
    db.commit()
    db.refresh(content)
    return _build_response(content, current_user.id, db)


@router.post("/health-content/fetch-rss", status_code=201)
def fetch_rss(
    current_user: User = Depends(require_owner),
    db: Session = Depends(get_db)
):
    """管理员触发 RSS 拉取并用 Claude 生成摘要"""
    from services.rss_service import parse_rss_feed, HEALTH_RSS_FEEDS
    from services.claude_service import summarize_article
    created = 0
    for feed in HEALTH_RSS_FEEDS:
        try:
            entries = parse_rss_feed(feed["url"], limit=5)
        except Exception:
            continue
        for entry in entries:
            if not entry.get("title") or not entry.get("url"):
                continue
            if db.query(HealthContent).filter_by(url=entry["url"]).first():
                continue
            try:
                summaries = summarize_article(entry["title"], entry.get("summary", ""))
                zh = summaries.get("zh", entry.get("summary", "")[:100])
                en = summaries.get("en", entry.get("summary", "")[:100])
            except Exception:
                zh = entry.get("summary", "")[:200]
                en = zh
            content = HealthContent(
                type="article",
                title=entry["title"],
                url=entry["url"],
                source=feed["name"],
                summary_zh=zh,
                summary_en=en,
                tags=json.dumps(["nutrition", "research"], ensure_ascii=False),
                published_at=entry.get("published_at", "")
            )
            db.add(content)
            created += 1
    db.commit()
    return {"created": created}


@router.post("/health-content/{content_id}/generate-meal-plan")
def generate_from_content(
    content_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """基于文章/视频内容一键生成餐谱"""
    from services.claude_service import generate_meal_plan
    from routers.profile import calculate_tdee
    from models.user import Profile
    import json as json_lib

    content = db.query(HealthContent).filter_by(id=content_id).first()
    if not content:
        raise HTTPException(status_code=404, detail="Content not found")

    profile_obj = db.query(Profile).filter_by(user_id=current_user.id).first()
    profile_dict = {"weight": 65, "goal": "maintain", "allergies": [], "tdee": 2000}
    if profile_obj:
        profile_dict = {
            "weight": profile_obj.weight or 65,
            "goal": profile_obj.goal or "maintain",
            "allergies": json_lib.loads(profile_obj.allergies or "[]"),
            "tdee": calculate_tdee(profile_obj) or 2000
        }

    context_note = f"参考以下健康研究：{content.title}。{content.summary_zh or ''}"
    result = generate_meal_plan(
        profile=profile_dict,
        ingredients=[context_note],
        style="other",
        range="daily",
        exercise_calories=0
    )
    return {"meal_plan": result, "based_on": content.title}
```

- [ ] **Step 5: 更新 main.py**

```python
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from routers import auth, profile, exercise, admin, meal, tracking, knowledge

app = FastAPI(title="HealthMeal API", version="1.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth.router, prefix="/auth", tags=["auth"])
app.include_router(profile.router, prefix="/profile", tags=["profile"])
app.include_router(exercise.router, prefix="/exercise-logs", tags=["exercise"])
app.include_router(admin.router, prefix="/admin", tags=["admin"])
app.include_router(meal.router, tags=["meal"])
app.include_router(tracking.router, tags=["tracking"])
app.include_router(knowledge.router, tags=["knowledge"])

@app.get("/health")
def health():
    return {"status": "ok"}
```

- [ ] **Step 6: 运行测试，确认通过**

```bash
python -m pytest tests/test_knowledge.py -v
```

预期：5 个测试全部 PASS

- [ ] **Step 7: 运行全部测试**

```bash
python -m pytest tests/ -v
```

预期：全部 PASS（44 个以上）

- [ ] **Step 8: Commit**

```bash
cd /Users/liuying/Desktop/lilyproject
git add healthmeal/backend/
git commit -m "feat: knowledge content API with bookmarks and RSS fetch"
```

---

## Task 4: 前端 i18n + 知识库服务层

**Files:**
- Modify: `healthmeal/frontend/i18n/zh.ts`
- Modify: `healthmeal/frontend/i18n/en.ts`
- Create: `healthmeal/frontend/services/knowledge.ts`

- [ ] **Step 1: 在 zh.ts 的末尾 `}` 前添加 knowledge 字段**

在文件最后一行 `}` 前插入：

```typescript
  knowledge: {
    title: "知识库",
    all: "全部",
    articles: "研究文章",
    videos: "视频",
    bookmarks: "收藏",
    bookmark: "收藏",
    unbookmark: "取消收藏",
    readMore: "阅读原文",
    watchVideo: "观看视频",
    generateMeal: "基于此生成餐谱",
    empty: "暂无内容",
    bookmarkEmpty: "暂无收藏",
    tags: {
      heart: "心脏",
      mediterranean: "地中海",
      reduce_fat: "减脂",
      gain_muscle: "增肌",
      anti_inflammatory: "抗炎",
      nutrition: "营养",
      research: "研究",
    },
  },
```

- [ ] **Step 2: 在 en.ts 的末尾 `}` 前添加 knowledge 字段**

```typescript
  knowledge: {
    title: "Knowledge",
    all: "All",
    articles: "Articles",
    videos: "Videos",
    bookmarks: "Bookmarks",
    bookmark: "Bookmark",
    unbookmark: "Unbookmark",
    readMore: "Read More",
    watchVideo: "Watch Video",
    generateMeal: "Generate Meal from This",
    empty: "No content yet",
    bookmarkEmpty: "No bookmarks yet",
    tags: {
      heart: "Heart",
      mediterranean: "Mediterranean",
      reduce_fat: "Fat Loss",
      gain_muscle: "Muscle Gain",
      anti_inflammatory: "Anti-Inflammatory",
      nutrition: "Nutrition",
      research: "Research",
    },
  },
```

- [ ] **Step 3: 创建 services/knowledge.ts**

```typescript
import { api } from "./api"

export interface HealthContentData {
  id: number
  type: string          // article / video
  title: string
  url: string
  source: string
  summary_zh: string | null
  summary_en: string | null
  tags: string[]
  published_at: string | null
  created_at: string
  is_bookmarked: boolean
}

export interface GeneratedMealFromContent {
  meal_plan: Record<string, unknown>
  based_on: string
}

export async function getHealthContent(type?: string, tag?: string): Promise<HealthContentData[]> {
  const params = new URLSearchParams()
  if (type) params.append("type", type)
  if (tag) params.append("tag", tag)
  const query = params.toString() ? `?${params.toString()}` : ""
  const res = await api.get(`/health-content${query}`)
  return res.data
}

export async function getBookmarks(): Promise<HealthContentData[]> {
  const res = await api.get("/health-content/bookmarks")
  return res.data
}

export async function addBookmark(contentId: number): Promise<void> {
  await api.post(`/health-content/${contentId}/bookmark`)
}

export async function removeBookmark(contentId: number): Promise<void> {
  await api.delete(`/health-content/${contentId}/bookmark`)
}

export async function generateMealFromContent(contentId: number): Promise<GeneratedMealFromContent> {
  const res = await api.post(`/health-content/${contentId}/generate-meal-plan`)
  return res.data
}
```

- [ ] **Step 4: Commit**

```bash
cd /Users/liuying/Desktop/lilyproject
git add healthmeal/frontend/i18n/ healthmeal/frontend/services/knowledge.ts
git commit -m "feat: i18n knowledge strings and knowledge service layer"
```

---

## Task 5: 前端知识库页面

**Files:**
- Create: `healthmeal/frontend/app/(tabs)/knowledge.tsx`
- Modify: `healthmeal/frontend/app/(tabs)/_layout.tsx`

- [ ] **Step 1: 安装 expo-web-browser**

```bash
cd healthmeal/frontend
npx expo install expo-web-browser
```

- [ ] **Step 2: 创建 app/(tabs)/knowledge.tsx**

```typescript
import { useState, useEffect, useCallback } from "react"
import {
  View, Text, ScrollView, TouchableOpacity,
  StyleSheet, Alert, ActivityIndicator, RefreshControl
} from "react-native"
import * as WebBrowser from "expo-web-browser"
import {
  getHealthContent, getBookmarks, addBookmark, removeBookmark,
  generateMealFromContent, HealthContentData
} from "../../services/knowledge"
import { zh } from "../../i18n/zh"

const t = zh.knowledge

type FilterType = "all" | "article" | "video" | "bookmarks"

function ContentCard({
  item, onToggleBookmark, onGenerateMeal
}: {
  item: HealthContentData
  onToggleBookmark: (id: number, bookmarked: boolean) => void
  onGenerateMeal: (id: number, title: string) => void
}) {
  const isVideo = item.type === "video"
  const summary = item.summary_zh || item.summary_en || ""

  async function handleOpen() {
    await WebBrowser.openBrowserAsync(item.url)
  }

  return (
    <View style={styles.card}>
      <View style={styles.cardHeader}>
        <View style={[styles.typeBadge, isVideo ? styles.videoBadge : styles.articleBadge]}>
          <Text style={styles.typeText}>{isVideo ? "视频" : "文章"}</Text>
        </View>
        <Text style={styles.source}>{item.source}</Text>
        {item.published_at && <Text style={styles.date}>{item.published_at}</Text>}
      </View>

      <Text style={styles.cardTitle} numberOfLines={2}>{item.title}</Text>

      {summary.length > 0 && (
        <Text style={styles.summary} numberOfLines={3}>{summary}</Text>
      )}

      {item.tags.length > 0 && (
        <View style={styles.tagsRow}>
          {item.tags.slice(0, 4).map((tag) => (
            <View key={tag} style={styles.tag}>
              <Text style={styles.tagText}>#{tag}</Text>
            </View>
          ))}
        </View>
      )}

      <View style={styles.actions}>
        <TouchableOpacity style={styles.actionBtn} onPress={handleOpen}>
          <Text style={styles.actionText}>{isVideo ? t.watchVideo : t.readMore}</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.actionBtn, item.is_bookmarked ? styles.bookmarkedBtn : styles.bookmarkBtn]}
          onPress={() => onToggleBookmark(item.id, item.is_bookmarked)}
        >
          <Text style={[styles.actionText, item.is_bookmarked && styles.bookmarkedText]}>
            {item.is_bookmarked ? t.unbookmark : t.bookmark}
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.actionBtn, styles.generateBtn]}
          onPress={() => onGenerateMeal(item.id, item.title)}
        >
          <Text style={styles.generateText}>{t.generateMeal}</Text>
        </TouchableOpacity>
      </View>
    </View>
  )
}

export default function KnowledgeScreen() {
  const [filter, setFilter] = useState<FilterType>("all")
  const [contents, setContents] = useState<HealthContentData[]>([])
  const [loading, setLoading] = useState(false)
  const [refreshing, setRefreshing] = useState(false)
  const [generatingId, setGeneratingId] = useState<number | null>(null)

  const loadData = useCallback(async () => {
    setLoading(true)
    try {
      if (filter === "bookmarks") {
        const data = await getBookmarks()
        setContents(data)
      } else {
        const type = filter === "all" ? undefined : filter
        const data = await getHealthContent(type)
        setContents(data)
      }
    } catch {
      // 静默失败
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }, [filter])

  useEffect(() => { loadData() }, [loadData])

  async function handleToggleBookmark(id: number, isBookmarked: boolean) {
    try {
      if (isBookmarked) {
        await removeBookmark(id)
      } else {
        await addBookmark(id)
      }
      setContents(prev => prev.map(c =>
        c.id === id ? { ...c, is_bookmarked: !isBookmarked } : c
      ))
    } catch {
      Alert.alert(zh.common.error)
    }
  }

  async function handleGenerateMeal(id: number, title: string) {
    setGeneratingId(id)
    try {
      const result = await generateMealFromContent(id)
      const summary = (result.meal_plan as any)?.summary
      Alert.alert(
        `基于《${result.based_on}》`,
        summary
          ? `今日热量：${summary.total_calories}kcal\n蛋白质：${summary.protein}g\n${summary.health_notes}`
          : "餐谱已生成，请前往「餐谱」Tab 查看历史记录"
      )
    } catch {
      Alert.alert(zh.common.error, "生成失败，请稍后重试")
    } finally {
      setGeneratingId(null)
    }
  }

  const filters: Array<{ key: FilterType; label: string }> = [
    { key: "all", label: t.all },
    { key: "article", label: t.articles },
    { key: "video", label: t.videos },
    { key: "bookmarks", label: t.bookmarks },
  ]

  const emptyText = filter === "bookmarks" ? t.bookmarkEmpty : t.empty

  return (
    <View style={styles.container}>
      {/* 过滤 Tab */}
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.filterRow}
        contentContainerStyle={{ paddingHorizontal: 16, paddingVertical: 10 }}>
        {filters.map(({ key, label }) => (
          <TouchableOpacity key={key}
            style={[styles.filterBtn, filter === key && styles.filterBtnActive]}
            onPress={() => setFilter(key)}>
            <Text style={[styles.filterText, filter === key && styles.filterTextActive]}>{label}</Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      {loading && !refreshing ? (
        <ActivityIndicator size="large" color="#22c55e" style={{ marginTop: 40 }} />
      ) : (
        <ScrollView
          contentContainerStyle={styles.list}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); loadData() }} />}
        >
          {contents.length === 0 ? (
            <Text style={styles.empty}>{emptyText}</Text>
          ) : (
            contents.map((item) => (
              <View key={item.id}>
                {generatingId === item.id && (
                  <View style={styles.generatingOverlay}>
                    <ActivityIndicator color="#22c55e" />
                    <Text style={styles.generatingText}>正在生成餐谱...</Text>
                  </View>
                )}
                <ContentCard
                  item={item}
                  onToggleBookmark={handleToggleBookmark}
                  onGenerateMeal={handleGenerateMeal}
                />
              </View>
            ))
          )}
        </ScrollView>
      )}
    </View>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#f9fafb" },
  filterRow: { backgroundColor: "#fff", borderBottomWidth: 1, borderBottomColor: "#e5e7eb", maxHeight: 56 },
  filterBtn: { paddingHorizontal: 14, paddingVertical: 6, borderRadius: 20, marginRight: 8, backgroundColor: "#f3f4f6" },
  filterBtnActive: { backgroundColor: "#22c55e" },
  filterText: { fontSize: 14, color: "#6b7280" },
  filterTextActive: { color: "#fff", fontWeight: "600" },
  list: { padding: 16, paddingBottom: 32 },
  empty: { textAlign: "center", color: "#9ca3af", marginTop: 60, fontSize: 15 },
  card: { backgroundColor: "#fff", borderRadius: 12, padding: 16, marginBottom: 12 },
  cardHeader: { flexDirection: "row", alignItems: "center", marginBottom: 8 },
  typeBadge: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6, marginRight: 8 },
  articleBadge: { backgroundColor: "#dbeafe" },
  videoBadge: { backgroundColor: "#fce7f3" },
  typeText: { fontSize: 11, fontWeight: "600", color: "#374151" },
  source: { fontSize: 12, color: "#6b7280", flex: 1 },
  date: { fontSize: 11, color: "#9ca3af" },
  cardTitle: { fontSize: 16, fontWeight: "bold", color: "#111827", marginBottom: 8, lineHeight: 22 },
  summary: { fontSize: 13, color: "#6b7280", lineHeight: 19, marginBottom: 10 },
  tagsRow: { flexDirection: "row", flexWrap: "wrap", gap: 6, marginBottom: 12 },
  tag: { backgroundColor: "#f0fdf4", paddingHorizontal: 8, paddingVertical: 3, borderRadius: 10 },
  tagText: { fontSize: 11, color: "#16a34a" },
  actions: { flexDirection: "row", gap: 8, flexWrap: "wrap" },
  actionBtn: { paddingHorizontal: 10, paddingVertical: 7, borderRadius: 8, borderWidth: 1, borderColor: "#e5e7eb" },
  actionText: { fontSize: 12, color: "#374151" },
  bookmarkBtn: { borderColor: "#e5e7eb" },
  bookmarkedBtn: { borderColor: "#22c55e", backgroundColor: "#f0fdf4" },
  bookmarkedText: { color: "#16a34a" },
  generateBtn: { borderColor: "#7c3aed", backgroundColor: "#f5f3ff" },
  generateText: { fontSize: 12, color: "#7c3aed" },
  generatingOverlay: { flexDirection: "row", alignItems: "center", justifyContent: "center", paddingVertical: 8 },
  generatingText: { marginLeft: 8, fontSize: 13, color: "#22c55e" },
})
```

- [ ] **Step 3: 更新 app/(tabs)/_layout.tsx**

```typescript
import { Tabs } from "expo-router"
import { zh } from "../../i18n/zh"

export default function TabLayout() {
  return (
    <Tabs screenOptions={{ tabBarActiveTintColor: "#22c55e" }}>
      <Tabs.Screen name="index" options={{ title: "首页" }} />
      <Tabs.Screen name="meal" options={{ title: zh.meal.title }} />
      <Tabs.Screen name="tracking" options={{ title: zh.tracking.title }} />
      <Tabs.Screen name="ingredients" options={{ title: zh.ingredients.title }} />
      <Tabs.Screen name="knowledge" options={{ title: zh.knowledge.title }} />
      <Tabs.Screen name="profile" options={{ title: zh.profile.title }} />
    </Tabs>
  )
}
```

- [ ] **Step 4: Commit**

```bash
cd /Users/liuying/Desktop/lilyproject
git add healthmeal/frontend/
git commit -m "feat: knowledge library screen with bookmarks and generate-from-content"
```

---

## Task 6: 端到端验证

- [ ] **Step 1: 运行全部后端测试**

```bash
cd healthmeal/backend && source venv/bin/activate
python -m pytest tests/ -v
```

预期：全部 PASS（44 个以上）

- [ ] **Step 2: 验证 API 文档**

```bash
uvicorn main:app --reload --port 8001
```

访问 `http://localhost:8001/docs`，确认以下端点：
- `GET /health-content`
- `GET /health-content/bookmarks`
- `POST /health-content/{id}/bookmark`
- `DELETE /health-content/{id}/bookmark`
- `POST /health-content` (owner only)
- `POST /health-content/fetch-rss` (owner only)
- `POST /health-content/{id}/generate-meal-plan`

- [ ] **Step 3: 启动前端**

```bash
cd healthmeal/frontend && npx expo start
```

用 Expo Go 验证：
1. 导航栏出现「知识库」Tab（第五个）
2. 默认显示空列表（"暂无内容"）
3. 切换「收藏」Tab → 显示"暂无收藏"

- [ ] **Step 4: 最终 Commit**

```bash
cd /Users/liuying/Desktop/lilyproject
git add .
git commit -m "feat: Phase 4 complete — knowledge library with RSS, bookmarks, generate-from-content"
```
