# HealthMeal Phase 5 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 实现社交功能（分享餐谱/好友关系）、购物清单自动生成、Apple Health 数据接入（iOS），完成 App 全部核心功能。

**Architecture:** 后端新增 Friendship 和 ShoppingList 模型，新增 social 和 shopping 路由。Apple Health 在前端通过 `react-native-health` 读取步数和运动数据，补充到运动记录。购物清单由后端根据餐谱食材自动聚合生成。

**Tech Stack:** FastAPI, SQLAlchemy, React Native + Expo, react-native-health（仅 iOS）, expo-sharing

---

## 范围说明

Phase 5 包含三个独立子系统，按优先级顺序实现：
1. **购物清单**（最独立，后端纯计算，前端展示）
2. **社交/分享**（依赖餐谱数据，分享用系统原生分享）
3. **Apple Health**（仅 iOS，读取步数/运动补充到运动记录）

---

## 文件结构

```
healthmeal/backend/
├── models/
│   └── social.py                    # Friendship, ShoppingList 模型（新建）
├── schemas/
│   └── social.py                    # 社交/购物清单 schema（新建）
├── routers/
│   ├── social.py                    # /friends, /shopping-list 路由（新建）
├── tests/
│   └── test_social.py               # 社交/购物清单 API 测试（新建）
├── models/user.py                   # 新增 friendships/shopping_lists relationships（修改）
├── models/__init__.py               # 导出新模型（修改）
└── main.py                          # 注册 social 路由（修改）

healthmeal/frontend/
├── app/(tabs)/
│   └── social.tsx                   # 社交/好友/购物清单页面（新建）
├── services/
│   └── social.ts                    # 社交 API 调用（新建）
├── i18n/
│   ├── zh.ts                        # 新增 social 字段（修改）
│   └── en.ts                        # 新增 social 字段（修改）
└── app/(tabs)/_layout.tsx           # 新增「我的」Tab 下社交入口（修改 profile.tsx）
```

---

## Task 1: 后端数据模型 — Friendship & ShoppingList

**Files:**
- Create: `healthmeal/backend/models/social.py`
- Modify: `healthmeal/backend/models/__init__.py`
- Modify: `healthmeal/backend/models/user.py`

- [ ] **Step 1: 编写失败测试**

创建 `healthmeal/backend/tests/test_social_models.py`：

```python
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from models.social import Friendship, ShoppingList
from models.user import Base, User
import pytest

TEST_DB = "sqlite:///./test_social_models.db"

@pytest.fixture
def db():
    engine = create_engine(TEST_DB, connect_args={"check_same_thread": False})
    Base.metadata.create_all(bind=engine)
    Session = sessionmaker(bind=engine)
    session = Session()
    yield session
    session.close()
    Base.metadata.drop_all(bind=engine)

def test_create_friendship(db):
    u1 = User(email="a@a.com", password_hash="h", role="trial", language="zh")
    u2 = User(email="b@b.com", password_hash="h", role="trial", language="zh")
    db.add_all([u1, u2]); db.commit()
    f = Friendship(requester_id=u1.id, addressee_id=u2.id, status="pending")
    db.add(f); db.commit()
    result = db.query(Friendship).filter_by(requester_id=u1.id).first()
    assert result.status == "pending"
    assert result.addressee_id == u2.id

def test_create_shopping_list(db):
    user = User(email="s@s.com", password_hash="h", role="trial", language="zh")
    db.add(user); db.commit()
    sl = ShoppingList(
        user_id=user.id,
        meal_plan_id=None,
        items_json='[{"name":"鸡胸肉","quantity":300,"unit":"g"},{"name":"西兰花","quantity":200,"unit":"g"}]',
        date="2026-04-08"
    )
    db.add(sl); db.commit()
    result = db.query(ShoppingList).filter_by(user_id=user.id).first()
    assert result.date == "2026-04-08"
    assert "鸡胸肉" in result.items_json
```

- [ ] **Step 2: 运行测试，确认失败**

