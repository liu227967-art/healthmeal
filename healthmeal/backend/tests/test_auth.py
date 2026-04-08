import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from main import app
from database import get_db, Base

TEST_DB = "sqlite:///./test_auth_api.db"
engine = create_engine(TEST_DB, connect_args={"check_same_thread": False})
TestSession = sessionmaker(bind=engine)


def override_db():
    db = TestSession()
    try:
        yield db
    finally:
        db.close()


app.dependency_overrides[get_db] = override_db


@pytest.fixture(autouse=True)
def setup():
    Base.metadata.create_all(bind=engine)
    yield
    Base.metadata.drop_all(bind=engine)


client = TestClient(app)


def test_register():
    res = client.post("/auth/register", json={
        "email": "user@example.com", "password": "pass1234", "language": "zh"
    })
    assert res.status_code == 201
    assert "access_token" in res.json()


def test_register_duplicate_email():
    client.post("/auth/register", json={"email": "dup@example.com", "password": "p", "language": "zh"})
    res = client.post("/auth/register", json={"email": "dup@example.com", "password": "p", "language": "zh"})
    assert res.status_code == 409


def test_login_success():
    client.post("/auth/register", json={"email": "login@example.com", "password": "secret", "language": "zh"})
    res = client.post("/auth/login", json={"email": "login@example.com", "password": "secret"})
    assert res.status_code == 200
    assert "access_token" in res.json()


def test_login_wrong_password():
    client.post("/auth/register", json={"email": "wp@example.com", "password": "correct", "language": "zh"})
    res = client.post("/auth/login", json={"email": "wp@example.com", "password": "wrong"})
    assert res.status_code == 401
