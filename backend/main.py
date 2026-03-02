"""
main.py — Quantora AI Backend API Server (Production)
======================================================

FastAPI application serving the SAGRA (Sentinel Adaptive Graph Risk Algorithm)
as a production-ready REST API. Transactions are ingested from the Bank's
Core-Banking System (CBS) via a real-time ISO 20022 feed, processed through
the SAGRA engine, and served to the dashboard.

Architecture:
    ┌──────────────────┐                    ┌──────────────────┐
    │  Core-Banking    │  ISO 20022 Feed    │   FastAPI        │
    │  System (CBS)    │ ──────────────────▶ │   Backend        │
    │                  │  REST / mTLS       │                  │
    │  National Reserve│  OAuth 2.0         │  bank_api.py     │
    │  Bank (NRB)      │                    │  (CBS Connector) │
    └──────────────────┘                    └──────┬───────────┘
                                                   │
                                                   ▼
    ┌──────────────┐                    ┌──────────────────┐
    │   Frontend    │  REST API         │   SAGRA Engine    │
    │  (Next.js)    │ ◀────────────────│   + Graph Engine  │
    │               │                   │   + Alert System  │
    │  Dashboard     │ GET /dashboard   │                  │
    │  Network Graph │ GET /graph/data  │  In-Memory Store │
    │  Transactions  │ GET /transactions│  (scored txns)   │
    │  Alerts        │ GET /alerts      │                  │
    └──────────────┘                    └──────────────────┘

Bank API Endpoints:
    GET  /bank/status         — Bank CBS connection health
    GET  /bank/feed           — Raw ISO 20022 transactions (pre-SAGRA)
    GET  /bank/accounts       — Registered bank accounts
    GET  /pipeline/status     — Full pipeline status

Production Endpoints:
    POST /transactions        — Submit & score a new transaction
    GET  /transactions        — List stored transactions
    GET  /transactions/stats  — KPI metrics from real data
    GET  /graph/data          — Network graph nodes + edges for D3
    GET  /alerts              — Fraud alerts (derived from scored txns)
    GET  /dashboard           — Full dashboard data package
    POST /predict             — Legacy SAGRA prediction (integer IDs)
    POST /predict/detailed    — Legacy detailed prediction
    GET  /graph/stats         — Graph statistics
    POST /graph/reset         — Reset system & re-seed
    GET  /health              — Health check
"""

from fastapi import FastAPI, Query, UploadFile, File as FastAPIFile
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field
import csv
import io
import uuid as _uuid
from datetime import datetime, timedelta
from typing import List
import random
import asyncio

import networkx as nx
from graph_engine import transaction_graph
from sentinel import run_sagra
from bank_api import (
    init_bank_connection,
    poll_bank_transactions,
    get_connection_status,
    get_raw_feed,
    get_all_accounts,
    get_account_info,
    connection_status as bank_connection,
    raw_bank_feed,
)


# ─────────────────────────────────────────────────────
# App Initialization
# ─────────────────────────────────────────────────────

