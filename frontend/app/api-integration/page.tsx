'use client';

import { useState, useEffect, useCallback } from 'react';
import Sidebar from '@/components/Sidebar';
import PipelineStatusBar from '@/components/PipelineStatusBar';
import BackButton from '@/components/ui/BackButton';
import {
    Activity,
    CheckCircle2,
    XCircle,
    Clock,
    RefreshCw,
    Send,
    ChevronDown,
    ChevronRight,
    Copy,
    Loader2,
    Wifi,
    WifiOff,
    Server,
    Database,
    Globe,
    Zap,
    AlertTriangle,
    ArrowRight,
} from 'lucide-react';
import {
    fetchHealth,
    fetchTransactionStats,
    fetchAlerts,
    fetchGraphData,
    fetchDashboard,
    fetchTransactions,
    type TransactionStats,
} from '@/lib/api';

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

// ── Types ──────────────────────────────────────────────────────────

interface EndpointDef {
    method: 'GET' | 'POST';
    path: string;
    label: string;
    description: string;
    category: string;
    sampleBody?: object;
}

interface EndpointResult {
    status: number | null;
    latency: number | null;
    data: unknown;
    error: string | null;
    timestamp: string | null;
}

// ── Endpoint Catalog ───────────────────────────────────────────────

const ENDPOINTS: EndpointDef[] = [
    { method: 'GET', path: '/health', label: 'Health Check', description: 'System health and algorithm status', category: 'System' },
    { method: 'GET', path: '/pipeline/status', label: 'Pipeline Status', description: 'Bank CBS → SAGRA → Dashboard data flow', category: 'System' },
    { method: 'GET', path: '/bank/status', label: 'Bank Connection', description: 'CBS API connection health and stats', category: 'Bank CBS' },
    { method: 'GET', path: '/bank/feed?limit=5', label: 'Bank Feed', description: 'Raw ISO 20022 transactions (pre-SAGRA)', category: 'Bank CBS' },
    { method: 'GET', path: '/bank/accounts', label: 'Bank Accounts', description: 'Registered accounts from CBS customer file', category: 'Bank CBS' },
    { method: 'GET', path: '/transactions?limit=10', label: 'List Transactions', description: 'Scored transactions (newest first)', category: 'Transactions' },
    { method: 'GET', path: '/transactions/stats', label: 'Transaction Stats', description: 'KPI metrics from all stored transactions', category: 'Transactions' },
    { method: 'POST', path: '/transactions', label: 'Submit Transaction', description: 'Submit & score a new transaction via SAGRA', category: 'Transactions', sampleBody: { sender: 'B001', receiver: 'A003', amount: 12500 } },
    { method: 'GET', path: '/graph/data', label: 'Graph Data', description: 'Network graph nodes + edges for D3', category: 'Graph' },
    { method: 'GET', path: '/graph/stats', label: 'Graph Stats', description: 'Current graph statistics', category: 'Graph' },
    { method: 'POST', path: '/graph/reset', label: 'Reset System', description: 'Reset & re-seed with fresh data', category: 'Graph' },
    { method: 'GET', path: '/alerts?limit=10', label: 'Fraud Alerts', description: 'Alerts derived from high-risk transactions', category: 'Alerts' },
    { method: 'GET', path: '/dashboard', label: 'Dashboard Data', description: 'Full dashboard package (KPIs, trend, clusters)', category: 'Dashboard' },
    { method: 'POST', path: '/predict', label: 'Predict (Legacy)', description: 'Legacy SAGRA prediction with integer IDs', category: 'Legacy', sampleBody: { sender: 1, receiver: 5, amount: 25000 } },
    { method: 'POST', path: '/predict/detailed', label: 'Predict Detailed', description: 'Legacy detailed prediction with SAGRA breakdown', category: 'Legacy', sampleBody: { sender: 1, receiver: 5, amount: 25000 } },
];

const CATEGORIES = ['System', 'Bank CBS', 'Transactions', 'Graph', 'Alerts', 'Dashboard', 'Legacy'];

// ── Status Badge ───────────────────────────────────────────────────

