from sqlalchemy import Column, Integer, String, DateTime, ForeignKey, Text
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
