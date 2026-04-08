# HealthMeal Phase 3 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 实现饮食记录（拍照/手动）、体征记录（体重/体脂），以及日/周/月健康追踪仪表盘，含计划 vs 实际对比和 AI 健康建议。

**Architecture:** 后端新增 FoodLog（饮食记录）和 BodyMetric（体征记录）模型，Claude 服务层新增食物照片营养分析函数，新增 tracking 路由提供健康汇总 API。前端新增「记录」Tab，包含今日饮食记录、仪表盘（日/周/月切换）。

**Tech Stack:** FastAPI, SQLAlchemy, anthropic Python SDK (Vision), React Native + Expo, expo-image-picker（复用 Phase 2 已安装）

---

## 文件结构

```
healthmeal/backend/
├── models/
│   └── tracking.py                  # FoodLog, BodyMetric 模型（新建）
├── schemas/
│   └── tracking.py                  # 饮食记录/体征/仪表盘 schema（新建）
├── services/
│   └── claude_service.py            # 新增 analyze_food_photo 函数（修改）
├── routers/
│   └── tracking.py                  # /food-logs, /body-metrics, /health-summary（新建）
├── tests/
│   └── test_tracking.py             # 饮食记录/体征/汇总 API 测试（新建）
├── models/user.py                   # 新增 food_logs, body_metrics relationships（修改）
├── models/__init__.py               # 导出新模型（修改）
└── main.py                          # 注册 tracking 路由（修改）

healthmeal/frontend/
├── app/(tabs)/
│   └── tracking.tsx                 # 饮食记录 + 仪表盘页面（新建）
├── services/
│   └── tracking.ts                  # 追踪 API 调用（新建）
├── i18n/
│   ├── zh.ts                        # 新增 tracking 字段（修改）
│   └── en.ts                        # 新增 tracking 字段（修改）
└── app/(tabs)/_layout.tsx           # 新增「记录」Tab（修改）
```

---

## Task 1: 后端数据模型 — FoodLog & BodyMetric

**Files:**
- Create: `healthmeal/backend/models/tracking.py`
- Modify: `healthmeal/backend/models/__init__.py`
- Modify: `healthmeal/backend/models/user.py`

- [ ] **Step 1: 编写失败测试**

创建 `healthmeal/backend/tests/test_tracking_models.py`：

```python
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from models.tracking import FoodLog, BodyMetric
from models.user import Base, User
import pytest

TEST_DB = "sqlite:///./test_tracking_models.db"

@pytest.fixture
def db():
    engine = create_engine(TEST_DB, connect_args={"check_same_thread": False})
    Base.metadata.create_all(bind=engine)
    Session = sessionmaker(bind=engine)
    session = Session()
    yield session
    session.close()
    Base.metadata.drop_all(bind=engine)

def test_create_food_log(db):
    user = User(email="fl@fl.com", password_hash="h", role="trial", language="zh")
    db.add(user); db.commit()
    log = FoodLog(
        user_id=user.id,
        meal_type="breakfast",
        input_method="manual",
        date="2026-04-08",
        food_items_json='[{"name":"燕麦粥","calories":350,"protein":12,"fiber":8}]',
        total_calories=350.0,
        total_protein=12.0,
        total_fiber=8.0,
        anti_inflammatory_score=7.0
    )
    db.add(log); db.commit()
    result = db.query(FoodLog).filter_by(user_id=user.id).first()
    assert result.meal_type == "breakfast"
    assert result.total_calories == 350.0

def test_create_body_metric(db):
    user = User(email="bm@bm.com", password_hash="h", role="trial", language="zh")
    db.add(user); db.commit()
    metric = BodyMetric(user_id=user.id, date="2026-04-08", weight=65.0, body_fat_pct=22.0)
    db.add(metric); db.commit()
    result = db.query(BodyMetric).filter_by(user_id=user.id).first()
    assert result.weight == 65.0
    assert result.body_fat_pct == 22.0
```

- [ ] **Step 2: 运行测试，确认失败**

```bash
cd healthmeal/backend && source venv/bin/activate
python -m pytest tests/test_tracking_models.py -v
```

预期：`ModuleNotFoundError: No module named 'models.tracking'`

- [ ] **Step 3: 创建 models/tracking.py**

```python
from sqlalchemy import Column, Integer, String, Float, DateTime, ForeignKey, Text
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from database import Base


class FoodLog(Base):
    __tablename__ = "food_logs"
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    meal_type = Column(String, nullable=False)       # breakfast/lunch/dinner/snack
    input_method = Column(String, default="manual")  # manual/photo
    date = Column(String, nullable=False)            # YYYY-MM-DD
    food_items_json = Column(Text, nullable=False)   # JSON: [{name, calories, protein, fiber}, ...]
    total_calories = Column(Float, default=0.0)
    total_protein = Column(Float, default=0.0)
    total_fiber = Column(Float, default=0.0)
    anti_inflammatory_score = Column(Float, default=0.0)  # 0-10
    logged_at = Column(DateTime(timezone=True), server_default=func.now())

    user = relationship("User", back_populates="food_logs")


class BodyMetric(Base):
    __tablename__ = "body_metrics"
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    date = Column(String, nullable=False)   # YYYY-MM-DD
    weight = Column(Float)                  # kg
    body_fat_pct = Column(Float)            # %
    recorded_at = Column(DateTime(timezone=True), server_default=func.now())

    user = relationship("User", back_populates="body_metrics")
```

- [ ] **Step 4: 更新 models/__init__.py**

```python
from .user import User, Profile, ExerciseLog, UsageQuota
from .meal import Ingredient, MealPlan
from .tracking import FoodLog, BodyMetric
```

- [ ] **Step 5: 更新 models/user.py — 在 meal_plans 关系后添加**

```python
    food_logs = relationship("FoodLog", back_populates="user")
    body_metrics = relationship("BodyMetric", back_populates="user")
```

