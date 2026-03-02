"""
Dashboard router — aggregated KPIs and analytics.
"""

from datetime import datetime, timedelta
from fastapi import APIRouter, Depends
from sqlalchemy import select, func
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.auth import get_current_user
from app.models.user import User
from app.models.transaction import Transaction
from app.models.alert import Alert
from graph_engine import transaction_graph

router = APIRouter(prefix="/dashboard", tags=["Dashboard"])


def _compute_trend(transactions: list) -> list:
    """Group transactions into hourly buckets for the trend chart."""
    now = datetime.utcnow()
    buckets = {}

    for i in range(24):
        hour = (now - timedelta(hours=23 - i)).strftime("%H:00")
        buckets[hour] = {"time": hour, "total": 0, "fraud": 0, "amount": 0}

    for tx in transactions:
        ts = tx.timestamp
        if (now - ts).total_seconds() > 86400:
            continue
        hour_key = ts.strftime("%H:00")
        if hour_key in buckets:
            buckets[hour_key]["total"] += 1
            buckets[hour_key]["amount"] += tx.amount
            if tx.is_fraud:
                buckets[hour_key]["fraud"] += 1

    return list(buckets.values())


def _compute_clusters(transactions: list) -> list:
    """Derive risk clusters from transaction patterns."""
    # Group by sender to find active clusters
    sender_groups: dict[str, dict] = {}
    for tx in transactions:
        if tx.risk_level == "high":
            if tx.sender not in sender_groups:
                sender_groups[tx.sender] = {
                    "clusterId": f"CLU-{hash(tx.sender) % 100:03d}",
                    "nodeCount": 0,
                    "riskLevel": 0,
                    "accounts": set(),
                }
            sender_groups[tx.sender]["nodeCount"] += 1
            sender_groups[tx.sender]["riskLevel"] = max(
                sender_groups[tx.sender]["riskLevel"], tx.risk_score
            )
            sender_groups[tx.sender]["accounts"].add(tx.sender)
            sender_groups[tx.sender]["accounts"].add(tx.receiver)

    clusters = []
    for sender, data in list(sender_groups.items())[:10]:
        clusters.append({
            "clusterId": data["clusterId"],
            "nodeCount": len(data["accounts"]),
            "riskLevel": round(data["riskLevel"], 2),
            "primaryActor": sender,
            "isExpanded": False,
        })

    return sorted(clusters, key=lambda c: c["riskLevel"], reverse=True)


@router.get("")
async def dashboard(
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user),
):
    """Full dashboard data package — KPIs, trends, risk distribution."""
    result = await db.execute(select(Transaction))
    all_txs = result.scalars().all()

    alert_result = await db.execute(select(Alert).where(Alert.status == "active"))
    active_alerts_list = alert_result.scalars().all()

    total = len(all_txs)
    fraud_count = sum(1 for t in all_txs if t.is_fraud)
    total_amount = sum(t.amount for t in all_txs)
    fraud_amount = sum(t.amount for t in all_txs if t.is_fraud)
    high = sum(1 for t in all_txs if t.risk_level == "high")
    med = sum(1 for t in all_txs if t.risk_level == "medium")
    low = sum(1 for t in all_txs if t.risk_level == "low")
    active_alerts = len(active_alerts_list)

    # Format fraud prevented value
    if fraud_amount >= 1_000_000:
        prevented_str = f"₹{fraud_amount / 1_000_000:.1f}M"
    elif fraud_amount >= 1_000:
        prevented_str = f"₹{fraud_amount / 1_000:.1f}K"
    else:
        prevented_str = f"₹{fraud_amount:,.0f}"

    kpis = [
        {
            "id": "total-transactions",
            "label": "Total Transactions",
            "value": f"{total:,}",
            "rawValue": total,
            "change": 0,
            "changeLabel": "live feed",
        },
        {
            "id": "fraud-detected",
            "label": "Fraud Detected",
            "value": str(fraud_count),
            "rawValue": fraud_count,
            "change": 0,
            "changeLabel": "from SAGRA",
            "invertChange": True,
        },
        {
            "id": "fraud-prevented",
            "label": "Fraud Prevented",
            "value": prevented_str,
            "rawValue": fraud_amount,
            "change": 0,
            "changeLabel": "blocked",
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

    total_safe = max(total, 1)
    risk_dist = [
        {"label": "Low", "value": round(low / total_safe * 100), "color": "#52525b"},
        {"label": "Medium", "value": round(med / total_safe * 100), "color": "#d97706"},
        {"label": "High", "value": round(high / total_safe * 100), "color": "#dc2626"},
    ]

    trend = _compute_trend(all_txs)
    clusters = _compute_clusters(all_txs)

    # Threat level
    active_high = sum(1 for a in active_alerts_list if a.risk_score >= 0.8)
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
