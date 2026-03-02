'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import Sidebar from '@/components/Sidebar';
import PipelineStatusBar from '@/components/PipelineStatusBar';
import BackButton from '@/components/ui/BackButton';
import {
    Landmark,
    Plug,
    Upload,
    PenLine,
    Plus,
    RefreshCw,
    Trash2,
    CheckCircle2,
    XCircle,
    Loader2,
    FileText,
    AlertTriangle,
    ArrowRight,
    Send,
    Download,
    Wifi,
    Shield,
    Clock,
    Zap,
} from 'lucide-react';
import {
    uploadBankFile,
    submitManualTransaction,
    addBankConnection,
    listBankConnections,
    removeBankConnection,
    type FileUploadResponse,
    type BankApiConnection,
    type StoredTransaction,
} from '@/lib/api';


// ── Tab Definition ─────────────────────────────────────────────────

type TabId = 'connections' | 'import' | 'manual';

const TABS: { id: TabId; label: string; icon: React.ElementType }[] = [
    { id: 'connections', label: 'API Connections', icon: Plug },
    { id: 'import', label: 'Import Statements', icon: Upload },
    { id: 'manual', label: 'Manual Entry', icon: PenLine },
];


// ── Risk Score Gauge ───────────────────────────────────────────────

function RiskGauge({ score }: { score: number }) {
    const pct = Math.round(score * 100);
    const color = score > 0.7 ? '#dc2626' : score > 0.4 ? '#d97706' : '#22c55e';
    const circumference = 2 * Math.PI * 36;
    const offset = circumference * (1 - score);

    return (
        <div className="relative w-24 h-24 flex items-center justify-center">
            <svg viewBox="0 0 80 80" className="w-full h-full -rotate-90">
                <circle cx="40" cy="40" r="36" fill="none" stroke="var(--border)" strokeWidth="6" />
                <circle
                    cx="40" cy="40" r="36" fill="none" stroke={color} strokeWidth="6"
                    strokeDasharray={circumference}
                    strokeDashoffset={offset}
                    strokeLinecap="round"
                    className="transition-all duration-700 ease-out"
                />
            </svg>
            <div className="absolute inset-0 flex flex-col items-center justify-center">
                <span className="text-lg font-mono font-bold" style={{ color }}>{pct}%</span>
                <span className="text-[8px] font-mono text-[var(--text-muted)] uppercase tracking-widest">Risk</span>
            </div>
        </div>
    );
}


// ── API Connections Tab ────────────────────────────────────────────

