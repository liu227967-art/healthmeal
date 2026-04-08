# HealthMeal Phase 1 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 搭建 HealthMeal 的项目基础，包括前后端脚手架、数据库、用户认证、个人档案管理、运动记录，以及用户角色/配额系统。

**Architecture:** React Native (Expo) 前端 + FastAPI 后端 + PostgreSQL 数据库。前后端通过 REST API 通信，JWT 做鉴权。用户分四个角色（owner/family/trial/pro），每次 AI 调用前检查配额。

**Tech Stack:** React Native + Expo, FastAPI, PostgreSQL, SQLAlchemy, Alembic, JWT (python-jose), bcrypt, pytest, Jest + React Native Testing Library

---

## 文件结构

```
lilyproject/healthmeal/
├── backend/
│   ├── main.py                    # FastAPI 入口
│   ├── database.py                # DB 连接 & 会话
│   ├── models/
│   │   ├── user.py                # User, Profile, ExerciseLog, UsageQuota 模型
│   ├── schemas/
│   │   ├── auth.py                # 注册/登录 schema
│   │   ├── profile.py             # 档案 schema
│   │   ├── exercise.py            # 运动记录 schema
│   ├── routers/
│   │   ├── auth.py                # /auth/register, /auth/login
│   │   ├── profile.py             # /profile
│   │   ├── exercise.py            # /exercise-logs
│   │   ├── admin.py               # /admin/set-role
│   ├── services/
│   │   ├── auth_service.py        # 密码哈希、JWT 签发
│   │   ├── quota_service.py       # 配额检查逻辑
│   ├── dependencies.py            # get_current_user, require_role
│   ├── alembic/                   # 数据库迁移
│   ├── requirements.txt
│   └── tests/
│       ├── test_auth.py
│       ├── test_profile.py
│       ├── test_exercise.py
│       └── test_quota.py
└── frontend/
    ├── app/
    │   ├── (auth)/
    │   │   ├── login.tsx           # 登录页
    │   │   └── register.tsx        # 注册页
    │   ├── (tabs)/
    │   │   ├── index.tsx           # 首页（占位）
    │   │   └── profile.tsx         # 个人档案页
    │   └── _layout.tsx             # 根布局
    ├── components/
    │   ├── ProfileForm.tsx         # 档案表单
    │   └── ExerciseLogForm.tsx     # 运动记录表单
    ├── services/
    │   ├── api.ts                  # axios 实例 + token 注入
    │   ├── auth.ts                 # 登录/注册 API 调用
    │   ├── profile.ts              # 档案 API 调用
    │   └── exercise.ts             # 运动 API 调用
    ├── store/
    │   └── authStore.ts            # Zustand 用户状态
    ├── i18n/
    │   ├── zh.ts                   # 中文字符串
    │   └── en.ts                   # 英文字符串
    └── package.json
```

---

## Task 1: 后端项目初始化

**Files:**
- Create: `backend/requirements.txt`
- Create: `backend/main.py`
- Create: `backend/database.py`

- [ ] **Step 1: 创建目录结构**

```bash
mkdir -p lilyproject/healthmeal/backend/{models,schemas,routers,services,tests,alembic}
mkdir -p lilyproject/healthmeal/frontend
cd lilyproject/healthmeal/backend
```

- [ ] **Step 2: 创建 requirements.txt**

```
fastapi==0.111.0
uvicorn[standard]==0.29.0
sqlalchemy==2.0.30
alembic==1.13.1
psycopg2-binary==2.9.9
python-jose[cryptography]==3.3.0
passlib[bcrypt]==1.7.4
python-multipart==0.0.9
pydantic[email]==2.7.1
pytest==8.2.0
httpx==0.27.0
pytest-asyncio==0.23.6
python-dotenv==1.0.1
```

- [ ] **Step 3: 安装依赖**

```bash
python -m venv venv
source venv/bin/activate  # Windows: venv\Scripts\activate
pip install -r requirements.txt
```

- [ ] **Step 4: 创建 .env 文件**

```
DATABASE_URL=postgresql://postgres:password@localhost:5432/healthmeal
SECRET_KEY=your-secret-key-change-in-production-min-32-chars
ACCESS_TOKEN_EXPIRE_MINUTES=10080
FIRST_OWNER_EMAIL=your@email.com
```

- [ ] **Step 5: 创建 database.py**

```python
from sqlalchemy import create_engine
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker
import os
from dotenv import load_dotenv

load_dotenv()

DATABASE_URL = os.getenv("DATABASE_URL")

engine = create_engine(DATABASE_URL)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
Base = declarative_base()

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
```

- [ ] **Step 6: 创建 main.py**

```python
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from routers import auth, profile, exercise, admin

app = FastAPI(title="HealthMeal API", version="1.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth.router, prefix="/auth", tags=["auth"])
app.include_router(profile.router, prefix="/profile", tags=["profile"])
app.include_router(exercise.router, prefix="/exercise-logs", tags=["exercise"])
app.include_router(admin.router, prefix="/admin", tags=["admin"])

@app.get("/health")
def health():
    return {"status": "ok"}
```

- [ ] **Step 7: 启动验证**

```bash
uvicorn main:app --reload --port 8001
```

访问 `http://localhost:8001/health`，预期返回 `{"status": "ok"}`

- [ ] **Step 8: Commit**

```bash
git add .
git commit -m "feat: backend project scaffold"
```

---

## Task 2: 数据库模型

**Files:**
- Create: `backend/models/user.py`
- Create: `backend/alembic.ini`（alembic init 生成）

- [ ] **Step 1: 编写失败测试**

创建 `backend/tests/test_models.py`：

