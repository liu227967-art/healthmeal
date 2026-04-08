from sqlalchemy import Column, Integer, String, Float, DateTime, ForeignKey, Text
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from database import Base


class FoodLog(Base):
    __tablename__ = "food_logs"
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    meal_type = Column(String, nullable=False)        # breakfast/lunch/dinner/snack
    input_method = Column(String, default="manual")   # manual/photo
    date = Column(String, nullable=False)             # YYYY-MM-DD
    food_items_json = Column(Text, nullable=False)    # JSON: [{name, calories, protein, fiber}, ...]
    total_calories = Column(Float, default=0.0)
    total_protein = Column(Float, default=0.0)
    total_fiber = Column(Float, default=0.0)
    anti_inflammatory_score = Column(Float, default=0.0)  # 0-10
    logged_at = Column(DateTime(timezone=True), server_default=func.now())

    user = relationship("User", back_populates="food_logs")


class BodyMetric(Base):
    __tablename__ = "body_metrics"
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    date = Column(String, nullable=False)   # YYYY-MM-DD
    weight = Column(Float)                  # kg
    body_fat_pct = Column(Float)            # %
    recorded_at = Column(DateTime(timezone=True), server_default=func.now())

    user = relationship("User", back_populates="body_metrics")
