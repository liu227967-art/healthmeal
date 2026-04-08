from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from models.user import Base, User, Profile, ExerciseLog, UsageQuota
import pytest

TEST_DB = "sqlite:///./test.db"

@pytest.fixture
def db():
    engine = create_engine(TEST_DB, connect_args={"check_same_thread": False})
    Base.metadata.create_all(bind=engine)
    Session = sessionmaker(bind=engine)
    session = Session()
    yield session
    session.close()
    Base.metadata.drop_all(bind=engine)

def test_create_user(db):
    user = User(email="test@example.com", password_hash="hashed", role="trial", language="zh")
    db.add(user)
    db.commit()
    assert db.query(User).filter_by(email="test@example.com").first() is not None

def test_create_profile(db):
    user = User(email="p@example.com", password_hash="h", role="trial", language="zh")
    db.add(user)
    db.commit()
    profile = Profile(user_id=user.id, height=170.0, weight=65.0, body_fat_pct=20.0,
                      age=30, gender="female", goal="reduce_fat", allergies="[]")
    db.add(profile)
    db.commit()
    assert db.query(Profile).filter_by(user_id=user.id).first().goal == "reduce_fat"

def test_create_exercise_log(db):
    user = User(email="e@example.com", password_hash="h", role="trial", language="zh")
    db.add(user)
    db.commit()
    log = ExerciseLog(user_id=user.id, type="cardio",
                      detail_json='{"activity":"running","duration_min":30,"intensity":"moderate"}',
                      calories_burned=250.0)
    db.add(log)
    db.commit()
    assert db.query(ExerciseLog).filter_by(user_id=user.id).first().calories_burned == 250.0

def test_create_usage_quota(db):
    user = User(email="q@example.com", password_hash="h", role="trial", language="zh")
    db.add(user)
    db.commit()
    quota = UsageQuota(user_id=user.id, year_month="2026-04",
                       meal_plan_count=0, ingredient_photo_count=0,
                       food_log_photo_count=0, ai_summary_count=0)
    db.add(quota)
    db.commit()
    assert db.query(UsageQuota).filter_by(user_id=user.id).first().meal_plan_count == 0
