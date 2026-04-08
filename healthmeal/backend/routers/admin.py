from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from pydantic import BaseModel, EmailStr
from database import get_db
from models.user import User
from dependencies import require_owner

router = APIRouter()

VALID_ROLES = {"owner", "family", "trial", "pro"}


class SetRoleRequest(BaseModel):
    email: EmailStr
    role: str


class UserRoleResponse(BaseModel):
    email: str
    role: str


@router.post("/set-role", response_model=UserRoleResponse)
def set_role(body: SetRoleRequest, _: User = Depends(require_owner),
             db: Session = Depends(get_db)):
    if body.role not in VALID_ROLES:
        raise HTTPException(status_code=400, detail=f"Invalid role. Must be one of {VALID_ROLES}")
    user = db.query(User).filter(User.email == body.email).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    user.role = body.role
    db.commit()
    return UserRoleResponse(email=user.email, role=user.role)
