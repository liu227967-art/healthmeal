import pytest, json
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from main import app
from database import get_db, Base

TEST_DB = "sqlite:///./test_tracking_api.db"
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
    client.post("/auth/register", json={"email": "track@track.com", "password": "p", "language": "zh"})
    res = client.post("/auth/login", json={"email": "track@track.com", "password": "p"})
    return res.json()["access_token"]

def test_add_food_log_manual():
    token = get_token()
    res = client.post("/food-logs", headers={"Authorization": f"Bearer {token}"}, json={
        "meal_type": "breakfast",
        "input_method": "manual",
        "date": "2026-04-08",
        "food_items": [
            {"name": "燕麦粥", "calories": 350, "protein": 12, "fiber": 8, "anti_inflammatory": 7}
        ]
    })
    assert res.status_code == 201
    assert res.json()["meal_type"] == "breakfast"
    assert res.json()["total_calories"] == 350.0

def test_get_food_logs_by_date():
    token = get_token()
    client.post("/food-logs", headers={"Authorization": f"Bearer {token}"}, json={
        "meal_type": "lunch", "input_method": "manual", "date": "2026-04-08",
        "food_items": [{"name": "鸡胸肉饭", "calories": 500, "protein": 40, "fiber": 5, "anti_inflammatory": 6}]
    })
    res = client.get("/food-logs?date=2026-04-08", headers={"Authorization": f"Bearer {token}"})
    assert res.status_code == 200
    assert len(res.json()) == 1

def test_health_summary_daily():
    token = get_token()
    client.post("/food-logs", headers={"Authorization": f"Bearer {token}"}, json={
        "meal_type": "breakfast", "input_method": "manual", "date": "2026-04-08",
        "food_items": [{"name": "燕麦粥", "calories": 350, "protein": 12, "fiber": 8, "anti_inflammatory": 7}]
    })
    res = client.get("/health-summary?period=daily&date=2026-04-08", headers={"Authorization": f"Bearer {token}"})
    assert res.status_code == 200
    data = res.json()
    assert data["total_calories"] == 350.0
    assert data["total_protein"] == 12.0

def test_record_body_metric():
    token = get_token()
    res = client.post("/body-metrics", headers={"Authorization": f"Bearer {token}"}, json={
        "date": "2026-04-08", "weight": 65.0, "body_fat_pct": 22.0
    })
    assert res.status_code == 201
    assert res.json()["weight"] == 65.0

def test_get_body_metrics():
    token = get_token()
    client.post("/body-metrics", headers={"Authorization": f"Bearer {token}"}, json={
        "date": "2026-04-08", "weight": 65.0, "body_fat_pct": 22.0
    })
    res = client.get("/body-metrics", headers={"Authorization": f"Bearer {token}"})
    assert res.status_code == 200
    assert len(res.json()) == 1