- [ ] **Step 6: 运行测试，确认通过**

```bash
python -m pytest tests/test_tracking_models.py -v
```

预期：2 个测试全部 PASS

- [ ] **Step 7: Commit**

```bash
cd /Users/liuying/Desktop/lilyproject
git add healthmeal/backend/models/
git commit -m "feat: add FoodLog and BodyMetric models"
```

---

## Task 2: Claude 服务层 — 食物照片营养分析

**Files:**
- Modify: `healthmeal/backend/services/claude_service.py`
- Modify: `healthmeal/backend/tests/test_claude_service.py`

- [ ] **Step 1: 在 test_claude_service.py 末尾添加新测试**

```python
def test_analyze_food_photo_returns_nutrition():
    mock_response = MagicMock()
    mock_response.content = [MagicMock(text='{"items":[{"name":"炒鸡蛋","calories":180,"protein":14,"fiber":0,"anti_inflammatory":5},{"name":"米饭","calories":220,"protein":4,"fiber":1,"anti_inflammatory":3}],"total_calories":400,"total_protein":18,"total_fiber":1,"anti_inflammatory_score":4.0,"organs":["心脏","肌肉"]}')]
    with patch("services.claude_service.client.messages.create", return_value=mock_response):
        result = analyze_food_photo("base64imagedata")
    assert "items" in result
    assert result["total_calories"] == 400
    assert result["total_protein"] == 18
    assert len(result["items"]) == 2
```

- [ ] **Step 2: 运行新测试，确认失败**

```bash
python -m pytest tests/test_claude_service.py::test_analyze_food_photo_returns_nutrition -v
```

预期：`ImportError: cannot import name 'analyze_food_photo'`

- [ ] **Step 3: 在 services/claude_service.py 末尾添加新函数**

```python
def analyze_food_photo(image_base64: str) -> dict:
    """
    分析食物照片，返回营养信息。
    返回格式：{
      "items": [{"name": str, "calories": float, "protein": float, "fiber": float, "anti_inflammatory": float}],
      "total_calories": float,
      "total_protein": float,
      "total_fiber": float,
      "anti_inflammatory_score": float,  # 0-10
      "organs": [str]
    }
    """
    response = client.messages.create(
        model=MODEL,
        max_tokens=1024,
        messages=[{
            "role": "user",
            "content": [
                {
                    "type": "image",
                    "source": {
                        "type": "base64",
                        "media_type": "image/jpeg",
                        "data": image_base64,
                    },
                },
                {
                    "type": "text",
                    "text": (
                        "请识别图片中的食物，估算每种食物的营养成分和热量。"
                        "只返回 JSON，不输出其他文字。格式：\n"
                        '{"items":[{"name":"食物名","calories":数字,"protein":数字,"fiber":数字,"anti_inflammatory":0-10评分}],'
                        '"total_calories":数字,"total_protein":数字,"total_fiber":数字,'
                        '"anti_inflammatory_score":0-10的综合评分,"organs":["对哪些器官有益"]}'
                    )
                }
            ],
        }]
    )
    raw = response.content[0].text.strip()
    start = raw.find("{")
    end = raw.rfind("}") + 1
    return json.loads(raw[start:end])
```

- [ ] **Step 4: 更新 test_claude_service.py 顶部 import**

将第一行改为：
```python
from services.claude_service import identify_ingredients_from_image, generate_meal_plan, analyze_food_photo
```

- [ ] **Step 5: 运行所有 Claude 测试，确认通过**

```bash
python -m pytest tests/test_claude_service.py -v
```

预期：3 个测试全部 PASS

- [ ] **Step 6: Commit**

```bash
cd /Users/liuying/Desktop/lilyproject
git add healthmeal/backend/services/claude_service.py healthmeal/backend/tests/test_claude_service.py
git commit -m "feat: add analyze_food_photo to claude service"
```

---

## Task 3: 饮食记录与健康汇总 API

**Files:**
- Create: `healthmeal/backend/schemas/tracking.py`
- Create: `healthmeal/backend/routers/tracking.py`
- Create: `healthmeal/backend/tests/test_tracking.py`
- Modify: `healthmeal/backend/main.py`

- [ ] **Step 1: 编写失败测试**

创建 `healthmeal/backend/tests/test_tracking.py`：

```python
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
```

- [ ] **Step 2: 运行测试，确认失败**

```bash
python -m pytest tests/test_tracking.py -v
```

预期：404 错误（路由不存在）

- [ ] **Step 3: 创建 schemas/tracking.py**

```python
from pydantic import BaseModel
from typing import Optional, List, Any
from datetime import datetime


class FoodItemInput(BaseModel):
    name: str
    calories: float
    protein: float
    fiber: float
    anti_inflammatory: float = 5.0   # 0-10


class FoodLogRequest(BaseModel):
    meal_type: str                    # breakfast/lunch/dinner/snack
    input_method: str = "manual"     # manual/photo
    date: str                        # YYYY-MM-DD
    food_items: List[FoodItemInput]


class FoodLogPhotoRequest(BaseModel):
    meal_type: str
    image_base64: str


class FoodLogResponse(BaseModel):
    id: int
    meal_type: str
    input_method: str
    date: str
    food_items: List[dict[str, Any]]
    total_calories: float
    total_protein: float
    total_fiber: float
    anti_inflammatory_score: float
    logged_at: datetime

    class Config:
        from_attributes = True


class BodyMetricRequest(BaseModel):
    date: str       # YYYY-MM-DD
    weight: Optional[float] = None
    body_fat_pct: Optional[float] = None


class BodyMetricResponse(BaseModel):
    id: int
    date: str
    weight: Optional[float]
    body_fat_pct: Optional[float]
    recorded_at: datetime

    class Config:
        from_attributes = True


class DailyHealthSummary(BaseModel):
    date: str
    total_calories: float
    target_calories: Optional[float]
    total_protein: float
    target_protein: Optional[float]
    total_fiber: float
    anti_inflammatory_score: float
    meal_count: int
    exercise_calories_burned: float
    logs: List[FoodLogResponse]


class WeeklyHealthSummary(BaseModel):
    week_start: str
    week_end: str
    daily_calories: List[dict[str, Any]]   # [{"date": str, "calories": float, "exercise": float}]
    avg_protein: float
    avg_fiber: float
    avg_anti_inflammatory: float
    total_exercise_calories: float


class MonthlyHealthSummary(BaseModel):
    month: str
    weekly_calories: List[dict[str, Any]]  # [{"week": str, "avg_calories": float}]
    body_metrics: List[BodyMetricResponse]
    avg_anti_inflammatory: float
    total_days_logged: int
```

