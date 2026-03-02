// lib/api.ts
// ============================================================
// Enterprise API client for the Quantora AI SAGRA backend.
//
// All requests include JWT auth headers.
// Auth token stored in localStorage.
// ============================================================

import type { Transaction, GraphNode, GraphEdge, RiskLevel } from '@/lib/mockData';

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';


// ─────────────────────────────────────────────────────
// Auth Helper
// ─────────────────────────────────────────────────────

function getAuthHeaders(): Record<string, string> {
    const token = typeof window !== 'undefined' ? localStorage.getItem('quantora_token') : null;
    const headers: Record<string, string> = { 'Content-Type': 'application/json' };
    if (token) {
        headers['Authorization'] = `Bearer ${token}`;
    }
    return headers;
}

async function authFetch(url: string, options: RequestInit = {}): Promise<Response> {
    const headers = { ...getAuthHeaders(), ...(options.headers || {}) };
    const res = await fetch(url, { ...options, headers });

    // If we get 401, redirect to login
    if (res.status === 401 && typeof window !== 'undefined') {
        localStorage.removeItem('quantora_token');
        localStorage.removeItem('quantora_user');
        window.location.href = '/login';
        throw new Error('Session expired');
    }
    return res;
}


// ─────────────────────────────────────────────────────
// Auth Endpoints
// ─────────────────────────────────────────────────────

export interface AuthUser {
    id: string;
    email: string;
    full_name: string;
    role: string;
    created_at: string;
}

export interface AuthResponse {
    user: AuthUser;
    token: string;
}

export async function loginUser(email: string, password: string): Promise<AuthResponse> {
    const res = await fetch(`${API_BASE}/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
    });
    if (!res.ok) {
        const data = await res.json().catch(() => ({ detail: 'Login failed' }));
        throw new Error(data.detail || 'Login failed');
    }
    const data: AuthResponse = await res.json();
    localStorage.setItem('quantora_token', data.token);
    localStorage.setItem('quantora_user', JSON.stringify(data.user));
    return data;
}

export async function registerUser(email: string, password: string, fullName: string): Promise<AuthResponse> {
    const res = await fetch(`${API_BASE}/auth/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password, full_name: fullName }),
    });
    if (!res.ok) {
        const data = await res.json().catch(() => ({ detail: 'Registration failed' }));
        throw new Error(data.detail || 'Registration failed');
    }
    const data: AuthResponse = await res.json();
    localStorage.setItem('quantora_token', data.token);
    localStorage.setItem('quantora_user', JSON.stringify(data.user));
    return data;
}

export function logoutUser(): void {
    localStorage.removeItem('quantora_token');
    localStorage.removeItem('quantora_user');
    window.location.href = '/login';
}

export function getStoredUser(): AuthUser | null {
    if (typeof window === 'undefined') return null;
    const raw = localStorage.getItem('quantora_user');
    if (!raw) return null;
    try { return JSON.parse(raw); } catch { return null; }
}

export function isAuthenticated(): boolean {
    if (typeof window === 'undefined') return false;
    return !!localStorage.getItem('quantora_token');
}


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
    id: string;
    tx_id: string;
    type: string;
    severity: string;
    status: string;
    timestamp: string;
    sender: string;
    receiver: string;
    amount: number;
    risk_score: number;
    trigger_reason: string;
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
    total: number;
    fraud: number;
    amount: number;
}

export interface RiskDistPoint {
    label: string;
    value: number;
    color: string;
}

export interface ClusterData {
    clusterId: string;
    nodeCount: number;
    riskLevel: number;
    primaryActor: string;
    isExpanded: boolean;
}

export interface DashboardData {
    kpis: DashboardKpi[];
    trend: TrendPoint[];
    risk_distribution: RiskDistPoint[];
    clusters: ClusterData[];
    threat_level: 'High' | 'Medium' | 'Low';
}


// ─────────────────────────────────────────────────────
// API Functions — All Auth-Protected
// ─────────────────────────────────────────────────────

export async function submitTransaction(data: {
    sender: string;
    receiver: string;
    amount: number;
}): Promise<StoredTransaction> {
    const res = await authFetch(`${API_BASE}/transactions`, {
        method: 'POST',
        body: JSON.stringify(data),
    });
    if (!res.ok) throw new Error(`API error: ${res.status}`);
    return await res.json();
}

export async function fetchTransactions(
    limit = 50,
    fraudOnly = false,
): Promise<TransactionsResponse> {
    const params = new URLSearchParams({
        limit: String(limit),
        fraud_only: String(fraudOnly),
    });
    const res = await authFetch(`${API_BASE}/transactions?${params}`);
    if (!res.ok) throw new Error(`API error: ${res.status}`);
    return await res.json();
}

