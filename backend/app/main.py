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
from app.routers import auth, transactions, graph, alerts, dashboard, bank_input, admin

app.include_router(auth.router)
app.include_router(transactions.router)
app.include_router(graph.router)
app.include_router(alerts.router)
app.include_router(dashboard.router)
app.include_router(bank_input.router)
app.include_router(admin.router)


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
    """Initialize database, create default accounts, and optionally seed data."""
    await init_db()
    logger.info("Database initialized")

    # ── Create default accounts (idempotent) ──
    await _create_default_accounts()

    if settings.seed_data:
        logger.info("SEED_DATA=true — loading seed data...")
        await _run_seed()
    else:
        logger.info("Enterprise mode — empty database, awaiting real data input")

    logger.info("Quantora AI Enterprise started on port 8000")


async def _create_default_accounts():
    """Create admin and analyst accounts if they don't exist."""
    from sqlalchemy import select
    from app.database import async_session
    from app.models.user import User
    from app.auth import hash_password

    DEFAULT_USERS = [
        {
            "id": "USR-ADMIN-001",
            "email": "admin@quantora.ai",
            "password": "quantora2024",
            "full_name": "SAGRA Admin",
            "role": "admin",
        },
        {
            "id": "USR-ANALYST-001",
            "email": "analyst@quantora.ai",
            "password": "quantora2024",
            "full_name": "Risk Analyst",
            "role": "analyst",
        },
    ]

    async with async_session() as db:
        for u in DEFAULT_USERS:
            existing = await db.execute(select(User).where(User.email == u["email"]))
            if existing.scalar_one_or_none():
                logger.info(f"Account {u['email']} already exists — skipping")
                continue

            user = User(
                id=u["id"],
                email=u["email"],
                password_hash=hash_password(u["password"]),
                full_name=u["full_name"],
                role=u["role"],
            )
            db.add(user)
            await db.commit()
            logger.info(f"Created default account: {u['email']} ({u['role']})")


async def _run_seed():
    """Seed realistic transaction data — ~5-8% fraud rate."""
    import random
    from app.database import async_session
    from app.services.sagra import process_transaction
    from datetime import timedelta

    random.seed(42)
    now = datetime.utcnow()

    # 30 normal accounts, 3 fraud accounts
    NORMAL = [f"ACC-{str(i).zfill(3)}" for i in range(1, 31)]
    FRAUD = ["FRD-001", "FRD-002", "FRD-003"]
    ALL = NORMAL + FRAUD

    async with async_session() as db:
        # ── Normal transactions (bulk, low amount, low risk) ──
        for hour in range(48):  # 2 days of data
            base_time = now - timedelta(hours=48 - hour)
            count = random.randint(8, 20) if 8 <= (hour % 24) <= 20 else random.randint(2, 6)

            for _ in range(count):
                ts = base_time + timedelta(minutes=random.randint(0, 59), seconds=random.randint(0, 59))
                sender = random.choice(NORMAL)
                receiver = random.choice(ALL)
                while receiver == sender:
                    receiver = random.choice(ALL)
                amount = round(random.uniform(200, 8000), 2)
                await process_transaction(sender, receiver, amount, db, timestamp=ts, source="seed")

        # ── Suspicious transactions (~5% of total, high amounts) ──
        for _ in range(25):
            ts = now - timedelta(hours=random.randint(1, 36), minutes=random.randint(0, 59))
            sender = random.choice(FRAUD)
            receiver = random.choice(NORMAL)
            amount = round(random.uniform(30000, 80000), 2)
            await process_transaction(sender, receiver, amount, db, timestamp=ts, source="seed")

        # ── One clear fraud ring (coordinated circular transfers) ──
        ring = [
            ("FRD-001", "FRD-002", 55000),
            ("FRD-002", "FRD-003", 48000),
            ("FRD-003", "FRD-001", 42000),
            ("FRD-001", "ACC-015", 35000),
        ]
        for i, (s, r, a) in enumerate(ring):
            await process_transaction(s, r, a, db, timestamp=now - timedelta(minutes=(len(ring) - i) * 3), source="seed")

    random.seed()
    logger.info("Seed data loaded (realistic fraud rate ~5-8%%)")


async def _run_simulation():
    """Run a quick live simulation — injects 20 transactions in real-time pattern."""
    import random
    from app.database import async_session
    from app.services.sagra import process_transaction

    now = datetime.utcnow()
    ACCOUNTS = [f"SIM-{str(i).zfill(3)}" for i in range(1, 16)]
    FRAUD_ACC = "SIM-FRAUD"

    async with async_session() as db:
        # 16 normal transactions
        for i in range(16):
            from datetime import timedelta
            sender = random.choice(ACCOUNTS)
            receiver = random.choice(ACCOUNTS)
            while receiver == sender:
                receiver = random.choice(ACCOUNTS)
            amount = round(random.uniform(300, 5000), 2)
            ts = now - timedelta(minutes=random.randint(0, 30))
            await process_transaction(sender, receiver, amount, db, timestamp=ts, source="simulation")

        # 4 suspicious transactions from a fraud account
        for target in random.sample(ACCOUNTS, 4):
            from datetime import timedelta
            amount = round(random.uniform(35000, 70000), 2)
            ts = now - timedelta(minutes=random.randint(0, 10))
            await process_transaction(FRAUD_ACC, target, amount, db, timestamp=ts, source="simulation")

    logger.info("Simulation complete — 20 transactions injected")


# ── Admin Triggers for Seed / Simulation ──

@app.post("/admin/seed", tags=["Admin"])
async def trigger_seed():
    """Trigger seed data injection (admin use)."""
    from app.auth import get_current_user
    await _run_seed()
    return {"detail": "Seed data loaded successfully", "fraud_rate": "~5-8%"}


@app.post("/admin/simulate", tags=["Admin"])
async def trigger_simulation():
    """Trigger a live simulation batch (admin use)."""
    await _run_simulation()
    return {"detail": "Simulation complete — 20 transactions injected"}


# ── Entry Point ──
if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000, log_level="info")