```python
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from models.user import Base, User, Profile, ExerciseLog, UsageQuota
import pytest

TEST_DB = "sqlite:///./test.db"

@pytest.fixture
def db():
    engine = create_engine(TEST_DB, connect_args={"check_same_thread": False})
    Base.metadata.create_all(bind=engine)
    Session = sessionmaker(bind=engine)
    session = Session()
    yield session
    session.close()
    Base.metadata.drop_all(bind=engine)

def test_create_user(db):
    user = User(email="test@example.com", password_hash="hashed", role="trial", language="zh")
    db.add(user)
    db.commit()
    assert db.query(User).filter_by(email="test@example.com").first() is not None

def test_create_profile(db):
    user = User(email="p@example.com", password_hash="h", role="trial", language="zh")
    db.add(user)
    db.commit()
    profile = Profile(user_id=user.id, height=170.0, weight=65.0, body_fat_pct=20.0,
                      age=30, gender="female", goal="reduce_fat", allergies="[]")
    db.add(profile)
    db.commit()
    assert db.query(Profile).filter_by(user_id=user.id).first().goal == "reduce_fat"

def test_create_exercise_log(db):
    user = User(email="e@example.com", password_hash="h", role="trial", language="zh")
    db.add(user)
    db.commit()
    log = ExerciseLog(user_id=user.id, type="cardio",
                      detail_json='{"activity":"running","duration_min":30,"intensity":"moderate"}',
                      calories_burned=250.0)
    db.add(log)
    db.commit()
    assert db.query(ExerciseLog).filter_by(user_id=user.id).first().calories_burned == 250.0

def test_create_usage_quota(db):
    user = User(email="q@example.com", password_hash="h", role="trial", language="zh")
    db.add(user)
    db.commit()
    quota = UsageQuota(user_id=user.id, year_month="2026-04",
                       meal_plan_count=0, ingredient_photo_count=0,
                       food_log_photo_count=0, ai_summary_count=0)
    db.add(quota)
    db.commit()
    assert db.query(UsageQuota).filter_by(user_id=user.id).first().meal_plan_count == 0
```

- [ ] **Step 2: 运行测试，确认失败**

```bash
cd backend && pytest tests/test_models.py -v
```

预期：`ImportError: cannot import name 'User' from 'models.user'`

- [ ] **Step 3: 创建 models/user.py**

```python
from sqlalchemy import Column, Integer, String, Float, DateTime, ForeignKey, Text
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from database import Base

class User(Base):
    __tablename__ = "users"
    id = Column(Integer, primary_key=True, index=True)
    email = Column(String, unique=True, index=True, nullable=False)
    password_hash = Column(String, nullable=False)
    role = Column(String, default="trial")  # owner/family/trial/pro
    language = Column(String, default="zh")  # zh/en
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    profile = relationship("Profile", back_populates="user", uselist=False)
    exercise_logs = relationship("ExerciseLog", back_populates="user")
    usage_quotas = relationship("UsageQuota", back_populates="user")


class Profile(Base):
    __tablename__ = "profiles"
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), unique=True, nullable=False)
    height = Column(Float)           # cm
    weight = Column(Float)           # kg
    body_fat_pct = Column(Float)     # %
    age = Column(Integer)
    gender = Column(String)          # male/female/other
    goal = Column(String)            # reduce_fat/maintain/gain_muscle
    allergies = Column(Text, default="[]")  # JSON array of strings
    updated_at = Column(DateTime(timezone=True), onupdate=func.now(), server_default=func.now())

    user = relationship("User", back_populates="profile")


class ExerciseLog(Base):
    __tablename__ = "exercise_logs"
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    type = Column(String, nullable=False)   # cardio/strength
    detail_json = Column(Text, nullable=False)  # JSON: activity, duration_min, intensity / muscle_group, sets, weight_kg
    calories_burned = Column(Float, default=0.0)
    logged_at = Column(DateTime(timezone=True), server_default=func.now())

    user = relationship("User", back_populates="exercise_logs")


class UsageQuota(Base):
    __tablename__ = "usage_quotas"
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    year_month = Column(String, nullable=False)   # e.g. "2026-04"
    meal_plan_count = Column(Integer, default=0)
    ingredient_photo_count = Column(Integer, default=0)
    food_log_photo_count = Column(Integer, default=0)
    ai_summary_count = Column(Integer, default=0)

    user = relationship("User", back_populates="usage_quotas")
```

- [ ] **Step 4: 创建 models/__init__.py**

```python
from .user import User, Profile, ExerciseLog, UsageQuota
```

- [ ] **Step 5: 运行测试，确认通过**

```bash
pytest tests/test_models.py -v
```

预期：4 个测试全部 PASS

- [ ] **Step 6: 初始化 Alembic 并生成迁移**

```bash
alembic init alembic
```

编辑 `alembic/env.py`，在 `from alembic import context` 后添加：

```python
import sys, os
sys.path.insert(0, os.path.dirname(os.path.dirname(__file__)))
from database import Base
from models.user import User, Profile, ExerciseLog, UsageQuota
target_metadata = Base.metadata
```

在 `alembic.ini` 中设置：
```
sqlalchemy.url = postgresql://postgres:password@localhost:5432/healthmeal
```

```bash
alembic revision --autogenerate -m "initial tables"
alembic upgrade head
```

- [ ] **Step 7: Commit**

```bash
git add .
git commit -m "feat: database models and initial migration"
```

---

## Task 3: 认证服务 + 配额服务

**Files:**
- Create: `backend/services/auth_service.py`
- Create: `backend/services/quota_service.py`
- Create: `backend/dependencies.py`

- [ ] **Step 1: 编写失败测试**

创建 `backend/tests/test_auth_service.py`：

```python
from services.auth_service import hash_password, verify_password, create_access_token, decode_token

def test_hash_and_verify_password():
    hashed = hash_password("secret123")
    assert verify_password("secret123", hashed) is True
    assert verify_password("wrong", hashed) is False

def test_create_and_decode_token():
    token = create_access_token({"sub": "42", "role": "trial"})
    payload = decode_token(token)
    assert payload["sub"] == "42"
    assert payload["role"] == "trial"
```

创建 `backend/tests/test_quota_service.py`：

