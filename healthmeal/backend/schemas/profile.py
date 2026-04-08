from pydantic import BaseModel
from typing import Optional, List


class ProfileRequest(BaseModel):
    height: Optional[float] = None
    weight: Optional[float] = None
    body_fat_pct: Optional[float] = None
    age: Optional[int] = None
    gender: Optional[str] = None
    goal: Optional[str] = None
    allergies: Optional[List[str]] = []


class ProfileResponse(BaseModel):
    height: Optional[float]
    weight: Optional[float]
    body_fat_pct: Optional[float]
    age: Optional[int]
    gender: Optional[str]
    goal: Optional[str]
    allergies: List[str]
    tdee: Optional[float]

    class Config:
        from_attributes = True
