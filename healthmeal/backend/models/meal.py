from sqlalchemy import Column, Integer, String, Float, DateTime, ForeignKey, Text
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from database import Base


class Ingredient(Base):
    __tablename__ = "ingredients"
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    name = Column(String, nullable=False)
    quantity = Column(Float, nullable=False)
    unit = Column(String, default="g")           # g / ml / 个 / 片
    input_method = Column(String, default="manual")  # manual / photo / voice
    date = Column(String, nullable=False)         # YYYY-MM-DD
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    user = relationship("User", back_populates="ingredients")


class MealPlan(Base):
    __tablename__ = "meal_plans"
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    style = Column(String, nullable=False)        # mediterranean/japanese/chinese/western/other
    range = Column(String, nullable=False)        # daily/weekly/monthly
    lang = Column(String, default="zh")            # zh / en
    content_json = Column(Text, nullable=False)   # 完整餐谱 JSON
    total_calories = Column(Float)
    nutrients_json = Column(Text)                 # 营养素汇总 JSON
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    user = relationship("User", back_populates="meal_plans")
