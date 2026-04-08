from pydantic import BaseModel
from typing import Any
from datetime import datetime


class ExerciseLogRequest(BaseModel):
    type: str   # cardio / strength
    detail: dict[str, Any]


class ExerciseLogResponse(BaseModel):
    id: int
    type: str
    detail: dict[str, Any]
    calories_burned: float
    logged_at: datetime

    class Config:
        from_attributes = True
