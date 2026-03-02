# Quantora AI — Backend

## SAGRA: Sentinel Adaptive Graph Risk Algorithm

Production-ready backend powering Quantora AI's real-time fraud detection engine.

---

### Architecture

```
backend/
├── main.py           # FastAPI server — HTTP layer & request routing
├── graph_engine.py   # In-memory transaction graph (NetworkX)
├── sentinel.py       # SAGRA algorithm — core risk scoring engine
├── requirements.txt  # Python dependencies
└── README.md         # This file
```

### How SAGRA Works

SAGRA combines three risk signals into a weighted final score:

| Component | Formula | Weight | Purpose |
|-----------|---------|--------|---------|
| **TRS** (Transaction Risk) | `min(amount / 10000, 1)` | 50% | Monetary risk signal |
| **GRS** (Graph Risk) | `min(sender_degree × 5, 1)` | 30% | Topological risk from graph centrality |
| **NDB** (Network Density Boost) | `0.3 if degree > 0.05` | 20% | Adaptive escalation for high-connectivity |

**Final Score:** `FRS = 0.5 × TRS + 0.3 × GRS + 0.2 × NDB`

**Fraud Decision:** `FRS > 0.7 → FRAUD` | `FRS ≤ 0.7 → SAFE`

### Research Lineage

SAGRA was originally prototyped and validated in:
> **"SAGRA — Sentinel Adaptive Graph Risk Algorithm.ipynb"**

The notebook included:
- Synthetic fraud data generation (fan-out attack simulation)
- Graph construction using NetworkX
- Centrality feature extraction (degree, betweenness, closeness)
- Custom risk scoring logic with weighted aggregation
- Adaptive threshold validation and accuracy benchmarking

This backend is the production migration of that validated research.

### API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| `POST` | `/predict` | Score a transaction for fraud risk |
| `POST` | `/predict/detailed` | Full SAGRA breakdown with graph stats |
| `GET` | `/graph/stats` | Current graph node/edge counts |
| `POST` | `/graph/reset` | Reset the graph (demo/testing) |
| `GET` | `/health` | Health check |

### Quick Start

```bash
cd backend
pip install -r requirements.txt
python main.py
```

Server starts at `http://localhost:8000`

### Example Request

```bash
curl -X POST http://localhost:8000/predict \
  -H "Content-Type: application/json" \
  -d '{"sender": 1001, "receiver": 2002, "amount": 15000}'
```

**Response:**
```json
{
  "risk_score": 0.56,
  "fraud_prediction": 0
}
```

### Production Scalability

Current implementation uses in-memory graph for demonstration. Enterprise deployment would:

- **Graph DB:** Neo4j or Amazon Neptune for persistent, distributed graph storage
- **Streaming:** Apache Kafka for real-time transaction ingestion
- **Scaling:** Horizontal scaling with containerized microservices (K8s)
- **Latency:** Target <200ms end-to-end inference per transaction
- **Monitoring:** Model drift detection and performance dashboards
