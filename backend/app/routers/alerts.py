"""
Alerts router — fraud alerts from SAGRA scoring.
"""

from fastapi import APIRouter, Depends, Query
from sqlalchemy import select, func
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.auth import get_current_user
from app.models.user import User
from app.models.alert import Alert

router = APIRouter(prefix="/alerts", tags=["Alerts"])


@router.get("")
async def get_alerts(
    limit: int = Query(50, ge=1, le=200),
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user),
):
    """Return fraud alerts, newest first."""
    result = await db.execute(
        select(Alert).order_by(Alert.timestamp.desc()).limit(limit)
    )
    alerts = result.scalars().all()

    active_count = await db.execute(
        select(func.count(Alert.id)).where(Alert.status == "active")
    )
    active = active_count.scalar() or 0

    return {
        "alerts": [a.to_dict() for a in alerts],
        "active": active,
        "investigating": 0,
    }