- [ ] **Step 4: 创建 routers/tracking.py**

```python
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List, Optional
import json
from datetime import date, timedelta
from database import get_db
from models.user import User, Profile, ExerciseLog
from models.tracking import FoodLog, BodyMetric
from schemas.tracking import (
    FoodLogRequest, FoodLogPhotoRequest, FoodLogResponse,
    BodyMetricRequest, BodyMetricResponse,
    DailyHealthSummary, WeeklyHealthSummary, MonthlyHealthSummary
)
from dependencies import get_current_user
from services.quota_service import check_quota, increment_quota
from routers.profile import calculate_tdee

router = APIRouter()


def _build_food_log_response(log: FoodLog) -> FoodLogResponse:
    return FoodLogResponse(
        id=log.id,
        meal_type=log.meal_type,
        input_method=log.input_method,
        date=log.date,
        food_items=json.loads(log.food_items_json),
        total_calories=log.total_calories,
        total_protein=log.total_protein,
        total_fiber=log.total_fiber,
        anti_inflammatory_score=log.anti_inflammatory_score,
        logged_at=log.logged_at
    )


@router.post("/food-logs", response_model=FoodLogResponse, status_code=201)
def add_food_log(body: FoodLogRequest,
                 current_user: User = Depends(get_current_user),
                 db: Session = Depends(get_db)):
    items = [item.model_dump() for item in body.food_items]
    total_cal = sum(i["calories"] for i in items)
    total_pro = sum(i["protein"] for i in items)
    total_fib = sum(i["fiber"] for i in items)
    avg_anti = sum(i["anti_inflammatory"] for i in items) / len(items) if items else 0.0

    log = FoodLog(
        user_id=current_user.id,
        meal_type=body.meal_type,
        input_method=body.input_method,
        date=body.date,
        food_items_json=json.dumps(items, ensure_ascii=False),
        total_calories=total_cal,
        total_protein=total_pro,
        total_fiber=total_fib,
        anti_inflammatory_score=round(avg_anti, 1)
    )
    db.add(log)
    db.commit()
    db.refresh(log)
    return _build_food_log_response(log)


@router.post("/food-logs/photo", response_model=FoodLogResponse, status_code=201)
def add_food_log_from_photo(body: FoodLogPhotoRequest,
                             current_user: User = Depends(get_current_user),
                             db: Session = Depends(get_db)):
    if not check_quota(db, current_user, "food_log_photo"):
        raise HTTPException(status_code=402, detail="Trial limit reached. Please upgrade to Pro.")
    from services.claude_service import analyze_food_photo
    today = date.today().isoformat()
    nutrition = analyze_food_photo(body.image_base64)
    items = nutrition.get("items", [])

    log = FoodLog(
        user_id=current_user.id,
        meal_type=body.meal_type,
        input_method="photo",
        date=today,
        food_items_json=json.dumps(items, ensure_ascii=False),
        total_calories=nutrition.get("total_calories", 0.0),
        total_protein=nutrition.get("total_protein", 0.0),
        total_fiber=nutrition.get("total_fiber", 0.0),
        anti_inflammatory_score=nutrition.get("anti_inflammatory_score", 0.0)
    )
    db.add(log)
    db.commit()
    db.refresh(log)
    increment_quota(db, current_user.id, "food_log_photo")
    return _build_food_log_response(log)


@router.get("/food-logs", response_model=List[FoodLogResponse])
def get_food_logs(date: str = None,
                  current_user: User = Depends(get_current_user),
                  db: Session = Depends(get_db)):
    query = db.query(FoodLog).filter(FoodLog.user_id == current_user.id)
    if date:
        query = query.filter(FoodLog.date == date)
    return [_build_food_log_response(l) for l in query.order_by(FoodLog.logged_at).all()]


@router.post("/body-metrics", response_model=BodyMetricResponse, status_code=201)
def record_body_metric(body: BodyMetricRequest,
                       current_user: User = Depends(get_current_user),
                       db: Session = Depends(get_db)):
    # 同日更新而非新增
    existing = db.query(BodyMetric).filter_by(user_id=current_user.id, date=body.date).first()
    if existing:
        if body.weight is not None:
            existing.weight = body.weight
        if body.body_fat_pct is not None:
            existing.body_fat_pct = body.body_fat_pct
        db.commit()
        db.refresh(existing)
        metric = existing
    else:
        metric = BodyMetric(user_id=current_user.id, date=body.date,
                            weight=body.weight, body_fat_pct=body.body_fat_pct)
        db.add(metric)
        db.commit()
        db.refresh(metric)
    return BodyMetricResponse(id=metric.id, date=metric.date, weight=metric.weight,
                               body_fat_pct=metric.body_fat_pct, recorded_at=metric.recorded_at)


@router.get("/body-metrics", response_model=List[BodyMetricResponse])
def get_body_metrics(current_user: User = Depends(get_current_user),
                     db: Session = Depends(get_db)):
    metrics = db.query(BodyMetric).filter(
        BodyMetric.user_id == current_user.id
    ).order_by(BodyMetric.date.desc()).limit(30).all()
    return [BodyMetricResponse(id=m.id, date=m.date, weight=m.weight,
                                body_fat_pct=m.body_fat_pct, recorded_at=m.recorded_at)
            for m in metrics]


@router.get("/health-summary")
def get_health_summary(period: str = "daily",
                        date: str = None,
                        current_user: User = Depends(get_current_user),
                        db: Session = Depends(get_db)):
    """period: daily | weekly | monthly"""
    target_date = date or str(date.__class__.today()) if date else str(__import__('datetime').date.today())

    profile = db.query(Profile).filter_by(user_id=current_user.id).first()
    target_calories = calculate_tdee(profile) if profile else 2000.0
    target_protein = (profile.weight or 65) * 1.6 if profile else 104.0

    if period == "daily":
        logs = db.query(FoodLog).filter(
            FoodLog.user_id == current_user.id,
            FoodLog.date == target_date
        ).order_by(FoodLog.logged_at).all()

        all_exercise = db.query(ExerciseLog).filter(ExerciseLog.user_id == current_user.id).all()
        today_ex = [l for l in all_exercise if l.logged_at and str(l.logged_at.date()) == target_date]
        exercise_cal = sum(l.calories_burned for l in today_ex)

        total_cal = sum(l.total_calories for l in logs)
        total_pro = sum(l.total_protein for l in logs)
        total_fib = sum(l.total_fiber for l in logs)
        avg_anti = sum(l.anti_inflammatory_score for l in logs) / len(logs) if logs else 0.0

        return DailyHealthSummary(
            date=target_date,
            total_calories=total_cal,
            target_calories=target_calories,
            total_protein=total_pro,
            target_protein=target_protein,
            total_fiber=total_fib,
            anti_inflammatory_score=round(avg_anti, 1),
            meal_count=len(logs),
            exercise_calories_burned=exercise_cal,
            logs=[_build_food_log_response(l) for l in logs]
        )

    elif period == "weekly":
        try:
            from datetime import date as date_cls
            end = date_cls.fromisoformat(target_date)
        except Exception:
            from datetime import date as date_cls
            end = date_cls.today()
        start = end - timedelta(days=6)
        dates = [(start + timedelta(days=i)).isoformat() for i in range(7)]

        daily_data = []
        total_protein_sum = total_fiber_sum = anti_sum = ex_total = 0.0
        days_with_data = 0

        all_exercise = db.query(ExerciseLog).filter(ExerciseLog.user_id == current_user.id).all()

        for d in dates:
            logs = db.query(FoodLog).filter(FoodLog.user_id == current_user.id, FoodLog.date == d).all()
            day_cal = sum(l.total_calories for l in logs)
            day_pro = sum(l.total_protein for l in logs)
            day_fib = sum(l.total_fiber for l in logs)
            day_anti = sum(l.anti_inflammatory_score for l in logs) / len(logs) if logs else 0.0
            day_ex = sum(l.calories_burned for l in all_exercise if l.logged_at and str(l.logged_at.date()) == d)
            ex_total += day_ex
            if logs:
                days_with_data += 1
                total_protein_sum += day_pro
                total_fiber_sum += day_fib
                anti_sum += day_anti
            daily_data.append({"date": d, "calories": day_cal, "exercise": day_ex})

        n = days_with_data or 1
        return WeeklyHealthSummary(
            week_start=dates[0],
            week_end=dates[-1],
            daily_calories=daily_data,
            avg_protein=round(total_protein_sum / n, 1),
            avg_fiber=round(total_fiber_sum / n, 1),
            avg_anti_inflammatory=round(anti_sum / n, 1),
            total_exercise_calories=ex_total
        )

    elif period == "monthly":
        month_str = target_date[:7]  # YYYY-MM
        logs = db.query(FoodLog).filter(
            FoodLog.user_id == current_user.id,
            FoodLog.date.startswith(month_str)
        ).all()
        metrics = db.query(BodyMetric).filter(
            BodyMetric.user_id == current_user.id,
            BodyMetric.date.startswith(month_str)
        ).order_by(BodyMetric.date).all()

        # 按周分组
        from collections import defaultdict
        weeks: dict = defaultdict(list)
        for log in logs:
            try:
                from datetime import date as date_cls
                d = date_cls.fromisoformat(log.date)
                week_num = d.isocalendar()[1]
                weeks[f"W{week_num}"].append(log.total_calories)
            except Exception:
                pass
        weekly_cals = [{"week": w, "avg_calories": round(sum(v) / len(v), 1)} for w, v in weeks.items()]

        avg_anti = sum(l.anti_inflammatory_score for l in logs) / len(logs) if logs else 0.0
        bm_list = [BodyMetricResponse(id=m.id, date=m.date, weight=m.weight,
                                       body_fat_pct=m.body_fat_pct, recorded_at=m.recorded_at)
                   for m in metrics]
        return MonthlyHealthSummary(
            month=month_str,
            weekly_calories=weekly_cals,
            body_metrics=bm_list,
            avg_anti_inflammatory=round(avg_anti, 1),
            total_days_logged=len(set(l.date for l in logs))
        )

    raise HTTPException(status_code=400, detail="period must be daily, weekly, or monthly")
```