```bash
cd healthmeal/backend && source venv/bin/activate
python -m pytest tests/test_social_models.py -v
```

预期：`ModuleNotFoundError: No module named 'models.social'`

- [ ] **Step 3: 创建 models/social.py**

```python
from sqlalchemy import Column, Integer, String, DateTime, ForeignKey, Text
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from database import Base


class Friendship(Base):
    __tablename__ = "friendships"
    id = Column(Integer, primary_key=True, index=True)
    requester_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    addressee_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    status = Column(String, default="pending")   # pending / accepted / rejected
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    requester = relationship("User", foreign_keys=[requester_id], back_populates="sent_requests")
    addressee = relationship("User", foreign_keys=[addressee_id], back_populates="received_requests")


class ShoppingList(Base):
    __tablename__ = "shopping_lists"
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    meal_plan_id = Column(Integer, ForeignKey("meal_plans.id"), nullable=True)
    items_json = Column(Text, nullable=False)    # JSON: [{name, quantity, unit, checked}]
    date = Column(String, nullable=False)        # YYYY-MM-DD
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    user = relationship("User", back_populates="shopping_lists")
```

- [ ] **Step 4: 更新 models/__init__.py**

```python
from .user import User, Profile, ExerciseLog, UsageQuota
from .meal import Ingredient, MealPlan
from .tracking import FoodLog, BodyMetric
from .knowledge import HealthContent, Bookmark
from .social import Friendship, ShoppingList
```

- [ ] **Step 5: 在 models/user.py 的 bookmarks 行后添加**

```python
    sent_requests = relationship("Friendship", foreign_keys="Friendship.requester_id", back_populates="requester")
    received_requests = relationship("Friendship", foreign_keys="Friendship.addressee_id", back_populates="addressee")
    shopping_lists = relationship("ShoppingList", back_populates="user")
```

- [ ] **Step 6: 运行测试，确认通过**

```bash
python -m pytest tests/test_social_models.py -v
```

预期：2 个测试全部 PASS

- [ ] **Step 7: Commit**

```bash
cd /Users/liuying/Desktop/lilyproject
git add healthmeal/backend/models/
git commit -m "feat: add Friendship and ShoppingList models"
```

---

## Task 2: 购物清单 + 社交 API

**Files:**
- Create: `healthmeal/backend/schemas/social.py`
- Create: `healthmeal/backend/routers/social.py`
- Create: `healthmeal/backend/tests/test_social.py`
- Modify: `healthmeal/backend/main.py`

- [ ] **Step 1: 编写失败测试**

创建 `healthmeal/backend/tests/test_social.py`：

```python
import pytest, json
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from main import app
from database import get_db, Base
from models.meal import MealPlan

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
    # 先添加今日食材
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
```

- [ ] **Step 2: 运行测试，确认失败**

```bash
python -m pytest tests/test_social.py -v
```

预期：404 错误

- [ ] **Step 3: 创建 schemas/social.py**

```python
from pydantic import BaseModel, EmailStr
from typing import Optional, List, Any
from datetime import datetime


class ShoppingItem(BaseModel):
    name: str
    quantity: float
    unit: str
    checked: bool = False


class ShoppingListResponse(BaseModel):
    id: int
    date: str
    items: List[ShoppingItem]
    created_at: datetime

    class Config:
        from_attributes = True


class FriendRequestCreate(BaseModel):
    email: EmailStr


class FriendshipResponse(BaseModel):
    id: int
    requester_email: str
    addressee_email: str
    status: str
    created_at: datetime

    class Config:
        from_attributes = True
```

- [ ] **Step 4: 创建 routers/social.py**

