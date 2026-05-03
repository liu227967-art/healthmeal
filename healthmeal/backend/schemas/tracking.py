from pydantic import BaseModel
from typing import Optional, List, Any
from datetime import datetime


class NutritionEstimateRequest(BaseModel):
    name: str
    quantity: float
    unit: str


class NutritionEstimateResponse(BaseModel):
    calories: float
    protein: float
    fiber: float
    anti_inflammatory: float


class FoodItemInput(BaseModel):
    name: str
    calories: float
    protein: float
    fiber: float
    anti_inflammatory: float = 5.0


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
    date: str
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
    daily_calories: List[dict[str, Any]]
    avg_protein: float
    avg_fiber: float
    avg_anti_inflammatory: float
    total_exercise_calories: float


class MonthlyHealthSummary(BaseModel):
    month: str
    weekly_calories: List[dict[str, Any]]
    body_metrics: List[BodyMetricResponse]
    avg_anti_inflammatory: float
    total_days_logged: int