```python
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from models.user import Base, User, UsageQuota
from services.quota_service import check_quota, increment_quota, TRIAL_LIMITS
import pytest

TEST_DB = "sqlite:///./test_quota.db"

@pytest.fixture
def db():
    engine = create_engine(TEST_DB, connect_args={"check_same_thread": False})
    Base.metadata.create_all(bind=engine)
    Session = sessionmaker(bind=engine)
    session = Session()
    yield session
    session.close()
    Base.metadata.drop_all(bind=engine)

def test_trial_within_limit(db):
    user = User(email="t@t.com", password_hash="h", role="trial", language="zh")
    db.add(user); db.commit()
    assert check_quota(db, user, "meal_plan") is True

def test_trial_exceeds_limit(db):
    user = User(email="e@t.com", password_hash="h", role="trial", language="zh")
    db.add(user); db.commit()
    quota = UsageQuota(user_id=user.id, year_month="2026-04",
                       meal_plan_count=TRIAL_LIMITS["meal_plan"],
                       ingredient_photo_count=0, food_log_photo_count=0, ai_summary_count=0)
    db.add(quota); db.commit()
    assert check_quota(db, user, "meal_plan") is False

def test_pro_no_limit(db):
    user = User(email="p@t.com", password_hash="h", role="pro", language="zh")
    db.add(user); db.commit()
    quota = UsageQuota(user_id=user.id, year_month="2026-04",
                       meal_plan_count=9999,
                       ingredient_photo_count=0, food_log_photo_count=0, ai_summary_count=0)
    db.add(quota); db.commit()
    assert check_quota(db, user, "meal_plan") is True
```

- [ ] **Step 2: 运行测试，确认失败**

```bash
pytest tests/test_auth_service.py tests/test_quota_service.py -v
```

预期：`ImportError`

- [ ] **Step 3: 创建 services/auth_service.py**

```python
from passlib.context import CryptContext
from jose import JWTError, jwt
from datetime import datetime, timedelta
import os

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")
SECRET_KEY = os.getenv("SECRET_KEY", "dev-secret-key-change-me")
ALGORITHM = "HS256"
EXPIRE_MINUTES = int(os.getenv("ACCESS_TOKEN_EXPIRE_MINUTES", "10080"))

def hash_password(password: str) -> str:
    return pwd_context.hash(password)

def verify_password(plain: str, hashed: str) -> bool:
    return pwd_context.verify(plain, hashed)

def create_access_token(data: dict) -> str:
    to_encode = data.copy()
    expire = datetime.utcnow() + timedelta(minutes=EXPIRE_MINUTES)
    to_encode.update({"exp": expire})
    return jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)

def decode_token(token: str) -> dict:
    return jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
```

- [ ] **Step 4: 创建 services/quota_service.py**

```python
from sqlalchemy.orm import Session
from models.user import User, UsageQuota
from datetime import datetime

TRIAL_LIMITS = {
    "meal_plan": 10,
    "ingredient_photo": 20,
    "food_log_photo": 30,
    "ai_summary": 15,
}

UNLIMITED_ROLES = {"owner", "family", "pro"}

def _get_or_create_quota(db: Session, user_id: int, year_month: str) -> UsageQuota:
    quota = db.query(UsageQuota).filter_by(user_id=user_id, year_month=year_month).first()
    if not quota:
        quota = UsageQuota(user_id=user_id, year_month=year_month,
                           meal_plan_count=0, ingredient_photo_count=0,
                           food_log_photo_count=0, ai_summary_count=0)
        db.add(quota)
        db.commit()
        db.refresh(quota)
    return quota

def check_quota(db: Session, user: User, action: str) -> bool:
    if user.role in UNLIMITED_ROLES:
        return True
    year_month = datetime.utcnow().strftime("%Y-%m")
    quota = _get_or_create_quota(db, user.id, year_month)
    count_field = f"{action}_count"
    current = getattr(quota, count_field, 0)
    return current < TRIAL_LIMITS.get(action, 0)

def increment_quota(db: Session, user_id: int, action: str):
    year_month = datetime.utcnow().strftime("%Y-%m")
    quota = _get_or_create_quota(db, user_id, year_month)
    count_field = f"{action}_count"
    setattr(quota, count_field, getattr(quota, count_field, 0) + 1)
    db.commit()
```

- [ ] **Step 5: 创建 dependencies.py**

```python
from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from sqlalchemy.orm import Session
from database import get_db
from models.user import User
from services.auth_service import decode_token
from jose import JWTError

bearer = HTTPBearer()

def get_current_user(
    credentials: HTTPAuthorizationCredentials = Depends(bearer),
    db: Session = Depends(get_db)
) -> User:
    try:
        payload = decode_token(credentials.credentials)
        user_id = int(payload.get("sub"))
    except (JWTError, ValueError):
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid token")
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="User not found")
    return user

def require_owner(user: User = Depends(get_current_user)) -> User:
    if user.role != "owner":
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Owner only")
    return user
```

- [ ] **Step 6: 创建 services/__init__.py**

```python
```

- [ ] **Step 7: 运行测试，确认通过**

```bash
pytest tests/test_auth_service.py tests/test_quota_service.py -v
```

预期：全部 PASS

- [ ] **Step 8: Commit**

```bash
git add .
git commit -m "feat: auth service, quota service, dependencies"
```

---

## Task 4: 认证 API 路由

**Files:**
- Create: `backend/schemas/auth.py`
- Create: `backend/routers/auth.py`
- Create: `backend/tests/test_auth.py`

- [ ] **Step 1: 编写失败测试**

创建 `backend/tests/test_auth.py`：

```python
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
```

- [ ] **Step 2: 运行测试，确认失败**

```bash
pytest tests/test_auth.py -v
```

预期：`ImportError` 或 404

- [ ] **Step 3: 创建 schemas/auth.py**

```python
from pydantic import BaseModel, EmailStr

class RegisterRequest(BaseModel):
    email: EmailStr
    password: str
    language: str = "zh"

class LoginRequest(BaseModel):
    email: EmailStr
    password: str

class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    role: str
    language: str
```

- [ ] **Step 4: 创建 routers/auth.py**