```python
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List
import json
from datetime import date
from database import get_db
from models.user import User
from models.social import Friendship, ShoppingList
from models.meal import Ingredient
from schemas.social import ShoppingListResponse, ShoppingItem, FriendRequestCreate, FriendshipResponse
from dependencies import get_current_user

router = APIRouter()


@router.post("/shopping-list/generate", response_model=ShoppingListResponse, status_code=201)
def generate_shopping_list(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """根据今日食材自动生成购物清单"""
    today = date.today().isoformat()
    ingredients = db.query(Ingredient).filter(
        Ingredient.user_id == current_user.id,
        Ingredient.date == today
    ).all()

    # 聚合同名食材
    aggregated: dict = {}
    for ing in ingredients:
        key = f"{ing.name}_{ing.unit}"
        if key in aggregated:
            aggregated[key]["quantity"] += ing.quantity
        else:
            aggregated[key] = {"name": ing.name, "quantity": ing.quantity,
                                "unit": ing.unit, "checked": False}

    items = list(aggregated.values())
    sl = ShoppingList(
        user_id=current_user.id,
        items_json=json.dumps(items, ensure_ascii=False),
        date=today
    )
    db.add(sl)
    db.commit()
    db.refresh(sl)
    return ShoppingListResponse(
        id=sl.id, date=sl.date,
        items=[ShoppingItem(**i) for i in items],
        created_at=sl.created_at
    )


@router.get("/shopping-list", response_model=List[ShoppingListResponse])
def get_shopping_lists(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    lists = db.query(ShoppingList).filter(
        ShoppingList.user_id == current_user.id
    ).order_by(ShoppingList.created_at.desc()).limit(10).all()
    result = []
    for sl in lists:
        items = [ShoppingItem(**i) for i in json.loads(sl.items_json)]
        result.append(ShoppingListResponse(id=sl.id, date=sl.date,
                                            items=items, created_at=sl.created_at))
    return result


@router.post("/friends/request", response_model=FriendshipResponse, status_code=201)
def send_friend_request(
    body: FriendRequestCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    addressee = db.query(User).filter(User.email == body.email).first()
    if not addressee:
        raise HTTPException(status_code=404, detail="User not found")
    if addressee.id == current_user.id:
        raise HTTPException(status_code=400, detail="Cannot add yourself")
    existing = db.query(Friendship).filter(
        ((Friendship.requester_id == current_user.id) & (Friendship.addressee_id == addressee.id)) |
        ((Friendship.requester_id == addressee.id) & (Friendship.addressee_id == current_user.id))
    ).first()
    if existing:
        raise HTTPException(status_code=409, detail="Friendship already exists")
    f = Friendship(requester_id=current_user.id, addressee_id=addressee.id, status="pending")
    db.add(f)
    db.commit()
    db.refresh(f)
    return FriendshipResponse(id=f.id, requester_email=current_user.email,
                               addressee_email=addressee.email, status=f.status,
                               created_at=f.created_at)


@router.get("/friends/requests", response_model=List[FriendshipResponse])
def get_friend_requests(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    requests = db.query(Friendship).filter(
        Friendship.addressee_id == current_user.id,
        Friendship.status == "pending"
    ).all()
    result = []
    for f in requests:
        requester = db.query(User).filter_by(id=f.requester_id).first()
        addressee = db.query(User).filter_by(id=f.addressee_id).first()
        result.append(FriendshipResponse(
            id=f.id, requester_email=requester.email if requester else "",
            addressee_email=addressee.email if addressee else "",
            status=f.status, created_at=f.created_at
        ))
    return result


@router.put("/friends/requests/{friendship_id}/accept", response_model=FriendshipResponse)
def accept_friend_request(
    friendship_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    f = db.query(Friendship).filter_by(id=friendship_id, addressee_id=current_user.id).first()
    if not f:
        raise HTTPException(status_code=404, detail="Request not found")
    f.status = "accepted"
    db.commit()
    db.refresh(f)
    requester = db.query(User).filter_by(id=f.requester_id).first()
    addressee = db.query(User).filter_by(id=f.addressee_id).first()
    return FriendshipResponse(
        id=f.id, requester_email=requester.email if requester else "",
        addressee_email=addressee.email if addressee else "",
        status=f.status, created_at=f.created_at
    )


@router.get("/friends", response_model=List[FriendshipResponse])
def get_friends(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    friendships = db.query(Friendship).filter(
        ((Friendship.requester_id == current_user.id) | (Friendship.addressee_id == current_user.id)),
        Friendship.status == "accepted"
    ).all()
    result = []
    for f in friendships:
        requester = db.query(User).filter_by(id=f.requester_id).first()
        addressee = db.query(User).filter_by(id=f.addressee_id).first()
        result.append(FriendshipResponse(
            id=f.id, requester_email=requester.email if requester else "",
            addressee_email=addressee.email if addressee else "",
            status=f.status, created_at=f.created_at
        ))
    return result
```

