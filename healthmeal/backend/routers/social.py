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
    today = date.today().isoformat()
    ingredients = db.query(Ingredient).filter(
        Ingredient.user_id == current_user.id,
        Ingredient.date == today
    ).all()

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
