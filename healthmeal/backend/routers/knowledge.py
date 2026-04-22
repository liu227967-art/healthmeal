from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List, Optional
import json
from database import get_db
from models.user import User
from models.knowledge import HealthContent, Bookmark
from schemas.knowledge import HealthContentResponse, AddContentRequest, NoteRequest
from dependencies import get_current_user, require_owner

router = APIRouter()


def _build_response(content: HealthContent, user_id: int, db: Session) -> HealthContentResponse:
    is_bookmarked = db.query(Bookmark).filter_by(
        user_id=user_id, content_id=content.id
    ).first() is not None
    tags = json.loads(content.tags) if content.tags else []
    return HealthContentResponse(
        id=content.id, type=content.type, title=content.title,
        url=content.url, source=content.source,
        lang=content.lang or "en",
        summary_zh=content.summary_zh, summary_en=content.summary_en,
        tags=tags, published_at=content.published_at,
        created_at=content.created_at, is_bookmarked=is_bookmarked
    )


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


@router.get("/health-content", response_model=List[HealthContentResponse])
def get_health_content(
    type: Optional[str] = None,
    lang: Optional[str] = None,
    tag: Optional[str] = None,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    query = db.query(HealthContent).filter(
        (HealthContent.user_id == None) | (HealthContent.user_id == current_user.id)
    )
    if type:
        query = query.filter(HealthContent.type == type)
    if lang:
        query = query.filter(HealthContent.lang == lang)
    if tag:
        query = query.filter(HealthContent.tags.contains(tag))
    contents = query.order_by(HealthContent.created_at.desc()).limit(50).all()
    return [_build_response(c, current_user.id, db) for c in contents]


@router.post("/notes", response_model=HealthContentResponse, status_code=201)
def create_note(
    body: NoteRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    from services.claude_service import summarize_article

    # 用 AI 生成另一语言的摘要
    summary_zh = body.content if body.lang == "zh" else None
    summary_en = body.content if body.lang == "en" else None
    try:
        result = summarize_article(body.title, body.content)
        if body.lang == "zh":
            summary_en = result.get("en", "")
        else:
            summary_zh = result.get("zh", "")
    except Exception:
        pass  # 翻译失败不影响保存

    note = HealthContent(
        type="note",
        title=body.title,
        url="",
        source="personal_note",
        lang=body.lang,
        summary_zh=summary_zh,
        summary_en=summary_en,
        tags=json.dumps(body.tags, ensure_ascii=False),
        user_id=current_user.id
    )
    db.add(note)
    db.commit()
    db.refresh(note)
    return _build_response(note, current_user.id, db)


@router.delete("/notes/{note_id}", status_code=204)
def delete_note(
    note_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    note = db.query(HealthContent).filter_by(id=note_id, user_id=current_user.id, type="note").first()
    if not note:
        raise HTTPException(status_code=404, detail="Note not found")
    db.delete(note)
    db.commit()


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
    content = HealthContent(
        type=body.type, title=body.title, url=body.url, source=body.source,
        summary_zh=body.summary_zh, summary_en=body.summary_en,
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
                type="article", title=entry["title"], url=entry["url"],
                source=feed["name"], summary_zh=zh, summary_en=en,
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
