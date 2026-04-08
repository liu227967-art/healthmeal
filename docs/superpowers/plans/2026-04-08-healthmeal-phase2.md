# HealthMeal Phase 2 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 实现食材管理（拍照/语音/手动三种输入）和 AI 餐谱生成（Claude API），包括完整的健康标准评分和营养素展示。

**Architecture:** 后端新增 Ingredient 和 MealPlan 数据模型，新增 Claude 服务层封装所有 AI 调用（食材图片识别、餐谱生成），通过 FastAPI 路由暴露给前端。前端新增食材管理页面和餐谱生成页面，并更新 Tab 导航。

**Tech Stack:** FastAPI, SQLAlchemy, anthropic Python SDK, React Native + Expo, expo-image-picker, expo-speech（语音输入用 Expo Speech-to-Text）

---

## 文件结构

```
healthmeal/backend/
├── models/
│   └── meal.py                     # Ingredient, MealPlan 模型（新建）
├── schemas/
│   └── meal.py                     # 食材/餐谱 schema（新建）
├── services/
│   └── claude_service.py           # Claude API 封装（新建）
├── routers/
│   └── meal.py                     # /ingredients, /meal-plans 路由（新建）
├── tests/
│   ├── test_claude_service.py      # Claude 服务测试（新建）
│   └── test_meal.py                # 食材/餐谱 API 测试（新建）
└── main.py                         # 注册新路由（修改）

healthmeal/frontend/
├── app/(tabs)/
│   ├── ingredients.tsx             # 食材管理页面（新建）
│   └── meal.tsx                    # 餐谱生成页面（新建）
├── services/
│   └── meal.ts                     # 食材/餐谱 API 调用（新建）
├── i18n/
│   ├── zh.ts                       # 增加 ingredients/meal 字段（修改）
│   └── en.ts                       # 增加 ingredients/meal 字段（修改）
└── app/(tabs)/_layout.tsx          # 增加食材/餐谱 Tab（修改）
```

---

## Task 1: 后端数据模型 — Ingredient & MealPlan

**Files:**
- Create: `healthmeal/backend/models/meal.py`
- Modify: `healthmeal/backend/models/__init__.py`

- [ ] **Step 1: 编写失败测试**

创建 `healthmeal/backend/tests/test_meal_models.py`：

```python
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from models.meal import Ingredient, MealPlan
from models.user import Base, User
import pytest

TEST_DB = "sqlite:///./test_meal_models.db"

@pytest.fixture
def db():
    engine = create_engine(TEST_DB, connect_args={"check_same_thread": False})
    Base.metadata.create_all(bind=engine)
    Session = sessionmaker(bind=engine)
    session = Session()
    yield session
    session.close()
    Base.metadata.drop_all(bind=engine)

def test_create_ingredient(db):
    user = User(email="i@i.com", password_hash="h", role="trial", language="zh")
    db.add(user); db.commit()
    ing = Ingredient(user_id=user.id, name="鸡胸肉", quantity=200.0,
                     unit="g", input_method="manual", date="2026-04-08")
    db.add(ing); db.commit()
    result = db.query(Ingredient).filter_by(user_id=user.id).first()
    assert result.name == "鸡胸肉"
    assert result.quantity == 200.0

def test_create_meal_plan(db):
    user = User(email="m@m.com", password_hash="h", role="trial", language="zh")
    db.add(user); db.commit()
    plan = MealPlan(
        user_id=user.id,
        style="mediterranean",
        range="daily",
        content_json='{"breakfast": {"name": "燕麦粥", "calories": 350}}',
        total_calories=1800.0,
        nutrients_json='{"protein": 80, "fiber": 30}'
    )
    db.add(plan); db.commit()
    result = db.query(MealPlan).filter_by(user_id=user.id).first()
    assert result.style == "mediterranean"
    assert result.total_calories == 1800.0
```

- [ ] **Step 2: 运行测试，确认失败**

```bash
cd healthmeal/backend && source venv/bin/activate
python -m pytest tests/test_meal_models.py -v
```

预期：`ModuleNotFoundError: No module named 'models.meal'`

- [ ] **Step 3: 创建 models/meal.py**

```python
from sqlalchemy import Column, Integer, String, Float, DateTime, ForeignKey, Text
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from database import Base


class Ingredient(Base):
    __tablename__ = "ingredients"
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    name = Column(String, nullable=False)
    quantity = Column(Float, nullable=False)
    unit = Column(String, default="g")          # g / ml / 个 / 片
    input_method = Column(String, default="manual")  # manual / photo / voice
    date = Column(String, nullable=False)        # YYYY-MM-DD
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    user = relationship("User", back_populates="ingredients")


class MealPlan(Base):
    __tablename__ = "meal_plans"
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    style = Column(String, nullable=False)       # mediterranean/japanese/chinese/western/other
    range = Column(String, nullable=False)       # daily/weekly/monthly
    content_json = Column(Text, nullable=False)  # 完整餐谱 JSON
    total_calories = Column(Float)
    nutrients_json = Column(Text)                # 营养素汇总 JSON
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    user = relationship("User", back_populates="meal_plans")
```