- [ ] **Step 5: 更新 main.py — 注册 tracking 路由**

将 `healthmeal/backend/main.py` 改为：

```python
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from routers import auth, profile, exercise, admin, meal, tracking

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
app.include_router(meal.router, tags=["meal"])
app.include_router(tracking.router, tags=["tracking"])

@app.get("/health")
def health():
    return {"status": "ok"}
```

- [ ] **Step 6: 运行新测试，确认通过**

```bash
python -m pytest tests/test_tracking.py -v
```

预期：5 个测试全部 PASS

- [ ] **Step 7: 运行全部测试**

```bash
python -m pytest tests/ -v
```

预期：全部 PASS（34 个以上）

- [ ] **Step 8: Commit**

```bash
cd /Users/liuying/Desktop/lilyproject
git add healthmeal/backend/
git commit -m "feat: food log and health summary API endpoints"
```

---

## Task 4: 前端 i18n 扩展 + 追踪服务层

**Files:**
- Modify: `healthmeal/frontend/i18n/zh.ts`
- Modify: `healthmeal/frontend/i18n/en.ts`
- Create: `healthmeal/frontend/services/tracking.ts`

- [ ] **Step 1: 在 zh.ts 的 common 块之前添加 tracking 字段**

```typescript
  tracking: {
    title: "健康记录",
    addMeal: "记录饮食",
    mealType: "餐次",
    breakfast: "早餐",
    lunch: "午餐",
    dinner: "晚餐",
    snack: "加餐",
    addManual: "手动输入",
    addPhoto: "拍照记录",
    analyzing: "分析中...",
    foodName: "食物名称",
    calories: "热量 (kcal)",
    protein: "蛋白质 (g)",
    fiber: "膳食纤维 (g)",
    add: "添加",
    daily: "今日",
    weekly: "本周",
    monthly: "本月",
    totalCalories: "总热量",
    targetCalories: "目标热量",
    totalProtein: "蛋白质",
    targetProtein: "目标",
    totalFiber: "膳食纤维",
    antiInflammatory: "抗炎评分",
    exerciseBurned: "运动消耗",
    bodyMetric: "体征记录",
    weight: "体重 (kg)",
    bodyFat: "体脂率 (%)",
    record: "记录",
    noLogs: "今日还没有饮食记录",
    trend: "趋势",
  },
```

