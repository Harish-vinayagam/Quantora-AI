"""
Admin router — user management, role assignment.
Only accessible by users with role='admin'.
"""

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, Field
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.auth import get_current_user, hash_password, create_token
from app.models.user import User

router = APIRouter(prefix="/admin", tags=["Admin"])


# ── Helpers ──

def require_admin(user: User = Depends(get_current_user)) -> User:
    """Dependency that ensures the current user is an admin."""
    if user.role != "admin":
        raise HTTPException(status_code=403, detail="Admin access required")
    return user


# ── Schemas ──

class CreateUserRequest(BaseModel):
    email: str = Field(..., description="User email")
    password: str = Field(..., min_length=6, description="Password (min 6 chars)")
    full_name: str = Field("", description="Full name")
    role: str = Field("analyst", description="Role: admin or analyst")


class UpdateRoleRequest(BaseModel):
    role: str = Field(..., description="New role: admin or analyst")


# ── Endpoints ──

@router.get("/users")
async def list_users(
    admin: User = Depends(require_admin),
    db: AsyncSession = Depends(get_db),
):
    """List all users (admin only)."""
    result = await db.execute(select(User).order_by(User.created_at.desc()))
    users = result.scalars().all()
    return [u.to_dict() for u in users]


@router.post("/users")
async def create_user(
    req: CreateUserRequest,
    admin: User = Depends(require_admin),
    db: AsyncSession = Depends(get_db),
):
    """Create a new user (admin only)."""
    import uuid

    # Validate role
    if req.role not in ("admin", "analyst"):
        raise HTTPException(status_code=400, detail="Role must be 'admin' or 'analyst'")

    # Check duplicate
    existing = await db.execute(select(User).where(User.email == req.email))
    if existing.scalar_one_or_none():
        raise HTTPException(status_code=400, detail="Email already registered")

    user = User(
        id=f"USR-{uuid.uuid4().hex[:8].upper()}",
        email=req.email,
        password_hash=hash_password(req.password),
        full_name=req.full_name,
        role=req.role,
    )
    db.add(user)
    await db.commit()
    await db.refresh(user)
    return user.to_dict()


@router.patch("/users/{user_id}/role")
async def update_user_role(
    user_id: str,
    req: UpdateRoleRequest,
    admin: User = Depends(require_admin),
    db: AsyncSession = Depends(get_db),
):
    """Update a user's role (admin only)."""
    if req.role not in ("admin", "analyst"):
        raise HTTPException(status_code=400, detail="Role must be 'admin' or 'analyst'")

    result = await db.execute(select(User).where(User.id == user_id))
    user = result.scalar_one_or_none()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    user.role = req.role
    await db.commit()
    return user.to_dict()


@router.delete("/users/{user_id}")
async def delete_user(
    user_id: str,
    admin: User = Depends(require_admin),
    db: AsyncSession = Depends(get_db),
):
    """Delete a user (admin only). Cannot delete yourself."""
    if user_id == admin.id:
        raise HTTPException(status_code=400, detail="Cannot delete your own account")

    result = await db.execute(select(User).where(User.id == user_id))
    user = result.scalar_one_or_none()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    await db.delete(user)
    await db.commit()
    return {"detail": f"User {user.email} deleted"}