- [ ] **Step 4: 更新 models/__init__.py**

```python
from .user import User, Profile, ExerciseLog, UsageQuota
from .meal import Ingredient, MealPlan
```

- [ ] **Step 5: 更新 models/user.py — 添加 relationships**

在 `User` 类末尾添加两个关系（在 `usage_quotas` 行后）：

```python
    ingredients = relationship("Ingredient", back_populates="user")
    meal_plans = relationship("MealPlan", back_populates="user")
```

- [ ] **Step 6: 运行测试，确认通过**

```bash
python -m pytest tests/test_meal_models.py -v
```

预期：2 个测试全部 PASS

- [ ] **Step 7: Commit**

```bash
cd /Users/liuying/Desktop/lilyproject
git add healthmeal/backend/models/
git commit -m "feat: add Ingredient and MealPlan models"
```

---

## Task 2: Claude 服务层

**Files:**
- Create: `healthmeal/backend/services/claude_service.py`
- Create: `healthmeal/backend/tests/test_claude_service.py`

- [ ] **Step 1: 安装 anthropic SDK**

```bash
cd healthmeal/backend && source venv/bin/activate
pip install anthropic==0.25.0
```

在 `requirements.txt` 末尾加上：
```
anthropic==0.25.0
```

- [ ] **Step 2: 编写失败测试**

创建 `healthmeal/backend/tests/test_claude_service.py`：

```python
from unittest.mock import patch, MagicMock
from services.claude_service import identify_ingredients_from_image, generate_meal_plan

def test_identify_ingredients_returns_list():
    mock_response = MagicMock()
    mock_response.content = [MagicMock(text='[{"name":"鸡胸肉","quantity":200,"unit":"g"},{"name":"西兰花","quantity":150,"unit":"g"}]')]
    with patch("services.claude_service.client.messages.create", return_value=mock_response):
        result = identify_ingredients_from_image("base64imagedata")
    assert isinstance(result, list)
    assert len(result) == 2
    assert result[0]["name"] == "鸡胸肉"

def test_generate_meal_plan_returns_dict():
    mock_response = MagicMock()
    mock_response.content = [MagicMock(text='{"breakfast":{"name":"燕麦粥","calories":350,"protein":12,"fiber":8,"organs":["肠道","心脏"],"steps":["煮燕麦10分钟","加牛奶搅拌"]},"lunch":{"name":"鸡胸肉沙拉","calories":450,"protein":40,"fiber":6,"organs":["肌肉","肝脏"],"steps":["煮鸡胸肉","切蔬菜","混合"]},"dinner":{"name":"三文鱼蔬菜","calories":500,"protein":35,"fiber":10,"organs":["心脏","大脑"],"steps":["烤三文鱼","炒蔬菜"]},"summary":{"total_calories":1300,"protein":87,"fiber":24,"anti_inflammatory_score":8.5,"health_notes":"本餐谱富含Omega-3"}}')]
    with patch("services.claude_service.client.messages.create", return_value=mock_response):
        result = generate_meal_plan(
            profile={"weight": 65, "goal": "reduce_fat", "allergies": [], "tdee": 1600},
            ingredients=["鸡胸肉", "西兰花", "燕麦"],
            style="chinese",
            range="daily",
            exercise_calories=300
        )
    assert "breakfast" in result
    assert "summary" in result
    assert result["summary"]["protein"] > 0
```

- [ ] **Step 3: 运行测试，确认失败**

```bash
python -m pytest tests/test_claude_service.py -v
```

预期：`ModuleNotFoundError: No module named 'services.claude_service'`

- [ ] **Step 4: 创建 services/claude_service.py**

