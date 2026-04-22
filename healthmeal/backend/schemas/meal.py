from pydantic import BaseModel
from typing import Optional, List, Any, Dict
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
    lang: str = "zh"


class MealPlanRequest(BaseModel):
    style: str
    range: str
    ingredients: list[str] = []
    date: Optional[str] = None
    lang: str = "zh"


class MealPlanResponse(BaseModel):
    id: int
    style: str
    range: str
    content: Dict[str, Any]
    total_calories: Optional[float]
    nutrients: Optional[Dict[str, Any]]
    created_at: datetime

    class Config:
        from_attributes = True