function ConnectionsTab() {
    const [connections, setConnections] = useState<BankApiConnection[]>([]);
    const [showForm, setShowForm] = useState(false);
    const [bankName, setBankName] = useState('');
    const [apiKey, setApiKey] = useState('');
    const [endpointUrl, setEndpointUrl] = useState('');
    const [loading, setLoading] = useState(true);
    const [submitting, setSubmitting] = useState(false);
    const [syncing, setSyncing] = useState<string | null>(null);
    const [syncResult, setSyncResult] = useState<{ id: string; count: number } | null>(null);

    const loadConnections = useCallback(async () => {
        try {
            const res = await listBankConnections();
            setConnections(res.connections);
        } catch { /* silent */ }
        setLoading(false);
    }, []);

    useEffect(() => { loadConnections(); }, [loadConnections]);

    const handleAdd = async () => {
        if (!bankName || !apiKey || !endpointUrl) return;
        setSubmitting(true);
        try {
            const conn = await addBankConnection({ bank_name: bankName, api_key: apiKey, endpoint_url: endpointUrl });
            setConnections(prev => [...prev, conn]);
            setBankName('');
            setApiKey('');
            setEndpointUrl('');
            setShowForm(false);
        } catch { /* error */ }
        setSubmitting(false);
    };

    const handleRemove = async (id: string) => {
        try {
            await removeBankConnection(id);
            setConnections(prev => prev.filter(c => c.id !== id));
        } catch { /* error */ }
    };

    const handleSync = async (id: string) => {
        setSyncing(id);
        setSyncResult(null);
        try {
            // Sync is done server-side; just show a success message
            setSyncResult({ id, count: 0 });
            loadConnections();
        } catch { /* error */ }
        setSyncing(null);
    };

    const formatTime = (iso: string) => {
        try {
            return new Date(iso).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
        } catch { return '—'; }
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center h-64">
                <Loader2 size={16} className="animate-spin text-[var(--text-muted)]" />
            </div>
        );
    }

    return (
        <div className="space-y-4 animate-fade-in">
            {/* Add Connection Button / Form */}
            {!showForm ? (
                <button
                    onClick={() => setShowForm(true)}
                    className="flex items-center gap-2 px-4 py-2.5 rounded-md border border-dashed border-[var(--border)] text-[10px] font-mono text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:border-zinc-500 hover:bg-[var(--surface)] transition-all duration-150 w-full justify-center"
                >
                    <Plus size={12} />
                    Add Bank API Connection
                </button>
            ) : (
                <div className="rounded-lg border border-[var(--border)] bg-[var(--surface)] p-5 space-y-4 animate-fade-in">
                    <div className="flex items-center justify-between">
                        <span className="text-[9px] font-mono uppercase tracking-widest text-[var(--text-muted)]">New Connection</span>
                        <button onClick={() => setShowForm(false)} className="text-[9px] font-mono text-[var(--text-muted)] hover:text-[var(--text-primary)]">Cancel</button>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                        <div>
                            <label className="block text-[9px] font-mono text-[var(--text-muted)] uppercase tracking-widest mb-1.5">Bank Name</label>
                            <input
                                value={bankName}
                                onChange={e => setBankName(e.target.value)}
                                placeholder="e.g. National Reserve Bank"
                                className="w-full h-9 px-3 text-[11px] font-mono rounded-md border border-[var(--border)] bg-[var(--bg)] text-[var(--text-primary)] focus:outline-none focus:border-zinc-500 transition-colors"
                            />
                        </div>
                        <div>
                            <label className="block text-[9px] font-mono text-[var(--text-muted)] uppercase tracking-widest mb-1.5">API Key / Client ID</label>
                            <input
                                value={apiKey}
                                onChange={e => setApiKey(e.target.value)}
                                placeholder="sk_live_..."
                                type="password"
                                className="w-full h-9 px-3 text-[11px] font-mono rounded-md border border-[var(--border)] bg-[var(--bg)] text-[var(--text-primary)] focus:outline-none focus:border-zinc-500 transition-colors"
                            />
                        </div>
                        <div>
                            <label className="block text-[9px] font-mono text-[var(--text-muted)] uppercase tracking-widest mb-1.5">Endpoint URL</label>
                            <input
                                value={endpointUrl}
                                onChange={e => setEndpointUrl(e.target.value)}
                                placeholder="https://api.bank.com/v3"
                                className="w-full h-9 px-3 text-[11px] font-mono rounded-md border border-[var(--border)] bg-[var(--bg)] text-[var(--text-primary)] focus:outline-none focus:border-zinc-500 transition-colors"
                            />
                        </div>
                    </div>

                    <button
                        onClick={handleAdd}
                        disabled={submitting || !bankName || !apiKey || !endpointUrl}
                        className="flex items-center gap-2 px-4 py-2 rounded-md text-[10px] font-mono font-semibold bg-white text-black hover:bg-zinc-100 transition-all duration-150 disabled:opacity-50"
                    >
                        {submitting ? <Loader2 size={11} className="animate-spin" /> : <Plug size={11} />}
                        Connect
                    </button>
                </div>
            )}

            {/* Connection Cards */}
            {connections.length === 0 && !showForm && (
                <div className="text-center py-12">
                    <Wifi size={24} className="mx-auto text-[var(--text-muted)] mb-3 opacity-40" />
                    <p className="text-[11px] font-mono text-[var(--text-muted)]">No bank API connections registered</p>
                    <p className="text-[9px] font-mono text-[var(--text-muted)] mt-1 opacity-60">Click above to connect to an external bank API</p>
                </div>
            )}

            {connections.map(conn => (
                <div key={conn.id} className="rounded-lg border border-[var(--border)] bg-[var(--surface)] overflow-hidden animate-fade-in">
                    <div className="px-5 py-4 flex items-center gap-4">
                        {/* Status dot */}
                        <div className="relative flex-shrink-0">
                            <span className="relative flex h-2.5 w-2.5">
                                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
                                <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500" />
                            </span>
                        </div>

                        {/* Info */}
                        <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2">
                                <span className="text-[12px] font-mono font-semibold text-[var(--text-primary)]">{conn.bank_name}</span>
                                <span className="text-[9px] font-mono px-1.5 py-0.5 rounded-sm border text-emerald-400 bg-emerald-500/10 border-emerald-500/20">{conn.status}</span>
                            </div>
                            <div className="flex items-center gap-4 mt-1">
                                <span className="text-[9px] font-mono text-[var(--text-muted)]">Key: {conn.api_key_masked}</span>
                                <span className="text-[9px] font-mono text-[var(--text-muted)]">{conn.endpoint_url}</span>
                            </div>
                        </div>

                        {/* Stats */}
                        <div className="flex items-center gap-6 flex-shrink-0">
                            <div className="text-right">
                                <p className="text-[11px] font-mono font-semibold text-[var(--text-primary)]">{conn.status}</p>
                                <p className="text-[8px] font-mono text-[var(--text-muted)]">status</p>
                            </div>
                            <div className="text-right">
                                <p className="text-[11px] font-mono text-[var(--text-secondary)]">{formatTime(conn.created_at)}</p>
                                <p className="text-[8px] font-mono text-[var(--text-muted)]">created</p>
                            </div>
                        </div>

                        {/* Sync result flash */}
                        {syncResult?.id === conn.id && (
                            <span className="text-[9px] font-mono text-emerald-400 animate-fade-in">
                                +{syncResult.count} synced
                            </span>
                        )}

                        {/* Actions */}
                        <div className="flex items-center gap-1.5 flex-shrink-0">
                            <button
                                onClick={() => handleSync(conn.id)}
                                disabled={syncing === conn.id}
                                className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-md text-[10px] font-mono border border-[var(--border)] text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-[var(--bg)] hover:border-zinc-500 transition-all duration-150 disabled:opacity-50"
                            >
                                {syncing === conn.id ? <Loader2 size={10} className="animate-spin" /> : <RefreshCw size={10} />}
                                Sync
                            </button>
                            <button
                                onClick={() => handleRemove(conn.id)}
                                className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-md text-[10px] font-mono border border-[var(--border)] text-red-400/70 hover:text-red-400 hover:bg-red-500/5 hover:border-red-500/20 transition-all duration-150"
                            >
                                <Trash2 size={10} />
                            </button>
                        </div>
                    </div>

                    {/* Pipeline indicator */}
                    <div className="px-5 py-2.5 border-t border-[var(--border)] bg-[var(--bg)] flex items-center gap-2 text-[9px] font-mono text-[var(--text-muted)]">
                        <Wifi size={9} className="text-emerald-400" />
                        <span>{conn.bank_name}</span>
                        <ArrowRight size={9} />
                        <Shield size={9} className="text-blue-400" />
                        <span>SAGRA Engine</span>
                        <ArrowRight size={9} />
                        <Zap size={9} className="text-amber-400" />
                        <span>Dashboard</span>
                    </div>
                </div>
            ))}
        </div>
    );
}