```python
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from database import get_db
from models.user import User
from schemas.auth import RegisterRequest, LoginRequest, TokenResponse
from services.auth_service import hash_password, verify_password, create_access_token
import os

router = APIRouter()
OWNER_EMAIL = os.getenv("FIRST_OWNER_EMAIL", "")

@router.post("/register", response_model=TokenResponse, status_code=201)
def register(body: RegisterRequest, db: Session = Depends(get_db)):
    if db.query(User).filter(User.email == body.email).first():
        raise HTTPException(status_code=409, detail="Email already registered")
    role = "owner" if body.email == OWNER_EMAIL else "trial"
    user = User(email=body.email, password_hash=hash_password(body.password),
                role=role, language=body.language)
    db.add(user)
    db.commit()
    db.refresh(user)
    token = create_access_token({"sub": str(user.id), "role": user.role})
    return TokenResponse(access_token=token, role=user.role, language=user.language)

@router.post("/login", response_model=TokenResponse)
def login(body: LoginRequest, db: Session = Depends(get_db)):
    user = db.query(User).filter(User.email == body.email).first()
    if not user or not verify_password(body.password, user.password_hash):
        raise HTTPException(status_code=401, detail="Invalid credentials")
    token = create_access_token({"sub": str(user.id), "role": user.role})
    return TokenResponse(access_token=token, role=user.role, language=user.language)
```

- [ ] **Step 5: 创建 routers/__init__.py 和 schemas/__init__.py**

```python
# 两个文件都留空
```

- [ ] **Step 6: 运行测试，确认通过**

```bash
pytest tests/test_auth.py -v
```

预期：4 个测试全部 PASS

- [ ] **Step 7: Commit**

```bash
git add .
git commit -m "feat: auth register and login endpoints"
```

---

## Task 5: 个人档案 API

**Files:**
- Create: `backend/schemas/profile.py`
- Create: `backend/routers/profile.py`
- Create: `backend/tests/test_profile.py`

- [ ] **Step 1: 编写失败测试**

创建 `backend/tests/test_profile.py`：

```python
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

app.dependency_overrides[get_db] = override_db

@pytest.fixture(autouse=True)
def setup():
    Base.metadata.create_all(bind=engine)
    yield
    Base.metadata.drop_all(bind=engine)

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
```

- [ ] **Step 2: 运行测试，确认失败**

```bash
pytest tests/test_profile.py -v
```

预期：404 错误

- [ ] **Step 3: 创建 schemas/profile.py**

```python
from pydantic import BaseModel
from typing import Optional, List

class ProfileRequest(BaseModel):
    height: Optional[float] = None      # cm
    weight: Optional[float] = None      # kg
    body_fat_pct: Optional[float] = None  # %
    age: Optional[int] = None
    gender: Optional[str] = None        # male/female/other
    goal: Optional[str] = None          # reduce_fat/maintain/gain_muscle
    allergies: Optional[List[str]] = []

class ProfileResponse(BaseModel):
    height: Optional[float]
    weight: Optional[float]
    body_fat_pct: Optional[float]
    age: Optional[int]
    gender: Optional[str]
    goal: Optional[str]
    allergies: List[str]
    tdee: Optional[float]               # 计算得出的每日热量目标

    class Config:
        from_attributes = True
```

- [ ] **Step 4: 创建 routers/profile.py**

```python
from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from typing import Optional
import json
from database import get_db
from models.user import User, Profile
from schemas.profile import ProfileRequest, ProfileResponse
from dependencies import get_current_user

router = APIRouter()

def calculate_tdee(profile: Profile) -> Optional[float]:
    """Harris-Benedict 公式计算基础代谢率，再乘活动系数"""
    if not all([profile.weight, profile.height, profile.age, profile.gender]):
        return None
    w, h, a = profile.weight, profile.height, profile.age
    if profile.gender == "male":
        bmr = 88.36 + 13.4 * w + 4.8 * h - 5.7 * a
    else:
        bmr = 447.6 + 9.25 * w + 3.1 * h - 4.33 * a
    # 默认轻度活动系数 1.375
    tdee = bmr * 1.375
    if profile.goal == "reduce_fat":
        tdee -= 500
    elif profile.goal == "gain_muscle":
        tdee += 300
    return round(tdee, 1)

@router.get("", response_model=Optional[ProfileResponse])
def get_profile(current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    profile = db.query(Profile).filter_by(user_id=current_user.id).first()
    if not profile:
        return None
    allergies = json.loads(profile.allergies) if profile.allergies else []
    return ProfileResponse(
        height=profile.height, weight=profile.weight, body_fat_pct=profile.body_fat_pct,
        age=profile.age, gender=profile.gender, goal=profile.goal,
        allergies=allergies, tdee=calculate_tdee(profile)
    )

@router.put("", response_model=ProfileResponse)
def update_profile(body: ProfileRequest, current_user: User = Depends(get_current_user),
                   db: Session = Depends(get_db)):
    profile = db.query(Profile).filter_by(user_id=current_user.id).first()
    if not profile:
        profile = Profile(user_id=current_user.id)
        db.add(profile)
    for field in ["height", "weight", "body_fat_pct", "age", "gender", "goal"]:
        val = getattr(body, field)
        if val is not None:
            setattr(profile, field, val)
    if body.allergies is not None:
        profile.allergies = json.dumps(body.allergies, ensure_ascii=False)
    db.commit()
    db.refresh(profile)
    allergies = json.loads(profile.allergies) if profile.allergies else []
    return ProfileResponse(
        height=profile.height, weight=profile.weight, body_fat_pct=profile.body_fat_pct,
        age=profile.age, gender=profile.gender, goal=profile.goal,
        allergies=allergies, tdee=calculate_tdee(profile)
    )
```

- [ ] **Step 5: 运行测试，确认通过**

```bash
pytest tests/test_profile.py -v
```

预期：3 个测试全部 PASS

- [ ] **Step 6: Commit**

```bash
git add .
git commit -m "feat: profile get and update endpoints with TDEE calculation"
```

---

## Task 6: 运动记录 API

**Files:**
- Create: `backend/schemas/exercise.py`
- Create: `backend/routers/exercise.py`
- Create: `backend/tests/test_exercise.py`

- [ ] **Step 1: 编写失败测试**

创建 `backend/tests/test_exercise.py`：