```python
import anthropic
import json
import os
from dotenv import load_dotenv

load_dotenv()

client = anthropic.Anthropic(api_key=os.getenv("ANTHROPIC_API_KEY"))
MODEL = "claude-opus-4-6"


def identify_ingredients_from_image(image_base64: str) -> list[dict]:
    """
    识别图片中的食材，返回 [{"name": str, "quantity": float, "unit": str}, ...]
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
                        "请识别图片中所有食材，估算每种食材的大概数量。"
                        "只返回 JSON 数组，格式：[{\"name\": \"食材名\", \"quantity\": 数字, \"unit\": \"g或ml或个\"}]"
                        "不要输出任何其他文字。"
                    )
                }
            ],
        }]
    )
    raw = response.content[0].text.strip()
    # 提取 JSON 数组（防止模型输出额外文字）
    start = raw.find("[")
    end = raw.rfind("]") + 1
    return json.loads(raw[start:end])


def generate_meal_plan(
    profile: dict,
    ingredients: list[str],
    style: str,
    range: str,
    exercise_calories: float = 0
) -> dict:
    """
    生成个性化餐谱。
    profile: {weight, goal, allergies, tdee}
    返回完整餐谱 dict（包含 breakfast/lunch/dinner/snack 及 summary）
    """
    style_map = {
        "mediterranean": "地中海饮食",
        "japanese": "日式料理",
        "chinese": "中式料理",
        "western": "西式料理",
        "other": "均衡饮食"
    }
    range_map = {
        "daily": "今日（早中晚三餐）",
        "weekly": "本周7天（每天三餐）",
        "monthly": "本月（按周规划）"
    }
    goal_map = {
        "reduce_fat": "减脂",
        "maintain": "维持体重",
        "gain_muscle": "增肌"
    }

    weight = profile.get("weight", 65)
    goal = profile.get("goal", "maintain")
    allergies = profile.get("allergies", [])
    tdee = profile.get("tdee", 2000)
    target_calories = tdee - exercise_calories if exercise_calories else tdee
    target_protein = round(weight * (2.0 if goal == "gain_muscle" else 1.6), 0)

    allergy_str = "、".join(allergies) if allergies else "无"
    ingredients_str = "、".join(ingredients) if ingredients else "不限"

    prompt = f"""请为我制定{range_map.get(range, "今日")}的{style_map.get(style, "均衡")}餐谱。

用户信息：
- 体重：{weight}kg，目标：{goal_map.get(goal, "维持")}
- 每日热量目标：{target_calories:.0f} kcal
- 蛋白质目标：{target_protein:.0f}g/天
- 过敏食物：{allergy_str}
- 今日可用食材：{ingredients_str}

健康标准（必须达到）：
1. 抗炎：优先使用富含Omega-3、多酚、姜黄素的食材
2. 蛋白质：每日不低于{target_protein:.0f}g
3. 维生素：覆盖A/B族/C/D/E/K
4. 矿物质：钙、铁、镁、锌、钾达标
5. 膳食纤维：每日25-35g
6. 器官健康：标注每餐对心脏/肝脏/肠道/肾脏/骨骼的益处

请只返回 JSON，不要输出其他文字。格式如下（daily范围示例）：
{{
  "breakfast": {{
    "name": "餐名",
    "calories": 数字,
    "protein": 数字（克）,
    "fiber": 数字（克）,
    "organs": ["受益器官列表"],
    "steps": ["步骤1", "步骤2"],
    "ingredients": ["食材1 100g", "食材2 50g"]
  }},
  "lunch": {{ 同上 }},
  "dinner": {{ 同上 }},
  "summary": {{
    "total_calories": 数字,
    "protein": 数字,
    "fiber": 数字,
    "anti_inflammatory_score": 0-10的评分,
    "health_notes": "一句话健康点评"
  }}
}}"""

    response = client.messages.create(
        model=MODEL,
        max_tokens=4096,
        messages=[{"role": "user", "content": prompt}]
    )
    raw = response.content[0].text.strip()
    start = raw.find("{")
    end = raw.rfind("}") + 1
    return json.loads(raw[start:end])
```

- [ ] **Step 5: 运行测试，确认通过**

```bash
python -m pytest tests/test_claude_service.py -v
```

预期：2 个测试全部 PASS

- [ ] **Step 6: Commit**

```bash
cd /Users/liuying/Desktop/lilyproject
git add healthmeal/backend/services/claude_service.py healthmeal/backend/tests/test_claude_service.py healthmeal/backend/requirements.txt
git commit -m "feat: claude service for ingredient recognition and meal plan generation"
```

---

## Task 3: 食材管理 API

**Files:**
- Create: `healthmeal/backend/schemas/meal.py`
- Create: `healthmeal/backend/routers/meal.py`
- Create: `healthmeal/backend/tests/test_meal_api.py`
- Modify: `healthmeal/backend/main.py`

- [ ] **Step 1: 编写失败测试**

创建 `healthmeal/backend/tests/test_meal_api.py`：

```python
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
```

- [ ] **Step 2: 运行测试，确认失败**

```bash
python -m pytest tests/test_meal_api.py -v
```

预期：404 错误（路由不存在）

- [ ] **Step 3: 创建 schemas/meal.py**

```python
from pydantic import BaseModel
from typing import Optional, List, Any
from datetime import datetime


class IngredientRequest(BaseModel):
    name: str
    quantity: float
    unit: str = "g"
    input_method: str = "manual"   # manual / photo / voice
    date: str                       # YYYY-MM-DD


class IngredientResponse(BaseModel):
    id: int
    name: str
    quantity: float
    unit: str
    input_method: str
    date: str
    created_at: datetime

    class Config:
        from_attributes = True


class IngredientPhotoRequest(BaseModel):
    image_base64: str               # base64 编码的图片


class MealPlanRequest(BaseModel):
    style: str                      # mediterranean/japanese/chinese/western/other
    range: str                      # daily/weekly/monthly


class MealPlanResponse(BaseModel):
    id: int
    style: str
    range: str
    content: dict[str, Any]
    total_calories: Optional[float]
    nutrients: Optional[dict[str, Any]]
    created_at: datetime

    class Config:
        from_attributes = True
```

- [ ] **Step 4: 创建 routers/meal.py**

