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
    image_base64: str


class MealPlanRequest(BaseModel):
    style: str   # mediterranean/japanese/chinese/western/other
    range: str   # daily/weekly/monthly


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
