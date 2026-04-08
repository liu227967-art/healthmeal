from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List
import json
from datetime import date, timedelta
from collections import defaultdict
from database import get_db
from models.user import User, Profile, ExerciseLog
from models.tracking import FoodLog, BodyMetric
from schemas.tracking import (
    FoodLogRequest, FoodLogPhotoRequest, FoodLogResponse,
    BodyMetricRequest, BodyMetricResponse,
    DailyHealthSummary, WeeklyHealthSummary, MonthlyHealthSummary
)
from dependencies import get_current_user
from services.quota_service import check_quota, increment_quota
from routers.profile import calculate_tdee

router = APIRouter()


def _build_food_log_response(log: FoodLog) -> FoodLogResponse:
    return FoodLogResponse(
        id=log.id,
        meal_type=log.meal_type,
        input_method=log.input_method,
        date=log.date,
        food_items=json.loads(log.food_items_json),
        total_calories=log.total_calories,
        total_protein=log.total_protein,
        total_fiber=log.total_fiber,
        anti_inflammatory_score=log.anti_inflammatory_score,
        logged_at=log.logged_at
    )


@router.post("/food-logs", response_model=FoodLogResponse, status_code=201)
def add_food_log(body: FoodLogRequest,
                 current_user: User = Depends(get_current_user),
                 db: Session = Depends(get_db)):
    items = [item.model_dump() for item in body.food_items]
    total_cal = sum(i["calories"] for i in items)
    total_pro = sum(i["protein"] for i in items)
    total_fib = sum(i["fiber"] for i in items)
    avg_anti = sum(i["anti_inflammatory"] for i in items) / len(items) if items else 0.0

    log = FoodLog(
        user_id=current_user.id,
        meal_type=body.meal_type,
        input_method=body.input_method,
        date=body.date,
        food_items_json=json.dumps(items, ensure_ascii=False),
        total_calories=total_cal,
        total_protein=total_pro,
        total_fiber=total_fib,
        anti_inflammatory_score=round(avg_anti, 1)
    )
    db.add(log)
    db.commit()
    db.refresh(log)
    return _build_food_log_response(log)


@router.post("/food-logs/photo", response_model=FoodLogResponse, status_code=201)
def add_food_log_from_photo(body: FoodLogPhotoRequest,
                             current_user: User = Depends(get_current_user),
                             db: Session = Depends(get_db)):
    if not check_quota(db, current_user, "food_log_photo"):
        raise HTTPException(status_code=402, detail="Trial limit reached. Please upgrade to Pro.")
    from services.claude_service import analyze_food_photo
    today = date.today().isoformat()
    nutrition = analyze_food_photo(body.image_base64)
    items = nutrition.get("items", [])

    log = FoodLog(
        user_id=current_user.id,
        meal_type=body.meal_type,
        input_method="photo",
        date=today,
        food_items_json=json.dumps(items, ensure_ascii=False),
        total_calories=nutrition.get("total_calories", 0.0),
        total_protein=nutrition.get("total_protein", 0.0),
        total_fiber=nutrition.get("total_fiber", 0.0),
        anti_inflammatory_score=nutrition.get("anti_inflammatory_score", 0.0)
    )
    db.add(log)
    db.commit()
    db.refresh(log)
    increment_quota(db, current_user.id, "food_log_photo")
    return _build_food_log_response(log)


@router.get("/food-logs", response_model=List[FoodLogResponse])
def get_food_logs(date: str = None,
                  current_user: User = Depends(get_current_user),
                  db: Session = Depends(get_db)):
    query = db.query(FoodLog).filter(FoodLog.user_id == current_user.id)
    if date:
        query = query.filter(FoodLog.date == date)
    return [_build_food_log_response(l) for l in query.order_by(FoodLog.logged_at).all()]


@router.post("/body-metrics", response_model=BodyMetricResponse, status_code=201)
def record_body_metric(body: BodyMetricRequest,
                       current_user: User = Depends(get_current_user),
                       db: Session = Depends(get_db)):
    existing = db.query(BodyMetric).filter_by(user_id=current_user.id, date=body.date).first()
    if existing:
        if body.weight is not None:
            existing.weight = body.weight
        if body.body_fat_pct is not None:
            existing.body_fat_pct = body.body_fat_pct
        db.commit()
        db.refresh(existing)
        metric = existing
    else:
        metric = BodyMetric(user_id=current_user.id, date=body.date,
                            weight=body.weight, body_fat_pct=body.body_fat_pct)
        db.add(metric)
        db.commit()
        db.refresh(metric)
    return BodyMetricResponse(id=metric.id, date=metric.date, weight=metric.weight,
                               body_fat_pct=metric.body_fat_pct, recorded_at=metric.recorded_at)


@router.get("/body-metrics", response_model=List[BodyMetricResponse])
def get_body_metrics(current_user: User = Depends(get_current_user),
                     db: Session = Depends(get_db)):
    metrics = db.query(BodyMetric).filter(
        BodyMetric.user_id == current_user.id
    ).order_by(BodyMetric.date.desc()).limit(30).all()
    return [BodyMetricResponse(id=m.id, date=m.date, weight=m.weight,
                                body_fat_pct=m.body_fat_pct, recorded_at=m.recorded_at)
            for m in metrics]