```python
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

app.dependency_overrides[get_db] = override_db

@pytest.fixture(autouse=True)
def setup():
    Base.metadata.create_all(bind=engine)
    yield
    Base.metadata.drop_all(bind=engine)

client = TestClient(app)

def get_token():
    client.post("/auth/register", json={"email": "ex@ex.com", "password": "p", "language": "zh"})
    res = client.post("/auth/login", json={"email": "ex@ex.com", "password": "p"})
    return res.json()["access_token"]

def test_log_cardio():
    token = get_token()
    res = client.post("/exercise-logs", headers={"Authorization": f"Bearer {token}"}, json={
        "type": "cardio",
        "detail": {"activity": "running", "duration_min": 30, "intensity": "moderate"}
    })
    assert res.status_code == 201
    assert res.json()["calories_burned"] > 0

def test_log_strength():
    token = get_token()
    res = client.post("/exercise-logs", headers={"Authorization": f"Bearer {token}"}, json={
        "type": "strength",
        "detail": {"muscle_group": "chest", "sets": 4, "weight_kg": 60}
    })
    assert res.status_code == 201
    assert res.json()["calories_burned"] > 0

def test_get_today_logs():
    token = get_token()
    client.post("/exercise-logs", headers={"Authorization": f"Bearer {token}"}, json={
        "type": "cardio",
        "detail": {"activity": "cycling", "duration_min": 45, "intensity": "low"}
    })
    res = client.get("/exercise-logs/today", headers={"Authorization": f"Bearer {token}"})
    assert res.status_code == 200
    assert len(res.json()) == 1
```

- [ ] **Step 2: 运行测试，确认失败**

```bash
pytest tests/test_exercise.py -v
```

预期：404 错误

- [ ] **Step 3: 创建 schemas/exercise.py**

```python
from pydantic import BaseModel
from typing import Any
from datetime import datetime

class ExerciseLogRequest(BaseModel):
    type: str   # cardio / strength
    detail: dict[str, Any]

class ExerciseLogResponse(BaseModel):
    id: int
    type: str
    detail: dict[str, Any]
    calories_burned: float
    logged_at: datetime

    class Config:
        from_attributes = True
```

- [ ] **Step 4: 创建 routers/exercise.py**

```python
from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from sqlalchemy import func, cast, Date
from typing import List
import json
from datetime import datetime, date
from database import get_db
from models.user import User, ExerciseLog
from schemas.exercise import ExerciseLogRequest, ExerciseLogResponse
from dependencies import get_current_user

router = APIRouter()

CARDIO_MET = {"running": 9.8, "cycling": 7.5, "swimming": 8.0, "walking": 3.5, "default": 6.0}
STRENGTH_CAL_PER_SET = 15.0  # 每组约 15 千卡

def estimate_calories(type: str, detail: dict) -> float:
    if type == "cardio":
        met = CARDIO_MET.get(detail.get("activity", "default"), CARDIO_MET["default"])
        duration = detail.get("duration_min", 0)
        intensity_factor = {"low": 0.8, "moderate": 1.0, "high": 1.3}.get(detail.get("intensity", "moderate"), 1.0)
        return round(met * 3.5 * 70 / 200 * duration * intensity_factor, 1)
    elif type == "strength":
        sets = detail.get("sets", 0)
        return round(sets * STRENGTH_CAL_PER_SET, 1)
    return 0.0

@router.post("", response_model=ExerciseLogResponse, status_code=201)
def log_exercise(body: ExerciseLogRequest, current_user: User = Depends(get_current_user),
                 db: Session = Depends(get_db)):
    calories = estimate_calories(body.type, body.detail)
    log = ExerciseLog(user_id=current_user.id, type=body.type,
                      detail_json=json.dumps(body.detail, ensure_ascii=False),
                      calories_burned=calories)
    db.add(log)
    db.commit()
    db.refresh(log)
    return ExerciseLogResponse(id=log.id, type=log.type, detail=body.detail,
                               calories_burned=log.calories_burned, logged_at=log.logged_at)

@router.get("/today", response_model=List[ExerciseLogResponse])
def get_today_logs(current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    today = date.today()
    logs = db.query(ExerciseLog).filter(
        ExerciseLog.user_id == current_user.id,
        cast(ExerciseLog.logged_at, Date) == today
    ).all()
    return [ExerciseLogResponse(id=l.id, type=l.type, detail=json.loads(l.detail_json),
                                calories_burned=l.calories_burned, logged_at=l.logged_at)
            for l in logs]
```

- [ ] **Step 5: 运行测试，确认通过**

```bash
pytest tests/test_exercise.py -v
```

预期：3 个测试全部 PASS

- [ ] **Step 6: Commit**

```bash
git add .
git commit -m "feat: exercise log endpoints with calorie estimation"
```

---

## Task 7: 管理员角色管理 API

**Files:**
- Create: `backend/routers/admin.py`
- Create: `backend/tests/test_admin.py`

- [ ] **Step 1: 编写失败测试**

创建 `backend/tests/test_admin.py`：

```python
import pytest, os
os.environ["FIRST_OWNER_EMAIL"] = "owner@example.com"

from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from main import app
from database import get_db, Base

TEST_DB = "sqlite:///./test_admin_api.db"
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

def get_owner_token():
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
```

- [ ] **Step 2: 运行测试，确认失败**

```bash
pytest tests/test_admin.py -v
```

预期：404 错误

- [ ] **Step 3: 创建 routers/admin.py**

```python
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from pydantic import BaseModel, EmailStr
from database import get_db
from models.user import User
from dependencies import require_owner

router = APIRouter()

VALID_ROLES = {"owner", "family", "trial", "pro"}

class SetRoleRequest(BaseModel):
    email: EmailStr
    role: str

class UserRoleResponse(BaseModel):
    email: str
    role: str

@router.post("/set-role", response_model=UserRoleResponse)
def set_role(body: SetRoleRequest, _: User = Depends(require_owner),
             db: Session = Depends(get_db)):
    if body.role not in VALID_ROLES:
        raise HTTPException(status_code=400, detail=f"Invalid role. Must be one of {VALID_ROLES}")
    user = db.query(User).filter(User.email == body.email).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    user.role = body.role
    db.commit()
    return UserRoleResponse(email=user.email, role=user.role)
```

- [ ] **Step 4: 运行测试，确认通过**

