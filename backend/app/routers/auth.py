"""
Auth router — registration, login, profile.
"""

from fastapi import APIRouter, Depends
from pydantic import BaseModel, Field
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.auth import (
    register_user, authenticate_user, create_token, get_current_user,
)
from app.models.user import User

router = APIRouter(prefix="/auth", tags=["Authentication"])


class RegisterRequest(BaseModel):
    email: str = Field(..., description="Email address")
    password: str = Field(..., min_length=6, description="Password (min 6 chars)")
    full_name: str = Field("", description="Full name")


class LoginRequest(BaseModel):
    email: str
    password: str


@router.post("/register")
async def register(req: RegisterRequest, db: AsyncSession = Depends(get_db)):
    """Create a new user account."""
    user = await register_user(req.email, req.password, req.full_name, db)
    token = create_token(user.id, user.email, user.role)
    return {
        "user": user.to_dict(),
        "token": token,
    }


@router.post("/login")
async def login(req: LoginRequest, db: AsyncSession = Depends(get_db)):
    """Authenticate and receive a JWT token."""
    user = await authenticate_user(req.email, req.password, db)
    token = create_token(user.id, user.email, user.role)
    return {
        "user": user.to_dict(),
        "token": token,
    }


@router.get("/me")
async def me(user: User = Depends(get_current_user)):
    """Return the current authenticated user."""
    return user.to_dict()