```python
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List
import json
from datetime import date
from database import get_db
from models.user import User
from models.meal import Ingredient, MealPlan
from schemas.meal import (IngredientRequest, IngredientResponse,
                           IngredientPhotoRequest, MealPlanRequest, MealPlanResponse)
from dependencies import get_current_user
from services.quota_service import check_quota, increment_quota

router = APIRouter()


@router.post("/ingredients", response_model=IngredientResponse, status_code=201)
def add_ingredient(body: IngredientRequest,
                   current_user: User = Depends(get_current_user),
                   db: Session = Depends(get_db)):
    ing = Ingredient(
        user_id=current_user.id,
        name=body.name,
        quantity=body.quantity,
        unit=body.unit,
        input_method=body.input_method,
        date=body.date
    )
    db.add(ing)
    db.commit()
    db.refresh(ing)
    return ing


@router.get("/ingredients", response_model=List[IngredientResponse])
def get_ingredients(date: str = None,
                    current_user: User = Depends(get_current_user),
                    db: Session = Depends(get_db)):
    query = db.query(Ingredient).filter(Ingredient.user_id == current_user.id)
    if date:
        query = query.filter(Ingredient.date == date)
    return query.order_by(Ingredient.created_at.desc()).all()


@router.delete("/ingredients/{ingredient_id}", status_code=204)
def delete_ingredient(ingredient_id: int,
                      current_user: User = Depends(get_current_user),
                      db: Session = Depends(get_db)):
    ing = db.query(Ingredient).filter(
        Ingredient.id == ingredient_id,
        Ingredient.user_id == current_user.id
    ).first()
    if not ing:
        raise HTTPException(status_code=404, detail="Ingredient not found")
    db.delete(ing)
    db.commit()


@router.post("/ingredients/identify-photo", response_model=List[IngredientResponse], status_code=201)
def identify_ingredients_from_photo(body: IngredientPhotoRequest,
                                     current_user: User = Depends(get_current_user),
                                     db: Session = Depends(get_db)):
    if not check_quota(db, current_user, "ingredient_photo"):
        raise HTTPException(status_code=402, detail="Trial limit reached. Please upgrade to Pro.")
    from services.claude_service import identify_ingredients_from_image
    today = date.today().isoformat()
    items = identify_ingredients_from_image(body.image_base64)
    created = []
    for item in items:
        ing = Ingredient(
            user_id=current_user.id,
            name=item.get("name", "未知"),
            quantity=float(item.get("quantity", 100)),
            unit=item.get("unit", "g"),
            input_method="photo",
            date=today
        )
        db.add(ing)
        db.commit()
        db.refresh(ing)
        created.append(ing)
    increment_quota(db, current_user.id, "ingredient_photo")
    return created


@router.post("/meal-plans/generate", response_model=MealPlanResponse, status_code=201)
def generate_meal_plan_endpoint(body: MealPlanRequest,
                                 current_user: User = Depends(get_current_user),
                                 db: Session = Depends(get_db)):
    if not check_quota(db, current_user, "meal_plan"):
        raise HTTPException(status_code=402, detail="Trial limit reached. Please upgrade to Pro.")

    from services.claude_service import generate_meal_plan
    from routers.profile import calculate_tdee
    from routers.exercise import estimate_calories
    from models.user import Profile, ExerciseLog
    from datetime import date as date_cls
    import json as json_lib

    # 获取个人档案
    profile_obj = db.query(Profile).filter_by(user_id=current_user.id).first()
    profile_dict = {}
    if profile_obj:
        profile_dict = {
            "weight": profile_obj.weight or 65,
            "goal": profile_obj.goal or "maintain",
            "allergies": json_lib.loads(profile_obj.allergies or "[]"),
            "tdee": calculate_tdee(profile_obj) or 2000
        }

    # 获取今日运动消耗
    today_str = date_cls.today().isoformat()
    today_logs = db.query(ExerciseLog).filter(
        ExerciseLog.user_id == current_user.id
    ).all()
    today_logs = [l for l in today_logs if l.logged_at and l.logged_at.date() == date_cls.today()]
    exercise_calories = sum(l.calories_burned for l in today_logs)

    # 获取今日食材
    today_ingredients = db.query(Ingredient).filter(
        Ingredient.user_id == current_user.id,
        Ingredient.date == today_str
    ).all()
    ingredient_names = [f"{i.name} {i.quantity}{i.unit}" for i in today_ingredients]

    # 调用 Claude 生成餐谱
    content = generate_meal_plan(
        profile=profile_dict,
        ingredients=ingredient_names,
        style=body.style,
        range=body.range,
        exercise_calories=exercise_calories
    )

    summary = content.get("summary", {})
    plan = MealPlan(
        user_id=current_user.id,
        style=body.style,
        range=body.range,
        content_json=json_lib.dumps(content, ensure_ascii=False),
        total_calories=summary.get("total_calories"),
        nutrients_json=json_lib.dumps({
            "protein": summary.get("protein"),
            "fiber": summary.get("fiber"),
            "anti_inflammatory_score": summary.get("anti_inflammatory_score"),
            "health_notes": summary.get("health_notes")
        }, ensure_ascii=False)
    )
    db.add(plan)
    db.commit()
    db.refresh(plan)
    increment_quota(db, current_user.id, "meal_plan")

    return MealPlanResponse(
        id=plan.id,
        style=plan.style,
        range=plan.range,
        content=content,
        total_calories=plan.total_calories,
        nutrients=json_lib.loads(plan.nutrients_json) if plan.nutrients_json else None,
        created_at=plan.created_at
    )


@router.get("/meal-plans/history", response_model=List[MealPlanResponse])
def get_meal_plan_history(current_user: User = Depends(get_current_user),
                           db: Session = Depends(get_db)):
    plans = db.query(MealPlan).filter(
        MealPlan.user_id == current_user.id
    ).order_by(MealPlan.created_at.desc()).limit(20).all()
    result = []
    for p in plans:
        content = json.loads(p.content_json)
        nutrients = json.loads(p.nutrients_json) if p.nutrients_json else None
        result.append(MealPlanResponse(
            id=p.id, style=p.style, range=p.range, content=content,
            total_calories=p.total_calories, nutrients=nutrients, created_at=p.created_at
        ))
    return result
```

