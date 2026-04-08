from sqlalchemy.orm import Session
from models.user import User, UsageQuota
from datetime import datetime

TRIAL_LIMITS = {
    "meal_plan": 10,
    "ingredient_photo": 20,
    "food_log_photo": 30,
    "ai_summary": 15,
}

UNLIMITED_ROLES = {"owner", "family", "pro"}


def _get_or_create_quota(db: Session, user_id: int, year_month: str) -> UsageQuota:
    quota = db.query(UsageQuota).filter_by(user_id=user_id, year_month=year_month).first()
    if not quota:
        quota = UsageQuota(user_id=user_id, year_month=year_month,
                           meal_plan_count=0, ingredient_photo_count=0,
                           food_log_photo_count=0, ai_summary_count=0)
        db.add(quota)
        db.commit()
        db.refresh(quota)
    return quota


def check_quota(db: Session, user: User, action: str) -> bool:
    if user.role in UNLIMITED_ROLES:
        return True
    year_month = datetime.utcnow().strftime("%Y-%m")
    quota = _get_or_create_quota(db, user.id, year_month)
    count_field = f"{action}_count"
    current = getattr(quota, count_field, 0)
    return current < TRIAL_LIMITS.get(action, 0)


def increment_quota(db: Session, user_id: int, action: str):
    year_month = datetime.utcnow().strftime("%Y-%m")
    quota = _get_or_create_quota(db, user_id, year_month)
    count_field = f"{action}_count"
    setattr(quota, count_field, getattr(quota, count_field, 0) + 1)
    db.commit()
