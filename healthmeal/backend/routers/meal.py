from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List
import json
from datetime import date
from database import get_db
from models.user import User
from models.meal import Ingredient, MealPlan
from schemas.meal import (IngredientRequest, IngredientResponse,
                           IngredientPhotoRequest, MealPlanRequest, MealPlanResponse)
from dependencies import get_current_user
from services.quota_service import check_quota, increment_quota

router = APIRouter()


@router.post("/ingredients", response_model=IngredientResponse, status_code=201)
def add_ingredient(body: IngredientRequest,
                   current_user: User = Depends(get_current_user),
                   db: Session = Depends(get_db)):
    ing = Ingredient(user_id=current_user.id, name=body.name, quantity=body.quantity,
                     unit=body.unit, input_method=body.input_method, date=body.date)
    db.add(ing)
    db.commit()
    db.refresh(ing)
    return ing


@router.get("/ingredients", response_model=List[IngredientResponse])
def get_ingredients(date: str = None,
                    current_user: User = Depends(get_current_user),
                    db: Session = Depends(get_db)):
    query = db.query(Ingredient).filter(Ingredient.user_id == current_user.id)
    if date:
        query = query.filter(Ingredient.date == date)
    return query.order_by(Ingredient.created_at.desc()).all()


@router.delete("/ingredients/{ingredient_id}", status_code=204)
def delete_ingredient(ingredient_id: int,
                      current_user: User = Depends(get_current_user),
                      db: Session = Depends(get_db)):
    ing = db.query(Ingredient).filter(
        Ingredient.id == ingredient_id,
        Ingredient.user_id == current_user.id
    ).first()
    if not ing:
        raise HTTPException(status_code=404, detail="Ingredient not found")
    db.delete(ing)
    db.commit()


@router.post("/ingredients/identify-photo", response_model=List[IngredientResponse], status_code=201)
def identify_ingredients_from_photo(body: IngredientPhotoRequest,
                                     current_user: User = Depends(get_current_user),
                                     db: Session = Depends(get_db)):
    if not check_quota(db, current_user, "ingredient_photo"):
        raise HTTPException(status_code=402, detail="Trial limit reached. Please upgrade to Pro.")
    from services.claude_service import identify_ingredients_from_image
    today = date.today().isoformat()
    items = identify_ingredients_from_image(body.image_base64, lang=body.lang)
    created = []
    for item in items:
        ing = Ingredient(user_id=current_user.id, name=item.get("name", "未知"),
                         quantity=float(item.get("quantity", 100)),
                         unit=item.get("unit", "g"), input_method="photo", date=today)
        db.add(ing)
        db.commit()
        db.refresh(ing)
        created.append(ing)
    increment_quota(db, current_user.id, "ingredient_photo")
    return created


@router.post("/meal-plans/generate", response_model=MealPlanResponse, status_code=201)
def generate_meal_plan_endpoint(body: MealPlanRequest,
                                 current_user: User = Depends(get_current_user),
                                 db: Session = Depends(get_db)):
    if not check_quota(db, current_user, "meal_plan"):
        raise HTTPException(status_code=402, detail="Trial limit reached. Please upgrade to Pro.")

    from services.claude_service import generate_meal_plan
    from routers.profile import calculate_tdee
    from models.user import Profile, ExerciseLog
    from datetime import date as date_cls
    import json as json_lib

    profile_obj = db.query(Profile).filter_by(user_id=current_user.id).first()
    profile_dict = {"weight": 65, "goal": "maintain", "allergies": [], "tdee": 2000}
    if profile_obj:
        profile_dict = {
            "weight": profile_obj.weight or 65,
            "goal": profile_obj.goal or "maintain",
            "allergies": json_lib.loads(profile_obj.allergies or "[]"),
            "tdee": calculate_tdee(profile_obj) or 2000
        }

    today_date = date_cls.today()
    all_logs = db.query(ExerciseLog).filter(ExerciseLog.user_id == current_user.id).all()
    today_logs = [l for l in all_logs if l.logged_at and l.logged_at.date() == today_date]
    exercise_calories = sum(l.calories_burned for l in today_logs)

    today_str = body.date or date_cls.today().isoformat()
    today_ingredients = db.query(Ingredient).filter(
        Ingredient.user_id == current_user.id,
        Ingredient.date == today_str
    ).all()
    ingredient_names = [f"{i.name} {i.quantity}{i.unit}" for i in today_ingredients]
    # 合并用户手动输入的食材
    for name in (body.ingredients or []):
        if name not in ingredient_names:
            ingredient_names.append(name)

    content = generate_meal_plan(profile=profile_dict, ingredients=ingredient_names,
                                  style=body.style, range=body.range,
                                  exercise_calories=exercise_calories, lang=body.lang)

    summary = content.get("summary", {})
    plan = MealPlan(
        user_id=current_user.id, style=body.style, range=body.range,
        lang=body.lang,
        content_json=json_lib.dumps(content, ensure_ascii=False),
        total_calories=summary.get("total_calories"),
        nutrients_json=json_lib.dumps({
            "protein": summary.get("protein"),
            "fiber": summary.get("fiber"),
            "anti_inflammatory_score": summary.get("anti_inflammatory_score"),
            "health_notes": summary.get("health_notes")
        }, ensure_ascii=False)
    )
    db.add(plan)
    db.commit()
    db.refresh(plan)
    increment_quota(db, current_user.id, "meal_plan")

    return MealPlanResponse(
        id=plan.id, style=plan.style, range=plan.range, content=content,
        total_calories=plan.total_calories,
        nutrients=json_lib.loads(plan.nutrients_json) if plan.nutrients_json else None,
        created_at=plan.created_at
    )


@router.get("/meal-plans/history", response_model=List[MealPlanResponse])
def get_meal_plan_history(current_user: User = Depends(get_current_user),
                           db: Session = Depends(get_db)):
    plans = db.query(MealPlan).filter(MealPlan.user_id == current_user.id
                                       ).order_by(MealPlan.created_at.desc()).limit(20).all()
    result = []
    for p in plans:
        content = json.loads(p.content_json)
        nutrients = json.loads(p.nutrients_json) if p.nutrients_json else None
        result.append(MealPlanResponse(
            id=p.id, style=p.style, range=p.range, content=content,
            total_calories=p.total_calories, nutrients=nutrients, created_at=p.created_at
        ))
    return result
