"""
Quantora AI — Enterprise Backend
==================================
Production FastAPI application with:
- PostgreSQL persistence (SQLAlchemy async)
- JWT authentication
- Modular router architecture
- SAGRA fraud detection engine

Usage:
    python -m app.main
    # or
    uvicorn app.main:app --host 0.0.0.0 --port 8000
"""

import os
import sys
import logging
from datetime import datetime

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

# Add parent dir to path so sentinel/graph_engine imports work
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from app.config import get_settings
from app.database import init_db

# ── Logging ──
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(name)s] %(levelname)s — %(message)s",
    datefmt="%H:%M:%S",
)
logger = logging.getLogger("quantora")

settings = get_settings()

# ── App Factory ──
app = FastAPI(
    title="Quantora AI — SAGRA Enterprise Platform",
    description="Enterprise fraud detection API powered by the Sentinel Adaptive Graph Risk Algorithm.",
    version="3.0.0",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# ── Mount Routers ──
from app.routers import auth, transactions, graph, alerts, dashboard, bank_input

app.include_router(auth.router)
app.include_router(transactions.router)
app.include_router(graph.router)
app.include_router(alerts.router)
app.include_router(dashboard.router)
app.include_router(bank_input.router)


# ── Health Check ──
_start_time = datetime.utcnow()


@app.get("/health", tags=["System"])
async def health_check():
    """Health check endpoint with system status."""
    from graph_engine import transaction_graph
    from sqlalchemy import select, func
    from app.database import async_session
    from app.models.transaction import Transaction
    from app.models.alert import Alert

    async with async_session() as db:
        tx_count = await db.execute(select(func.count(Transaction.id)))
        alert_count = await db.execute(select(func.count(Alert.id)).where(Alert.status == "active"))

    uptime = (datetime.utcnow() - _start_time).total_seconds()

    return {
        "status": "healthy",
        "version": "3.0.0",
        "algorithm": "SAGRA v2.0",
        "uptime_seconds": round(uptime),
        "database": "connected",
        "transactions_stored": tx_count.scalar() or 0,
        "graph_nodes": transaction_graph.node_count,
        "graph_edges": transaction_graph.edge_count,
        "active_alerts": alert_count.scalar() or 0,
    }


# ── Startup ──
@app.on_event("startup")
async def startup():
    """Initialize database and optionally seed data."""
    await init_db()
    logger.info("Database initialized")

    if settings.seed_data:
        logger.info("SEED_DATA=true — loading seed data...")
        await _run_seed()
    else:
        logger.info("Enterprise mode — empty database, awaiting real data input")

    logger.info("Quantora AI Enterprise started on port 8000")


async def _run_seed():
    """Fallback seed function — only runs if SEED_DATA=true."""
    import random
    from app.database import async_session
    from app.services.sagra import process_transaction

    random.seed(42)
    now = datetime.utcnow()

    async with async_session() as db:
        from datetime import timedelta

        FRAUD_ACCOUNTS = ["A001", "A002", "A003", "A004", "A005"]
        NORMAL_ACCOUNTS = ["B001", "B002", "B003", "B004", "B005", "B006", "B007", "B008", "C001", "C002", "C003"]
        ALL_ACCOUNTS = FRAUD_ACCOUNTS + NORMAL_ACCOUNTS

        for hour in range(24):
            base_time = now - timedelta(hours=24 - hour)
            count = random.randint(6, 14) if 8 <= hour <= 20 else random.randint(2, 5)

            for _ in range(count):
                ts = base_time + timedelta(minutes=random.randint(0, 59), seconds=random.randint(0, 59))

                if random.random() < 0.2:
                    sender = random.choice(FRAUD_ACCOUNTS)
                    receiver = random.choice(ALL_ACCOUNTS)
                    while receiver == sender:
                        receiver = random.choice(ALL_ACCOUNTS)
                    amount = round(random.uniform(8000, 55000), 2)
                else:
                    sender = random.choice(NORMAL_ACCOUNTS)
                    receiver = random.choice(ALL_ACCOUNTS)
                    while receiver == sender:
                        receiver = random.choice(ALL_ACCOUNTS)
                    amount = round(random.uniform(100, 4000), 2)

                await process_transaction(sender, receiver, amount, db, timestamp=ts, source="seed")

        # Fraud cluster core transactions
        fraud_core = [
            ("A001", "A002", 42000), ("A002", "A003", 38000),
            ("A003", "A004", 51000), ("A004", "A001", 29000),
            ("A001", "A005", 17000), ("A005", "A003", 23000),
        ]
        for i, (s, r, a) in enumerate(fraud_core):
            from datetime import timedelta
            await process_transaction(s, r, a, db, timestamp=now - timedelta(minutes=(len(fraud_core) - i) * 2), source="seed")

    random.seed()
    logger.info("Seed data loaded")


# ── Entry Point ──
if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000, log_level="info")
