from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from models.user import Base, User, UsageQuota
from services.quota_service import check_quota, increment_quota, TRIAL_LIMITS
import pytest

TEST_DB = "sqlite:///./test_quota.db"

@pytest.fixture
def db():
    engine = create_engine(TEST_DB, connect_args={"check_same_thread": False})
    Base.metadata.create_all(bind=engine)
    Session = sessionmaker(bind=engine)
    session = Session()
    yield session
    session.close()
    Base.metadata.drop_all(bind=engine)

def test_trial_within_limit(db):
    user = User(email="t@t.com", password_hash="h", role="trial", language="zh")
    db.add(user); db.commit()
    assert check_quota(db, user, "meal_plan") is True

def test_trial_exceeds_limit(db):
    user = User(email="e@t.com", password_hash="h", role="trial", language="zh")
    db.add(user); db.commit()
    quota = UsageQuota(user_id=user.id, year_month="2026-04",
                       meal_plan_count=TRIAL_LIMITS["meal_plan"],
                       ingredient_photo_count=0, food_log_photo_count=0, ai_summary_count=0)
    db.add(quota); db.commit()
    assert check_quota(db, user, "meal_plan") is False

def test_pro_no_limit(db):
    user = User(email="p@t.com", password_hash="h", role="pro", language="zh")
    db.add(user); db.commit()
    quota = UsageQuota(user_id=user.id, year_month="2026-04",
                       meal_plan_count=9999,
                       ingredient_photo_count=0, food_log_photo_count=0, ai_summary_count=0)
    db.add(quota); db.commit()
    assert check_quota(db, user, "meal_plan") is True