- [ ] **Step 2: 在 en.ts 的 common 块之前添加 tracking 字段**

```typescript
  tracking: {
    title: "Health Log",
    addMeal: "Log Meal",
    mealType: "Meal Type",
    breakfast: "Breakfast",
    lunch: "Lunch",
    dinner: "Dinner",
    snack: "Snack",
    addManual: "Manual Input",
    addPhoto: "Photo Log",
    analyzing: "Analyzing...",
    foodName: "Food Name",
    calories: "Calories (kcal)",
    protein: "Protein (g)",
    fiber: "Fiber (g)",
    add: "Add",
    daily: "Today",
    weekly: "This Week",
    monthly: "This Month",
    totalCalories: "Total Calories",
    targetCalories: "Target",
    totalProtein: "Protein",
    targetProtein: "Target",
    totalFiber: "Fiber",
    antiInflammatory: "Anti-Inflammatory",
    exerciseBurned: "Exercise Burned",
    bodyMetric: "Body Metrics",
    weight: "Weight (kg)",
    bodyFat: "Body Fat (%)",
    record: "Record",
    noLogs: "No meals logged today",
    trend: "Trend",
  },
```

- [ ] **Step 3: 创建 services/tracking.ts**

```typescript
import { api } from "./api"

export interface FoodItem {
  name: string
  calories: number
  protein: number
  fiber: number
  anti_inflammatory: number
}

export interface FoodLogData {
  id: number
  meal_type: string
  input_method: string
  date: string
  food_items: FoodItem[]
  total_calories: number
  total_protein: number
  total_fiber: number
  anti_inflammatory_score: number
  logged_at: string
}

export interface BodyMetricData {
  id: number
  date: string
  weight: number | null
  body_fat_pct: number | null
  recorded_at: string
}

export interface DailySummary {
  date: string
  total_calories: number
  target_calories: number | null
  total_protein: number
  target_protein: number | null
  total_fiber: number
  anti_inflammatory_score: number
  meal_count: number
  exercise_calories_burned: number
  logs: FoodLogData[]
}

export interface WeeklySummary {
  week_start: string
  week_end: string
  daily_calories: Array<{ date: string; calories: number; exercise: number }>
  avg_protein: number
  avg_fiber: number
  avg_anti_inflammatory: number
  total_exercise_calories: number
}

export interface MonthlySummary {
  month: string
  weekly_calories: Array<{ week: string; avg_calories: number }>
  body_metrics: BodyMetricData[]
  avg_anti_inflammatory: number
  total_days_logged: number
}

export async function addFoodLog(data: {
  meal_type: string
  input_method: string
  date: string
  food_items: FoodItem[]
}): Promise<FoodLogData> {
  const res = await api.post("/food-logs", data)
  return res.data
}

export async function addFoodLogFromPhoto(meal_type: string, image_base64: string): Promise<FoodLogData> {
  const res = await api.post("/food-logs/photo", { meal_type, image_base64 })
  return res.data
}

export async function getFoodLogs(date: string): Promise<FoodLogData[]> {
  const res = await api.get(`/food-logs?date=${date}`)
  return res.data
}

export async function recordBodyMetric(data: {
  date: string
  weight?: number
  body_fat_pct?: number
}): Promise<BodyMetricData> {
  const res = await api.post("/body-metrics", data)
  return res.data
}

export async function getBodyMetrics(): Promise<BodyMetricData[]> {
  const res = await api.get("/body-metrics")
  return res.data
}

export async function getDailySummary(date: string): Promise<DailySummary> {
  const res = await api.get(`/health-summary?period=daily&date=${date}`)
  return res.data
}

export async function getWeeklySummary(date: string): Promise<WeeklySummary> {
  const res = await api.get(`/health-summary?period=weekly&date=${date}`)
  return res.data
}

export async function getMonthlySummary(date: string): Promise<MonthlySummary> {
  const res = await api.get(`/health-summary?period=monthly&date=${date}`)
  return res.data
}
```

- [ ] **Step 4: Commit**

```bash
cd /Users/liuying/Desktop/lilyproject
git add healthmeal/frontend/i18n/ healthmeal/frontend/services/tracking.ts
git commit -m "feat: i18n tracking strings and tracking service layer"
```

---

## Task 5: 前端健康记录页面