// ── Import Statements Tab ──────────────────────────────────────────

function ImportTab() {
    const fileInputRef = useRef<HTMLInputElement>(null);
    const [dragActive, setDragActive] = useState(false);
    const [uploading, setUploading] = useState(false);
    const [uploadResult, setUploadResult] = useState<FileUploadResponse | null>(null);
    const [uploadHistory, setUploadHistory] = useState<{ filename: string; rows_processed: number; fraud_detected: number; avg_risk: number; timestamp: string }[]>([]);
    const [error, setError] = useState<string | null>(null);

    // Upload history is maintained client-side for enterprise version

    const handleFile = async (file: File) => {
        setUploading(true);
        setError(null);
        setUploadResult(null);
        try {
            const res = await uploadBankFile(file);
            setUploadResult(res);
            // Add to local history
            setUploadHistory(prev => [{
                filename: res.filename,
                rows_processed: res.rows_processed,
                fraud_detected: res.fraud_detected,
                avg_risk: res.avg_risk,
                timestamp: new Date().toISOString(),
            }, ...prev]);
        } catch (err) {
            setError((err as Error).message);
        }
        setUploading(false);
    };

    const handleDrop = (e: React.DragEvent) => {
        e.preventDefault();
        setDragActive(false);
        const file = e.dataTransfer.files?.[0];
        if (file) handleFile(file);
    };

    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) handleFile(file);
    };

    const downloadTemplate = () => {
        const csv = 'sender,receiver,amount\nB001,A003,15000\nB002,B005,2500\nA001,B003,45000\nC001,B007,8200\nB004,A002,32000\n';
        const blob = new Blob([csv], { type: 'text/csv' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'quantora_template.csv';
        a.click();
        URL.revokeObjectURL(url);
    };

    return (
        <div className="space-y-4 animate-fade-in">
            {/* Drop Zone */}
            <div
                onDragOver={e => { e.preventDefault(); setDragActive(true); }}
                onDragLeave={() => setDragActive(false)}
                onDrop={handleDrop}
                onClick={() => fileInputRef.current?.click()}
                className={`relative rounded-lg border-2 border-dashed cursor-pointer transition-all duration-200
                    ${dragActive
                        ? 'border-white/40 bg-white/5'
                        : 'border-[var(--border)] hover:border-zinc-500 hover:bg-[var(--surface)]'
                    }
                    py-12 flex flex-col items-center justify-center gap-3`}
            >
                {uploading ? (
                    <>
                        <Loader2 size={28} className="text-[var(--text-muted)] animate-spin" />
                        <p className="text-[11px] font-mono text-[var(--text-muted)]">Processing through SAGRA...</p>
                    </>
                ) : (
                    <>
                        <Upload size={28} className="text-[var(--text-muted)] opacity-50" />
                        <div className="text-center">
                            <p className="text-[11px] font-mono text-[var(--text-primary)]">
                                Drop CSV file here or <span className="text-white underline">browse</span>
                            </p>
                            <p className="text-[9px] font-mono text-[var(--text-muted)] mt-1">
                                Columns: sender, receiver, amount · Max 10,000 rows
                            </p>
                        </div>
                    </>
                )}
                <input
                    ref={fileInputRef}
                    type="file"
                    accept=".csv"
                    onChange={handleInputChange}
                    className="hidden"
                />
            </div>

            {/* Template Download */}
            <button
                onClick={downloadTemplate}
                className="flex items-center gap-1.5 text-[9px] font-mono text-[var(--text-muted)] hover:text-[var(--text-primary)] transition-colors"
            >
                <Download size={10} />
                Download CSV template
            </button>

            {/* Error */}
            {error && (
                <div className="flex items-center gap-2 px-4 py-3 rounded-md border border-red-500/20 bg-red-500/5 text-[10px] font-mono text-red-400 animate-fade-in">
                    <XCircle size={12} />
                    {error}
                </div>
            )}

            {/* Upload Result */}
            {uploadResult && (
                <div className="rounded-lg border border-[var(--border)] bg-[var(--surface)] overflow-hidden animate-fade-in">
                    <div className="px-5 py-3.5 border-b border-[var(--border)] flex items-center justify-between">
                        <div className="flex items-center gap-2">
                            <CheckCircle2 size={13} className="text-emerald-400" />
                            <span className="text-[10px] font-mono text-emerald-400 font-semibold">Upload Complete</span>
                        </div>
                        <span className="text-[9px] font-mono text-[var(--text-muted)]">{uploadResult.filename}</span>
                    </div>

                    <div className="grid grid-cols-3 divide-x divide-[var(--border)]">
                        <div className="px-5 py-4 text-center">
                            <p className="text-[18px] font-mono font-bold text-[var(--text-primary)]">{uploadResult.rows_processed}</p>
                            <p className="text-[9px] font-mono text-[var(--text-muted)] mt-0.5">Rows Processed</p>
                        </div>
                        <div className="px-5 py-4 text-center">
                            <p className="text-[18px] font-mono font-bold text-red-400">{uploadResult.fraud_detected}</p>
                            <p className="text-[9px] font-mono text-[var(--text-muted)] mt-0.5">Fraud Detected</p>
                        </div>
                        <div className="px-5 py-4 text-center">
                            <p className="text-[18px] font-mono font-bold text-amber-400">{(uploadResult.avg_risk * 100).toFixed(1)}%</p>
                            <p className="text-[9px] font-mono text-[var(--text-muted)] mt-0.5">Avg Risk Score</p>
                        </div>
                    </div>

                    {/* Preview transactions */}
                    {uploadResult.transactions.length > 0 && (
                        <div className="border-t border-[var(--border)]">
                            <div className="px-5 py-2.5">
                                <span className="text-[9px] font-mono uppercase tracking-widest text-[var(--text-muted)]">Transaction Preview</span>
                            </div>
                            <table className="w-full text-[10px] font-mono">
                                <thead>
                                    <tr className="border-t border-[var(--border)] text-[var(--text-muted)]">
                                        <th className="px-5 py-2 text-left font-normal">ID</th>
                                        <th className="px-3 py-2 text-left font-normal">Sender → Receiver</th>
                                        <th className="px-3 py-2 text-right font-normal">Amount</th>
                                        <th className="px-3 py-2 text-right font-normal">Risk</th>
                                        <th className="px-5 py-2 text-right font-normal">Fraud</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {uploadResult.transactions.map(tx => (
                                        <tr key={tx.id} className="border-t border-[var(--border)] text-[var(--text-secondary)]">
                                            <td className="px-5 py-2 text-[var(--text-primary)]">{tx.id}</td>
                                            <td className="px-3 py-2">{tx.sender} → {tx.receiver}</td>
                                            <td className="px-3 py-2 text-right">₹{tx.amount.toLocaleString()}</td>
                                            <td className="px-3 py-2 text-right">
                                                <span className={
                                                    tx.risk_level === 'high' ? 'text-red-400'
                                                        : tx.risk_level === 'medium' ? 'text-amber-400'
                                                            : 'text-[var(--text-muted)]'
                                                }>
                                                    {(tx.risk_score * 100).toFixed(1)}%
                                                </span>
                                            </td>
                                            <td className="px-5 py-2 text-right">
                                                {tx.is_fraud
                                                    ? <span className="text-red-400">⬤ Fraud</span>
                                                    : <span className="text-[var(--text-muted)]">—</span>
                                                }
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}
                </div>
            )}

            {/* Upload History */}
            {uploadHistory.length > 0 && (
                <div className="rounded-lg border border-[var(--border)] bg-[var(--surface)] overflow-hidden">
                    <div className="px-5 py-3.5 border-b border-[var(--border)]">
                        <span className="text-[9px] font-mono uppercase tracking-widest text-[var(--text-muted)]">Recent Imports</span>
                    </div>
                    <table className="w-full text-[10px] font-mono">
                        <thead>
                            <tr className="text-[var(--text-muted)] border-b border-[var(--border)]">
                                <th className="px-5 py-2 text-left font-normal">File</th>
                                <th className="px-3 py-2 text-right font-normal">Rows</th>
                                <th className="px-3 py-2 text-right font-normal">Fraud</th>
                                <th className="px-3 py-2 text-right font-normal">Avg Risk</th>
                                <th className="px-5 py-2 text-right font-normal">Time</th>
                            </tr>
                        </thead>
                        <tbody>
                            {uploadHistory.slice(0, 10).map(rec => (
                                <tr key={rec.filename + rec.timestamp} className="border-t border-[var(--border)] text-[var(--text-secondary)]">
                                    <td className="px-5 py-2 text-[var(--text-primary)] flex items-center gap-1.5">
                                        <FileText size={10} className="text-[var(--text-muted)]" />
                                        {rec.filename}
                                    </td>
                                    <td className="px-3 py-2 text-right">{rec.rows_processed}</td>
                                    <td className="px-3 py-2 text-right text-red-400">{rec.fraud_detected}</td>
                                    <td className="px-3 py-2 text-right">{(rec.avg_risk * 100).toFixed(1)}%</td>
                                    <td className="px-5 py-2 text-right text-[var(--text-muted)]">
                                        {new Date(rec.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}
        </div>
    );
}


// ── Manual Entry Tab ───────────────────────────────────────────────

function ManualEntryTab() {
    const [sender, setSender] = useState('');
    const [receiver, setReceiver] = useState('');
    const [amount, setAmount] = useState('');
    const [iban, setIban] = useState('');
    const [bic, setBic] = useState('');
    const [description, setDescription] = useState('');
    const [submitting, setSubmitting] = useState(false);
    const [result, setResult] = useState<StoredTransaction | null>(null);
    const [recentSubmissions, setRecentSubmissions] = useState<StoredTransaction[]>([]);
    const [error, setError] = useState<string | null>(null);

    const ACCOUNT_IDS = [
        'A001', 'A002', 'A003', 'A004', 'A005',
        'B001', 'B002', 'B003', 'B004', 'B005', 'B006', 'B007', 'B008',
        'C001', 'C002', 'C003',
    ];

    const handleSubmit = async () => {
        if (!sender || !receiver || !amount) return;
        setSubmitting(true);
        setError(null);
        setResult(null);
        try {
            const tx = await submitManualTransaction({
                sender,
                receiver,
                amount: parseFloat(amount),
                iban: iban || undefined,
                bic: bic || undefined,
                description: description || undefined,
            });
            setResult(tx);
            setRecentSubmissions(prev => [tx, ...prev].slice(0, 10));
        } catch (err) {
            setError((err as Error).message);
        }
        setSubmitting(false);
    };

    const riskColor = (level: string) =>
        level === 'high' ? 'text-red-400' : level === 'medium' ? 'text-amber-400' : 'text-emerald-400';

    return (
        <div className="space-y-4 animate-fade-in">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                {/* Form */}
                <div className="rounded-lg border border-[var(--border)] bg-[var(--surface)] overflow-hidden">
                    <div className="px-5 py-3.5 border-b border-[var(--border)]">
                        <span className="text-[9px] font-mono uppercase tracking-widest text-[var(--text-muted)]">Transaction Details</span>
                    </div>
                    <div className="p-5 space-y-3">
                        <div className="grid grid-cols-2 gap-3">
                            <div>
                                <label className="block text-[9px] font-mono text-[var(--text-muted)] uppercase tracking-widest mb-1.5">Sender Account *</label>
                                <select
                                    value={sender}
                                    onChange={e => setSender(e.target.value)}
                                    className="w-full h-9 px-3 text-[11px] font-mono rounded-md border border-[var(--border)] bg-[var(--bg)] text-[var(--text-primary)] focus:outline-none focus:border-zinc-500 appearance-none cursor-pointer"
                                >
                                    <option value="">Select...</option>
                                    {ACCOUNT_IDS.map(id => (
                                        <option key={id} value={id}>{id}</option>
                                    ))}
                                </select>
                            </div>
                            <div>
                                <label className="block text-[9px] font-mono text-[var(--text-muted)] uppercase tracking-widest mb-1.5">Receiver Account *</label>
                                <select
                                    value={receiver}
                                    onChange={e => setReceiver(e.target.value)}
                                    className="w-full h-9 px-3 text-[11px] font-mono rounded-md border border-[var(--border)] bg-[var(--bg)] text-[var(--text-primary)] focus:outline-none focus:border-zinc-500 appearance-none cursor-pointer"
                                >
                                    <option value="">Select...</option>
                                    {ACCOUNT_IDS.filter(id => id !== sender).map(id => (
                                        <option key={id} value={id}>{id}</option>
                                    ))}
                                </select>
                            </div>
                        </div>

                        <div>
                            <label className="block text-[9px] font-mono text-[var(--text-muted)] uppercase tracking-widest mb-1.5">Amount (INR) *</label>
                            <input
                                type="number"
                                value={amount}
                                onChange={e => setAmount(e.target.value)}
                                placeholder="e.g. 25000"
                                min="1"
                                className="w-full h-9 px-3 text-[11px] font-mono rounded-md border border-[var(--border)] bg-[var(--bg)] text-[var(--text-primary)] focus:outline-none focus:border-zinc-500 transition-colors"
                            />
                        </div>

                        <div className="grid grid-cols-2 gap-3">
                            <div>
                                <label className="block text-[9px] font-mono text-[var(--text-muted)] uppercase tracking-widest mb-1.5">IBAN <span className="opacity-50">(optional)</span></label>
                                <input
                                    value={iban}
                                    onChange={e => setIban(e.target.value)}
                                    placeholder="e.g. IN92NRBI0001234567"
                                    className="w-full h-9 px-3 text-[11px] font-mono rounded-md border border-[var(--border)] bg-[var(--bg)] text-[var(--text-primary)] focus:outline-none focus:border-zinc-500 transition-colors"
                                />
                            </div>
                            <div>
                                <label className="block text-[9px] font-mono text-[var(--text-muted)] uppercase tracking-widest mb-1.5">SWIFT/BIC <span className="opacity-50">(optional)</span></label>
                                <input
                                    value={bic}
                                    onChange={e => setBic(e.target.value)}
                                    placeholder="e.g. NRBIIN3M"
                                    className="w-full h-9 px-3 text-[11px] font-mono rounded-md border border-[var(--border)] bg-[var(--bg)] text-[var(--text-primary)] focus:outline-none focus:border-zinc-500 transition-colors"
                                />
                            </div>
                        </div>

                        <div>
                            <label className="block text-[9px] font-mono text-[var(--text-muted)] uppercase tracking-widest mb-1.5">Description <span className="opacity-50">(optional)</span></label>
                            <input
                                value={description}
                                onChange={e => setDescription(e.target.value)}
                                placeholder="e.g. Vendor payment Q4"
                                className="w-full h-9 px-3 text-[11px] font-mono rounded-md border border-[var(--border)] bg-[var(--bg)] text-[var(--text-primary)] focus:outline-none focus:border-zinc-500 transition-colors"
                            />
                        </div>

                        {error && (
                            <div className="flex items-center gap-2 px-3 py-2 rounded-md border border-red-500/20 bg-red-500/5 text-[10px] font-mono text-red-400">
                                <AlertTriangle size={11} />
                                {error}
                            </div>
                        )}

                        <button
                            onClick={handleSubmit}
                            disabled={submitting || !sender || !receiver || !amount}
                            className="w-full flex items-center justify-center gap-2 h-10 rounded-md text-[11px] font-mono font-semibold bg-white text-black hover:bg-zinc-100 transition-all duration-150 disabled:opacity-50 mt-2"
                        >
                            {submitting ? <Loader2 size={12} className="animate-spin" /> : <Send size={12} />}
                            Submit & Score
                        </button>
                    </div>
                </div>

                {/* Result Panel */}
                <div className="rounded-lg border border-[var(--border)] bg-[var(--surface)] overflow-hidden">
                    <div className="px-5 py-3.5 border-b border-[var(--border)]">
                        <span className="text-[9px] font-mono uppercase tracking-widest text-[var(--text-muted)]">SAGRA Score Result</span>
                    </div>
                    {result ? (
                        <div className="p-5 space-y-4 animate-fade-in">
                            {/* Risk Gauge + Fraud Badge */}
                            <div className="flex items-center gap-6">
                                <RiskGauge score={result.risk_score} />
                                <div className="flex-1 space-y-2">
                                    <div className="flex items-center gap-2">
                                        <span className={`text-[11px] font-mono font-bold ${riskColor(result.risk_level)}`}>
                                            {result.risk_level.toUpperCase()} RISK
                                        </span>
                                        {result.is_fraud && (
                                            <span className="text-[9px] font-mono px-2 py-0.5 rounded-sm border text-red-400 bg-red-500/10 border-red-500/20">
                                                ⚠ FRAUD
                                            </span>
                                        )}
                                    </div>
                                    <div className="text-[9px] font-mono text-[var(--text-muted)]">
                                        Transaction {result.id}
                                    </div>
                                    <div className="text-[10px] font-mono text-[var(--text-secondary)]">
                                        {result.sender} → {result.receiver} · ₹{result.amount.toLocaleString()}
                                    </div>
                                </div>
                            </div>

                            {/* SAGRA Score Breakdown */}
                            <div className="grid grid-cols-3 gap-3">
                                <div className="px-3 py-2.5 rounded-md border border-[var(--border)] bg-[var(--bg)]">
                                    <p className="text-[9px] font-mono text-[var(--text-muted)] uppercase tracking-widest mb-1">TRS</p>
                                    <p className="text-[14px] font-mono font-bold text-[var(--text-primary)]">{result.trs.toFixed(4)}</p>
                                    <p className="text-[8px] font-mono text-[var(--text-muted)] mt-0.5">Transaction Risk</p>
                                </div>
                                <div className="px-3 py-2.5 rounded-md border border-[var(--border)] bg-[var(--bg)]">
                                    <p className="text-[9px] font-mono text-[var(--text-muted)] uppercase tracking-widest mb-1">GRS</p>
                                    <p className="text-[14px] font-mono font-bold text-[var(--text-primary)]">{result.grs.toFixed(4)}</p>
                                    <p className="text-[8px] font-mono text-[var(--text-muted)] mt-0.5">Graph Risk</p>
                                </div>
                                <div className="px-3 py-2.5 rounded-md border border-[var(--border)] bg-[var(--bg)]">
                                    <p className="text-[9px] font-mono text-[var(--text-muted)] uppercase tracking-widest mb-1">NDB</p>
                                    <p className="text-[14px] font-mono font-bold text-[var(--text-primary)]">{result.ndb.toFixed(4)}</p>
                                    <p className="text-[8px] font-mono text-[var(--text-muted)] mt-0.5">Node Deviation</p>
                                </div>
                            </div>
                        </div>
                    ) : (
                        <div className="flex flex-col items-center justify-center py-16 gap-3">
                            <Shield size={28} className="text-[var(--text-muted)] opacity-30" />
                            <p className="text-[10px] font-mono text-[var(--text-muted)]">Submit a transaction to see SAGRA score</p>
                        </div>
                    )}
                </div>
            </div>

            {/* Recent Manual Submissions */}
            {recentSubmissions.length > 0 && (
                <div className="rounded-lg border border-[var(--border)] bg-[var(--surface)] overflow-hidden animate-fade-in">
                    <div className="px-5 py-3.5 border-b border-[var(--border)]">
                        <span className="text-[9px] font-mono uppercase tracking-widest text-[var(--text-muted)]">Recent Manual Submissions</span>
                    </div>
                    <table className="w-full text-[10px] font-mono">
                        <thead>
                            <tr className="text-[var(--text-muted)] border-b border-[var(--border)]">
                                <th className="px-5 py-2 text-left font-normal">ID</th>
                                <th className="px-3 py-2 text-left font-normal">Flow</th>
                                <th className="px-3 py-2 text-right font-normal">Amount</th>
                                <th className="px-3 py-2 text-right font-normal">Risk</th>
                                <th className="px-5 py-2 text-right font-normal">Status</th>
                            </tr>
                        </thead>
                        <tbody>
                            {recentSubmissions.map(tx => (
                                <tr key={tx.id} className="border-t border-[var(--border)] text-[var(--text-secondary)]">
                                    <td className="px-5 py-2 text-[var(--text-primary)]">{tx.id}</td>
                                    <td className="px-3 py-2">{tx.sender} → {tx.receiver}</td>
                                    <td className="px-3 py-2 text-right">₹{tx.amount.toLocaleString()}</td>
                                    <td className={`px-3 py-2 text-right ${riskColor(tx.risk_level)}`}>
                                        {(tx.risk_score * 100).toFixed(1)}%
                                    </td>
                                    <td className="px-5 py-2 text-right">
                                        {tx.is_fraud
                                            ? <span className="text-red-400">⬤ Fraud</span>
                                            : <span className="text-emerald-400">✓ Safe</span>
                                        }
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}
        </div>
    );
}


// ── Main Page ──────────────────────────────────────────────────────

export default function BankInputPage() {
    const [activeTab, setActiveTab] = useState<TabId>('connections');

    return (
        <div className="flex h-screen overflow-hidden bg-[var(--bg)]">
            <Sidebar />
            <div className="flex-1 flex flex-col overflow-hidden">
                <PipelineStatusBar />

                {/* Page Header */}
                <header className="h-14 flex-shrink-0 border-b border-[var(--border)] px-6 flex items-center justify-between">
                    <div className="flex items-center gap-4">
                        <BackButton />
                        <div className="w-px h-4 bg-[var(--border)]" />
                        <Landmark size={14} strokeWidth={1.5} className="text-[var(--text-muted)]" />
                        <div>
                            <span className="text-xs font-semibold text-[var(--text-primary)] tracking-tight">Bank Input</span>
                            <span className="text-[10px] font-mono text-[var(--text-muted)] ml-2">· Ingest data into SAGRA</span>
                        </div>
                    </div>
                </header>

                {/* Tab Bar */}
                <div className="flex-shrink-0 border-b border-[var(--border)] bg-[var(--surface)]">
                    <div className="flex px-6">
                        {TABS.map(tab => {
                            const active = activeTab === tab.id;
                            const Icon = tab.icon;
                            return (
                                <button
                                    key={tab.id}
                                    onClick={() => setActiveTab(tab.id)}
                                    className={`flex items-center gap-2 px-4 py-3 text-[10px] font-mono transition-all duration-150 border-b-2 -mb-px
                                        ${active
                                            ? 'border-white text-[var(--text-primary)] font-semibold'
                                            : 'border-transparent text-[var(--text-muted)] hover:text-[var(--text-secondary)]'
                                        }`}
                                >
                                    <Icon size={12} strokeWidth={active ? 2 : 1.5} />
                                    {tab.label}
                                </button>
                            );
                        })}
                    </div>
                </div>

                {/* Tab Content */}
                <main className="flex-1 overflow-y-auto custom-scrollbar p-6">
                    <div className="max-w-4xl">
                        {activeTab === 'connections' && <ConnectionsTab />}
                        {activeTab === 'import' && <ImportTab />}
                        {activeTab === 'manual' && <ManualEntryTab />}
                    </div>
                </main>
            </div>
        </div>
    );
}