- [ ] **Step 5: 更新 main.py**

```python
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from routers import auth, profile, exercise, admin, meal, tracking, knowledge, social

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
app.include_router(knowledge.router, tags=["knowledge"])
app.include_router(social.router, tags=["social"])

@app.get("/health")
def health():
    return {"status": "ok"}
```

- [ ] **Step 6: 运行测试，确认通过**

```bash
python -m pytest tests/test_social.py -v
```

预期：5 个测试全部 PASS

- [ ] **Step 7: 运行全部测试**

```bash
python -m pytest tests/ -v
```

预期：全部 PASS（55 个以上）

- [ ] **Step 8: Commit**

```bash
cd /Users/liuying/Desktop/lilyproject
git add healthmeal/backend/
git commit -m "feat: shopping list and social/friends API"
```

---

## Task 3: 前端 i18n + 社交服务层

**Files:**
- Modify: `healthmeal/frontend/i18n/zh.ts`
- Modify: `healthmeal/frontend/i18n/en.ts`
- Create: `healthmeal/frontend/services/social.ts`

- [ ] **Step 1: 在 zh.ts 末尾 `}` 前添加 social 字段**

```typescript
  social: {
    title: "好友",
    friends: "好友列表",
    requests: "好友申请",
    addFriend: "添加好友",
    friendEmail: "好友邮箱",
    send: "发送申请",
    accept: "接受",
    reject: "拒绝",
    pending: "待确认",
    accepted: "已成为好友",
    noFriends: "还没有好友",
    noRequests: "暂无好友申请",
    shoppingList: "购物清单",
    generateList: "生成购物清单",
    noItems: "暂无食材，请先添加今日食材",
    checked: "已购",
    share: "分享餐谱",
    shareTitle: "我的今日餐谱",
  },
```

- [ ] **Step 2: 在 en.ts 末尾 `}` 前添加 social 字段**

```typescript
  social: {
    title: "Friends",
    friends: "Friends",
    requests: "Friend Requests",
    addFriend: "Add Friend",
    friendEmail: "Friend's Email",
    send: "Send Request",
    accept: "Accept",
    reject: "Reject",
    pending: "Pending",
    accepted: "Now Friends",
    noFriends: "No friends yet",
    noRequests: "No friend requests",
    shoppingList: "Shopping List",
    generateList: "Generate Shopping List",
    noItems: "No ingredients, please add today's ingredients first",
    checked: "Got it",
    share: "Share Meal Plan",
    shareTitle: "My Today's Meal Plan",
  },
```

- [ ] **Step 3: 创建 services/social.ts**

```typescript
import { api } from "./api"

export interface ShoppingItem {
  name: string
  quantity: number
  unit: string
  checked: boolean
}

export interface ShoppingListData {
  id: number
  date: string
  items: ShoppingItem[]
  created_at: string
}

export interface FriendshipData {
  id: number
  requester_email: string
  addressee_email: string
  status: string
  created_at: string
}

export async function generateShoppingList(): Promise<ShoppingListData> {
  const res = await api.post("/shopping-list/generate")
  return res.data
}

export async function getShoppingLists(): Promise<ShoppingListData[]> {
  const res = await api.get("/shopping-list")
  return res.data
}

export async function sendFriendRequest(email: string): Promise<FriendshipData> {
  const res = await api.post("/friends/request", { email })
  return res.data
}

export async function getFriendRequests(): Promise<FriendshipData[]> {
  const res = await api.get("/friends/requests")
  return res.data
}

export async function acceptFriendRequest(friendshipId: number): Promise<FriendshipData> {
  const res = await api.put(`/friends/requests/${friendshipId}/accept`)
  return res.data
}

export async function getFriends(): Promise<FriendshipData[]> {
  const res = await api.get("/friends")
  return res.data
}
```