**Files:**
- Create: `healthmeal/frontend/app/(tabs)/tracking.tsx`
- Modify: `healthmeal/frontend/app/(tabs)/_layout.tsx`

- [ ] **Step 1: 创建 app/(tabs)/tracking.tsx**

```typescript
import { useState, useEffect, useCallback } from "react"
import {
  View, Text, ScrollView, TouchableOpacity,
  TextInput, StyleSheet, Alert, ActivityIndicator, Modal
} from "react-native"
import * as ImagePicker from "expo-image-picker"
import {
  addFoodLog, addFoodLogFromPhoto, getFoodLogs,
  getDailySummary, getWeeklySummary, getMonthlySummary,
  recordBodyMetric,
  FoodLogData, DailySummary, WeeklySummary, MonthlySummary, FoodItem
} from "../../services/tracking"
import { zh } from "../../i18n/zh"

const t = zh.tracking
const todayStr = () => new Date().toISOString().split("T")[0]

function ProgressBar({ value, target, color = "#22c55e" }: { value: number; target: number; color?: string }) {
  const pct = Math.min((value / (target || 1)) * 100, 100)
  return (
    <View style={pb.track}>
      <View style={[pb.fill, { width: `${pct}%` as any, backgroundColor: color }]} />
    </View>
  )
}
const pb = StyleSheet.create({
  track: { height: 8, backgroundColor: "#e5e7eb", borderRadius: 4, marginVertical: 4 },
  fill: { height: 8, borderRadius: 4 },
})

export default function TrackingScreen() {
  const [tab, setTab] = useState<"daily" | "weekly" | "monthly">("daily")
  const [dailySummary, setDailySummary] = useState<DailySummary | null>(null)
  const [weeklySummary, setWeeklySummary] = useState<WeeklySummary | null>(null)
  const [monthlySummary, setMonthlySummary] = useState<MonthlySummary | null>(null)
  const [loading, setLoading] = useState(false)
  const [showAddModal, setShowAddModal] = useState(false)
  const [mealType, setMealType] = useState("breakfast")
  const [foodName, setFoodName] = useState("")
  const [calories, setCalories] = useState("")
  const [protein, setProtein] = useState("")
  const [fiber, setFiber] = useState("")
  const [analyzing, setAnalyzing] = useState(false)

  const loadData = useCallback(async () => {
    setLoading(true)
    try {
      const today = todayStr()
      if (tab === "daily") {
        const data = await getDailySummary(today)
        setDailySummary(data)
      } else if (tab === "weekly") {
        const data = await getWeeklySummary(today)
        setWeeklySummary(data)
      } else {
        const data = await getMonthlySummary(today)
        setMonthlySummary(data)
      }
    } catch {
      // 静默失败
    } finally {
      setLoading(false)
    }
  }, [tab])

  useEffect(() => { loadData() }, [loadData])

  async function handleAddManual() {
    if (!foodName.trim() || !calories) return
    try {
      await addFoodLog({
        meal_type: mealType,
        input_method: "manual",
        date: todayStr(),
        food_items: [{
          name: foodName.trim(),
          calories: parseFloat(calories) || 0,
          protein: parseFloat(protein) || 0,
          fiber: parseFloat(fiber) || 0,
          anti_inflammatory: 5
        }]
      })
      setFoodName(""); setCalories(""); setProtein(""); setFiber("")
      setShowAddModal(false)
      await loadData()
    } catch {
      Alert.alert(zh.common.error)
    }
  }

  async function handlePhoto() {
    const perm = await ImagePicker.requestCameraPermissionsAsync()
    if (!perm.granted) { Alert.alert("需要相机权限"); return }
    const result = await ImagePicker.launchCameraAsync({ base64: true, quality: 0.7 })
    if (result.canceled || !result.assets?.[0]?.base64) return
    setAnalyzing(true)
    setShowAddModal(false)
    try {
      await addFoodLogFromPhoto(mealType, result.assets[0].base64)
      await loadData()
    } catch {
      Alert.alert(zh.common.error, "分析失败，请重试")
    } finally {
      setAnalyzing(false)
    }
  }

  return (
    <View style={styles.container}>
      {/* Tab 切换 */}
      <View style={styles.tabRow}>
        {(["daily", "weekly", "monthly"] as const).map((key) => (
          <TouchableOpacity key={key} style={[styles.tabBtn, tab === key && styles.tabBtnActive]}
            onPress={() => setTab(key)}>
            <Text style={[styles.tabText, tab === key && styles.tabTextActive]}>
              {key === "daily" ? t.daily : key === "weekly" ? t.weekly : t.monthly}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {loading ? (
        <ActivityIndicator size="large" color="#22c55e" style={{ marginTop: 40 }} />
      ) : (
        <ScrollView contentContainerStyle={styles.content}>
          {/* 今日视图 */}
          {tab === "daily" && dailySummary && (
            <View>
              <View style={styles.statsCard}>
                <Text style={styles.cardTitle}>今日营养</Text>
                <Text style={styles.statLine}>{t.totalCalories}：<Text style={styles.bold}>{dailySummary.total_calories}</Text> / {dailySummary.target_calories?.toFixed(0)} kcal</Text>
                <ProgressBar value={dailySummary.total_calories} target={dailySummary.target_calories || 2000} />
                <Text style={styles.statLine}>{t.totalProtein}：<Text style={styles.bold}>{dailySummary.total_protein}g</Text> / {dailySummary.target_protein?.toFixed(0)}g</Text>
                <ProgressBar value={dailySummary.total_protein} target={dailySummary.target_protein || 100} color="#3b82f6" />
                <Text style={styles.statLine}>{t.totalFiber}：<Text style={styles.bold}>{dailySummary.total_fiber}g</Text> / 30g</Text>
                <ProgressBar value={dailySummary.total_fiber} target={30} color="#f59e0b" />
                <Text style={styles.statLine}>{t.antiInflammatory}：<Text style={styles.bold}>{dailySummary.anti_inflammatory_score}/10</Text></Text>
                <Text style={styles.statLine}>{t.exerciseBurned}：<Text style={styles.bold}>{dailySummary.exercise_calories_burned} kcal</Text></Text>
              </View>

              {dailySummary.logs.length === 0 ? (
                <Text style={styles.empty}>{t.noLogs}</Text>
              ) : (
                dailySummary.logs.map((log) => (
                  <View key={log.id} style={styles.logCard}>
                    <Text style={styles.mealLabel}>
                      {log.meal_type === "breakfast" ? t.breakfast
                        : log.meal_type === "lunch" ? t.lunch
                        : log.meal_type === "dinner" ? t.dinner : t.snack}
                    </Text>
                    {log.food_items.map((item, i) => (
                      <Text key={i} style={styles.foodItem}>{item.name} — {item.calories}kcal · 蛋白质{item.protein}g</Text>
                    ))}
                    <Text style={styles.logTotal}>合计：{log.total_calories}kcal · {log.total_protein}g蛋白</Text>
                  </View>
                ))
              )}
            </View>
          )}

          {/* 周视图 */}
          {tab === "weekly" && weeklySummary && (
            <View>
              <View style={styles.statsCard}>
                <Text style={styles.cardTitle}>本周趋势 ({weeklySummary.week_start} ~ {weeklySummary.week_end})</Text>
                <Text style={styles.statLine}>平均蛋白质：<Text style={styles.bold}>{weeklySummary.avg_protein}g/天</Text></Text>
                <Text style={styles.statLine}>平均膳食纤维：<Text style={styles.bold}>{weeklySummary.avg_fiber}g/天</Text></Text>
                <Text style={styles.statLine}>平均抗炎评分：<Text style={styles.bold}>{weeklySummary.avg_anti_inflammatory}/10</Text></Text>
                <Text style={styles.statLine}>运动总消耗：<Text style={styles.bold}>{weeklySummary.total_exercise_calories}kcal</Text></Text>
              </View>
              <View style={styles.statsCard}>
                <Text style={styles.cardTitle}>每日热量</Text>
                {weeklySummary.daily_calories.map((d) => (
                  <View key={d.date} style={styles.dayRow}>
                    <Text style={styles.dayLabel}>{d.date.slice(5)}</Text>
                    <View style={{ flex: 1, marginHorizontal: 8 }}>
                      <ProgressBar value={d.calories} target={2000} />
                    </View>
                    <Text style={styles.dayValue}>{d.calories.toFixed(0)}</Text>
                  </View>
                ))}
              </View>
            </View>
          )}

          {/* 月视图 */}
          {tab === "monthly" && monthlySummary && (
            <View>
              <View style={styles.statsCard}>
                <Text style={styles.cardTitle}>{monthlySummary.month} 月度概览</Text>
                <Text style={styles.statLine}>记录天数：<Text style={styles.bold}>{monthlySummary.total_days_logged}天</Text></Text>
                <Text style={styles.statLine}>平均抗炎评分：<Text style={styles.bold}>{monthlySummary.avg_anti_inflammatory}/10</Text></Text>
              </View>
              {monthlySummary.body_metrics.length > 0 && (
                <View style={styles.statsCard}>
                  <Text style={styles.cardTitle}>体征变化</Text>
                  {monthlySummary.body_metrics.map((m) => (
                    <Text key={m.id} style={styles.statLine}>{m.date}：{m.weight}kg · 体脂{m.body_fat_pct}%</Text>
                  ))}
                </View>
              )}
            </View>
          )}
        </ScrollView>
      )}

      {analyzing && (
        <View style={styles.overlay}>
          <ActivityIndicator size="large" color="#fff" />
          <Text style={styles.overlayText}>{t.analyzing}</Text>
        </View>
      )}

      {/* 浮动添加按钮（仅今日视图显示） */}
      {tab === "daily" && (
        <TouchableOpacity style={styles.fab} onPress={() => setShowAddModal(true)}>
          <Text style={styles.fabText}>+</Text>
        </TouchableOpacity>
      )}

      {/* 添加饮食弹窗 */}
      <Modal visible={showAddModal} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.modalBox}>
            <Text style={styles.modalTitle}>{t.addMeal}</Text>

            <Text style={styles.label}>{t.mealType}</Text>
            <View style={styles.mealTypeRow}>
              {["breakfast", "lunch", "dinner", "snack"].map((type) => (
                <TouchableOpacity key={type} style={[styles.mealTypeBtn, mealType === type && styles.mealTypeBtnActive]}
                  onPress={() => setMealType(type)}>
                  <Text style={[styles.mealTypeTxt, mealType === type && styles.mealTypeTxtActive]}>
                    {type === "breakfast" ? t.breakfast : type === "lunch" ? t.lunch : type === "dinner" ? t.dinner : t.snack}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            <TextInput style={styles.input} placeholder={t.foodName} value={foodName} onChangeText={setFoodName} />
            <TextInput style={styles.input} placeholder={t.calories} value={calories} onChangeText={setCalories} keyboardType="numeric" />
            <TextInput style={styles.input} placeholder={t.protein} value={protein} onChangeText={setProtein} keyboardType="numeric" />
            <TextInput style={styles.input} placeholder={t.fiber} value={fiber} onChangeText={setFiber} keyboardType="numeric" />

            <TouchableOpacity style={styles.addBtn} onPress={handleAddManual}>
              <Text style={styles.addBtnText}>{t.addManual}</Text>
            </TouchableOpacity>
            <TouchableOpacity style={[styles.addBtn, { backgroundColor: "#3b82f6", marginTop: 8 }]} onPress={handlePhoto}>
              <Text style={styles.addBtnText}>{t.addPhoto}</Text>
            </TouchableOpacity>
            <TouchableOpacity style={[styles.addBtn, { backgroundColor: "#9ca3af", marginTop: 8 }]} onPress={() => setShowAddModal(false)}>
              <Text style={styles.addBtnText}>{zh.common.cancel}</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </View>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#f9fafb" },
  tabRow: { flexDirection: "row", backgroundColor: "#fff", borderBottomWidth: 1, borderBottomColor: "#e5e7eb" },
  tabBtn: { flex: 1, paddingVertical: 12, alignItems: "center" },
  tabBtnActive: { borderBottomWidth: 2, borderBottomColor: "#22c55e" },
  tabText: { fontSize: 14, color: "#9ca3af" },
  tabTextActive: { color: "#22c55e", fontWeight: "600" },
  content: { padding: 16, paddingBottom: 80 },
  statsCard: { backgroundColor: "#fff", borderRadius: 12, padding: 16, marginBottom: 12 },
  cardTitle: { fontSize: 16, fontWeight: "bold", marginBottom: 10, color: "#111827" },
  statLine: { fontSize: 14, color: "#374151", marginBottom: 4 },
  bold: { fontWeight: "bold" },
  empty: { textAlign: "center", color: "#9ca3af", marginTop: 40, fontSize: 15 },
  logCard: { backgroundColor: "#fff", borderRadius: 10, padding: 14, marginBottom: 8 },
  mealLabel: { fontSize: 13, color: "#22c55e", fontWeight: "600", marginBottom: 6 },
  foodItem: { fontSize: 14, color: "#374151", marginBottom: 2 },
  logTotal: { fontSize: 13, color: "#6b7280", marginTop: 6, fontStyle: "italic" },
  dayRow: { flexDirection: "row", alignItems: "center", marginBottom: 6 },
  dayLabel: { width: 40, fontSize: 12, color: "#6b7280" },
  dayValue: { width: 40, fontSize: 12, color: "#374151", textAlign: "right" },
  overlay: { position: "absolute", top: 0, left: 0, right: 0, bottom: 0, backgroundColor: "rgba(0,0,0,0.5)", justifyContent: "center", alignItems: "center" },
  overlayText: { color: "#fff", marginTop: 12, fontSize: 15 },
  fab: { position: "absolute", bottom: 24, right: 24, width: 56, height: 56, borderRadius: 28, backgroundColor: "#22c55e", justifyContent: "center", alignItems: "center", elevation: 4 },
  fabText: { color: "#fff", fontSize: 28, lineHeight: 32 },
  modalOverlay: { flex: 1, backgroundColor: "rgba(0,0,0,0.4)", justifyContent: "flex-end" },
  modalBox: { backgroundColor: "#fff", borderTopLeftRadius: 20, borderTopRightRadius: 20, padding: 24 },
  modalTitle: { fontSize: 18, fontWeight: "bold", marginBottom: 16 },
  label: { fontSize: 13, color: "#6b7280", marginBottom: 6 },
  mealTypeRow: { flexDirection: "row", gap: 8, marginBottom: 14 },
  mealTypeBtn: { flex: 1, paddingVertical: 8, borderRadius: 8, borderWidth: 1, borderColor: "#e5e7eb", alignItems: "center" },
  mealTypeBtnActive: { backgroundColor: "#22c55e", borderColor: "#22c55e" },
  mealTypeTxt: { fontSize: 13, color: "#374151" },
  mealTypeTxtActive: { color: "#fff", fontWeight: "600" },
  input: { borderWidth: 1, borderColor: "#e5e7eb", borderRadius: 8, padding: 10, marginBottom: 10, fontSize: 15 },
  addBtn: { backgroundColor: "#22c55e", borderRadius: 8, padding: 12, alignItems: "center" },
  addBtnText: { color: "#fff", fontSize: 15, fontWeight: "600" },
})
```

