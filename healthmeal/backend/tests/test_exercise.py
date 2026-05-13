import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from main import app
from database import get_db, Base

TEST_DB = "sqlite:///./test_exercise_api.db"
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
    client.post("/auth/register", json={"email": "ex@ex.com", "password": "p", "language": "zh"})
    res = client.post("/auth/login", json={"email": "ex@ex.com", "password": "p"})
    return res.json()["access_token"]


def test_log_cardio():
    token = get_token()
    res = client.post("/exercise-logs", headers={"Authorization": f"Bearer {token}"}, json={
        "type": "cardio",
        "detail": {"activity": "running", "duration_min": 30, "intensity": "moderate"},
        "date": "2026-05-11"
    })
    assert res.status_code == 201
    assert res.json()["calories_burned"] > 0


def test_log_strength():
    token = get_token()
    res = client.post("/exercise-logs", headers={"Authorization": f"Bearer {token}"}, json={
        "type": "strength",
        "detail": {"muscle_group": "chest", "sets": 4, "weight_kg": 60},
        "date": "2026-05-11"
    })
    assert res.status_code == 201
    assert res.json()["calories_burned"] > 0


def test_get_today_logs():
    from datetime import date as date_cls
    today = date_cls.today().isoformat()
    token = get_token()
    client.post("/exercise-logs", headers={"Authorization": f"Bearer {token}"}, json={
        "type": "cardio",
        "detail": {"activity": "cycling", "duration_min": 45, "intensity": "low"},
        "date": today
    })
    res = client.get("/exercise-logs/today", headers={"Authorization": f"Bearer {token}"})
    assert res.status_code == 200
    assert len(res.json()) == 1
