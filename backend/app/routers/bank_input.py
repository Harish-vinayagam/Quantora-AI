"""
Bank Input router — CSV upload, manual entry, API connections.
"""

import csv
import io
import uuid

from datetime import datetime
from fastapi import APIRouter, Depends, UploadFile, File as FastAPIFile
from pydantic import BaseModel, Field
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.auth import get_current_user
from app.models.user import User
from app.models.bank_connection import BankConnection
from app.services.sagra import process_transaction

router = APIRouter(prefix="/bank/input", tags=["Bank Input"])


class ManualTransactionRequest(BaseModel):
    sender: str = Field(..., description="Sender account ID")
    receiver: str = Field(..., description="Receiver account ID")
    amount: float = Field(..., gt=0, description="Amount in INR")
    iban: str = Field("", description="Optional IBAN")
    bic: str = Field("", description="Optional SWIFT/BIC")
    description: str = Field("", description="Remittance info / description")


class BankApiConnectionRequest(BaseModel):
    bank_name: str = Field(..., description="Display name of the bank")
    api_key: str = Field(..., description="API key or client ID")
    endpoint_url: str = Field(..., description="Base URL of the bank API")


@router.post("/upload")
async def upload_bank_file(
    file: UploadFile = FastAPIFile(...),
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user),
):
    """Upload a CSV bank statement for batch processing through SAGRA."""
    contents = await file.read()
    text = contents.decode("utf-8")
    reader = csv.DictReader(io.StringIO(text))

    rows_processed = 0
    fraud_detected = 0
    total_risk = 0.0
    results = []

    col_map = {}
    for row in reader:
        if not col_map:
            lower_keys = {k.strip().lower(): k for k in row.keys()}
            col_map["sender"] = lower_keys.get("sender", lower_keys.get("sender_id", lower_keys.get("from", lower_keys.get("debtor", ""))))
            col_map["receiver"] = lower_keys.get("receiver", lower_keys.get("receiver_id", lower_keys.get("to", lower_keys.get("creditor", ""))))
            col_map["amount"] = lower_keys.get("amount", lower_keys.get("value", lower_keys.get("sum", "")))

        sender = row.get(col_map.get("sender", ""), "").strip()
        receiver = row.get(col_map.get("receiver", ""), "").strip()
        amount_str = row.get(col_map.get("amount", ""), "0").strip()

        if not sender or not receiver:
            continue

        try:
            amount = float(amount_str)
        except ValueError:
            continue

        if amount <= 0:
            continue

        tx = await process_transaction(sender, receiver, amount, db, source="csv")
        rows_processed += 1
        total_risk += tx.risk_score
        if tx.is_fraud:
            fraud_detected += 1
        results.append(tx.to_dict())

    avg_risk = round(total_risk / max(rows_processed, 1), 4)

    return {
        "status": "success",
        "filename": file.filename,
        "rows_processed": rows_processed,
        "fraud_detected": fraud_detected,
        "avg_risk": avg_risk,
        "transactions": results[:10],
    }


@router.post("/manual")
async def manual_transaction(
    req: ManualTransactionRequest,
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user),
):
    """Submit a single manual transaction for SAGRA scoring."""
    tx = await process_transaction(
        req.sender, req.receiver, req.amount, db,
        source="manual",
        description=req.description,
        iban=req.iban,
        bic=req.bic,
    )
    return tx.to_dict()


@router.post("/connect")
async def add_bank_connection(
    req: BankApiConnectionRequest,
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user),
):
    """Register a new external bank API connection."""
    conn = BankConnection(
        id=f"CONN-{uuid.uuid4().hex[:8]}",
        bank_name=req.bank_name,
        api_key_masked=req.api_key[:8] + "****" if len(req.api_key) > 8 else "****",
        endpoint_url=req.endpoint_url,
        status="connected",
    )
    db.add(conn)
    await db.commit()
    await db.refresh(conn)
    return conn.to_dict()


@router.get("/connections")
async def list_bank_connections(
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user),
):
    """List all registered external bank API connections."""
    result = await db.execute(select(BankConnection))
    conns = result.scalars().all()
    return {"connections": [c.to_dict() for c in conns]}


@router.delete("/connections/{conn_id}")
async def remove_bank_connection(
    conn_id: str,
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user),
):
    """Remove a bank API connection."""
    result = await db.execute(select(BankConnection).where(BankConnection.id == conn_id))
    conn = result.scalar_one_or_none()
    if not conn:
        return {"error": f"Connection {conn_id} not found"}
    await db.delete(conn)
    await db.commit()
    return {"status": "disconnected", "id": conn_id}