- [ ] **Step 2: 更新 app/(tabs)/_layout.tsx**

```typescript
import { Tabs } from "expo-router"
import { zh } from "../../i18n/zh"

export default function TabLayout() {
  return (
    <Tabs screenOptions={{ tabBarActiveTintColor: "#22c55e" }}>
      <Tabs.Screen name="index" options={{ title: "首页" }} />
      <Tabs.Screen name="meal" options={{ title: zh.meal.title }} />
      <Tabs.Screen name="tracking" options={{ title: zh.tracking.title }} />
      <Tabs.Screen name="ingredients" options={{ title: zh.ingredients.title }} />
      <Tabs.Screen name="profile" options={{ title: zh.profile.title }} />
    </Tabs>
  )
}
```

- [ ] **Step 3: Commit**

```bash
cd /Users/liuying/Desktop/lilyproject
git add healthmeal/frontend/
git commit -m "feat: health tracking screen with daily/weekly/monthly dashboard"
```

---

## Task 6: 端到端验证

- [ ] **Step 1: 运行全部后端测试**

```bash
cd healthmeal/backend && source venv/bin/activate
python -m pytest tests/ -v
```

预期：全部 PASS（34 个以上）

- [ ] **Step 2: 验证 API 文档**

```bash
uvicorn main:app --reload --port 8001
```

访问 `http://localhost:8001/docs`，确认以下端点存在：
- `POST /food-logs`
- `POST /food-logs/photo`
- `GET /food-logs`
- `POST /body-metrics`
- `GET /body-metrics`
- `GET /health-summary`

- [ ] **Step 3: 启动前端**

```bash
cd healthmeal/frontend && npx expo start
```

用 Expo Go 验证：
1. 导航栏出现「健康记录」Tab（第三个）
2. 今日视图：点 + 按钮 → 选早餐 → 手动输入 → 提交 → 显示进度条
3. 切换本周视图 → 显示每日热量趋势

- [ ] **Step 4: 最终 Commit**

```bash
cd /Users/liuying/Desktop/lilyproject
git add .
git commit -m "feat: Phase 3 complete — food logging and health tracking dashboard"
```
