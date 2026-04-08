import pytest, os

from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from main import app
from database import get_db, Base
import routers.auth as auth_router

TEST_DB = "sqlite:///./test_admin_api.db"
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


def get_owner_token():
    # 直接在 auth_router 模块层级设置 owner email
    auth_router.OWNER_EMAIL = "owner@example.com"
    client.post("/auth/register", json={"email": "owner@example.com", "password": "p", "language": "zh"})
    res = client.post("/auth/login", json={"email": "owner@example.com", "password": "p"})
    return res.json()["access_token"]


def test_set_family_role():
    owner_token = get_owner_token()
    client.post("/auth/register", json={"email": "fam@example.com", "password": "p", "language": "zh"})
    res = client.post("/admin/set-role", headers={"Authorization": f"Bearer {owner_token}"},
                      json={"email": "fam@example.com", "role": "family"})
    assert res.status_code == 200
    assert res.json()["role"] == "family"


def test_non_owner_cannot_set_role():
    get_owner_token()
    client.post("/auth/register", json={"email": "trial@example.com", "password": "p", "language": "zh"})
    res_login = client.post("/auth/login", json={"email": "trial@example.com", "password": "p"})
    trial_token = res_login.json()["access_token"]
    res = client.post("/admin/set-role", headers={"Authorization": f"Bearer {trial_token}"},
                      json={"email": "owner@example.com", "role": "family"})
    assert res.status_code == 403
