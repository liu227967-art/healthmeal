from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from typing import Optional
import json
from database import get_db
from models.user import User, Profile
from schemas.profile import ProfileRequest, ProfileResponse
from dependencies import get_current_user

router = APIRouter()


ACTIVITY_MULTIPLIERS = {
    "sedentary": 1.2,      # 久坐，几乎不运动
    "light": 1.375,        # 轻度，每周1-3次
    "moderate": 1.55,      # 中度，每周3-5次
    "active": 1.725,       # 高强度，每周6-7次
    "very_active": 1.9,    # 极高强度，体力劳动或每日训练
}

GOAL_ADJUSTMENTS = {
    "reduce_fat": None,   # -15% of TDEE, calculated dynamically
    "maintain": 0,
    "gain_muscle": 300,
}

def calculate_tdee(profile: Profile) -> Optional[float]:
    if not all([profile.weight, profile.height, profile.age, profile.gender]):
        return None
    w, h, a = profile.weight, profile.height, profile.age
    if profile.gender == "male":
        bmr = 88.36 + 13.4 * w + 4.8 * h - 5.7 * a
    else:
        bmr = 447.6 + 9.25 * w + 3.1 * h - 4.33 * a
    multiplier = ACTIVITY_MULTIPLIERS.get(profile.activity_level or "light", 1.375)
    tdee = bmr * multiplier
    if profile.goal == "reduce_fat":
        tdee = tdee * 0.85
    elif profile.goal == "gain_muscle":
        tdee = tdee + 300
    min_calories = 1500.0 if profile.gender == "male" else 1200.0
    return round(max(tdee, min_calories), 1)


@router.get("", response_model=Optional[ProfileResponse])
def get_profile(current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    profile = db.query(Profile).filter_by(user_id=current_user.id).first()
    if not profile:
        return None
    allergies = json.loads(profile.allergies) if profile.allergies else []
    return ProfileResponse(
        height=profile.height, weight=profile.weight, body_fat_pct=profile.body_fat_pct,
        age=profile.age, gender=profile.gender, goal=profile.goal,
        activity_level=profile.activity_level,
        allergies=allergies, tdee=calculate_tdee(profile)
    )


@router.put("", response_model=ProfileResponse)
def update_profile(body: ProfileRequest, current_user: User = Depends(get_current_user),
                   db: Session = Depends(get_db)):
    profile = db.query(Profile).filter_by(user_id=current_user.id).first()
    if not profile:
        profile = Profile(user_id=current_user.id)
        db.add(profile)
    for field in ["height", "weight", "body_fat_pct", "age", "gender", "goal", "activity_level"]:
        val = getattr(body, field)
        if val is not None:
            setattr(profile, field, val)
    if body.allergies is not None:
        profile.allergies = json.dumps(body.allergies, ensure_ascii=False)
    db.commit()
    db.refresh(profile)
    allergies = json.loads(profile.allergies) if profile.allergies else []
    return ProfileResponse(
        height=profile.height, weight=profile.weight, body_fat_pct=profile.body_fat_pct,
        age=profile.age, gender=profile.gender, goal=profile.goal,
        activity_level=profile.activity_level,
        allergies=allergies, tdee=calculate_tdee(profile)
    )