from pydantic import BaseModel, EmailStr
from typing import List
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
