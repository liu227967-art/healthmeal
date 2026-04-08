import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from main import app
from database import get_db, Base

TEST_DB = "sqlite:///./test_profile_api.db"
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
    client.post("/auth/register", json={"email": "u@u.com", "password": "p", "language": "zh"})
    res = client.post("/auth/login", json={"email": "u@u.com", "password": "p"})
    return res.json()["access_token"]


def test_get_profile_empty():
    token = get_token()
    res = client.get("/profile", headers={"Authorization": f"Bearer {token}"})
    assert res.status_code == 200
    assert res.json() is None


def test_update_profile():
    token = get_token()
    res = client.put("/profile", headers={"Authorization": f"Bearer {token}"}, json={
        "height": 165.0, "weight": 60.0, "body_fat_pct": 25.0,
        "age": 28, "gender": "female", "goal": "reduce_fat",
        "allergies": ["peanuts"]
    })
    assert res.status_code == 200
    assert res.json()["goal"] == "reduce_fat"
    assert res.json()["height"] == 165.0


def test_update_profile_twice():
    token = get_token()
    client.put("/profile", headers={"Authorization": f"Bearer {token}"}, json={
        "height": 165.0, "weight": 60.0, "body_fat_pct": 25.0,
        "age": 28, "gender": "female", "goal": "reduce_fat", "allergies": []
    })
    res = client.put("/profile", headers={"Authorization": f"Bearer {token}"}, json={
        "height": 165.0, "weight": 58.0, "body_fat_pct": 23.0,
        "age": 28, "gender": "female", "goal": "reduce_fat", "allergies": []
    })
    assert res.status_code == 200
    assert res.json()["weight"] == 58.0