@router.get("/health-summary")
def get_health_summary(period: str = "daily",
                        date: str = None,
                        current_user: User = Depends(get_current_user),
                        db: Session = Depends(get_db)):
    from datetime import date as date_cls
    target_date = date if date else date_cls.today().isoformat()

    profile = db.query(Profile).filter_by(user_id=current_user.id).first()
    target_calories = calculate_tdee(profile) if profile else 2000.0
    target_protein = (profile.weight or 65) * 1.6 if profile else 104.0

    if period == "daily":
        logs = db.query(FoodLog).filter(
            FoodLog.user_id == current_user.id,
            FoodLog.date == target_date
        ).order_by(FoodLog.logged_at).all()

        all_exercise = db.query(ExerciseLog).filter(ExerciseLog.user_id == current_user.id).all()
        today_ex = [l for l in all_exercise if l.logged_at and str(l.logged_at.date()) == target_date]
        exercise_cal = sum(l.calories_burned for l in today_ex)

        total_cal = sum(l.total_calories for l in logs)
        total_pro = sum(l.total_protein for l in logs)
        total_fib = sum(l.total_fiber for l in logs)
        avg_anti = sum(l.anti_inflammatory_score for l in logs) / len(logs) if logs else 0.0

        return DailyHealthSummary(
            date=target_date,
            total_calories=total_cal,
            target_calories=target_calories,
            total_protein=total_pro,
            target_protein=target_protein,
            total_fiber=total_fib,
            anti_inflammatory_score=round(avg_anti, 1),
            meal_count=len(logs),
            exercise_calories_burned=exercise_cal,
            logs=[_build_food_log_response(l) for l in logs]
        )

    elif period == "weekly":
        try:
            end = date_cls.fromisoformat(target_date)
        except Exception:
            end = date_cls.today()
        start = end - timedelta(days=6)
        dates = [(start + timedelta(days=i)).isoformat() for i in range(7)]

        daily_data = []
        total_protein_sum = total_fiber_sum = anti_sum = ex_total = 0.0
        days_with_data = 0
        all_exercise = db.query(ExerciseLog).filter(ExerciseLog.user_id == current_user.id).all()

        for d in dates:
            logs = db.query(FoodLog).filter(FoodLog.user_id == current_user.id, FoodLog.date == d).all()
            day_cal = sum(l.total_calories for l in logs)
            day_pro = sum(l.total_protein for l in logs)
            day_fib = sum(l.total_fiber for l in logs)
            day_anti = sum(l.anti_inflammatory_score for l in logs) / len(logs) if logs else 0.0
            day_ex = sum(l.calories_burned for l in all_exercise if l.logged_at and str(l.logged_at.date()) == d)
            ex_total += day_ex
            if logs:
                days_with_data += 1
                total_protein_sum += day_pro
                total_fiber_sum += day_fib
                anti_sum += day_anti
            daily_data.append({"date": d, "calories": day_cal, "exercise": day_ex})

        n = days_with_data or 1
        return WeeklyHealthSummary(
            week_start=dates[0],
            week_end=dates[-1],
            daily_calories=daily_data,
            avg_protein=round(total_protein_sum / n, 1),
            avg_fiber=round(total_fiber_sum / n, 1),
            avg_anti_inflammatory=round(anti_sum / n, 1),
            total_exercise_calories=ex_total
        )

    elif period == "monthly":
        month_str = target_date[:7]
        logs = db.query(FoodLog).filter(
            FoodLog.user_id == current_user.id,
            FoodLog.date.startswith(month_str)
        ).all()
        metrics = db.query(BodyMetric).filter(
            BodyMetric.user_id == current_user.id,
            BodyMetric.date.startswith(month_str)
        ).order_by(BodyMetric.date).all()

        weeks: dict = defaultdict(list)
        for log in logs:
            try:
                from datetime import date as date_cls2
                d = date_cls2.fromisoformat(log.date)
                week_num = d.isocalendar()[1]
                weeks[f"W{week_num}"].append(log.total_calories)
            except Exception:
                pass
        weekly_cals = [{"week": w, "avg_calories": round(sum(v) / len(v), 1)} for w, v in weeks.items()]

        avg_anti = sum(l.anti_inflammatory_score for l in logs) / len(logs) if logs else 0.0
        bm_list = [BodyMetricResponse(id=m.id, date=m.date, weight=m.weight,
                                       body_fat_pct=m.body_fat_pct, recorded_at=m.recorded_at)
                   for m in metrics]
        return MonthlyHealthSummary(
            month=month_str,
            weekly_calories=weekly_cals,
            body_metrics=bm_list,
            avg_anti_inflammatory=round(avg_anti, 1),
            total_days_logged=len(set(l.date for l in logs))
        )

    raise HTTPException(status_code=400, detail="period must be daily, weekly, or monthly")