```bash
pytest tests/test_admin.py -v
```

预期：2 个测试全部 PASS

- [ ] **Step 5: 运行全部后端测试**

```bash
pytest tests/ -v
```

预期：全部 PASS

- [ ] **Step 6: Commit**

```bash
git add .
git commit -m "feat: admin set-role endpoint, owner-only guard"
```

---

## Task 8: 前端项目初始化

**Files:**
- Create: `frontend/package.json`（由 Expo 生成）
- Create: `frontend/store/authStore.ts`
- Create: `frontend/services/api.ts`
- Create: `frontend/i18n/zh.ts`
- Create: `frontend/i18n/en.ts`

- [ ] **Step 1: 创建 Expo 项目**

```bash
cd lilyproject/healthmeal
npx create-expo-app frontend --template blank-typescript
cd frontend
```

- [ ] **Step 2: 安装依赖**

```bash
npx expo install expo-router react-native-safe-area-context react-native-screens expo-linking expo-constants expo-status-bar
npm install zustand axios @react-native-async-storage/async-storage
npm install -D jest @testing-library/react-native @testing-library/jest-native
```

- [ ] **Step 3: 创建 i18n/zh.ts**

```typescript
export const zh = {
  auth: {
    login: "登录",
    register: "注册",
    email: "邮箱",
    password: "密码",
    loginButton: "登录",
    registerButton: "注册",
    noAccount: "没有账号？立即注册",
    hasAccount: "已有账号？立即登录",
  },
  profile: {
    title: "个人档案",
    height: "身高 (cm)",
    weight: "体重 (kg)",
    bodyFat: "体脂率 (%)",
    age: "年龄",
    gender: "性别",
    goal: "目标",
    allergies: "过敏食物",
    save: "保存",
    goals: {
      reduce_fat: "减脂",
      maintain: "维持",
      gain_muscle: "增肌",
    },
    genders: {
      male: "男",
      female: "女",
      other: "其他",
    },
    tdee: "每日热量目标",
  },
  exercise: {
    title: "运动记录",
    type: "运动类型",
    cardio: "有氧运动",
    strength: "力量训练",
    activity: "运动项目",
    duration: "时长 (分钟)",
    intensity: "强度",
    muscleGroup: "训练部位",
    sets: "组数",
    weightKg: "重量 (kg)",
    caloriesBurned: "消耗热量",
    log: "记录",
    low: "低",
    moderate: "中",
    high: "高",
  },
  common: {
    save: "保存",
    cancel: "取消",
    loading: "加载中...",
    error: "发生错误",
    success: "保存成功",
  },
}
```

- [ ] **Step 4: 创建 i18n/en.ts**

```typescript
export const en = {
  auth: {
    login: "Login",
    register: "Register",
    email: "Email",
    password: "Password",
    loginButton: "Log In",
    registerButton: "Sign Up",
    noAccount: "No account? Sign up",
    hasAccount: "Have an account? Log in",
  },
  profile: {
    title: "My Profile",
    height: "Height (cm)",
    weight: "Weight (kg)",
    bodyFat: "Body Fat (%)",
    age: "Age",
    gender: "Gender",
    goal: "Goal",
    allergies: "Food Allergies",
    save: "Save",
    goals: {
      reduce_fat: "Reduce Fat",
      maintain: "Maintain",
      gain_muscle: "Gain Muscle",
    },
    genders: {
      male: "Male",
      female: "Female",
      other: "Other",
    },
    tdee: "Daily Calorie Target",
  },
  exercise: {
    title: "Exercise Log",
    type: "Exercise Type",
    cardio: "Cardio",
    strength: "Strength Training",
    activity: "Activity",
    duration: "Duration (min)",
    intensity: "Intensity",
    muscleGroup: "Muscle Group",
    sets: "Sets",
    weightKg: "Weight (kg)",
    caloriesBurned: "Calories Burned",
    log: "Log",
    low: "Low",
    moderate: "Moderate",
    high: "High",
  },
  common: {
    save: "Save",
    cancel: "Cancel",
    loading: "Loading...",
    error: "An error occurred",
    success: "Saved successfully",
  },
}
```

- [ ] **Step 5: 创建 services/api.ts**

```typescript
import axios from "axios"
import AsyncStorage from "@react-native-async-storage/async-storage"

const BASE_URL = "http://localhost:8001"

export const api = axios.create({ baseURL: BASE_URL })

api.interceptors.request.use(async (config) => {
  const token = await AsyncStorage.getItem("token")
  if (token) config.headers.Authorization = `Bearer ${token}`
  return config
})
```

- [ ] **Step 6: 创建 store/authStore.ts**

```typescript
import { create } from "zustand"
import AsyncStorage from "@react-native-async-storage/async-storage"

interface AuthState {
  token: string | null
  role: string | null
  language: string
  setAuth: (token: string, role: string, language: string) => Promise<void>
  logout: () => Promise<void>
  loadFromStorage: () => Promise<void>
}

export const useAuthStore = create<AuthState>((set) => ({
  token: null,
  role: null,
  language: "zh",
  setAuth: async (token, role, language) => {
    await AsyncStorage.setItem("token", token)
    set({ token, role, language })
  },
  logout: async () => {
    await AsyncStorage.removeItem("token")
    set({ token: null, role: null })
  },
  loadFromStorage: async () => {
    const token = await AsyncStorage.getItem("token")
    if (token) set({ token })
  },
}))
```

- [ ] **Step 7: Commit**

```bash
git add .
git commit -m "feat: expo frontend scaffold, i18n, api client, auth store"
```

---

## Task 9: 前端登录/注册页面

**Files:**
- Create: `frontend/app/(auth)/login.tsx`
- Create: `frontend/app/(auth)/register.tsx`
- Create: `frontend/services/auth.ts`
- Create: `frontend/app/_layout.tsx`

- [ ] **Step 1: 创建 services/auth.ts**

```typescript
import { api } from "./api"

export async function loginApi(email: string, password: string) {
  const res = await api.post("/auth/login", { email, password })
  return res.data as { access_token: string; role: string; language: string }
}

export async function registerApi(email: string, password: string, language: string) {
  const res = await api.post("/auth/register", { email, password, language })
  return res.data as { access_token: string; role: string; language: string }
}
```

