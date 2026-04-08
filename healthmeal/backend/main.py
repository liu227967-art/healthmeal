from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from routers import auth

app = FastAPI(title="HealthMeal API", version="1.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth.router, prefix="/auth", tags=["auth"])

# More routers will be added in later tasks
# from routers import profile, exercise, admin
# app.include_router(profile.router, prefix="/profile", tags=["profile"])
# app.include_router(exercise.router, prefix="/exercise-logs", tags=["exercise"])
# app.include_router(admin.router, prefix="/admin", tags=["admin"])

@app.get("/health")
def health():
    return {"status": "ok"}
