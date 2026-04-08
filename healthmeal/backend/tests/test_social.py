import pytest, json
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from main import app
from database import get_db, Base

TEST_DB = "sqlite:///./test_social_api.db"
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

def get_token(email="u1@u.com"):
    client.post("/auth/register", json={"email": email, "password": "p", "language": "zh"})
    res = client.post("/auth/login", json={"email": email, "password": "p"})
    return res.json()["access_token"]

def test_generate_shopping_list_from_ingredients():
    token = get_token()
    import datetime
    today = datetime.date.today().isoformat()
    client.post("/ingredients", headers={"Authorization": f"Bearer {token}"}, json={
        "name": "鸡胸肉", "quantity": 300.0, "unit": "g", "input_method": "manual", "date": today
    })
    client.post("/ingredients", headers={"Authorization": f"Bearer {token}"}, json={
        "name": "西兰花", "quantity": 200.0, "unit": "g", "input_method": "manual", "date": today
    })
    res = client.post("/shopping-list/generate", headers={"Authorization": f"Bearer {token}"})
    assert res.status_code == 201
    data = res.json()
    assert len(data["items"]) == 2
    names = [i["name"] for i in data["items"]]
    assert "鸡胸肉" in names

def test_get_shopping_lists():
    token = get_token()
    import datetime
    today = datetime.date.today().isoformat()
    client.post("/ingredients", headers={"Authorization": f"Bearer {token}"}, json={
        "name": "番茄", "quantity": 100.0, "unit": "g", "input_method": "manual", "date": today
    })
    client.post("/shopping-list/generate", headers={"Authorization": f"Bearer {token}"})
    res = client.get("/shopping-list", headers={"Authorization": f"Bearer {token}"})
    assert res.status_code == 200
    assert len(res.json()) >= 1

def test_send_friend_request():
    token1 = get_token("u1@u.com")
    get_token("u2@u.com")
    res = client.post("/friends/request", headers={"Authorization": f"Bearer {token1}"},
                      json={"email": "u2@u.com"})
    assert res.status_code == 201
    assert res.json()["status"] == "pending"

def test_get_friend_requests():
    token1 = get_token("req@u.com")
    token2 = get_token("addr@u.com")
    client.post("/friends/request", headers={"Authorization": f"Bearer {token1}"},
                json={"email": "addr@u.com"})
    res = client.get("/friends/requests", headers={"Authorization": f"Bearer {token2}"})
    assert res.status_code == 200
    assert len(res.json()) == 1

def test_accept_friend_request():
    token1 = get_token("acc_req@u.com")
    token2 = get_token("acc_addr@u.com")
    req_res = client.post("/friends/request", headers={"Authorization": f"Bearer {token1}"},
                          json={"email": "acc_addr@u.com"})
    friendship_id = req_res.json()["id"]
    res = client.put(f"/friends/requests/{friendship_id}/accept",
                     headers={"Authorization": f"Bearer {token2}"})
    assert res.status_code == 200
    assert res.json()["status"] == "accepted"