- [ ] **Step 2: 创建 app/_layout.tsx**

```typescript
import { useEffect } from "react"
import { Stack, useRouter, useSegments } from "expo-router"
import { useAuthStore } from "../store/authStore"

export default function RootLayout() {
  const { token, loadFromStorage } = useAuthStore()
  const segments = useSegments()
  const router = useRouter()

  useEffect(() => {
    loadFromStorage()
  }, [])

  useEffect(() => {
    const inAuth = segments[0] === "(auth)"
    if (!token && !inAuth) router.replace("/(auth)/login")
    if (token && inAuth) router.replace("/(tabs)/")
  }, [token, segments])

  return <Stack screenOptions={{ headerShown: false }} />
}
```

- [ ] **Step 3: 创建 app/(auth)/login.tsx**

```typescript
import { useState } from "react"
import { View, Text, TextInput, TouchableOpacity, StyleSheet, Alert } from "react-native"
import { useRouter } from "expo-router"
import { useAuthStore } from "../../store/authStore"
import { loginApi } from "../../services/auth"
import { zh } from "../../i18n/zh"

export default function LoginScreen() {
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const { setAuth, language } = useAuthStore()
  const t = language === "zh" ? zh : zh  // Phase 2 will add full i18n toggle
  const router = useRouter()

  async function handleLogin() {
    try {
      const data = await loginApi(email, password)
      await setAuth(data.access_token, data.role, data.language)
    } catch {
      Alert.alert(t.common.error, "邮箱或密码错误")
    }
  }

  return (
    <View style={styles.container}>
      <Text style={styles.title}>{t.auth.login}</Text>
      <TextInput style={styles.input} placeholder={t.auth.email}
        value={email} onChangeText={setEmail} keyboardType="email-address" autoCapitalize="none" />
      <TextInput style={styles.input} placeholder={t.auth.password}
        value={password} onChangeText={setPassword} secureTextEntry />
      <TouchableOpacity style={styles.button} onPress={handleLogin}>
        <Text style={styles.buttonText}>{t.auth.loginButton}</Text>
      </TouchableOpacity>
      <TouchableOpacity onPress={() => router.push("/(auth)/register")}>
        <Text style={styles.link}>{t.auth.noAccount}</Text>
      </TouchableOpacity>
    </View>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, justifyContent: "center", padding: 24, backgroundColor: "#fff" },
  title: { fontSize: 28, fontWeight: "bold", marginBottom: 32, textAlign: "center" },
  input: { borderWidth: 1, borderColor: "#ddd", borderRadius: 8, padding: 12, marginBottom: 16, fontSize: 16 },
  button: { backgroundColor: "#22c55e", borderRadius: 8, padding: 14, alignItems: "center", marginBottom: 16 },
  buttonText: { color: "#fff", fontSize: 16, fontWeight: "600" },
  link: { textAlign: "center", color: "#22c55e", fontSize: 14 },
})
```

- [ ] **Step 4: 创建 app/(auth)/register.tsx**

```typescript
import { useState } from "react"
import { View, Text, TextInput, TouchableOpacity, StyleSheet, Alert } from "react-native"
import { useRouter } from "expo-router"
import { useAuthStore } from "../../store/authStore"
import { registerApi } from "../../services/auth"
import { zh } from "../../i18n/zh"

export default function RegisterScreen() {
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const { setAuth, language } = useAuthStore()
  const t = zh
  const router = useRouter()

  async function handleRegister() {
    try {
      const data = await registerApi(email, password, language)
      await setAuth(data.access_token, data.role, data.language)
    } catch {
      Alert.alert(t.common.error, "注册失败，邮箱可能已被使用")
    }
  }

  return (
    <View style={styles.container}>
      <Text style={styles.title}>{t.auth.register}</Text>
      <TextInput style={styles.input} placeholder={t.auth.email}
        value={email} onChangeText={setEmail} keyboardType="email-address" autoCapitalize="none" />
      <TextInput style={styles.input} placeholder={t.auth.password}
        value={password} onChangeText={setPassword} secureTextEntry />
      <TouchableOpacity style={styles.button} onPress={handleRegister}>
        <Text style={styles.buttonText}>{t.auth.registerButton}</Text>
      </TouchableOpacity>
      <TouchableOpacity onPress={() => router.push("/(auth)/login")}>
        <Text style={styles.link}>{t.auth.hasAccount}</Text>
      </TouchableOpacity>
    </View>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, justifyContent: "center", padding: 24, backgroundColor: "#fff" },
  title: { fontSize: 28, fontWeight: "bold", marginBottom: 32, textAlign: "center" },
  input: { borderWidth: 1, borderColor: "#ddd", borderRadius: 8, padding: 12, marginBottom: 16, fontSize: 16 },
  button: { backgroundColor: "#22c55e", borderRadius: 8, padding: 14, alignItems: "center", marginBottom: 16 },
  buttonText: { color: "#fff", fontSize: 16, fontWeight: "600" },
  link: { textAlign: "center", color: "#22c55e", fontSize: 14 },
})
```

- [ ] **Step 5: 启动前端验证**

```bash
cd frontend && npx expo start
```

用 Expo Go 扫码，验证登录/注册页面可正常显示和提交。

- [ ] **Step 6: Commit**

```bash
git add .
git commit -m "feat: login and register screens with auth flow"
```

---

## Task 10: 前端个人档案页面

**Files:**
- Create: `frontend/services/profile.ts`
- Create: `frontend/app/(tabs)/profile.tsx`
- Create: `frontend/app/(tabs)/_layout.tsx`

- [ ] **Step 1: 创建 services/profile.ts**

```typescript
import { api } from "./api"

export interface ProfileData {
  height?: number
  weight?: number
  body_fat_pct?: number
  age?: number
  gender?: string
  goal?: string
  allergies?: string[]
  tdee?: number
}

export async function getProfile(): Promise<ProfileData | null> {
  const res = await api.get("/profile")
  return res.data
}

export async function updateProfile(data: ProfileData): Promise<ProfileData> {
  const res = await api.put("/profile", data)
  return res.data
}
```

