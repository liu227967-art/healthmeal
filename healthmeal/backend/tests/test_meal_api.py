import pytest, json
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from main import app
from database import get_db, Base

TEST_DB = "sqlite:///./test_meal_api.db"
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
    client.post("/auth/register", json={"email": "meal@meal.com", "password": "p", "language": "zh"})
    res = client.post("/auth/login", json={"email": "meal@meal.com", "password": "p"})
    return res.json()["access_token"]


def test_add_ingredient_manual():
    token = get_token()
    res = client.post("/ingredients", headers={"Authorization": f"Bearer {token}"}, json={
        "name": "鸡胸肉", "quantity": 200.0, "unit": "g",
        "input_method": "manual", "date": "2026-04-08"
    })
    assert res.status_code == 201
    assert res.json()["name"] == "鸡胸肉"


def test_get_ingredients_by_date():
    token = get_token()
    client.post("/ingredients", headers={"Authorization": f"Bearer {token}"}, json={
        "name": "西兰花", "quantity": 150.0, "unit": "g",
        "input_method": "manual", "date": "2026-04-08"
    })
    res = client.get("/ingredients?date=2026-04-08", headers={"Authorization": f"Bearer {token}"})
    assert res.status_code == 200
    assert len(res.json()) == 1
    assert res.json()[0]["name"] == "西兰花"


def test_delete_ingredient():
    token = get_token()
    add_res = client.post("/ingredients", headers={"Authorization": f"Bearer {token}"}, json={
        "name": "番茄", "quantity": 100.0, "unit": "g",
        "input_method": "manual", "date": "2026-04-08"
    })
    ing_id = add_res.json()["id"]
    del_res = client.delete(f"/ingredients/{ing_id}", headers={"Authorization": f"Bearer {token}"})
    assert del_res.status_code == 204


def test_get_ingredients_empty():
    token = get_token()
    res = client.get("/ingredients?date=2026-04-08", headers={"Authorization": f"Bearer {token}"})
    assert res.status_code == 200
    assert res.json() == []
