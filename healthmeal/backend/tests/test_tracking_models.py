from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from models.tracking import FoodLog, BodyMetric
from models.user import Base, User
import pytest

TEST_DB = "sqlite:///./test_tracking_models.db"

@pytest.fixture
def db():
    engine = create_engine(TEST_DB, connect_args={"check_same_thread": False})
    Base.metadata.create_all(bind=engine)
    Session = sessionmaker(bind=engine)
    session = Session()
    yield session
    session.close()
    Base.metadata.drop_all(bind=engine)

def test_create_food_log(db):
    user = User(email="fl@fl.com", password_hash="h", role="trial", language="zh")
    db.add(user); db.commit()
    log = FoodLog(
        user_id=user.id,
        meal_type="breakfast",
        input_method="manual",
        date="2026-04-08",
        food_items_json='[{"name":"燕麦粥","calories":350,"protein":12,"fiber":8}]',
        total_calories=350.0,
        total_protein=12.0,
        total_fiber=8.0,
        anti_inflammatory_score=7.0
    )
    db.add(log); db.commit()
    result = db.query(FoodLog).filter_by(user_id=user.id).first()
    assert result.meal_type == "breakfast"
    assert result.total_calories == 350.0

def test_create_body_metric(db):
    user = User(email="bm@bm.com", password_hash="h", role="trial", language="zh")
    db.add(user); db.commit()
    metric = BodyMetric(user_id=user.id, date="2026-04-08", weight=65.0, body_fat_pct=22.0)
    db.add(metric); db.commit()
    result = db.query(BodyMetric).filter_by(user_id=user.id).first()
    assert result.weight == 65.0
    assert result.body_fat_pct == 22.0
