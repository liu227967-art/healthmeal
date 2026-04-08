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
        type="article", title="地中海饮食与心脏健康",
        url="https://pubmed.ncbi.nlm.nih.gov/example", source="PubMed",
        summary_zh="地中海饮食能降低心脏病风险30%。",
        summary_en="Mediterranean diet reduces heart disease risk by 30%.",
        tags='["heart","mediterranean","anti-inflammatory"]', published_at="2026-04-01"
    )
    db.add(content); db.commit()
    result = db.query(HealthContent).filter_by(type="article").first()
    assert result.title == "地中海饮食与心脏健康"
    assert result.source == "PubMed"

def test_create_video(db):
    content = HealthContent(
        type="video", title="如何正确减脂饮食",
        url="https://www.youtube.com/watch?v=example", source="YouTube",
        summary_zh="专业营养师讲解减脂饮食要点。",
        summary_en="Nutritionist explains key points of fat-loss diet.",
        tags='["reduce_fat","nutrition"]', published_at="2026-04-01"
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
