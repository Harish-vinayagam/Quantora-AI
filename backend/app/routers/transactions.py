"""
Transactions router — submit, list, stats.
"""

from fastapi import APIRouter, Depends, Query
from pydantic import BaseModel, Field
from sqlalchemy import select, func
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.auth import get_current_user
from app.models.user import User
from app.models.transaction import Transaction
from app.services.sagra import process_transaction

router = APIRouter(prefix="/transactions", tags=["Transactions"])


class TransactionSubmitRequest(BaseModel):
    sender: str = Field(..., description="Sender account ID (e.g. 'A001')")
    receiver: str = Field(..., description="Receiver account ID (e.g. 'B002')")
    amount: float = Field(..., gt=0, description="Transaction amount in INR")


@router.post("")
async def submit_transaction(
    req: TransactionSubmitRequest,
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user),
):
    """Submit a new transaction for SAGRA scoring."""
    tx = await process_transaction(req.sender, req.receiver, req.amount, db, source="api")
    return tx.to_dict()


@router.get("")
async def list_transactions(
    limit: int = Query(50, ge=1, le=500),
    fraud_only: bool = Query(False),
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user),
):
    """List stored transactions, newest first."""
    query = select(Transaction).order_by(Transaction.timestamp.desc())
    if fraud_only:
        query = query.where(Transaction.is_fraud == True)
    query = query.limit(limit)

    result = await db.execute(query)
    txs = result.scalars().all()

    total_result = await db.execute(select(func.count(Transaction.id)))
    total = total_result.scalar() or 0

    return {"transactions": [t.to_dict() for t in txs], "total": total}


@router.get("/stats")
async def transaction_stats(
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user),
):
    """Compute KPI metrics from all stored transactions."""
    result = await db.execute(select(Transaction))
    all_txs = result.scalars().all()

    total = len(all_txs)
    fraud_count = sum(1 for t in all_txs if t.is_fraud)
    high = sum(1 for t in all_txs if t.risk_level == "high")
    med = sum(1 for t in all_txs if t.risk_level == "medium")
    low = sum(1 for t in all_txs if t.risk_level == "low")
    total_amount = sum(t.amount for t in all_txs)
    fraud_amount = sum(t.amount for t in all_txs if t.is_fraud)
    avg_risk = sum(t.risk_score for t in all_txs) / max(total, 1)

    return {
        "total": total,
        "fraud_count": fraud_count,
        "fraud_rate": round(fraud_count / max(total, 1) * 100, 2),
        "avg_risk": round(avg_risk, 4),
        "total_amount": round(total_amount, 2),
        "fraud_amount": round(fraud_amount, 2),
        "high_count": high,
        "medium_count": med,
        "low_count": low,
    }