- [ ] **Step 5: 更新 main.py — 注册 meal 路由**

将 `healthmeal/backend/main.py` 改为：

```python
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from routers import auth, profile, exercise, admin, meal

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

@app.get("/health")
def health():
    return {"status": "ok"}
```

- [ ] **Step 6: 运行测试，确认通过**

```bash
python -m pytest tests/test_meal_api.py -v
```

预期：4 个测试全部 PASS

- [ ] **Step 7: 运行全部后端测试**

```bash
python -m pytest tests/ -v
```

预期：全部 PASS（25 个以上）

- [ ] **Step 8: Commit**

```bash
cd /Users/liuying/Desktop/lilyproject
git add healthmeal/backend/
git commit -m "feat: ingredients and meal plan API endpoints"
```

---

## Task 4: 前端 i18n 扩展 + 食材服务层

**Files:**
- Modify: `healthmeal/frontend/i18n/zh.ts`
- Modify: `healthmeal/frontend/i18n/en.ts`
- Create: `healthmeal/frontend/services/meal.ts`

- [ ] **Step 1: 更新 i18n/zh.ts — 添加 ingredients 和 meal 字段**

在 `common` 块之前添加：

```typescript
  ingredients: {
    title: "今日食材",
    add: "添加食材",
    addManual: "手动输入",
    addPhoto: "拍照识别",
    addVoice: "语音输入",
    name: "食材名称",
    quantity: "数量",
    unit: "单位",
    delete: "删除",
    empty: "今日还没有添加食材",
    recognizing: "识别中...",
    units: {
      g: "克",
      ml: "毫升",
      piece: "个",
      slice: "片",
    },
  },
  meal: {
    title: "餐谱",
    generate: "生成餐谱",
    style: "饮食风格",
    range: "时间范围",
    history: "历史餐谱",
    breakfast: "早餐",
    lunch: "午餐",
    dinner: "晚餐",
    totalCalories: "总热量",
    protein: "蛋白质",
    fiber: "膳食纤维",
    antiInflammatory: "抗炎评分",
    healthNotes: "健康点评",
    organs: "受益器官",
    steps: "烹饪步骤",
    generating: "AI 正在生成餐谱...",
    styles: {
      mediterranean: "地中海",
      japanese: "日料",
      chinese: "中餐",
      western: "西餐",
      other: "均衡",
    },
    ranges: {
      daily: "今日",
      weekly: "本周",
      monthly: "本月",
    },
  },
```

- [ ] **Step 2: 更新 i18n/en.ts — 添加对应英文字段**

在 `common` 块之前添加：

```typescript
  ingredients: {
    title: "Today's Ingredients",
    add: "Add Ingredient",
    addManual: "Manual Input",
    addPhoto: "Photo Recognition",
    addVoice: "Voice Input",
    name: "Ingredient Name",
    quantity: "Quantity",
    unit: "Unit",
    delete: "Delete",
    empty: "No ingredients added today",
    recognizing: "Recognizing...",
    units: {
      g: "g",
      ml: "ml",
      piece: "pc",
      slice: "slice",
    },
  },
  meal: {
    title: "Meal Plan",
    generate: "Generate Meal Plan",
    style: "Diet Style",
    range: "Time Range",
    history: "History",
    breakfast: "Breakfast",
    lunch: "Lunch",
    dinner: "Dinner",
    totalCalories: "Total Calories",
    protein: "Protein",
    fiber: "Dietary Fiber",
    antiInflammatory: "Anti-Inflammatory Score",
    healthNotes: "Health Notes",
    organs: "Beneficial Organs",
    steps: "Cooking Steps",
    generating: "AI is generating your meal plan...",
    styles: {
      mediterranean: "Mediterranean",
      japanese: "Japanese",
      chinese: "Chinese",
      western: "Western",
      other: "Balanced",
    },
    ranges: {
      daily: "Today",
      weekly: "This Week",
      monthly: "This Month",
    },
  },
```

- [ ] **Step 3: 创建 services/meal.ts**

