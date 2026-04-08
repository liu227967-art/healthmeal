from sqlalchemy import Column, Integer, String, Float, DateTime, ForeignKey, Text
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from database import Base


class User(Base):
    __tablename__ = "users"
    id = Column(Integer, primary_key=True, index=True)
    email = Column(String, unique=True, index=True, nullable=False)
    password_hash = Column(String, nullable=False)
    role = Column(String, default="trial")  # owner/family/trial/pro
    language = Column(String, default="zh")  # zh/en
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    profile = relationship("Profile", back_populates="user", uselist=False)
    exercise_logs = relationship("ExerciseLog", back_populates="user")
    usage_quotas = relationship("UsageQuota", back_populates="user")
    ingredients = relationship("Ingredient", back_populates="user")
    meal_plans = relationship("MealPlan", back_populates="user")
    food_logs = relationship("FoodLog", back_populates="user")
    body_metrics = relationship("BodyMetric", back_populates="user")
    bookmarks = relationship("Bookmark", back_populates="user")
    sent_requests = relationship("Friendship", foreign_keys="Friendship.requester_id", back_populates="requester")
    received_requests = relationship("Friendship", foreign_keys="Friendship.addressee_id", back_populates="addressee")
    shopping_lists = relationship("ShoppingList", back_populates="user")


class Profile(Base):
    __tablename__ = "profiles"
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), unique=True, nullable=False)
    height = Column(Float)           # cm
    weight = Column(Float)           # kg
    body_fat_pct = Column(Float)     # %
    age = Column(Integer)
    gender = Column(String)          # male/female/other
    goal = Column(String)            # reduce_fat/maintain/gain_muscle
    allergies = Column(Text, default="[]")  # JSON array of strings
    updated_at = Column(DateTime(timezone=True), onupdate=func.now(), server_default=func.now())

    user = relationship("User", back_populates="profile")


class ExerciseLog(Base):
    __tablename__ = "exercise_logs"
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    type = Column(String, nullable=False)   # cardio/strength
    detail_json = Column(Text, nullable=False)  # JSON: activity, duration_min, intensity / muscle_group, sets, weight_kg
    calories_burned = Column(Float, default=0.0)
    logged_at = Column(DateTime(timezone=True), server_default=func.now())

    user = relationship("User", back_populates="exercise_logs")


class UsageQuota(Base):
    __tablename__ = "usage_quotas"
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    year_month = Column(String, nullable=False)   # e.g. "2026-04"
    meal_plan_count = Column(Integer, default=0)
    ingredient_photo_count = Column(Integer, default=0)
    food_log_photo_count = Column(Integer, default=0)
    ai_summary_count = Column(Integer, default=0)

    user = relationship("User", back_populates="usage_quotas")