- [ ] **Step 2: 创建 app/(tabs)/_layout.tsx**

```typescript
import { Tabs } from "expo-router"
import { zh } from "../../i18n/zh"

export default function TabLayout() {
  const t = zh
  return (
    <Tabs screenOptions={{ tabBarActiveTintColor: "#22c55e" }}>
      <Tabs.Screen name="index" options={{ title: "首页" }} />
      <Tabs.Screen name="profile" options={{ title: t.profile.title }} />
    </Tabs>
  )
}
```

- [ ] **Step 3: 创建 app/(tabs)/index.tsx（占位）**

```typescript
import { View, Text, StyleSheet } from "react-native"

export default function HomeScreen() {
  return (
    <View style={styles.container}>
      <Text style={styles.text}>HealthMeal 首页（Phase 2 实现）</Text>
    </View>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, justifyContent: "center", alignItems: "center" },
  text: { fontSize: 18, color: "#666" },
})
```

- [ ] **Step 4: 创建 app/(tabs)/profile.tsx**

```typescript
import { useState, useEffect } from "react"
import { View, Text, TextInput, TouchableOpacity, ScrollView, StyleSheet, Alert } from "react-native"
import { Picker } from "@react-native-picker/picker"
import { getProfile, updateProfile, ProfileData } from "../../services/profile"
import { zh } from "../../i18n/zh"

export default function ProfileScreen() {
  const t = zh.profile
  const [form, setForm] = useState<ProfileData>({
    height: undefined, weight: undefined, body_fat_pct: undefined,
    age: undefined, gender: "female", goal: "reduce_fat", allergies: []
  })
  const [tdee, setTdee] = useState<number | null>(null)

  useEffect(() => {
    getProfile().then((data) => {
      if (data) { setForm(data); setTdee(data.tdee ?? null) }
    })
  }, [])

  async function handleSave() {
    try {
      const updated = await updateProfile(form)
      setTdee(updated.tdee ?? null)
      Alert.alert("", zh.common.success)
    } catch {
      Alert.alert(zh.common.error)
    }
  }

  const numField = (label: string, key: keyof ProfileData) => (
    <View style={styles.field}>
      <Text style={styles.label}>{label}</Text>
      <TextInput style={styles.input} keyboardType="numeric"
        value={form[key]?.toString() ?? ""}
        onChangeText={(v) => setForm({ ...form, [key]: v ? parseFloat(v) : undefined })} />
    </View>
  )

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Text style={styles.title}>{t.title}</Text>
      {numField(t.height, "height")}
      {numField(t.weight, "weight")}
      {numField(t.bodyFat, "body_fat_pct")}
      {numField(t.age, "age")}

      <Text style={styles.label}>{t.gender}</Text>
      <Picker selectedValue={form.gender} onValueChange={(v) => setForm({ ...form, gender: v })}>
        <Picker.Item label={t.genders.female} value="female" />
        <Picker.Item label={t.genders.male} value="male" />
        <Picker.Item label={t.genders.other} value="other" />
      </Picker>

      <Text style={styles.label}>{t.goal}</Text>
      <Picker selectedValue={form.goal} onValueChange={(v) => setForm({ ...form, goal: v })}>
        <Picker.Item label={t.goals.reduce_fat} value="reduce_fat" />
        <Picker.Item label={t.goals.maintain} value="maintain" />
        <Picker.Item label={t.goals.gain_muscle} value="gain_muscle" />
      </Picker>

      {tdee && (
        <View style={styles.tdeeBox}>
          <Text style={styles.tdeeLabel}>{t.tdee}</Text>
          <Text style={styles.tdeeValue}>{tdee} kcal/天</Text>
        </View>
      )}

      <TouchableOpacity style={styles.button} onPress={handleSave}>
        <Text style={styles.buttonText}>{t.save}</Text>
      </TouchableOpacity>
    </ScrollView>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#fff" },
  content: { padding: 24 },
  title: { fontSize: 24, fontWeight: "bold", marginBottom: 24 },
  field: { marginBottom: 16 },
  label: { fontSize: 14, color: "#666", marginBottom: 4 },
  input: { borderWidth: 1, borderColor: "#ddd", borderRadius: 8, padding: 10, fontSize: 16 },
  button: { backgroundColor: "#22c55e", borderRadius: 8, padding: 14, alignItems: "center", marginTop: 24 },
  buttonText: { color: "#fff", fontSize: 16, fontWeight: "600" },
  tdeeBox: { backgroundColor: "#f0fdf4", borderRadius: 8, padding: 16, marginTop: 16 },
  tdeeLabel: { fontSize: 14, color: "#166534" },
  tdeeValue: { fontSize: 24, fontWeight: "bold", color: "#166534" },
})
```

- [ ] **Step 5: 安装 Picker 依赖**

```bash
npx expo install @react-native-picker/picker
```

- [ ] **Step 6: 启动验证**

用 Expo Go 进入档案页，填写数据保存，验证 TDEE 正确显示。

- [ ] **Step 7: Commit**

```bash
git add .
git commit -m "feat: profile screen with TDEE display"
```

---

## Task 11: 运行全量测试 + Phase 1 收尾

- [ ] **Step 1: 运行全部后端测试**

```bash
cd backend && pytest tests/ -v --tb=short
```

预期：全部 PASS

- [ ] **Step 2: 验证后端 API 文档**

启动后端，访问 `http://localhost:8001/docs`，确认以下端点存在：
- `POST /auth/register`
- `POST /auth/login`
- `GET /profile`
- `PUT /profile`
- `POST /exercise-logs`
- `GET /exercise-logs/today`
- `POST /admin/set-role`

- [ ] **Step 3: 验证前端完整流程**

用 Expo Go 验证：
1. 注册新用户 → 自动跳转首页
2. 退出登录 → 跳转登录页
3. 登录 → 进入首页
4. 填写档案 → 显示 TDEE

- [ ] **Step 4: 最终 Commit**

```bash
git add .
git commit -m "feat: Phase 1 complete - auth, profile, exercise log, quota system"
```
