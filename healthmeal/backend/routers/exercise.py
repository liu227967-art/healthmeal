from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from sqlalchemy import cast, Date
from typing import List
import json
from datetime import date, datetime, timezone
from database import get_db
from models.user import User, ExerciseLog
from schemas.exercise import ExerciseLogRequest, ExerciseLogResponse
from dependencies import get_current_user

router = APIRouter()

CARDIO_MET = {"running": 9.8, "cycling": 7.5, "swimming": 8.0, "walking": 3.5, "default": 6.0}
STRENGTH_CAL_PER_SET = 15.0


def estimate_calories(type: str, detail: dict) -> float:
    if type == "cardio":
        met = CARDIO_MET.get(detail.get("activity", "default"), CARDIO_MET["default"])
        duration = detail.get("duration_min", 0)
        intensity_factor = {"low": 0.8, "moderate": 1.0, "high": 1.3}.get(
            detail.get("intensity", "moderate"), 1.0)
        return round(met * 3.5 * 70 / 200 * duration * intensity_factor, 1)
    elif type == "strength":
        sets = detail.get("sets", 0)
        return round(sets * STRENGTH_CAL_PER_SET, 1)
    return 0.0


@router.post("", response_model=ExerciseLogResponse, status_code=201)
def log_exercise(body: ExerciseLogRequest, current_user: User = Depends(get_current_user),
                 db: Session = Depends(get_db)):
    calories = estimate_calories(body.type, body.detail)
    log = ExerciseLog(user_id=current_user.id, type=body.type,
                      detail_json=json.dumps(body.detail, ensure_ascii=False),
                      calories_burned=calories, date=body.date)
    db.add(log)
    db.commit()
    db.refresh(log)
    return ExerciseLogResponse(id=log.id, type=log.type, detail=body.detail,
                               calories_burned=log.calories_burned, date=log.date,
                               logged_at=log.logged_at)


@router.get("/today", response_model=List[ExerciseLogResponse])
def get_today_logs(current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    today = date.today()
    today_str = today.isoformat()
    today_logs = db.query(ExerciseLog).filter(
        ExerciseLog.user_id == current_user.id,
        ExerciseLog.date == today_str
    ).all()
    return [ExerciseLogResponse(id=l.id, type=l.type, detail=json.loads(l.detail_json),
                                calories_burned=l.calories_burned, date=l.date, logged_at=l.logged_at)
            for l in today_logs]
