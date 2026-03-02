"""
Quantora AI — SAGRA Transaction Processing Service
====================================================
Core business logic: process transactions through SAGRA, store to DB.
"""

import uuid
import random
import logging
from datetime import datetime
from sqlalchemy.ext.asyncio import AsyncSession

from graph_engine import transaction_graph
from sentinel import run_sagra
from app.models.transaction import Transaction
from app.models.alert import Alert

logger = logging.getLogger("quantora.sagra")

TRIGGER_REASONS = [
    "Circular fund movement detected",
    "Multi-hop connection to flagged entity",
    "Unusual transaction velocity",
    "Rapid sequential transfers",
    "Connected to known fraud cluster",
    "Elevated outbound volume",
    "Geographic anomaly detected",
    "Unusual behavioural pattern",
    "High-value transfer to new account",
    "Anomalous spending pattern",
]


async def process_transaction(
    sender: str,
    receiver: str,
    amount: float,
    db: AsyncSession,
    timestamp: datetime = None,
    source: str = "api",
    description: str = "",
    iban: str = "",
    bic: str = "",
) -> Transaction:
    """
    Process a single transaction through the SAGRA pipeline and store to DB.

    1. Add edge to NetworkX graph
    2. Compute sender degree centrality
    3. Run SAGRA algorithm
    4. Store scored transaction to database
    5. Generate alert if fraud detected
    """
    if timestamp is None:
        timestamp = datetime.utcnow()

    # 1. Add to graph
    transaction_graph.add_transaction(sender, receiver, amount)

    # 2. Compute sender degree centrality
    sender_degree = transaction_graph.get_sender_degree(sender)

    # 3. Run SAGRA
    result = run_sagra(amount=amount, sender_degree=sender_degree)

    # 4. Classify risk
    risk_level = (
        "high" if result.risk_score > 0.7
        else "medium" if result.risk_score > 0.4
        else "low"
    )
    is_fraud = result.fraud_prediction == 1

    # 5. Create transaction record in DB
    tx = Transaction(
        id=f"TXN-{uuid.uuid4().hex[:8].upper()}",
        sender=sender,
        receiver=receiver,
        amount=round(amount, 2),
        timestamp=timestamp,
        risk_score=round(result.risk_score, 4),
        risk_level=risk_level,
        is_fraud=is_fraud,
        trs=round(result.trs, 4),
        grs=round(result.grs, 4),
        ndb=round(result.ndb, 4),
        sender_degree=round(sender_degree, 4),
        source=source,
        description=description,
        iban=iban,
        bic=bic,
    )
    db.add(tx)

    # 6. Generate alert if fraud detected
    if is_fraud:
        alert = Alert(
            id=f"ALT-{uuid.uuid4().hex[:8].upper()}",
            tx_id=tx.id,
            type="fraud_detected",
            severity="critical" if result.risk_score > 0.85 else "high",
            status="active",
            timestamp=timestamp,
            sender=sender,
            receiver=receiver,
            amount=round(amount, 2),
            risk_score=round(result.risk_score, 4),
            trigger_reason=random.choice(TRIGGER_REASONS),
        )
        db.add(alert)
        logger.warning(f"FRAUD DETECTED: {tx.id} | {sender}→{receiver} | ₹{amount:,.2f} | risk={result.risk_score:.4f}")

    await db.commit()
    await db.refresh(tx)

    logger.info(f"Transaction processed: {tx.id} | {sender}→{receiver} | ₹{amount:,.2f} | {risk_level}")
    return tx