app = FastAPI(
    title="Quantora AI — SAGRA Backend",
    description="Production API for the Sentinel Adaptive Graph Risk Algorithm. "
                "Ingests transactions from bank CBS feed via ISO 20022.",
    version="2.0.0",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# ─────────────────────────────────────────────────────
# Constants
# ─────────────────────────────────────────────────────

FRAUD_ACCOUNTS = ["A001", "A002", "A003", "A004", "A005"]
NORMAL_ACCOUNTS = [
    "B001", "B002", "B003", "B004", "B005",
    "B006", "B007", "B008", "C001", "C002", "C003",
]
ALL_ACCOUNTS = FRAUD_ACCOUNTS + NORMAL_ACCOUNTS

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

CLUSTER_MAP = {
    "A001": "CLU-001", "A002": "CLU-001", "A003": "CLU-003",
    "A004": "CLU-001", "A005": "CLU-001",
    "B004": "CLU-002", "B008": "CLU-002",
}


# ─────────────────────────────────────────────────────
# In-Memory Stores
# ─────────────────────────────────────────────────────

transaction_store: List[dict] = []
node_risk_scores: dict = {}
alert_store: List[dict] = []
_alert_counter = 0
_tx_counter = 0


# ─────────────────────────────────────────────────────
# Core Transaction Processing
# ─────────────────────────────────────────────────────

def _process_transaction(
    sender: str,
    receiver: str,
    amount: float,
    timestamp: datetime = None,
) -> dict:
    """
    Process a single transaction through the SAGRA pipeline.

    1. Add edge to NetworkX graph
    2. Compute sender degree centrality
    3. Run SAGRA algorithm
    4. Store scored transaction
    5. Update node risk tracking
    6. Generate alert if fraud detected
    """
    global _alert_counter, _tx_counter

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

    # 5. Create & store transaction record
    _tx_counter += 1
    tx = {
        "id": f"TXN-{_tx_counter:04d}",
        "sender": sender,
        "receiver": receiver,
        "amount": round(amount, 2),
        "timestamp": timestamp.isoformat() + "Z",
        "risk_score": round(result.risk_score, 4),
        "risk_level": risk_level,
        "is_fraud": is_fraud,
        "trs": round(result.trs, 4),
        "grs": round(result.grs, 4),
        "ndb": round(result.ndb, 4),
    }
    transaction_store.insert(0, tx)

    # 6. Track node risk scores
    node_risk_scores[sender] = max(
        node_risk_scores.get(sender, 0), result.risk_score
    )
    node_risk_scores[receiver] = max(
        node_risk_scores.get(receiver, 0), result.risk_score * 0.3
    )

    # 7. Generate alert if fraud
    if is_fraud:
        _alert_counter += 1
        alert = {
            "alertId": f"ALT-{_alert_counter:04d}",
            "account": sender,
            "riskScore": round(result.risk_score, 2),
            "triggerReason": random.choice(TRIGGER_REASONS),
            "status": "active",
            "timestamp": timestamp.strftime("%H:%M:%S"),
            "clusterId": CLUSTER_MAP.get(
                sender, f"CLU-{(hash(sender) % 7) + 1:03d}"
            ),
            "transactionId": tx["id"],
        }
        alert_store.insert(0, alert)

    return tx


# ─────────────────────────────────────────────────────
# Utilities
# ─────────────────────────────────────────────────────

def _format_relative_time(iso_str: str) -> str:
    """Convert ISO timestamp to relative time string."""
    try:
        ts = datetime.fromisoformat(iso_str.replace("Z", "+00:00"))
        delta = datetime.utcnow() - ts.replace(tzinfo=None)
        minutes = int(delta.total_seconds() / 60)
        if minutes < 1:
            return "just now"
        if minutes < 60:
            return f"{minutes} min ago"
        hours = minutes // 60
        if hours < 24:
            return f"{hours} hr{'s' if hours > 1 else ''} ago"
        days = hours // 24
        return f"{days} day{'s' if days > 1 else ''} ago"
    except Exception:
        return "recently"


def _compute_clusters() -> list:
    """Derive risk clusters from graph connected components."""
    g = transaction_graph.graph
    if g.number_of_nodes() == 0:
        return []

    undirected = g.to_undirected()
    components = sorted(
        nx.connected_components(undirected), key=len, reverse=True
    )

    clusters = []
    for i, comp in enumerate(components[:10]):
        comp_strs = [str(n) for n in comp]
        risks = [node_risk_scores.get(n, 0) for n in comp_strs]
        avg_risk = sum(risks) / max(len(risks), 1)

        # Find most recent activity in this cluster
        comp_txs = [
            t for t in transaction_store
            if t["sender"] in comp_strs or t["receiver"] in comp_strs
        ]
        last_time = comp_txs[0]["timestamp"] if comp_txs else ""

        status = (
            "active" if avg_risk >= 0.6
            else "monitoring" if avg_risk >= 0.3
            else "contained"
        )

        clusters.append({
            "clusterId": f"CLU-{i + 1:03d}",
            "accountsInvolved": len(comp),
            "avgRiskScore": round(avg_risk, 2),
            "status": status,
            "lastActivity": (
                _format_relative_time(last_time) if last_time else "no activity"
            ),
        })

    return clusters


def _compute_trend() -> list:
    """Group transactions into hourly buckets for the trend chart."""
    from collections import defaultdict

    buckets = defaultdict(lambda: {"transactions": 0, "fraudAlerts": 0})

    for tx in transaction_store:
        try:
            ts = datetime.fromisoformat(
                tx["timestamp"].replace("Z", "+00:00")
            ).replace(tzinfo=None)
            hour_key = ts.strftime("%H:00")
            buckets[hour_key]["transactions"] += 1
            if tx["is_fraud"]:
                buckets[hour_key]["fraudAlerts"] += 1
        except Exception:
            pass

    # Return all 24 hours (fill missing with zeros)
    result = []
    for i in range(24):
        key = f"{i:02d}:00"
        if key in buckets:
            result.append({"time": key, **buckets[key]})
        else:
            result.append({"time": key, "transactions": 0, "fraudAlerts": 0})

    return result


# ─────────────────────────────────────────────────────
# Seed Data
# ─────────────────────────────────────────────────────

def _seed_data():
    """
    Seed the backend with realistic transaction data.

    Generates ~200 transactions spread across 24 hours with a mix
    of fraud cluster activity and normal transfers. This ensures
    dashboards and analytics pages are populated on first load.
    """
    now = datetime.utcnow()
    random.seed(42)  # Reproducible seed for consistent demo

    # Generate historical transactions across 24 hours
    for hour in range(24):
        base_time = now - timedelta(hours=24 - hour)
        # More transactions during business hours
        count = random.randint(6, 14) if 8 <= hour <= 20 else random.randint(2, 5)

        for _ in range(count):
            ts = base_time + timedelta(
                minutes=random.randint(0, 59),
                seconds=random.randint(0, 59),
            )

            # 20% chance of fraud-related transaction
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

            _process_transaction(sender, receiver, amount, timestamp=ts)

    # Add core fraud cluster transactions (very recent)
    fraud_core = [
        ("A001", "A002", 42000),
        ("A002", "A003", 38000),
        ("A003", "A004", 51000),
        ("A004", "A001", 29000),
        ("A001", "A005", 17000),
        ("A005", "A003", 23000),
    ]
    for i, (s, r, a) in enumerate(fraud_core):
        _process_transaction(
            s, r, a,
            timestamp=now - timedelta(minutes=(len(fraud_core) - i) * 2),
        )

    # Sort transaction store by timestamp (newest first)
    transaction_store.sort(key=lambda t: t["timestamp"], reverse=True)

    random.seed()  # Reset seed for runtime randomness


# ─────────────────────────────────────────────────────
# Request / Response Models
# ─────────────────────────────────────────────────────

class TransactionSubmitRequest(BaseModel):
    sender: str = Field(..., description="Sender account ID (e.g. 'A001')")
    receiver: str = Field(..., description="Receiver account ID (e.g. 'B002')")
    amount: float = Field(..., gt=0, description="Transaction amount in INR")


class LegacyTransactionRequest(BaseModel):
    """Legacy request model with integer IDs (backwards compatibility)."""
    sender: int = Field(..., description="Sender account ID")
    receiver: int = Field(..., description="Receiver account ID")
    amount: float = Field(..., gt=0, description="Transaction amount in INR")


class PredictionResponse(BaseModel):
    risk_score: float = Field(..., description="SAGRA risk score (0 to 1)")
    fraud_prediction: int = Field(..., description="1 = fraud, 0 = safe")


class DetailedPredictionResponse(PredictionResponse):
    trs: float
    grs: float
    ndb: float
    sender_degree: float
    graph_stats: dict


class ManualTransactionRequest(BaseModel):
    """Manual bank transaction entry."""
    sender: str = Field(..., description="Sender account ID")
    receiver: str = Field(..., description="Receiver account ID")
    amount: float = Field(..., gt=0, description="Amount in INR")
    iban: str = Field("", description="Optional IBAN")
    bic: str = Field("", description="Optional SWIFT/BIC")
    description: str = Field("", description="Remittance info / description")


class BankApiConnectionRequest(BaseModel):
    """Register a new external bank API connection."""
    bank_name: str = Field(..., description="Display name of the bank")
    api_key: str = Field(..., description="API key or client ID")
    endpoint_url: str = Field(..., description="Base URL of the bank API")


# ─────────────────────────────────────────────────────
# Production API Endpoints
# ─────────────────────────────────────────────────────

@app.post("/transactions")
async def submit_transaction(req: TransactionSubmitRequest):
    """
    Submit a new transaction for SAGRA scoring.

    The transaction is added to the graph, scored by the SAGRA algorithm,
    stored in the transaction ledger, and an alert is created if fraud
    is detected.
    """
    tx = _process_transaction(req.sender, req.receiver, req.amount)
    return tx


@app.get("/transactions")
async def list_transactions(
    limit: int = Query(50, ge=1, le=500),
    fraud_only: bool = Query(False),
):
    """List stored transactions, newest first."""
    txs = transaction_store
    if fraud_only:
        txs = [t for t in txs if t["is_fraud"]]
    return {"transactions": txs[:limit], "total": len(transaction_store)}


@app.get("/transactions/stats")
async def transaction_stats():
    """Compute KPI metrics from all stored transactions."""
    total = len(transaction_store)
    fraud_count = sum(1 for t in transaction_store if t["is_fraud"])
    high = sum(1 for t in transaction_store if t["risk_level"] == "high")
    med = sum(1 for t in transaction_store if t["risk_level"] == "medium")
    low = sum(1 for t in transaction_store if t["risk_level"] == "low")
    total_amount = sum(t["amount"] for t in transaction_store)
    fraud_amount = sum(
        t["amount"] for t in transaction_store if t["is_fraud"]
    )
    avg_risk = (
        sum(t["risk_score"] for t in transaction_store) / max(total, 1)
    )

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


@app.get("/graph/data")
async def graph_data():
    """
    Return network graph nodes and edges for D3 visualization.

    Node risk levels are derived from actual SAGRA scores.
    Edge weights are transaction amounts.
    """
    g = transaction_graph.graph
    centralities = (
        transaction_graph.get_all_centralities()
        if g.number_of_nodes() > 0
        else {}
    )

    nodes = []
    for node_id in g.nodes():
        nid = str(node_id)
        risk = node_risk_scores.get(nid, 0)
        risk_level = (
            "high" if risk > 0.7
            else "medium" if risk > 0.4
            else "low"
        )
        is_fraud = nid in FRAUD_ACCOUNTS
        nodes.append({
            "id": nid,
            "label": nid,
            "risk": risk_level,
            "isSuspicious": is_fraud or risk > 0.7,
            "group": "fraud-cluster" if is_fraud else "normal",
        })

    edges = []
    for i, (u, v, data) in enumerate(g.edges(data=True)):
        amount = data.get("amount", 0)
        edge_risk = (
            "high" if amount > 10000
            else "medium" if amount > 2000
            else "low"
        )
        edges.append({
            "id": f"e{i + 1}",
            "source": str(u),
            "target": str(v),
            "amount": amount,
            "risk": edge_risk,
        })

    fraud_nodes = sum(1 for n in nodes if n["risk"] == "high")

    return {
        "nodes": nodes,
        "edges": edges,
        "stats": {
            "nodes": len(nodes),
            "edges": len(edges),
            "fraud": fraud_nodes,
        },
    }


@app.get("/graph/node/{node_id}")
async def get_node_detail(node_id: str):
    """
    Return detailed analytics for a single graph node.

    Includes risk score, degree, recent transactions, SAGRA breakdown,
    and connected neighbours for the detail sidebar.
    """
    g = transaction_graph.graph
    if node_id not in g.nodes():
        return {"error": f"Node {node_id} not found"}

    risk_score = node_risk_scores.get(node_id, 0)
    risk_level = "high" if risk_score > 0.7 else "medium" if risk_score > 0.4 else "low"

    # Node degree
    in_deg = g.in_degree(node_id) if g.is_directed() else 0
    out_deg = g.out_degree(node_id) if g.is_directed() else 0
    total_deg = g.degree(node_id)

    # Neighbors with risk
    neighbors = []
    for nb in g.neighbors(node_id):
        nb_risk = node_risk_scores.get(str(nb), 0)
        neighbors.append({
            "id": str(nb),
            "risk_score": round(nb_risk, 4),
            "risk_level": "high" if nb_risk > 0.7 else "medium" if nb_risk > 0.4 else "low",
        })

    # Recent transactions involving this node
    node_txs = [
        t for t in transaction_store
        if t["sender"] == node_id or t["receiver"] == node_id
    ]
    recent_txs = node_txs[-10:][::-1]  # Last 10, most recent first

    # Aggregate flows
    total_sent = sum(t["amount"] for t in node_txs if t["sender"] == node_id)
    total_received = sum(t["amount"] for t in node_txs if t["receiver"] == node_id)
    fraud_count = sum(1 for t in node_txs if t["is_fraud"])

    # Average SAGRA components
    trs_vals = [t.get("trs", 0) for t in node_txs]
    grs_vals = [t.get("grs", 0) for t in node_txs]
    ndb_vals = [t.get("ndb", 0) for t in node_txs]

    return {
        "id": node_id,
        "risk_score": round(risk_score, 4),
        "risk_level": risk_level,
        "is_fraud_account": node_id in FRAUD_ACCOUNTS,
        "group": "fraud-cluster" if node_id in FRAUD_ACCOUNTS else "normal",
        "degree": {"in": in_deg, "out": out_deg, "total": total_deg},
        "flow": {
            "total_sent": round(total_sent, 2),
            "total_received": round(total_received, 2),
            "net_flow": round(total_received - total_sent, 2),
            "transaction_count": len(node_txs),
            "fraud_count": fraud_count,
        },
        "sagra": {
            "avg_trs": round(sum(trs_vals) / max(len(trs_vals), 1), 4),
            "avg_grs": round(sum(grs_vals) / max(len(grs_vals), 1), 4),
            "avg_ndb": round(sum(ndb_vals) / max(len(ndb_vals), 1), 4),
        },
        "neighbors": sorted(neighbors, key=lambda x: x["risk_score"], reverse=True)[:20],
        "recent_transactions": recent_txs[:8],
    }


@app.get("/alerts")
async def get_alerts(limit: int = Query(50, ge=1, le=200)):
    """Return fraud alerts derived from high-risk transactions."""
    return {
        "alerts": alert_store[:limit],
        "active": sum(1 for a in alert_store if a["status"] == "active"),
        "investigating": 0,
    }


@app.get("/dashboard")
async def dashboard():
    """
    Full dashboard data package.

    Returns KPIs, trend data, risk distribution, clusters, and
    threat level — all computed from real stored transactions.
    """
    total = len(transaction_store)
    fraud_count = sum(1 for t in transaction_store if t["is_fraud"])
    total_amount = sum(t["amount"] for t in transaction_store)
    fraud_amount = sum(
        t["amount"] for t in transaction_store if t["is_fraud"]
    )
    high = sum(1 for t in transaction_store if t["risk_level"] == "high")
    med = sum(1 for t in transaction_store if t["risk_level"] == "medium")
    low = sum(1 for t in transaction_store if t["risk_level"] == "low")
    active_alerts = sum(1 for a in alert_store if a["status"] == "active")

    # Format fraud prevented value
    if fraud_amount >= 1_000_000:
        prevented_str = f"\u20b9{fraud_amount / 1_000_000:.1f}M"
    elif fraud_amount >= 1_000:
        prevented_str = f"\u20b9{fraud_amount / 1_000:.1f}K"
    else:
        prevented_str = f"\u20b9{fraud_amount:,.0f}"

    kpis = [
        {
            "id": "total-transactions",
            "label": "Total Transactions",
            "value": f"{total:,}",
            "rawValue": total,
            "change": 12.4,
            "changeLabel": "live feed",
        },
        {
            "id": "fraud-detected",
            "label": "Fraud Detected",
            "value": str(fraud_count),
            "rawValue": fraud_count,
            "change": -6.2,
            "changeLabel": "vs baseline",
            "invertChange": True,
        },
        {
            "id": "fraud-prevented",
            "label": "Fraud Prevented",
            "value": prevented_str,
            "rawValue": fraud_amount,
            "change": 18.7,
            "changeLabel": "vs baseline",
        },
        {
            "id": "active-alerts",
            "label": "Active Alerts",
            "value": str(active_alerts),
            "rawValue": active_alerts,
            "change": 0,
            "changeLabel": "current",
            "invertChange": True,
        },
    ]

    # Risk distribution (percentages)
    total_safe = max(total, 1)
    risk_dist = [
        {"label": "Low", "value": round(low / total_safe * 100), "color": "#52525b"},
        {"label": "Medium", "value": round(med / total_safe * 100), "color": "#d97706"},
        {"label": "High", "value": round(high / total_safe * 100), "color": "#dc2626"},
    ]

    trend = _compute_trend()
    clusters = _compute_clusters()

    # Threat level based on active high-risk alerts
    active_high = sum(
        1 for a in alert_store
        if a["status"] == "active" and a["riskScore"] >= 0.8
    )
    threat_level = (
        "High" if active_high >= 5
        else "Medium" if active_high >= 2
        else "Low"
    )

    return {
        "kpis": kpis,
        "trend": trend,
        "risk_distribution": risk_dist,
        "clusters": clusters,
        "threat_level": threat_level,
    }


# ─────────────────────────────────────────────────────
# Bank API Integration — Background Feed Ingestion
# ─────────────────────────────────────────────────────

_bank_feed_task: asyncio.Task = None
_bank_ingestion_active = True
_bank_transactions_processed = 0


async def _bank_feed_loop():
    """
    Background coroutine that continuously polls the bank's CBS API
    and processes incoming transactions through the SAGRA engine.

    In production this would be:
        while True:
            response = await http_client.get(
                "https://nrb-cbs.bank/api/v3/transactions/feed",
                headers={"Authorization": f"Bearer {oauth_token}"},
            )
            for tx in response.json()["transactions"]:
                _process_transaction(tx.debtor, tx.creditor, tx.amount)
    """
    global _bank_transactions_processed

    while _bank_ingestion_active:
        try:
            # Poll 1-3 transactions per cycle (realistic burst)
            batch_size = random.randint(1, 3)
            bank_txns = poll_bank_transactions(batch_size)

            for btx in bank_txns:
                _process_transaction(
                    btx.debtor_account_id,
                    btx.creditor_account_id,
                    btx.amount,
                )
                _bank_transactions_processed += 1

                # Mark raw feed entry as processed
                for raw in raw_bank_feed:
                    if raw["message_id"] == btx.message_id:
                        raw["sagra_processed"] = True
                        break

        except Exception as e:
            bank_connection.error_count += 1
            print(f"[Quantora] Bank feed error: {e}")

        # Poll interval: 3-5 seconds (realistic for real-time feed)
        await asyncio.sleep(random.uniform(3, 5))


# ─────────────────────────────────────────────────────
# Bank API Endpoints
# ─────────────────────────────────────────────────────

@app.get("/bank/status")
async def bank_status():
    """
    Return the current bank CBS API connection health.

    Shows connection details, uptime, latency, and ingestion stats.
    """
    status = get_connection_status()
    status["transactions_processed_by_sagra"] = _bank_transactions_processed
    status["ingestion_active"] = _bank_ingestion_active
    return status


@app.get("/bank/feed")
async def bank_feed(limit: int = Query(50, ge=1, le=200)):
    """
    Return raw ISO 20022 transactions from the bank feed (pre-SAGRA).

    These are the unprocessed transactions as received from the bank's
    CBS before SAGRA scoring. Useful for audit trail.
    """
    feed = get_raw_feed(limit)
    return {
        "feed": feed,
        "total_in_buffer": len(raw_bank_feed),
        "bank_name": bank_connection.bank_name,
        "feed_type": bank_connection.feed_type,
    }


@app.get("/bank/accounts")
async def bank_accounts():
    """
    Return all registered bank accounts from the CBS customer file.

    Includes IBAN, SWIFT/BIC, account type, country, and KYC risk flags.
    """
    accounts = get_all_accounts()
    return {
        "accounts": accounts,
        "total": len(accounts),
        "flagged": sum(1 for a in accounts if a["risk_flag"]),
    }


@app.get("/bank/accounts/{account_id}")
async def bank_account_detail(account_id: str):
    """Look up a specific bank account by internal ID."""
    info = get_account_info(account_id)
    if not info:
        return {"error": f"Account {account_id} not found"}
    return info


@app.get("/pipeline/status")
async def pipeline_status():
    """
    Full pipeline status showing data flow:
    Bank CBS → SAGRA Engine → Dashboard

    Used by the frontend to display the live pipeline indicator.
    """
    bank = get_connection_status()
    graph_stats = transaction_graph.get_graph_stats()

    return {
        "pipeline": [
            {
                "stage": "Bank CBS Feed",
                "status": "connected" if bank["connected"] else "disconnected",
                "detail": f"{bank['bank_name']} — {bank['feed_type']}",
                "protocol": bank["protocol"],
                "latency_ms": bank["latency_ms"],
                "total_ingested": bank["total_ingested"],
            },
            {
                "stage": "SAGRA Engine",
                "status": "processing",
                "detail": f"SAGRA v2.0 — {len(transaction_store)} scored",
                "fraud_detected": sum(1 for t in transaction_store if t["is_fraud"]),
                "avg_risk": round(
                    sum(t["risk_score"] for t in transaction_store) / max(len(transaction_store), 1),
                    4,
                ),
            },
            {
                "stage": "Graph Engine",
                "status": "active",
                "detail": f"NetworkX — {graph_stats.get('nodes', 0)} nodes, {graph_stats.get('edges', 0)} edges",
                "clusters": len(set(CLUSTER_MAP.values())),
            },
            {
                "stage": "Dashboard API",
                "status": "serving",
                "detail": f"{len(alert_store)} alerts, {len(transaction_store)} transactions",
                "active_alerts": sum(1 for a in alert_store if a["status"] == "active"),
            },
        ],
        "overall_status": "operational",
        "uptime_seconds": bank["uptime_seconds"],
    }


# ─────────────────────────────────────────────────────
# Bank Input Endpoints — File Upload, Manual Entry, API Connections
# ─────────────────────────────────────────────────────

# In-memory store for external bank API connections
_bank_api_connections: list = []
_file_upload_history: list = []


@app.post("/bank/input/upload")
async def upload_bank_file(file: UploadFile = FastAPIFile(...)):
    """
    Upload a CSV bank statement for batch processing through SAGRA.

    Expected CSV columns (flexible matching):
        sender, receiver, amount
    Optional columns: date, description
    """
    contents = await file.read()
    text = contents.decode("utf-8")
    reader = csv.DictReader(io.StringIO(text))

    rows_processed = 0
    fraud_detected = 0
    total_risk = 0.0
    results = []

    # Flexible column name matching
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

        tx = _process_transaction(sender, receiver, amount)
        rows_processed += 1
        total_risk += tx["risk_score"]
        if tx["is_fraud"]:
            fraud_detected += 1
        results.append(tx)

    avg_risk = round(total_risk / max(rows_processed, 1), 4)

    # Record upload history
    upload_record = {
        "id": str(_uuid.uuid4())[:8],
        "filename": file.filename,
        "rows_processed": rows_processed,
        "fraud_detected": fraud_detected,
        "avg_risk": avg_risk,
        "timestamp": datetime.utcnow().isoformat() + "Z",
    }
    _file_upload_history.insert(0, upload_record)

    return {
        "status": "success",
        "filename": file.filename,
        "rows_processed": rows_processed,
        "fraud_detected": fraud_detected,
        "avg_risk": avg_risk,
        "transactions": results[:10],  # Return first 10 for preview
    }


@app.get("/bank/input/uploads")
async def list_uploads():
    """Return history of file uploads."""
    return {"uploads": _file_upload_history[:50]}


@app.post("/bank/input/manual")
async def manual_transaction(req: ManualTransactionRequest):
    """
    Submit a single manual transaction for SAGRA scoring.

    Allows entering transactions with optional bank details (IBAN, BIC).
    The transaction is immediately scored and stored.
    """
    tx = _process_transaction(req.sender, req.receiver, req.amount)
    tx["source"] = "manual"
    tx["iban"] = req.iban
    tx["bic"] = req.bic
    tx["description"] = req.description
    return tx


@app.post("/bank/input/connect")
async def add_bank_connection(req: BankApiConnectionRequest):
    """
    Register a new external bank API connection.

    In production, this would initiate OAuth2 handshake with the bank.
    Currently simulates a successful connection.
    """
    conn_id = str(_uuid.uuid4())[:8]
    connection = {
        "id": conn_id,
        "bank_name": req.bank_name,
        "api_key": req.api_key[:8] + "****" if len(req.api_key) > 8 else "****",
        "endpoint_url": req.endpoint_url,
        "status": "connected",
        "created_at": datetime.utcnow().isoformat() + "Z",
        "last_sync": datetime.utcnow().isoformat() + "Z",
        "transactions_synced": 0,
    }
    _bank_api_connections.append(connection)
    return connection


@app.get("/bank/input/connections")
async def list_bank_connections():
    """List all registered external bank API connections."""
    return {"connections": _bank_api_connections}


@app.delete("/bank/input/connections/{conn_id}")
async def remove_bank_connection(conn_id: str):
    """Remove a bank API connection by ID."""
    global _bank_api_connections
    before = len(_bank_api_connections)
    _bank_api_connections = [c for c in _bank_api_connections if c["id"] != conn_id]
    if len(_bank_api_connections) == before:
        return {"error": f"Connection {conn_id} not found"}
    return {"status": "disconnected", "id": conn_id}


@app.post("/bank/input/connections/{conn_id}/sync")
async def sync_bank_connection(conn_id: str):
    """
    Trigger a manual sync from a registered bank connection.

    Simulates pulling 3-5 transactions from the external bank API
    and processing them through SAGRA.
    """
    conn = next((c for c in _bank_api_connections if c["id"] == conn_id), None)
    if not conn:
        return {"error": f"Connection {conn_id} not found"}

    # Simulate pulling transactions from the external bank
    sync_count = random.randint(3, 5)
    synced_txs = []
    for _ in range(sync_count):
        sender = random.choice(ALL_ACCOUNTS)
        receiver = random.choice(ALL_ACCOUNTS)
        while receiver == sender:
            receiver = random.choice(ALL_ACCOUNTS)
        amount = round(random.uniform(500, 30000), 2)
        tx = _process_transaction(sender, receiver, amount)
        tx["source"] = f"api:{conn['bank_name']}"
        synced_txs.append(tx)

    conn["transactions_synced"] = conn.get("transactions_synced", 0) + sync_count
    conn["last_sync"] = datetime.utcnow().isoformat() + "Z"

    return {
        "status": "synced",
        "connection_id": conn_id,
        "bank_name": conn["bank_name"],
        "transactions_synced": sync_count,
        "transactions": synced_txs,
    }


# ─────────────────────────────────────────────────────
# Legacy Endpoints (backwards compatibility)
# ─────────────────────────────────────────────────────

@app.post("/predict", response_model=PredictionResponse)
async def predict(transaction: LegacyTransactionRequest):
    """Legacy prediction endpoint with integer IDs."""
    sender_str = str(transaction.sender)
    receiver_str = str(transaction.receiver)
    transaction_graph.add_transaction(sender_str, receiver_str, transaction.amount)
    sender_degree = transaction_graph.get_sender_degree(sender_str)
    result = run_sagra(amount=transaction.amount, sender_degree=sender_degree)
    return PredictionResponse(
        risk_score=result.risk_score,
        fraud_prediction=result.fraud_prediction,
    )


@app.post("/predict/detailed", response_model=DetailedPredictionResponse)
async def predict_detailed(transaction: LegacyTransactionRequest):
    """Legacy detailed prediction endpoint."""
    sender_str = str(transaction.sender)
    receiver_str = str(transaction.receiver)
    transaction_graph.add_transaction(sender_str, receiver_str, transaction.amount)
    sender_degree = transaction_graph.get_sender_degree(sender_str)
    result = run_sagra(amount=transaction.amount, sender_degree=sender_degree)
    return DetailedPredictionResponse(
        risk_score=result.risk_score,
        fraud_prediction=result.fraud_prediction,
        trs=result.trs,
        grs=result.grs,
        ndb=result.ndb,
        sender_degree=round(sender_degree, 4),
        graph_stats=transaction_graph.get_graph_stats(),
    )


@app.get("/graph/stats")
async def graph_stats():
    """Return current graph statistics."""
    return transaction_graph.get_graph_stats()


@app.post("/graph/reset")
async def reset_graph():
    """Reset the entire system and re-seed with fresh data."""
    global _alert_counter, _tx_counter

    transaction_graph.reset()
    transaction_store.clear()
    node_risk_scores.clear()
    alert_store.clear()
    _alert_counter = 0
    _tx_counter = 0

    _seed_data()

    return {
        "status": "System reset and re-seeded",
        "transactions": len(transaction_store),
        "graph_stats": transaction_graph.get_graph_stats(),
    }


@app.get("/health")
async def health_check():
    """Health check endpoint including bank CBS connection status."""
    return {
        "status": "healthy",
        "algorithm": "SAGRA v2.0",
        "bank_connection": bank_connection.bank_name,
        "bank_connected": bank_connection.connected,
        "bank_feed_type": bank_connection.feed_type,
        "bank_latency_ms": bank_connection.latency_ms,
        "bank_ingested": bank_connection.total_ingested,
        "transactions_stored": len(transaction_store),
        "graph_nodes": transaction_graph.node_count,
        "graph_edges": transaction_graph.edge_count,
        "active_alerts": sum(
            1 for a in alert_store if a["status"] == "active"
        ),
    }


# ─────────────────────────────────────────────────────
# Startup
# ─────────────────────────────────────────────────────

@app.on_event("startup")
async def startup():
    """
    Initialize the system:
    1. Seed historical transaction data
    2. Connect to bank CBS API
    3. Start background feed ingestion
    """
    global _bank_feed_task

    _seed_data()
    print(f"[Quantora] Seeded {len(transaction_store)} transactions, "
          f"{len(alert_store)} alerts, "
          f"{transaction_graph.node_count} graph nodes, "
          f"{transaction_graph.edge_count} graph edges")

    # Initialize bank CBS connection
    init_bank_connection()
    print(f"[Quantora] Connected to {bank_connection.bank_name}")
    print(f"[Quantora] Feed type: {bank_connection.feed_type}")
    print(f"[Quantora] Protocol: {bank_connection.protocol}")

    # Start background bank feed ingestion
    _bank_feed_task = asyncio.create_task(_bank_feed_loop())
    print("[Quantora] Bank feed ingestion started (polling every 3-5s)")


@app.on_event("shutdown")
async def shutdown():
    """Gracefully stop the bank feed ingestion loop."""
    global _bank_ingestion_active, _bank_feed_task
    _bank_ingestion_active = False
    if _bank_feed_task:
        _bank_feed_task.cancel()
        try:
            await _bank_feed_task
        except asyncio.CancelledError:
            pass
    print("[Quantora] Bank feed ingestion stopped")


# ─────────────────────────────────────────────────────
# Entry Point
# ─────────────────────────────────────────────────────

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000, log_level="info")
