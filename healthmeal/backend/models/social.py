from sqlalchemy import Column, Integer, String, DateTime, ForeignKey, Text
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from database import Base


class Friendship(Base):
    __tablename__ = "friendships"
    id = Column(Integer, primary_key=True, index=True)
    requester_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    addressee_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    status = Column(String, default="pending")   # pending / accepted / rejected
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    requester = relationship("User", foreign_keys=[requester_id], back_populates="sent_requests")
    addressee = relationship("User", foreign_keys=[addressee_id], back_populates="received_requests")


class ShoppingList(Base):
    __tablename__ = "shopping_lists"
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    meal_plan_id = Column(Integer, ForeignKey("meal_plans.id"), nullable=True)
    items_json = Column(Text, nullable=False)    # JSON: [{name, quantity, unit, checked}]
    date = Column(String, nullable=False)        # YYYY-MM-DD
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    user = relationship("User", back_populates="shopping_lists")
