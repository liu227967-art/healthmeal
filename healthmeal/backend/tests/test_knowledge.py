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

def seed_content():
    db = TestSession()
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
    db.add_all([article, video])
    db.commit()
    article_id = article.id
    video_id = video.id
    db.close()
    return article_id, video_id

def test_get_all_content():
    seed_content()
    token = get_token()
    res = client.get("/health-content", headers={"Authorization": f"Bearer {token}"})
    assert res.status_code == 200
    assert len(res.json()) == 2

def test_filter_content_by_type():
    seed_content()
    token = get_token()
    res = client.get("/health-content?type=video", headers={"Authorization": f"Bearer {token}"})
    assert res.status_code == 200
    assert all(item["type"] == "video" for item in res.json())

def test_add_bookmark():
    article_id, _ = seed_content()
    token = get_token()
    res = client.post(f"/health-content/{article_id}/bookmark",
                      headers={"Authorization": f"Bearer {token}"})
    assert res.status_code == 201

def test_remove_bookmark():
    article_id, _ = seed_content()
    token = get_token()
    client.post(f"/health-content/{article_id}/bookmark",
                headers={"Authorization": f"Bearer {token}"})
    res = client.delete(f"/health-content/{article_id}/bookmark",
                        headers={"Authorization": f"Bearer {token}"})
    assert res.status_code == 204

def test_get_bookmarks():
    article_id, _ = seed_content()
    token = get_token()
    client.post(f"/health-content/{article_id}/bookmark",
                headers={"Authorization": f"Bearer {token}"})
    res = client.get("/health-content/bookmarks",
                     headers={"Authorization": f"Bearer {token}"})
    assert res.status_code == 200
    assert len(res.json()) == 1
