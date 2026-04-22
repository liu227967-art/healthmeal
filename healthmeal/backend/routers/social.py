from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List, Optional
import json
from datetime import date
from database import get_db
from models.user import User
from models.social import Friendship, ShoppingList
from models.meal import Ingredient
from schemas.social import ShoppingListResponse, ShoppingItem, FriendRequestCreate, FriendshipResponse
from dependencies import get_current_user
from pydantic import BaseModel

router = APIRouter()


class ShoppingListRequest(BaseModel):
    lang: str = "zh"


@router.post("/shopping-list/generate", response_model=ShoppingListResponse, status_code=201)
def generate_shopping_list(
    body: ShoppingListRequest = ShoppingListRequest(),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    from models.meal import MealPlan
    today = date.today().isoformat()

    # 优先找当前语言的餐谱，找不到就用最新的
    meal_plan = db.query(MealPlan).filter(
        MealPlan.user_id == current_user.id,
        MealPlan.lang == body.lang
    ).order_by(MealPlan.created_at.desc()).first()
    if not meal_plan:
        meal_plan = db.query(MealPlan).filter(
            MealPlan.user_id == current_user.id
        ).order_by(MealPlan.created_at.desc()).first()

    # 从餐谱中提取所需食材
    plan_ingredients: dict = {}
    if meal_plan:
        content = json.loads(meal_plan.content_json)
        for meal_key in ["breakfast", "lunch", "dinner"]:
            meal = content.get(meal_key)
            if not meal:
                continue
            for ing_str in (meal.get("ingredients") or []):
                # 格式如 "鸡胸肉 150g"，解析名称和数量
                parts = ing_str.rsplit(" ", 1)
                name = parts[0].strip()
                qty_str = parts[1].strip() if len(parts) > 1 else "适量"
                # 提取数字和单位
                import re
                m = re.match(r"([\d.]+)(\D+)", qty_str)
                if m:
                    qty = float(m.group(1))
                    unit = m.group(2).strip()
                else:
                    qty = 0.0
                    unit = qty_str
                key = name
                if key in plan_ingredients:
                    plan_ingredients[key]["quantity"] += qty
                else:
                    plan_ingredients[key] = {"name": name, "quantity": qty, "unit": unit, "checked": False}

    # 获取已有食材
    existing = db.query(Ingredient).filter(
        Ingredient.user_id == current_user.id,
        Ingredient.date == today
    ).all()
    existing_names = {ing.name for ing in existing}

    # 购物清单 = 餐谱需要但还没有的食材
    if plan_ingredients:
        items = [v for k, v in plan_ingredients.items() if k not in existing_names]
        if not items:
            # 已有所有食材，返回完整餐谱食材清单供参考
            items = list(plan_ingredients.values())
    else:
        # 没有餐谱时，提示用户先生成餐谱
        items = []
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
