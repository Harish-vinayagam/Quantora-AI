# Quantora AI
### Adaptive Real-Time Fraud Detection Using Graph-Based Behavioral Analytics

<p align="center">
  <strong>Team Overdrive</strong> &nbsp;|&nbsp; DigitHon 3.0 – FinTech Track
</p>

---

> **Fraud is no longer a transaction problem. It is a network problem.**

---

## 📌 Overview

**Quantora AI** is a graph-native fraud detection framework designed to detect coordinated, network-based financial fraud in real time.

Traditional fraud systems analyze transactions individually. Modern fraud, however, operates as interconnected networks of accounts, devices, and identities.

Quantora AI models financial ecosystems as **dynamic graphs** to uncover hidden fraud rings and relational attack patterns.

---

## 🚨 The Problem

Modern financial fraud is **coordinated, distributed, and relational.**

### Current Threat Landscape

| Threat | Description |
|---|---|
| 🔴 Organized mule account rings | Groups of accounts used to funnel illicit funds |
| 🔴 Synthetic identity clusters | Fabricated identities sharing real data fragments |
| 🔴 Multi-hop money laundering | Layered transfers across accounts to obscure origins |
| 🔴 Device & IP masking | Single actor operating across many accounts |
| 🔴 Distributed smurfing attacks | Low-value transactions split to evade thresholds |

> Traditional transaction-level systems **cannot detect coordinated fraud networks.**

---

## ❌ Why Current Systems Fail

### Rule-Based Systems
- Static thresholds
- Easy to bypass
- High maintenance overhead

### Transaction-Level ML
- Analyzes rows in isolation
- No relational awareness
- Misses coordinated rings

### 🔍 Critical Gap

> There is no visibility into **relationship structures** between accounts, devices, IPs, and identities.

Fraud detection must evolve from **row-based analysis** to **network intelligence.**

---

## 🧠 Our Solution

### Quantora AI: Graph-Native Fraud Intelligence

We model the financial ecosystem as a **dynamic graph.**

### Nodes (Entities)

| Node Type |
|---|
| 👤 Customer Accounts |
| 🏦 Bank Accounts |
| 💻 Devices |
| 🌐 IP Addresses |
| 💳 Cards |
| 🏪 Merchants |

### Edges (Relationships)

| Edge Type |
|---|
| Transactions |
| Shared Device Usage |
| Shared IP Logins |
| Account Linkages |
| Beneficiary Additions |

### Detected Patterns

- 🔁 Circular money flows
- 📡 Fan-in / fan-out fraud
- 🕸 Dense suspicious communities
- 🔗 Multi-hop laundering chains
- 🪪 Synthetic identity clusters

---

## 🏗 System Architecture

### Project Structure

```
Quantora-AI/
├── frontend/               # Next.js React UI
│   ├── app/                # Pages and routing
│   ├── components/         # React components
│   ├── lib/                # Utilities, mock data, API client
│   ├── package.json        # Frontend dependencies
│   └── next.config.js      # API proxy configuration
│
├── backend/                # FastAPI + SAGRA Engine
│   ├── main.py             # REST API server
│   ├── sentinel.py         # SAGRA algorithm (core engine)
│   ├── graph_engine.py     # In-memory transaction graph
│   ├── requirements.txt    # Python dependencies
│   └── README.md           # Backend documentation
│
└── README.md               # This file
```

### SAGRA — Sentinel Adaptive Graph Risk Algorithm

The core innovation powering Quantora AI. Originally prototyped in:
> **"SAGRA — Sentinel Adaptive Graph Risk Algorithm.ipynb"**

SAGRA combines three risk signals:

| Component | Formula | Weight |
|-----------|---------|--------|
| **TRS** (Transaction Risk) | `min(amount / 10000, 1)` | 50% |
| **GRS** (Graph Risk) | `min(sender_degree × 5, 1)` | 30% |
| **NDB** (Network Density Boost) | `0.3 if degree > 0.05` | 20% |

**Final Score:** `FRS = 0.5 × TRS + 0.3 × GRS + 0.2 × NDB`  
**Fraud Decision:** `FRS > 0.7 → FRAUD`

### Real-Time Detection Pipeline

```
Transaction Event
       ↓
Feature Enrichment
       ↓
Graph Update (Nodes + Edges)
       ↓
Graph Analytics Engine
       ↓
Risk Scoring Engine
       ↓
Explainability Layer
       ↓
Final Decision
```

### Three Intelligence Layers

| Layer | Components |
|---|---|
| **1. Transaction Anomaly Detection** | Isolation Forest, statistical deviation |
| **2. Behavioral Drift Analysis** | Sliding window baselines, drift scoring |
| **3. Graph Intelligence** | Community Detection, Centrality Analysis |

---

## 📊 Adaptive Risk Engine

### Risk Formula

```
Final Risk Score =
    0.4 × Transaction Risk
  + 0.3 × Behavioral Risk
  + 0.3 × Graph Risk
```

### How Adaptivity Works

- 📈 **Sliding window** fraud density monitoring
- ⚙️ **Dynamic threshold adjustment** during attack surges
- 👤 **Personalized behavioral baselines** per entity
- ⏳ **Temporal decay** on graph relationships

> Risk sensitivity **automatically adapts** to emerging fraud patterns.

---

## 🛡 Explainability & Fairness

### Explainability

- Cluster membership visualization
- Multi-hop connection trace
- Transaction anomaly breakdown
- Behavioral deviation reasoning

### Fairness Safeguards

- Removal of protected attributes from scoring
- Monitoring false positive rate parity across groups
- Human-in-the-loop escalation for borderline cases

> Transparent, auditable, and **regulator-aligned** fraud decisions.

---

## 🚀 Hackathon MVP Scope

For **DigitHon 3.0**, we are implementing:

- [x] Simulated real-time transaction stream
- [x] Dynamic graph construction
- [x] Louvain community detection
- [x] Centrality-based anomaly scoring
- [x] Adaptive risk threshold logic
- [x] Live dashboard with explanation trace




> Designed for scalable integration into real-world banking systems.

---

## 🌍 Impact

| Goal | Outcome |
|---|---|
| 🎯 Detect entire fraud rings | Not just single anomalies |
| 📉 Reduce false positives | Via multi-layer scoring |
| 🔎 Actionable intelligence | For fraud analysts |
| 🛡 Proactive defense | Strengthen fraud posture |

> From isolated transactions to **intelligent networks.**

---

<p align="center">
  Built with ❤️ by <strong>Team Overdrive</strong> at DigitHon 3.0
</p>