export async function fetchTransactionStats(): Promise<TransactionStats> {
    const res = await authFetch(`${API_BASE}/transactions/stats`);
    if (!res.ok) throw new Error(`API error: ${res.status}`);
    return await res.json();
}

export async function fetchGraphData(): Promise<GraphData> {
    const res = await authFetch(`${API_BASE}/graph/data`);
    if (!res.ok) throw new Error(`API error: ${res.status}`);
    return await res.json();
}

export interface NodeDetail {
    id: string;
    risk_score: number;
    risk_level: 'high' | 'medium' | 'low';
    is_fraud_account: boolean;
    group: string;
    degree: { in: number; out: number; total: number };
    flow: {
        total_sent: number;
        total_received: number;
        net_flow: number;
        transaction_count: number;
        fraud_count: number;
    };
    sagra: { avg_trs: number; avg_grs: number; avg_ndb: number };
    neighbors: { id: string; risk_score: number; risk_level: string }[];
    recent_transactions: StoredTransaction[];
}

export async function fetchNodeDetail(nodeId: string): Promise<NodeDetail> {
    const res = await authFetch(`${API_BASE}/graph/node/${nodeId}`);
    if (!res.ok) throw new Error(`API error: ${res.status}`);
    return await res.json();
}

export async function fetchAlerts(limit = 50): Promise<AlertsResponse> {
    const res = await authFetch(`${API_BASE}/alerts?limit=${limit}`);
    if (!res.ok) throw new Error(`API error: ${res.status}`);
    return await res.json();
}

export async function fetchDashboard(): Promise<DashboardData> {
    const res = await authFetch(`${API_BASE}/dashboard`);
    if (!res.ok) throw new Error(`API error: ${res.status}`);
    return await res.json();
}


// ─────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────

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
// Bank Input Endpoints (Auth-Protected)
// ─────────────────────────────────────────────────────

export interface FileUploadResponse {
    status: string;
    filename: string;
    rows_processed: number;
    fraud_detected: number;
    avg_risk: number;
    transactions: StoredTransaction[];
}

export interface ManualTransactionRequest {
    sender: string;
    receiver: string;
    amount: number;
    iban?: string;
    bic?: string;
    description?: string;
}

export interface BankApiConnection {
    id: string;
    bank_name: string;
    api_key_masked: string;
    endpoint_url: string;
    status: string;
    created_at: string;
}

export interface BankApiConnectionRequest {
    bank_name: string;
    api_key: string;
    endpoint_url: string;
}

export async function uploadBankFile(file: File): Promise<FileUploadResponse> {
    const token = typeof window !== 'undefined' ? localStorage.getItem('quantora_token') : null;
    const formData = new FormData();
    formData.append('file', file);
    const headers: Record<string, string> = {};
    if (token) headers['Authorization'] = `Bearer ${token}`;
    const res = await fetch(`${API_BASE}/bank/input/upload`, {
        method: 'POST',
        headers,
        body: formData,
    });
    if (!res.ok) throw new Error(`Upload error: ${res.status}`);
    return await res.json();
}

export async function submitManualTransaction(data: ManualTransactionRequest): Promise<StoredTransaction> {
    const res = await authFetch(`${API_BASE}/bank/input/manual`, {
        method: 'POST',
        body: JSON.stringify(data),
    });
    if (!res.ok) throw new Error(`API error: ${res.status}`);
    return await res.json();
}

export async function addBankConnection(data: BankApiConnectionRequest): Promise<BankApiConnection> {
    const res = await authFetch(`${API_BASE}/bank/input/connect`, {
        method: 'POST',
        body: JSON.stringify(data),
    });
    if (!res.ok) throw new Error(`API error: ${res.status}`);
    return await res.json();
}

export async function listBankConnections(): Promise<{ connections: BankApiConnection[] }> {
    const res = await authFetch(`${API_BASE}/bank/input/connections`);
    if (!res.ok) throw new Error(`API error: ${res.status}`);
    return await res.json();
}

export async function removeBankConnection(id: string): Promise<void> {
    const res = await authFetch(`${API_BASE}/bank/input/connections/${id}`, {
        method: 'DELETE',
    });
    if (!res.ok) throw new Error(`API error: ${res.status}`);
}

export async function fetchHealth(): Promise<Record<string, unknown>> {
    const res = await fetch(`${API_BASE}/health`);
    if (!res.ok) throw new Error(`API error: ${res.status}`);
    return await res.json();
}