- [ ] **Step 4: Commit**

```bash
cd /Users/liuying/Desktop/lilyproject
git add healthmeal/frontend/i18n/ healthmeal/frontend/services/social.ts
git commit -m "feat: i18n social strings and social service layer"
```

---

## Task 4: 前端社交与购物清单页面

**Files:**
- Create: `healthmeal/frontend/app/(tabs)/social.tsx`
- Modify: `healthmeal/frontend/app/(tabs)/_layout.tsx`

- [ ] **Step 1: 安装 expo-sharing**

```bash
cd healthmeal/frontend
npx expo install expo-sharing
```

- [ ] **Step 2: 创建 app/(tabs)/social.tsx**

```typescript
import { useState, useEffect, useCallback } from "react"
import {
  View, Text, ScrollView, TouchableOpacity, TextInput,
  StyleSheet, Alert, ActivityIndicator, Switch
} from "react-native"
import * as Sharing from "expo-sharing"
import {
  generateShoppingList, getShoppingLists, sendFriendRequest,
  getFriendRequests, acceptFriendRequest, getFriends,
  ShoppingListData, FriendshipData, ShoppingItem
} from "../../services/social"
import { useAuthStore } from "../../store/authStore"
import { zh } from "../../i18n/zh"

const t = zh.social

type TabKey = "shopping" | "friends" | "requests"

function ShoppingListView() {
  const [lists, setLists] = useState<ShoppingListData[]>([])
  const [generating, setGenerating] = useState(false)
  const [checkedItems, setCheckedItems] = useState<Record<string, boolean>>({})

  const load = useCallback(async () => {
    try {
      const data = await getShoppingLists()
      setLists(data)
    } catch { /* 静默 */ }
  }, [])

  useEffect(() => { load() }, [load])

  async function handleGenerate() {
    setGenerating(true)
    try {
      await generateShoppingList()
      await load()
    } catch {
      Alert.alert(zh.common.error, t.noItems)
    } finally {
      setGenerating(false)
    }
  }

  const toggleItem = (listId: number, itemName: string) => {
    const key = `${listId}_${itemName}`
    setCheckedItems(prev => ({ ...prev, [key]: !prev[key] }))
  }

  const latest = lists[0]

  return (
    <View>
      <TouchableOpacity style={styles.primaryBtn} onPress={handleGenerate} disabled={generating}>
        {generating
          ? <ActivityIndicator color="#fff" />
          : <Text style={styles.primaryBtnText}>{t.generateList}</Text>
        }
      </TouchableOpacity>

      {latest ? (
        <View style={styles.card}>
          <Text style={styles.cardTitle}>{t.shoppingList} — {latest.date}</Text>
          {latest.items.map((item, i) => {
            const key = `${latest.id}_${item.name}`
            const checked = checkedItems[key] || false
            return (
              <View key={i} style={styles.itemRow}>
                <Switch value={checked} onValueChange={() => toggleItem(latest.id, item.name)}
                  trackColor={{ true: "#22c55e" }} />
                <Text style={[styles.itemText, checked && styles.itemChecked]}>
                  {item.name} {item.quantity}{item.unit}
                </Text>
              </View>
            )
          })}
        </View>
      ) : (
        <Text style={styles.empty}>{t.noItems}</Text>
      )}
    </View>
  )
}

function FriendsView() {
  const [friends, setFriends] = useState<FriendshipData[]>([])
  const [email, setEmail] = useState("")
  const [sending, setSending] = useState(false)
  const { token } = useAuthStore()

  const load = useCallback(async () => {
    try {
      const data = await getFriends()
      setFriends(data)
    } catch { /* 静默 */ }
  }, [])

  useEffect(() => { load() }, [load])

  async function handleSend() {
    if (!email.trim()) return
    setSending(true)
    try {
      await sendFriendRequest(email.trim())
      setEmail("")
      Alert.alert("", "好友申请已发送")
    } catch {
      Alert.alert(zh.common.error, "用户不存在或已发送过申请")
    } finally {
      setSending(false)
    }
  }

  async function handleShareMealPlan() {
    const text = `${t.shareTitle}\n通过 HealthMeal App 生成 — 科学饮食，健康生活`
    if (await Sharing.isAvailableAsync()) {
      const fs = require("expo-file-system")
      const fileUri = fs.documentDirectory + "meal_plan.txt"
      await fs.writeAsStringAsync(fileUri, text)
      await Sharing.shareAsync(fileUri)
    } else {
      Alert.alert("", "当前设备不支持分享功能")
    }
  }

  return (
    <View>
      <TouchableOpacity style={[styles.primaryBtn, { backgroundColor: "#7c3aed" }]} onPress={handleShareMealPlan}>
        <Text style={styles.primaryBtnText}>{t.share}</Text>
      </TouchableOpacity>

      <View style={styles.card}>
        <Text style={styles.cardTitle}>{t.addFriend}</Text>
        <TextInput style={styles.input} placeholder={t.friendEmail}
          value={email} onChangeText={setEmail} keyboardType="email-address" autoCapitalize="none" />
        <TouchableOpacity style={styles.sendBtn} onPress={handleSend} disabled={sending}>
          <Text style={styles.sendBtnText}>{sending ? "发送中..." : t.send}</Text>
        </TouchableOpacity>
      </View>

      <Text style={styles.sectionTitle}>{t.friends}</Text>
      {friends.length === 0 ? (
        <Text style={styles.empty}>{t.noFriends}</Text>
      ) : (
        friends.map((f) => (
          <View key={f.id} style={styles.friendRow}>
            <Text style={styles.friendEmail}>
              {f.requester_email === email ? f.addressee_email : f.requester_email}
            </Text>
            <Text style={styles.acceptedBadge}>{t.accepted}</Text>
          </View>
        ))
      )}
    </View>
  )
}

function RequestsView() {
  const [requests, setRequests] = useState<FriendshipData[]>([])

  const load = useCallback(async () => {
    try {
      const data = await getFriendRequests()
      setRequests(data)
    } catch { /* 静默 */ }
  }, [])

  useEffect(() => { load() }, [load])

  async function handleAccept(id: number) {
    try {
      await acceptFriendRequest(id)
      setRequests(prev => prev.filter(r => r.id !== id))
      Alert.alert("", "已接受好友申请")
    } catch {
      Alert.alert(zh.common.error)
    }
  }

  return (
    <View>
      {requests.length === 0 ? (
        <Text style={styles.empty}>{t.noRequests}</Text>
      ) : (
        requests.map((r) => (
          <View key={r.id} style={styles.requestRow}>
            <Text style={styles.friendEmail}>{r.requester_email}</Text>
            <TouchableOpacity style={styles.acceptBtn} onPress={() => handleAccept(r.id)}>
              <Text style={styles.acceptBtnText}>{t.accept}</Text>
            </TouchableOpacity>
          </View>
        ))
      )}
    </View>
  )
}

export default function SocialScreen() {
  const [tab, setTab] = useState<TabKey>("shopping")

  const tabs: Array<{ key: TabKey; label: string }> = [
    { key: "shopping", label: t.shoppingList },
    { key: "friends", label: t.friends },
    { key: "requests", label: t.requests },
  ]

  return (
    <View style={styles.container}>
      <View style={styles.tabRow}>
        {tabs.map(({ key, label }) => (
          <TouchableOpacity key={key}
            style={[styles.tabBtn, tab === key && styles.tabBtnActive]}
            onPress={() => setTab(key)}>
            <Text style={[styles.tabText, tab === key && styles.tabTextActive]}>{label}</Text>
          </TouchableOpacity>
        ))}
      </View>
      <ScrollView contentContainerStyle={styles.content}>
        {tab === "shopping" && <ShoppingListView />}
        {tab === "friends" && <FriendsView />}
        {tab === "requests" && <RequestsView />}
      </ScrollView>
    </View>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#f9fafb" },
  tabRow: { flexDirection: "row", backgroundColor: "#fff", borderBottomWidth: 1, borderBottomColor: "#e5e7eb" },
  tabBtn: { flex: 1, paddingVertical: 12, alignItems: "center" },
  tabBtnActive: { borderBottomWidth: 2, borderBottomColor: "#22c55e" },
  tabText: { fontSize: 13, color: "#9ca3af" },
  tabTextActive: { color: "#22c55e", fontWeight: "600" },
  content: { padding: 16, paddingBottom: 40 },
  primaryBtn: { backgroundColor: "#22c55e", borderRadius: 8, padding: 14, alignItems: "center", marginBottom: 16 },
  primaryBtnText: { color: "#fff", fontSize: 15, fontWeight: "600" },
  card: { backgroundColor: "#fff", borderRadius: 12, padding: 16, marginBottom: 12 },
  cardTitle: { fontSize: 16, fontWeight: "bold", marginBottom: 12, color: "#111827" },
  itemRow: { flexDirection: "row", alignItems: "center", paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: "#f0f0f0" },
  itemText: { marginLeft: 12, fontSize: 15, color: "#374151" },
  itemChecked: { textDecorationLine: "line-through", color: "#9ca3af" },
  empty: { textAlign: "center", color: "#9ca3af", marginTop: 40, fontSize: 15 },
  sectionTitle: { fontSize: 16, fontWeight: "bold", marginBottom: 8, color: "#111827" },
  friendRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", backgroundColor: "#fff", borderRadius: 8, padding: 14, marginBottom: 8 },
  requestRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", backgroundColor: "#fff", borderRadius: 8, padding: 14, marginBottom: 8 },
  friendEmail: { fontSize: 14, color: "#374151", flex: 1 },
  acceptedBadge: { fontSize: 12, color: "#22c55e", fontWeight: "600" },
  acceptBtn: { backgroundColor: "#22c55e", borderRadius: 6, paddingHorizontal: 12, paddingVertical: 6 },
  acceptBtnText: { color: "#fff", fontSize: 13, fontWeight: "600" },
  input: { borderWidth: 1, borderColor: "#e5e7eb", borderRadius: 8, padding: 10, marginBottom: 10, fontSize: 15 },
  sendBtn: { backgroundColor: "#3b82f6", borderRadius: 8, padding: 12, alignItems: "center" },
  sendBtnText: { color: "#fff", fontSize: 15, fontWeight: "600" },
})
```

