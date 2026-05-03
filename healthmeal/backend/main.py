from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from routers import auth, profile, exercise, admin, meal, tracking, knowledge, social
from database import engine, Base
import models.user, models.meal, models.tracking, models.knowledge, models.social
import os

# 启动时自动建表
Base.metadata.create_all(bind=engine)

app = FastAPI(title="HealthMeal API", version="1.0.0")

_raw_origins = os.getenv("ALLOWED_ORIGINS", "")
allowed_origins = [o.strip() for o in _raw_origins.split(",") if o.strip()] or ["*"]

app.add_middleware(
    CORSMiddleware,
    allow_origins=allowed_origins,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth.router, prefix="/auth", tags=["auth"])
app.include_router(profile.router, prefix="/profile", tags=["profile"])
app.include_router(exercise.router, prefix="/exercise-logs", tags=["exercise"])
app.include_router(admin.router, prefix="/admin", tags=["admin"])
app.include_router(meal.router, tags=["meal"])
app.include_router(tracking.router, tags=["tracking"])
app.include_router(knowledge.router, tags=["knowledge"])
app.include_router(social.router, tags=["social"])

@app.get("/health")
def health():
    return {"status": "ok"}