```typescript
import { api } from "./api"

export interface IngredientData {
  id: number
  name: string
  quantity: number
  unit: string
  input_method: string
  date: string
  created_at: string
}

export interface MealContent {
  breakfast?: MealItem
  lunch?: MealItem
  dinner?: MealItem
  summary?: MealSummary
}

export interface MealItem {
  name: string
  calories: number
  protein: number
  fiber: number
  organs: string[]
  steps: string[]
  ingredients: string[]
}

export interface MealSummary {
  total_calories: number
  protein: number
  fiber: number
  anti_inflammatory_score: number
  health_notes: string
}

export interface MealPlanData {
  id: number
  style: string
  range: string
  content: MealContent
  total_calories: number | null
  nutrients: Record<string, number | string> | null
  created_at: string
}

export async function addIngredient(data: {
  name: string
  quantity: number
  unit: string
  input_method: string
  date: string
}): Promise<IngredientData> {
  const res = await api.post("/ingredients", data)
  return res.data
}

export async function getIngredients(date: string): Promise<IngredientData[]> {
  const res = await api.get(`/ingredients?date=${date}`)
  return res.data
}

export async function deleteIngredient(id: number): Promise<void> {
  await api.delete(`/ingredients/${id}`)
}

export async function identifyIngredientsFromPhoto(imageBase64: string): Promise<IngredientData[]> {
  const res = await api.post("/ingredients/identify-photo", { image_base64: imageBase64 })
  return res.data
}

export async function generateMealPlan(style: string, range: string): Promise<MealPlanData> {
  const res = await api.post("/meal-plans/generate", { style, range })
  return res.data
}

export async function getMealPlanHistory(): Promise<MealPlanData[]> {
  const res = await api.get("/meal-plans/history")
  return res.data
}
```

- [ ] **Step 4: Commit**

```bash
cd /Users/liuying/Desktop/lilyproject
git add healthmeal/frontend/i18n/ healthmeal/frontend/services/meal.ts
git commit -m "feat: i18n ingredients/meal strings and meal service"
```

---

## Task 5: 前端食材管理页面

**Files:**
- Create: `healthmeal/frontend/app/(tabs)/ingredients.tsx`

- [ ] **Step 1: 安装图片选择器依赖**

```bash
cd healthmeal/frontend
npx expo install expo-image-picker
```

- [ ] **Step 2: 创建 app/(tabs)/ingredients.tsx**

```typescript
import { useState, useEffect, useCallback } from "react"
import {
  View, Text, TextInput, TouchableOpacity, FlatList,
  StyleSheet, Alert, ActivityIndicator, Image
} from "react-native"
import * as ImagePicker from "expo-image-picker"
import { Picker } from "@react-native-picker/picker"
import {
  getIngredients, addIngredient, deleteIngredient,
  identifyIngredientsFromPhoto, IngredientData
} from "../../services/meal"
import { zh } from "../../i18n/zh"

const today = () => new Date().toISOString().split("T")[0]
const t = zh.ingredients

export default function IngredientsScreen() {
  const [ingredients, setIngredients] = useState<IngredientData[]>([])
  const [name, setName] = useState("")
  const [quantity, setQuantity] = useState("100")
  const [unit, setUnit] = useState("g")
  const [loading, setLoading] = useState(false)

  const load = useCallback(async () => {
    const data = await getIngredients(today())
    setIngredients(data)
  }, [])

  useEffect(() => { load() }, [load])

  async function handleAddManual() {
    if (!name.trim()) return
    try {
      await addIngredient({
        name: name.trim(),
        quantity: parseFloat(quantity) || 100,
        unit,
        input_method: "manual",
        date: today(),
      })
      setName("")
      setQuantity("100")
      await load()
    } catch {
      Alert.alert(zh.common.error)
    }
  }

  async function handlePhoto() {
    const perm = await ImagePicker.requestMediaLibraryPermissionsAsync()
    if (!perm.granted) {
      Alert.alert("需要相册权限")
      return
    }
    const result = await ImagePicker.launchCameraAsync({
      base64: true,
      quality: 0.7,
    })
    if (result.canceled || !result.assets[0].base64) return
    setLoading(true)
    try {
      await identifyIngredientsFromPhoto(result.assets[0].base64)
      await load()
    } catch {
      Alert.alert(zh.common.error, "识别失败，请重试")
    } finally {
      setLoading(false)
    }
  }

  async function handleDelete(id: number) {
    try {
      await deleteIngredient(id)
      await load()
    } catch {
      Alert.alert(zh.common.error)
    }
  }

  return (
    <View style={styles.container}>
      <Text style={styles.title}>{t.title}</Text>

      {/* 手动输入区 */}
      <View style={styles.inputRow}>
        <TextInput
          style={[styles.input, { flex: 2 }]}
          placeholder={t.name}
          value={name}
          onChangeText={setName}
        />
        <TextInput
          style={[styles.input, { flex: 1, marginLeft: 8 }]}
          placeholder={t.quantity}
          value={quantity}
          onChangeText={setQuantity}
          keyboardType="numeric"
        />
        <View style={{ flex: 1, marginLeft: 8 }}>
          <Picker selectedValue={unit} onValueChange={setUnit} style={styles.picker}>
            <Picker.Item label="g" value="g" />
            <Picker.Item label="ml" value="ml" />
            <Picker.Item label="个" value="个" />
            <Picker.Item label="片" value="片" />
          </Picker>
        </View>
      </View>

      <TouchableOpacity style={styles.addButton} onPress={handleAddManual}>
        <Text style={styles.addButtonText}>{t.addManual}</Text>
      </TouchableOpacity>

      <TouchableOpacity style={[styles.addButton, styles.photoButton]} onPress={handlePhoto}>
        <Text style={styles.addButtonText}>{loading ? t.recognizing : t.addPhoto}</Text>
      </TouchableOpacity>

      {loading && <ActivityIndicator size="large" color="#22c55e" style={{ marginTop: 12 }} />}

      {/* 食材列表 */}
      {ingredients.length === 0 ? (
        <Text style={styles.empty}>{t.empty}</Text>
      ) : (
        <FlatList
          data={ingredients}
          keyExtractor={(item) => item.id.toString()}
          style={styles.list}
          renderItem={({ item }) => (
            <View style={styles.item}>
              <View style={{ flex: 1 }}>
                <Text style={styles.itemName}>{item.name}</Text>
                <Text style={styles.itemSub}>{item.quantity}{item.unit} · {item.input_method}</Text>
              </View>
              <TouchableOpacity onPress={() => handleDelete(item.id)} style={styles.deleteBtn}>
                <Text style={styles.deleteText}>✕</Text>
              </TouchableOpacity>
            </View>
          )}
        />
      )}
    </View>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#fff", padding: 16 },
  title: { fontSize: 22, fontWeight: "bold", marginBottom: 16 },
  inputRow: { flexDirection: "row", alignItems: "center", marginBottom: 8 },
  input: { borderWidth: 1, borderColor: "#ddd", borderRadius: 8, padding: 10, fontSize: 15 },
  picker: { height: 44 },
  addButton: { backgroundColor: "#22c55e", borderRadius: 8, padding: 12, alignItems: "center", marginBottom: 8 },
  photoButton: { backgroundColor: "#3b82f6" },
  addButtonText: { color: "#fff", fontSize: 15, fontWeight: "600" },
  empty: { textAlign: "center", color: "#999", marginTop: 40, fontSize: 15 },
  list: { marginTop: 8 },
  item: { flexDirection: "row", alignItems: "center", paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: "#f0f0f0" },
  itemName: { fontSize: 16, fontWeight: "500" },
  itemSub: { fontSize: 13, color: "#888", marginTop: 2 },
  deleteBtn: { padding: 8 },
  deleteText: { color: "#ef4444", fontSize: 16, fontWeight: "bold" },
})
```

