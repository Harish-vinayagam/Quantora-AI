// lib/api.ts
// ============================================================
// Production API client for the Quantora AI SAGRA backend.
//
// All data flows through the backend — no mock data.
// Endpoints:
//   POST /transactions        → submitTransaction()
//   GET  /transactions        → fetchTransactions()
//   GET  /transactions/stats  → fetchTransactionStats()
//   GET  /graph/data          → fetchGraphData()
//   GET  /alerts              → fetchAlerts()
//   GET  /dashboard           → fetchDashboard()
// ============================================================

import type { Transaction, GraphNode, GraphEdge, RiskLevel } from '@/lib/mockData';

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';


// ─────────────────────────────────────────────────────
// Backend Response Types
// ─────────────────────────────────────────────────────

export interface StoredTransaction {
    id: string;
    sender: string;
    receiver: string;
    amount: number;
    timestamp: string;
    risk_score: number;
    risk_level: 'high' | 'medium' | 'low';
    is_fraud: boolean;
    trs: number;
    grs: number;
    ndb: number;
}

export interface TransactionsResponse {
    transactions: StoredTransaction[];
    total: number;
}

export interface TransactionStats {
    total: number;
    fraud_count: number;
    fraud_rate: number;
    avg_risk: number;
    total_amount: number;
    fraud_amount: number;
    high_count: number;
    medium_count: number;
    low_count: number;
}

export interface GraphData {
    nodes: GraphNode[];
    edges: GraphEdge[];
    stats: { nodes: number; edges: number; fraud: number };
}

export interface AlertData {
    alertId: string;
    account: string;
    riskScore: number;
    triggerReason: string;
    status: 'active' | 'investigating' | 'resolved';
    timestamp: string;
    clusterId: string;
    transactionId?: string;
}

export interface AlertsResponse {
    alerts: AlertData[];
    active: number;
    investigating: number;
}

export interface DashboardKpi {
    id: string;
    label: string;
    value: string;
    rawValue: number;
    change: number;
    changeLabel: string;
    invertChange?: boolean;
}

export interface TrendPoint {
    time: string;
    transactions: number;
    fraudAlerts: number;
}

export interface RiskDistPoint {
    label: string;
    value: number;
    color: string;
}

export interface ClusterData {
    clusterId: string;
    accountsInvolved: number;
    avgRiskScore: number;
    status: 'active' | 'monitoring' | 'contained';
    lastActivity: string;
}

export interface DashboardData {
    kpis: DashboardKpi[];
    trend: TrendPoint[];
    risk_distribution: RiskDistPoint[];
    clusters: ClusterData[];
    threat_level: 'High' | 'Medium' | 'Low';
}


// ─────────────────────────────────────────────────────
// API Functions — Production Endpoints
// ─────────────────────────────────────────────────────

/**
 * Submit a new transaction for SAGRA scoring.
 * Returns the fully scored transaction record.
 */
export async function submitTransaction(data: {
    sender: string;
    receiver: string;
    amount: number;
}): Promise<StoredTransaction> {
    const res = await fetch(`${API_BASE}/transactions`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
    });
    if (!res.ok) throw new Error(`API error: ${res.status}`);
    return await res.json();
}

/**
 * Fetch stored transactions from the backend.
 */
export async function fetchTransactions(
    limit = 50,
    fraudOnly = false,
): Promise<TransactionsResponse> {
    const params = new URLSearchParams({
        limit: String(limit),
        fraud_only: String(fraudOnly),
    });
    const res = await fetch(`${API_BASE}/transactions?${params}`);
    if (!res.ok) throw new Error(`API error: ${res.status}`);
    return await res.json();
}

/**
 * Fetch KPI metrics computed from all stored transactions.
 */
export async function fetchTransactionStats(): Promise<TransactionStats> {
    const res = await fetch(`${API_BASE}/transactions/stats`);
    if (!res.ok) throw new Error(`API error: ${res.status}`);
    return await res.json();
}

/**
 * Fetch network graph data (nodes + edges) for D3 visualization.
 */
export async function fetchGraphData(): Promise<GraphData> {
    const res = await fetch(`${API_BASE}/graph/data`);
    if (!res.ok) throw new Error(`API error: ${res.status}`);
    return await res.json();
}

/**
 * Fetch fraud alerts derived from high-risk transactions.
 */
export async function fetchAlerts(limit = 50): Promise<AlertsResponse> {
    const res = await fetch(`${API_BASE}/alerts?limit=${limit}`);
    if (!res.ok) throw new Error(`API error: ${res.status}`);
    return await res.json();
}

/**
 * Fetch full dashboard data package (KPIs, trend, distribution, clusters).
 */
export async function fetchDashboard(): Promise<DashboardData> {
    const res = await fetch(`${API_BASE}/dashboard`);
    if (!res.ok) throw new Error(`API error: ${res.status}`);
    return await res.json();
}


// ─────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────

/**
 * Map a backend StoredTransaction to the frontend Transaction type.
 */
export function mapApiTransaction(t: StoredTransaction): Transaction {
    return {
        id: t.id,
        senderId: t.sender,
        receiverId: t.receiver,
        amount: t.amount,
        timestamp: new Date(t.timestamp),
        risk: t.risk_level as RiskLevel,
        isFraud: t.is_fraud,
    };
}


// ─────────────────────────────────────────────────────
// Legacy Endpoints (kept for backwards compatibility)
// ─────────────────────────────────────────────────────

export interface PredictRequest {
    sender: number;
    receiver: number;
    amount: number;
}

export interface PredictResponse {
    risk_score: number;
    fraud_prediction: number;
}

export async function predictFraud(data: PredictRequest): Promise<PredictResponse> {
    try {
        const res = await fetch(`${API_BASE}/predict`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(data),
        });
        if (!res.ok) return fallbackPrediction(data.amount);
        return await res.json();
    } catch {
        return fallbackPrediction(data.amount);
    }
}

function fallbackPrediction(amount: number): PredictResponse {
    const trs = Math.min(amount / 10000, 1);
    const risk_score = parseFloat((trs * 0.5).toFixed(4));
    return { risk_score, fraud_prediction: risk_score > 0.7 ? 1 : 0 };
}

export async function fetchGraphStats() {
    try {
        const res = await fetch(`${API_BASE}/graph/stats`);
        if (!res.ok) return null;
        return await res.json();
    } catch {
        return null;
    }
}
