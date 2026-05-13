from pydantic import BaseModel
from typing import Any
from datetime import datetime


class ExerciseLogRequest(BaseModel):
    type: str   # cardio / strength
    detail: dict[str, Any]
    date: str   # YYYY-MM-DD


class ExerciseLogResponse(BaseModel):
    id: int
    type: str
    detail: dict[str, Any]
    calories_burned: float
    date: str
    logged_at: datetime

    class Config:
        from_attributes = True