- [ ] **Step 3: Commit**

```bash
cd /Users/liuying/Desktop/lilyproject
git add healthmeal/frontend/
git commit -m "feat: ingredients management screen with photo recognition"
```

---

## Task 6: 前端餐谱生成页面

**Files:**
- Create: `healthmeal/frontend/app/(tabs)/meal.tsx`
- Modify: `healthmeal/frontend/app/(tabs)/_layout.tsx`

- [ ] **Step 1: 创建 app/(tabs)/meal.tsx**

```typescript
import { useState } from "react"
import {
  View, Text, ScrollView, TouchableOpacity,
  StyleSheet, Alert, ActivityIndicator
} from "react-native"
import { Picker } from "@react-native-picker/picker"
import { generateMealPlan, MealPlanData, MealItem } from "../../services/meal"
import { zh } from "../../i18n/zh"

const t = zh.meal

function MealCard({ label, meal }: { label: string; meal: MealItem }) {
  return (
    <View style={styles.card}>
      <Text style={styles.cardLabel}>{label}</Text>
      <Text style={styles.cardName}>{meal.name}</Text>
      <View style={styles.statsRow}>
        <Text style={styles.stat}>{meal.calories} kcal</Text>
        <Text style={styles.stat}>{t.protein}: {meal.protein}g</Text>
        <Text style={styles.stat}>{t.fiber}: {meal.fiber}g</Text>
      </View>
      {meal.organs?.length > 0 && (
        <Text style={styles.organs}>{t.organs}：{meal.organs.join("、")}</Text>
      )}
      {meal.steps?.length > 0 && (
        <View style={styles.steps}>
          <Text style={styles.stepsLabel}>{t.steps}</Text>
          {meal.steps.map((step, i) => (
            <Text key={i} style={styles.step}>{i + 1}. {step}</Text>
          ))}
        </View>
      )}
    </View>
  )
}

export default function MealScreen() {
  const [style, setStyle] = useState("chinese")
  const [range, setRange] = useState("daily")
  const [plan, setPlan] = useState<MealPlanData | null>(null)
  const [generating, setGenerating] = useState(false)

  async function handleGenerate() {
    setGenerating(true)
    try {
      const result = await generateMealPlan(style, range)
      setPlan(result)
    } catch {
      Alert.alert(zh.common.error, "生成失败，请检查网络或稍后重试")
    } finally {
      setGenerating(false)
    }
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Text style={styles.title}>{t.title}</Text>

      <Text style={styles.label}>{t.style}</Text>
      <Picker selectedValue={style} onValueChange={setStyle}>
        {Object.entries(t.styles).map(([key, label]) => (
          <Picker.Item key={key} label={label} value={key} />
        ))}
      </Picker>

      <Text style={styles.label}>{t.range}</Text>
      <Picker selectedValue={range} onValueChange={setRange}>
        {Object.entries(t.ranges).map(([key, label]) => (
          <Picker.Item key={key} label={label} value={key} />
        ))}
      </Picker>

      <TouchableOpacity
        style={[styles.genButton, generating && styles.genButtonDisabled]}
        onPress={handleGenerate}
        disabled={generating}
      >
        {generating
          ? <ActivityIndicator color="#fff" />
          : <Text style={styles.genButtonText}>{t.generate}</Text>
        }
      </TouchableOpacity>

      {generating && (
        <Text style={styles.generatingText}>{t.generating}</Text>
      )}

      {plan && (
        <View style={styles.result}>
          {plan.content.breakfast && (
            <MealCard label={t.breakfast} meal={plan.content.breakfast} />
          )}
          {plan.content.lunch && (
            <MealCard label={t.lunch} meal={plan.content.lunch} />
          )}
          {plan.content.dinner && (
            <MealCard label={t.dinner} meal={plan.content.dinner} />
          )}

          {plan.content.summary && (
            <View style={styles.summary}>
              <Text style={styles.summaryTitle}>每日汇总</Text>
              <Text style={styles.summaryLine}>{t.totalCalories}：{plan.content.summary.total_calories} kcal</Text>
              <Text style={styles.summaryLine}>{t.protein}：{plan.content.summary.protein}g</Text>
              <Text style={styles.summaryLine}>{t.fiber}：{plan.content.summary.fiber}g</Text>
              <Text style={styles.summaryLine}>{t.antiInflammatory}：{plan.content.summary.anti_inflammatory_score}/10</Text>
              <Text style={styles.summaryNotes}>{plan.content.summary.health_notes}</Text>
            </View>
          )}
        </View>
      )}
    </ScrollView>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#fff" },
  content: { padding: 16, paddingBottom: 40 },
  title: { fontSize: 22, fontWeight: "bold", marginBottom: 16 },
  label: { fontSize: 14, color: "#666", marginBottom: 4, marginTop: 8 },
  genButton: { backgroundColor: "#22c55e", borderRadius: 8, padding: 14, alignItems: "center", marginTop: 16, marginBottom: 8 },
  genButtonDisabled: { backgroundColor: "#86efac" },
  genButtonText: { color: "#fff", fontSize: 16, fontWeight: "600" },
  generatingText: { textAlign: "center", color: "#666", fontSize: 14, marginBottom: 16 },
  result: { marginTop: 16 },
  card: { backgroundColor: "#f9fafb", borderRadius: 12, padding: 16, marginBottom: 12 },
  cardLabel: { fontSize: 12, color: "#22c55e", fontWeight: "600", marginBottom: 4 },
  cardName: { fontSize: 18, fontWeight: "bold", marginBottom: 8 },
  statsRow: { flexDirection: "row", gap: 12, marginBottom: 8 },
  stat: { fontSize: 13, color: "#555" },
  organs: { fontSize: 13, color: "#7c3aed", marginBottom: 8 },
  steps: { marginTop: 4 },
  stepsLabel: { fontSize: 13, fontWeight: "600", color: "#374151", marginBottom: 4 },
  step: { fontSize: 13, color: "#555", lineHeight: 20 },
  summary: { backgroundColor: "#f0fdf4", borderRadius: 12, padding: 16, marginTop: 8 },
  summaryTitle: { fontSize: 16, fontWeight: "bold", color: "#166534", marginBottom: 8 },
  summaryLine: { fontSize: 14, color: "#166534", marginBottom: 4 },
  summaryNotes: { fontSize: 14, color: "#166534", marginTop: 8, fontStyle: "italic" },
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
git commit -m "feat: meal plan generation screen and ingredients tab navigation"
```

---

## Task 7: 端到端验证

- [ ] **Step 1: 启动后端**

```bash
cd healthmeal/backend && source venv/bin/activate
uvicorn main:app --reload --port 8001
```

- [ ] **Step 2: 验证 API 文档**

访问 `http://localhost:8001/docs`，确认以下端点存在：
- `POST /ingredients`
- `GET /ingredients`
- `DELETE /ingredients/{id}`
- `POST /ingredients/identify-photo`
- `POST /meal-plans/generate`
- `GET /meal-plans/history`

- [ ] **Step 3: 启动前端**

```bash
cd healthmeal/frontend && npx expo start
```

用 Expo Go 验证：
1. 导航栏出现「今日食材」和「餐谱」两个 Tab
2. 食材页：手动添加食材 → 列表显示 → 删除
3. 餐谱页：选择中餐/今日 → 点击生成 → 显示早中晚三餐 + 营养汇总

- [ ] **Step 4: 运行全部后端测试**

```bash
cd healthmeal/backend && python -m pytest tests/ -v
```

预期：全部 PASS

- [ ] **Step 5: 最终 Commit**

```bash
cd /Users/liuying/Desktop/lilyproject
git add .
git commit -m "feat: Phase 2 complete — ingredients management and AI meal plan generation"
```
