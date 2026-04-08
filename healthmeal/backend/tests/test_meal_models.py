from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from models.meal import Ingredient, MealPlan
from models.user import Base, User
import pytest

TEST_DB = "sqlite:///./test_meal_models.db"

@pytest.fixture
def db():
    engine = create_engine(TEST_DB, connect_args={"check_same_thread": False})
    Base.metadata.create_all(bind=engine)
    Session = sessionmaker(bind=engine)
    session = Session()
    yield session
    session.close()
    Base.metadata.drop_all(bind=engine)

def test_create_ingredient(db):
    user = User(email="i@i.com", password_hash="h", role="trial", language="zh")
    db.add(user); db.commit()
    ing = Ingredient(user_id=user.id, name="鸡胸肉", quantity=200.0,
                     unit="g", input_method="manual", date="2026-04-08")
    db.add(ing); db.commit()
    result = db.query(Ingredient).filter_by(user_id=user.id).first()
    assert result.name == "鸡胸肉"
    assert result.quantity == 200.0

def test_create_meal_plan(db):
    user = User(email="m@m.com", password_hash="h", role="trial", language="zh")
    db.add(user); db.commit()
    plan = MealPlan(
        user_id=user.id,
        style="mediterranean",
        range="daily",
        content_json='{"breakfast": {"name": "燕麦粥", "calories": 350}}',
        total_calories=1800.0,
        nutrients_json='{"protein": 80, "fiber": 30}'
    )
    db.add(plan); db.commit()
    result = db.query(MealPlan).filter_by(user_id=user.id).first()
    assert result.style == "mediterranean"
    assert result.total_calories == 1800.0
