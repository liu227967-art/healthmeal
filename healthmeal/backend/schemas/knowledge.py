from pydantic import BaseModel
from typing import Optional, List
from datetime import datetime


class HealthContentResponse(BaseModel):
    id: int
    type: str
    title: str
    url: str
    source: str
    lang: str = "en"
    summary_zh: Optional[str]
    summary_en: Optional[str]
    tags: List[str]
    published_at: Optional[str]
    created_at: datetime
    is_bookmarked: bool = False

    class Config:
        from_attributes = True


class AddContentRequest(BaseModel):
    type: str
    title: str
    url: str
    source: str
    lang: str = "en"
    summary_zh: Optional[str] = None
    summary_en: Optional[str] = None
    tags: List[str] = []
    published_at: Optional[str] = None


class NoteRequest(BaseModel):
    title: str
    content: str
    lang: str = "zh"
    tags: List[str] = []
