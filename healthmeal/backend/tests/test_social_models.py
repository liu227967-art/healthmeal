from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from models.social import Friendship, ShoppingList
from models.user import Base, User
import pytest

TEST_DB = "sqlite:///./test_social_models.db"

@pytest.fixture
def db():
    engine = create_engine(TEST_DB, connect_args={"check_same_thread": False})
    Base.metadata.create_all(bind=engine)
    Session = sessionmaker(bind=engine)
    session = Session()
    yield session
    session.close()
    Base.metadata.drop_all(bind=engine)

def test_create_friendship(db):
    u1 = User(email="a@a.com", password_hash="h", role="trial", language="zh")
    u2 = User(email="b@b.com", password_hash="h", role="trial", language="zh")
    db.add_all([u1, u2]); db.commit()
    f = Friendship(requester_id=u1.id, addressee_id=u2.id, status="pending")
    db.add(f); db.commit()
    result = db.query(Friendship).filter_by(requester_id=u1.id).first()
    assert result.status == "pending"
    assert result.addressee_id == u2.id

def test_create_shopping_list(db):
    user = User(email="s@s.com", password_hash="h", role="trial", language="zh")
    db.add(user); db.commit()
    sl = ShoppingList(
        user_id=user.id,
        meal_plan_id=None,
        items_json='[{"name":"鸡胸肉","quantity":300,"unit":"g"},{"name":"西兰花","quantity":200,"unit":"g"}]',
        date="2026-04-08"
    )
    db.add(sl); db.commit()
    result = db.query(ShoppingList).filter_by(user_id=user.id).first()
    assert result.date == "2026-04-08"
    assert "鸡胸肉" in result.items_json