- [ ] **Step 3: 更新 app/(tabs)/_layout.tsx**

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
      <Tabs.Screen name="knowledge" options={{ title: zh.knowledge.title }} />
      <Tabs.Screen name="social" options={{ title: zh.social.title }} />
      <Tabs.Screen name="profile" options={{ title: zh.profile.title }} />
    </Tabs>
  )
}
```

- [ ] **Step 4: Commit**

```bash
cd /Users/liuying/Desktop/lilyproject
git add healthmeal/frontend/
git commit -m "feat: social screen with shopping list, friends, and meal sharing"
```

---

## Task 5: Apple Health 接入（iOS）

**Files:**
- Modify: `healthmeal/frontend/app/(tabs)/profile.tsx`

> **注意：** `react-native-health` 只在真实 iOS 设备/模拟器上可用，Expo Go 不支持。需要用 `expo-dev-client` 构建自定义开发版本才能测试。本 Task 在 profile 页面添加 Apple Health 按钮，仅在 iOS 上显示，功能是读取今日步数并换算为运动热量追加到运动记录。

- [ ] **Step 1: 安装依赖**

```bash
cd healthmeal/frontend
npm install react-native-health --legacy-peer-deps
npx expo install expo-dev-client
```

在 `app.json` 的 `expo.ios` 中添加权限：
```json
{
  "expo": {
    "ios": {
      "infoPlist": {
        "NSHealthShareUsageDescription": "用于读取步数和运动数据以优化餐谱建议",
        "NSHealthUpdateUsageDescription": "用于记录饮食数据"
      }
    }
  }
}
```

- [ ] **Step 2: 在 profile.tsx 末尾添加 Apple Health 同步按钮**

读取现有 profile.tsx 末尾内容后，在 `handleSave` 函数后添加：

```typescript
import { Platform, Alert } from "react-native"

