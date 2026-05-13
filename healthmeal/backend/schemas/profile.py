from pydantic import BaseModel, Field
from typing import Optional, List


class ProfileRequest(BaseModel):
    height: Optional[float] = Field(None, ge=50, le=300)
    weight: Optional[float] = Field(None, ge=20, le=500)
    body_fat_pct: Optional[float] = Field(None, ge=1, le=70)
    age: Optional[int] = Field(None, ge=1, le=120)
    gender: Optional[str] = None
    goal: Optional[str] = None
    activity_level: Optional[str] = None   # sedentary/light/moderate/active/very_active
    allergies: Optional[List[str]] = []


class ProfileResponse(BaseModel):
    height: Optional[float]
    weight: Optional[float]
    body_fat_pct: Optional[float]
    age: Optional[int]
    gender: Optional[str]
    goal: Optional[str]
    activity_level: Optional[str]
    allergies: List[str]
    tdee: Optional[float]

    class Config:
        from_attributes = True
