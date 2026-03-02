"""
Graph router — network visualization data and node details.
"""

from fastapi import APIRouter, Depends
from sqlalchemy import select, or_
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.auth import get_current_user
from app.models.user import User
from app.models.transaction import Transaction
from graph_engine import transaction_graph

router = APIRouter(prefix="/graph", tags=["Graph"])


@router.get("/data")
async def graph_data(
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user),
):
    """
    Return network graph nodes and edges for D3 visualization.
    Node risk levels are derived from actual SAGRA scores in DB.
    """
    g = transaction_graph.graph

    # Build node risk scores from DB transactions
    result = await db.execute(select(Transaction))
    all_txs = result.scalars().all()

    node_risk_scores: dict[str, float] = {}
    for tx in all_txs:
        node_risk_scores[tx.sender] = max(
            node_risk_scores.get(tx.sender, 0), tx.risk_score
        )
        node_risk_scores[tx.receiver] = max(
            node_risk_scores.get(tx.receiver, 0), tx.risk_score * 0.3
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
        nodes.append({
            "id": nid,
            "label": nid,
            "risk": risk_level,
            "isSuspicious": risk > 0.7,
            "group": "fraud-cluster" if risk > 0.7 else "normal",
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


@router.get("/node/{node_id}")
async def get_node_detail(
    node_id: str,
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user),
):
    """Return detailed analytics for a single graph node."""
    g = transaction_graph.graph
    if node_id not in g.nodes():
        return {"error": f"Node {node_id} not found"}

    # Get all transactions involving this node from DB
    result = await db.execute(
        select(Transaction).where(
            or_(Transaction.sender == node_id, Transaction.receiver == node_id)
        ).order_by(Transaction.timestamp.desc())
    )
    node_txs = result.scalars().all()

    # Compute node risk score from transaction history
    risk_score = max((tx.risk_score for tx in node_txs if tx.sender == node_id), default=0)
    risk_level = "high" if risk_score > 0.7 else "medium" if risk_score > 0.4 else "low"

    # Degree
    in_deg = g.in_degree(node_id) if g.is_directed() else 0
    out_deg = g.out_degree(node_id) if g.is_directed() else 0
    total_deg = g.degree(node_id)

    # Neighbors with risk
    neighbors = []
    for nb in g.neighbors(node_id):
        nb_result = await db.execute(
            select(Transaction.risk_score).where(Transaction.sender == str(nb)).order_by(Transaction.risk_score.desc()).limit(1)
        )
        nb_risk = nb_result.scalar() or 0
        neighbors.append({
            "id": str(nb),
            "risk_score": round(nb_risk, 4),
            "risk_level": "high" if nb_risk > 0.7 else "medium" if nb_risk > 0.4 else "low",
        })

    # Aggregates
    total_sent = sum(t.amount for t in node_txs if t.sender == node_id)
    total_received = sum(t.amount for t in node_txs if t.receiver == node_id)
    fraud_count = sum(1 for t in node_txs if t.is_fraud)

    trs_vals = [t.trs for t in node_txs]
    grs_vals = [t.grs for t in node_txs]
    ndb_vals = [t.ndb for t in node_txs]

    recent_txs = [t.to_dict() for t in node_txs[:8]]

    return {
        "id": node_id,
        "risk_score": round(risk_score, 4),
        "risk_level": risk_level,
        "is_fraud_account": risk_score > 0.7,
        "group": "fraud-cluster" if risk_score > 0.7 else "normal",
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
        "recent_transactions": recent_txs,
    }


@router.get("/stats")
async def graph_stats(user: User = Depends(get_current_user)):
    """Return current graph statistics."""
    return transaction_graph.get_graph_stats()