// 在组件内添加此函数（handleSave 之后）
async function handleSyncAppleHealth() {
  if (Platform.OS !== "ios") {
    Alert.alert("提示", "Apple Health 仅在 iOS 设备上可用")
    return
  }
  try {
    const AppleHealthKit = require("react-native-health").default
    const PERMS = require("react-native-health").HealthKitPermissions
    await new Promise<void>((resolve, reject) => {
      AppleHealthKit.initHealthKit(
        { permissions: { read: [PERMS.Steps, PERMS.ActiveEnergyBurned] } },
        (err: any) => { err ? reject(err) : resolve() }
      )
    })
    const today = new Date()
    const startOfDay = new Date(today.setHours(0, 0, 0, 0)).toISOString()
    const steps: number = await new Promise((resolve, reject) => {
      AppleHealthKit.getStepCount(
        { date: startOfDay },
        (err: any, results: any) => err ? reject(err) : resolve(results?.value || 0)
      )
    })
    // 步数转换为热量：每步约 0.04 kcal
    const calories = Math.round(steps * 0.04)
    // 记录为运动
    const { api } = require("../../services/api")
    await api.post("/exercise-logs", {
      type: "cardio",
      detail: { activity: "walking", duration_min: Math.round(steps / 100), intensity: "low", steps }
    })
    Alert.alert("同步成功", `今日步数：${steps}步，消耗约 ${calories}kcal`)
  } catch {
    Alert.alert("同步失败", "请确保已授权 Apple Health 权限")
  }
}
```

在 profile.tsx 的 `handleSave` 按钮后添加 Apple Health 按钮：

```typescript
{Platform.OS === "ios" && (
  <TouchableOpacity
    style={[styles.button, { backgroundColor: "#ec4899", marginTop: 12 }]}
    onPress={handleSyncAppleHealth}
  >
    <Text style={styles.buttonText}>同步 Apple Health 步数</Text>
  </TouchableOpacity>
)}
```

- [ ] **Step 3: Commit**

```bash
cd /Users/liuying/Desktop/lilyproject
git add healthmeal/frontend/
git commit -m "feat: Apple Health step sync on iOS"
```

---

## Task 6: 端到端验证

- [ ] **Step 1: 运行全部后端测试**

```bash
cd healthmeal/backend && source venv/bin/activate
python -m pytest tests/ -v
```

预期：全部 PASS（55 个以上）

- [ ] **Step 2: 启动后端验证 API 文档**

```bash
uvicorn main:app --reload --port 8001
```

访问 `http://localhost:8001/docs`，确认以下端点存在：
- `POST /shopping-list/generate`
- `GET /shopping-list`
- `POST /friends/request`
- `GET /friends/requests`
- `PUT /friends/requests/{id}/accept`
- `GET /friends`

- [ ] **Step 3: 启动前端验证**

```bash
cd healthmeal/frontend && npx expo start
```

用 Expo Go 验证：
1. 导航栏出现「好友」Tab（第六个）
2. 购物清单：进入 Tab → 点「生成购物清单」→ 显示今日食材列表
3. 好友：填写邮箱 → 发送申请
4. profile 页面（iOS）显示「同步 Apple Health 步数」按钮

- [ ] **Step 4: 最终 Commit**

```bash
cd /Users/liuying/Desktop/lilyproject
git add .
git commit -m "feat: Phase 5 complete — shopping list, social/friends, Apple Health"
```