function StatusBadge({ status }: { status: 'connected' | 'disconnected' | 'processing' | 'active' | 'serving' | string }) {
    const styles: Record<string, string> = {
        connected: 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20',
        operational: 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20',
        processing: 'text-blue-400 bg-blue-500/10 border-blue-500/20',
        active: 'text-blue-400 bg-blue-500/10 border-blue-500/20',
        serving: 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20',
        disconnected: 'text-red-400 bg-red-500/10 border-red-500/20',
        error: 'text-red-400 bg-red-500/10 border-red-500/20',
    };
    return (
        <span className={`text-[9px] font-mono px-1.5 py-0.5 rounded-sm border ${styles[status] || styles.active}`}>
            {status}
        </span>
    );
}

// ── Method Badge ───────────────────────────────────────────────────

function MethodBadge({ method }: { method: string }) {
    const color = method === 'GET'
        ? 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20'
        : 'text-amber-400 bg-amber-500/10 border-amber-500/20';
    return (
        <span className={`text-[9px] font-mono font-bold px-1.5 py-0.5 rounded-sm border ${color} min-w-[36px] text-center inline-block`}>
            {method}
        </span>
    );
}

// ── Endpoint Row ───────────────────────────────────────────────────

function EndpointRow({ ep, result, onTest, testing }: {
    ep: EndpointDef;
    result: EndpointResult | null;
    onTest: () => void;
    testing: boolean;
}) {
    const [expanded, setExpanded] = useState(false);
    const [bodyText, setBodyText] = useState(ep.sampleBody ? JSON.stringify(ep.sampleBody, null, 2) : '');
    const [copied, setCopied] = useState(false);

    const copyResponse = () => {
        if (result?.data) {
            navigator.clipboard.writeText(JSON.stringify(result.data, null, 2));
            setCopied(true);
            setTimeout(() => setCopied(false), 1500);
        }
    };

    return (
        <div className="border border-[var(--border)] rounded-md bg-[var(--surface)] overflow-hidden">
            {/* Header */}
            <div
                className="flex items-center gap-3 px-4 py-3 cursor-pointer hover:bg-[var(--bg)] transition-colors duration-100"
                onClick={() => setExpanded(!expanded)}
            >
                {expanded ? <ChevronDown size={12} className="text-[var(--text-muted)]" /> : <ChevronRight size={12} className="text-[var(--text-muted)]" />}
                <MethodBadge method={ep.method} />
                <code className="text-[11px] font-mono text-[var(--text-primary)] flex-1">{ep.path}</code>
                <span className="text-[9px] font-mono text-[var(--text-muted)] hidden lg:inline">{ep.description}</span>

                {result && (
                    <div className="flex items-center gap-2 ml-2">
                        {result.error ? (
                            <XCircle size={12} className="text-red-400" />
                        ) : (
                            <CheckCircle2 size={12} className="text-emerald-400" />
                        )}
                        <span className={`text-[9px] font-mono ${result.error ? 'text-red-400' : 'text-emerald-400'}`}>
                            {result.status ?? '—'}
                        </span>
                        {result.latency !== null && (
                            <span className="text-[9px] font-mono text-[var(--text-muted)]">
                                {result.latency}ms
                            </span>
                        )}
                    </div>
                )}

                <button
                    onClick={e => { e.stopPropagation(); onTest(); }}
                    disabled={testing}
                    className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-md text-[10px] font-mono border border-[var(--border)] text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-[var(--surface)] hover:border-zinc-500 transition-all duration-150 disabled:opacity-50"
                >
                    {testing ? <Loader2 size={10} className="animate-spin" /> : <Send size={10} />}
                    Test
                </button>
            </div>

            {/* Expanded Detail */}
            {expanded && (
                <div className="border-t border-[var(--border)]">
                    <div className="grid grid-cols-1 xl:grid-cols-2 divide-y xl:divide-y-0 xl:divide-x divide-[var(--border)]">
                        {/* Request */}
                        <div className="p-4">
                            <div className="flex items-center justify-between mb-2">
                                <span className="text-[9px] font-mono uppercase tracking-widest text-[var(--text-muted)]">Request</span>
                                <span className="text-[9px] font-mono text-[var(--text-muted)]">{API_BASE}{ep.path}</span>
                            </div>
                            {ep.method === 'POST' && (
                                <textarea
                                    value={bodyText}
                                    onChange={e => setBodyText(e.target.value)}
                                    rows={5}
                                    spellCheck={false}
                                    className="w-full text-[10px] font-mono p-3 rounded-md border border-[var(--border)] bg-[var(--bg)] text-[var(--text-primary)] focus:outline-none focus:border-zinc-500 resize-none"
                                    placeholder="Request body (JSON)"
                                />
                            )}
                            {ep.method === 'GET' && (
                                <div className="text-[10px] font-mono p-3 rounded-md border border-[var(--border)] bg-[var(--bg)] text-[var(--text-muted)]">
                                    No request body required
                                </div>
                            )}
                        </div>

                        {/* Response */}
                        <div className="p-4">
                            <div className="flex items-center justify-between mb-2">
                                <span className="text-[9px] font-mono uppercase tracking-widest text-[var(--text-muted)]">Response</span>
                                {result?.data != null ? (
                                    <button onClick={copyResponse} className="flex items-center gap-1 text-[9px] font-mono text-[var(--text-muted)] hover:text-[var(--text-primary)] transition-colors">
                                        <Copy size={10} />
                                        {copied ? 'Copied' : 'Copy'}
                                    </button>
                                ) : null}
                            </div>
                            <pre className="text-[10px] font-mono p-3 rounded-md border border-[var(--border)] bg-[var(--bg)] text-[var(--text-secondary)] max-h-64 overflow-auto custom-scrollbar whitespace-pre-wrap">
                                {result
                                    ? result.error
                                        ? `Error: ${result.error}`
                                        : JSON.stringify(result.data, null, 2)
                                    : 'No response yet — click "Test" to execute'
                                }
                            </pre>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}

// ── Main Page ──────────────────────────────────────────────────────

export default function ApiIntegrationPage() {
    const [healthData, setHealthData] = useState<Record<string, unknown> | null>(null);
    const [txStats, setTxStats] = useState<TransactionStats | null>(null);
    const [results, setResults] = useState<Record<string, EndpointResult>>({});
    const [testing, setTesting] = useState<Record<string, boolean>>({});
    const [backendUp, setBackendUp] = useState<boolean | null>(null);
    const [filterCat, setFilterCat] = useState<string>('All');
    const [loading, setLoading] = useState(true);

    // ── Fetch overview data ──
    useEffect(() => {
        const load = async () => {
            try {
                const [health, stats] = await Promise.all([
                    fetchHealth().catch(() => null),
                    fetchTransactionStats().catch(() => null),
                ]);
                setHealthData(health);
                setTxStats(stats);
                setBackendUp(true);
            } catch {
                setBackendUp(false);
            }
            setLoading(false);
        };
        load();
        const interval = setInterval(load, 8000);
        return () => clearInterval(interval);
    }, []);

    // ── Test single endpoint ──
    const testEndpoint = useCallback(async (ep: EndpointDef) => {
        const key = `${ep.method}:${ep.path}`;
        setTesting(prev => ({ ...prev, [key]: true }));

        const start = performance.now();
        try {
            const opts: RequestInit = { method: ep.method };
            if (ep.method === 'POST') {
                opts.headers = { 'Content-Type': 'application/json' };
                opts.body = JSON.stringify(ep.sampleBody || {});
            }
            const res = await fetch(`${API_BASE}${ep.path}`, opts);
            const data = await res.json();
            const latency = Math.round(performance.now() - start);
            setResults(prev => ({
                ...prev,
                [key]: { status: res.status, latency, data, error: null, timestamp: new Date().toISOString() },
            }));
        } catch (err: unknown) {
            const latency = Math.round(performance.now() - start);
            setResults(prev => ({
                ...prev,
                [key]: { status: null, latency, data: null, error: (err as Error).message, timestamp: new Date().toISOString() },
            }));
        }
        setTesting(prev => ({ ...prev, [key]: false }));
    }, []);

    // ── Test all endpoints ──
    const testAll = async () => {
        for (const ep of ENDPOINTS) {
            await testEndpoint(ep);
        }
    };

    // ── Filter endpoints ──
    const filtered = filterCat === 'All' ? ENDPOINTS : ENDPOINTS.filter(e => e.category === filterCat);

    // Uptime format
    const uptimeStr = (seconds: number) => {
        const h = Math.floor(seconds / 3600);
        const m = Math.floor((seconds % 3600) / 60);
        return `${h}h ${m}m`;
    };

    // ── Loading state ──
    if (loading) {
        return (
            <div className="flex h-screen overflow-hidden bg-[var(--bg)]">
                <Sidebar />
                <div className="flex-1 flex items-center justify-center">
                    <div className="flex items-center gap-3">
                        <Loader2 size={16} className="animate-spin text-[var(--text-muted)]" />
                        <span className="text-xs font-mono text-[var(--text-muted)]">Connecting to SAGRA backend...</span>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="flex h-screen overflow-hidden bg-[var(--bg)]">
            <Sidebar />
            <div className="flex-1 flex flex-col overflow-hidden">

                <PipelineStatusBar />

                {/* Page Header */}
                <header className="h-14 flex-shrink-0 border-b border-[var(--border)] px-6 flex items-center justify-between">
                    <div className="flex items-center gap-4">
                        <BackButton />
                        <div>
                            <span className="text-xs font-semibold text-[var(--text-primary)] tracking-tight">API Integration</span>
                            <span className="text-[10px] font-mono text-[var(--text-muted)] ml-2">· Endpoint Testing & Monitoring</span>
                        </div>
                    </div>
                    <div className="flex items-center gap-3">
                        {/* Backend Status */}
                        <div className="flex items-center gap-1.5">
                            {backendUp ? (
                                <>
                                    <span className="relative flex h-1.5 w-1.5">
                                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
                                        <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-emerald-500" />
                                    </span>
                                    <span className="text-[10px] font-mono text-emerald-400">Backend Online</span>
                                </>
                            ) : (
                                <>
                                    <WifiOff size={12} className="text-red-400" />
                                    <span className="text-[10px] font-mono text-red-400">Backend Offline</span>
                                </>
                            )}
                        </div>
                        <div className="w-px h-4 bg-[var(--border)]" />
                        <button
                            onClick={testAll}
                            className="flex items-center gap-1.5 px-3 py-1.5 rounded-md text-[10px] font-mono border border-[var(--border)] text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-[var(--surface)] hover:border-zinc-500 transition-all duration-150"
                        >
                            <Zap size={11} />
                            Test All Endpoints
                        </button>
                    </div>
                </header>

                {/* Main Content — Full Width Enterprise Layout */}
                <main className="flex-1 overflow-y-auto custom-scrollbar">

                    {/* Connection Overview Strip */}
                    <div className="border-b border-[var(--border)] bg-[var(--surface)]">
                        <div className="grid grid-cols-2 lg:grid-cols-4 xl:grid-cols-6 divide-x divide-[var(--border)]">
                            {/* Backend */}
                            <div className="px-5 py-4">
                                <div className="flex items-center gap-2 mb-1.5">
                                    <Server size={12} className="text-[var(--text-muted)]" />
                                    <span className="text-[9px] font-mono uppercase tracking-widest text-[var(--text-muted)]">Backend</span>
                                </div>
                                <p className="text-[13px] font-mono font-semibold text-[var(--text-primary)]">
                                    {backendUp ? 'Operational' : 'Unreachable'}
                                </p>
                                <p className="text-[9px] font-mono text-[var(--text-muted)] mt-0.5">SAGRA v2.0 · FastAPI</p>
                            </div>

                            {/* Bank CBS */}
                            <div className="px-5 py-4">
                                <div className="flex items-center gap-2 mb-1.5">
                                    <Globe size={12} className="text-[var(--text-muted)]" />
                                    <span className="text-[9px] font-mono uppercase tracking-widest text-[var(--text-muted)]">Bank CBS</span>
                                </div>
                                <p className="text-[13px] font-mono font-semibold text-[var(--text-primary)]">
                                    {String(healthData?.algorithm || 'SAGRA v2.0')}
                                </p>
                                <p className="text-[9px] font-mono text-[var(--text-muted)] mt-0.5">
                                    {healthData ? `Enterprise · v${healthData.version || '3.0'}` : 'Not connected'}
                                </p>
                            </div>

                            {/* Latency */}
                            <div className="px-5 py-4">
                                <div className="flex items-center gap-2 mb-1.5">
                                    <Activity size={12} className="text-[var(--text-muted)]" />
                                    <span className="text-[9px] font-mono uppercase tracking-widest text-[var(--text-muted)]">Latency</span>
                                </div>
                                <p className="text-[13px] font-mono font-semibold text-[var(--text-primary)]">
                                    {String(healthData?.active_alerts ?? '—')}<span className="text-[10px] text-[var(--text-muted)]">alerts</span>
                                </p>
                                <p className="text-[9px] font-mono text-[var(--text-muted)] mt-0.5">CBS API round-trip</p>
                            </div>

                            {/* Uptime */}
                            <div className="px-5 py-4">
                                <div className="flex items-center gap-2 mb-1.5">
                                    <Clock size={12} className="text-[var(--text-muted)]" />
                                    <span className="text-[9px] font-mono uppercase tracking-widest text-[var(--text-muted)]">Uptime</span>
                                </div>
                                <p className="text-[13px] font-mono font-semibold text-[var(--text-primary)]">
                                    {healthData ? uptimeStr(Number(healthData.uptime_seconds) || 0) : '—'}
                                </p>
                                <p className="text-[9px] font-mono text-[var(--text-muted)] mt-0.5">Since last restart</p>
                            </div>

                            {/* Transactions Processed */}
                            <div className="px-5 py-4">
                                <div className="flex items-center gap-2 mb-1.5">
                                    <Database size={12} className="text-[var(--text-muted)]" />
                                    <span className="text-[9px] font-mono uppercase tracking-widest text-[var(--text-muted)]">Processed</span>
                                </div>
                                <p className="text-[13px] font-mono font-semibold text-[var(--text-primary)]">
                                    {txStats ? txStats.total.toLocaleString() : '—'}
                                </p>
                                <p className="text-[9px] font-mono text-[var(--text-muted)] mt-0.5">
                                    {txStats ? `${txStats.fraud_count} flagged (${txStats.fraud_rate}%)` : 'Total transactions'}
                                </p>
                            </div>

                            {/* Errors */}
                            <div className="px-5 py-4">
                                <div className="flex items-center gap-2 mb-1.5">
                                    <AlertTriangle size={12} className="text-[var(--text-muted)]" />
                                    <span className="text-[9px] font-mono uppercase tracking-widest text-[var(--text-muted)]">Errors</span>
                                </div>
                                <p className="text-[13px] font-mono font-semibold text-[var(--text-primary)]">
                                    {String(healthData?.graph_nodes ?? '—')}
                                </p>
                                <p className="text-[9px] font-mono text-[var(--text-muted)] mt-0.5">Feed errors since start</p>
                            </div>
                        </div>
                    </div>

                    {/* Pipeline Visualization */}
                    {healthData && (
                        <div className="border-b border-[var(--border)] px-6 py-4">
                            <div className="flex items-center gap-2 mb-3">
                                <span className="text-[9px] font-mono uppercase tracking-widest text-[var(--text-muted)]">Data Pipeline</span>
                                <StatusBadge status={String(healthData.status) || 'healthy'} />
                            </div>
                            <div className="flex items-center gap-0">
                                {[
                                    { stage: 'Data Input', status: 'active', detail: 'CSV / Manual / API' },
                                    { stage: 'SAGRA Engine', status: 'processing', detail: String(healthData.algorithm || 'SAGRA v2.0') },
                                    { stage: 'Graph Engine', status: 'active', detail: `${healthData.graph_nodes} nodes, ${healthData.graph_edges} edges` },
                                    { stage: 'Dashboard', status: 'serving', detail: `${healthData.transactions_stored} transactions` },
                                ].map((stage: { stage: string; status: string; detail: string }, i: number) => (
                                    <div key={stage.stage} className="flex items-center">
                                        <div className="px-4 py-2.5 rounded-md border border-[var(--border)] bg-[var(--surface)] min-w-[180px]">
                                            <div className="flex items-center justify-between mb-1">
                                                <span className="text-[10px] font-mono font-semibold text-[var(--text-primary)]">{stage.stage}</span>
                                                <StatusBadge status={stage.status} />
                                            </div>
                                            <p className="text-[9px] font-mono text-[var(--text-muted)]">{stage.detail}</p>
                                        </div>
                                        {i < 3 && (
                                            <ArrowRight size={14} className="mx-2 text-[var(--text-muted)] flex-shrink-0" />
                                        )}
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* Category Filters + Endpoint List */}
                    <div className="flex flex-col lg:flex-row lg:divide-x divide-[var(--border)] min-h-0 flex-1">

                        {/* Category Sidebar */}
                        <div className="lg:w-56 flex-shrink-0 border-b lg:border-b-0 border-[var(--border)] bg-[var(--surface)]">
                            <div className="px-4 py-3 border-b border-[var(--border)]">
                                <span className="text-[9px] font-mono uppercase tracking-widest text-[var(--text-muted)]">Categories</span>
                            </div>
                            <nav className="p-2 space-y-0.5 lg:block flex flex-wrap gap-1 lg:gap-0">
                                <button
                                    onClick={() => setFilterCat('All')}
                                    className={`w-full text-left px-3 py-2 rounded-md text-[10px] font-mono transition-colors duration-100 ${filterCat === 'All'
                                        ? 'bg-[var(--bg)] text-[var(--text-primary)] border border-[var(--border)] font-semibold'
                                        : 'text-[var(--text-muted)] hover:text-[var(--text-secondary)] hover:bg-[var(--bg)] border border-transparent'
                                        }`}
                                >
                                    All Endpoints
                                    <span className="ml-1.5 text-[9px] text-[var(--text-muted)]">({ENDPOINTS.length})</span>
                                </button>
                                {CATEGORIES.map(cat => {
                                    const count = ENDPOINTS.filter(e => e.category === cat).length;
                                    return (
                                        <button
                                            key={cat}
                                            onClick={() => setFilterCat(cat)}
                                            className={`w-full text-left px-3 py-2 rounded-md text-[10px] font-mono transition-colors duration-100 ${filterCat === cat
                                                ? 'bg-[var(--bg)] text-[var(--text-primary)] border border-[var(--border)] font-semibold'
                                                : 'text-[var(--text-muted)] hover:text-[var(--text-secondary)] hover:bg-[var(--bg)] border border-transparent'
                                                }`}
                                        >
                                            {cat}
                                            <span className="ml-1.5 text-[9px] text-[var(--text-muted)]">({count})</span>
                                        </button>
                                    );
                                })}
                            </nav>
                        </div>

                        {/* Endpoint List */}
                        <div className="flex-1 overflow-y-auto custom-scrollbar p-6">
                            <div className="flex items-center justify-between mb-4">
                                <div>
                                    <h2 className="text-xs font-semibold text-[var(--text-primary)] tracking-tight">
                                        {filterCat === 'All' ? 'All Endpoints' : filterCat}
                                    </h2>
                                    <p className="text-[9px] font-mono text-[var(--text-muted)] mt-0.5">
                                        {filtered.length} endpoint{filtered.length !== 1 ? 's' : ''} · Base URL: {API_BASE}
                                    </p>
                                </div>
                                <div className="flex items-center gap-2">
                                    <span className="text-[9px] font-mono text-[var(--text-muted)]">
                                        {Object.keys(results).length} tested
                                    </span>
                                </div>
                            </div>

                            <div className="space-y-2">
                                {filtered.map(ep => {
                                    const key = `${ep.method}:${ep.path}`;
                                    return (
                                        <EndpointRow
                                            key={key}
                                            ep={ep}
                                            result={results[key] || null}
                                            testing={!!testing[key]}
                                            onTest={() => testEndpoint(ep)}
                                        />
                                    );
                                })}
                            </div>
                        </div>
                    </div>
                </main>
            </div>
        </div>
    );
}
