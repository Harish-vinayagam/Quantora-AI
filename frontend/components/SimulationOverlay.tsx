'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import {
    Play,
    Square,
    Zap,
    Activity,
    X,
    Eye,
    EyeOff,
    AlertTriangle,
    CheckCircle2,
    Shield,
    Loader2,
} from 'lucide-react';
import {
    submitManualTransaction,
    addBankConnection,
    uploadBankFile,
    type StoredTransaction,
} from '@/lib/api';


// ── Realistic Transaction Data ─────────────────────────────────────

const ACCOUNTS = [
    'A001', 'A002', 'A003', 'A004', 'A005',
    'B001', 'B002', 'B003', 'B004', 'B005', 'B006', 'B007', 'B008',
    'C001', 'C002', 'C003',
];

const BANK_CONFIGS = [
    { bank_name: 'State Bank API', api_key: 'sk_sbi_prod_a8f2c91e4d', endpoint_url: 'https://api.sbi.co.in/v3/transactions' },
    { bank_name: 'HDFC Gateway', api_key: 'pk_hdfc_live_7b3e9d0f12', endpoint_url: 'https://connect.hdfcbank.com/api/v2' },
    { bank_name: 'ICICI Real-Time Feed', api_key: 'cl_icici_rt_5c4a8e6d21', endpoint_url: 'https://feeds.icicibank.com/iso20022' },
];

const TX_DESCRIPTIONS = [
    'Vendor payment — Q4 settlement',
    'Interbank RTGS transfer',
    'Salary credit — payroll batch',
    'Merchant refund processing',
    'Foreign wire — USD conversion',
    'Loan EMI auto-debit',
    'UPI bulk settlement',
    'Insurance premium collection',
    'Mutual fund SIP debit',
    'Trade settlement — equity',
    'Cross-border remittance',
    'Corporate payroll disbursement',
    'Tax challan payment',
    'Suspicious rapid transfer',
    'Layered multi-hop routing',
    'High-value night transaction',
];

const CSV_DATA = `sender,receiver,amount
B001,A003,15000
B002,B005,2500
A001,B003,45000
C001,B007,8200
B004,A002,32000
A005,B006,12750
B008,C002,67500
A003,B001,4800
C003,A004,95000
B003,B007,18900
A002,C001,7650
B006,A001,22500
B005,B002,3100
A004,B004,56000
C002,B008,11200`;


// ── Live Activity Log Entry ────────────────────────────────────────

interface LogEntry {
    id: string;
    time: string;
    type: 'tx' | 'bank' | 'sync' | 'upload' | 'fraud' | 'info';
    message: string;
}


// ── Simulation Overlay Component ───────────────────────────────────

export default function SimulationOverlay() {
    const [visible, setVisible] = useState(false);
    const [running, setRunning] = useState(false);
    const [minimized, setMinimized] = useState(false);
    const [log, setLog] = useState<LogEntry[]>([]);
    const [stats, setStats] = useState({ txCount: 0, fraudCount: 0, bankLinks: 0, filesProcessed: 0 });
    const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
    const phaseRef = useRef(0);
    const connIdsRef = useRef<string[]>([]);
    const logEndRef = useRef<HTMLDivElement>(null);

    const addLog = useCallback((type: LogEntry['type'], message: string) => {
        const entry: LogEntry = {
            id: `${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
            time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }),
            type,
            message,
        };
        setLog(prev => [...prev.slice(-40), entry]);
    }, []);

    // Global keyboard listener: Ctrl+Shift+D
    useEffect(() => {
        const handler = (e: KeyboardEvent) => {
            if (e.ctrlKey && e.shiftKey && e.key === 'D') {
                e.preventDefault();
                setVisible(v => !v);
            }
        };
        window.addEventListener('keydown', handler);
        return () => window.removeEventListener('keydown', handler);
    }, []);

    // Auto-scroll log
    useEffect(() => {
        logEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [log]);

    const randomAccount = () => ACCOUNTS[Math.floor(Math.random() * ACCOUNTS.length)];
    const randomAmount = () => Math.round((Math.random() * 80000 + 1000) * 100) / 100;
    const randomDesc = () => TX_DESCRIPTIONS[Math.floor(Math.random() * TX_DESCRIPTIONS.length)];

    // ── Simulation Phases ───────────────────────────────────────────

    const runPhase = useCallback(async () => {
        const phase = phaseRef.current;

        try {
            // Phase 0–2: Connect bank APIs (one per tick)
            if (phase < BANK_CONFIGS.length) {
                const cfg = BANK_CONFIGS[phase];
                addLog('info', `Connecting to ${cfg.bank_name}...`);
                const conn = await addBankConnection(cfg);
                connIdsRef.current.push(conn.id);
                addLog('bank', `✓ ${cfg.bank_name} connected (ID: ${conn.id})`);
                setStats(s => ({ ...s, bankLinks: s.bankLinks + 1 }));
            }
            // Phase 3: Upload CSV file
            else if (phase === BANK_CONFIGS.length) {
                addLog('info', 'Uploading bank_transactions_batch.csv...');
                const blob = new Blob([CSV_DATA], { type: 'text/csv' });
                const file = new File([blob], 'bank_transactions_batch.csv', { type: 'text/csv' });
                const res = await uploadBankFile(file);
                addLog('upload', `✓ CSV processed: ${res.rows_processed} rows, ${res.fraud_detected} fraud, avg risk ${(res.avg_risk * 100).toFixed(1)}%`);
                setStats(s => ({
                    ...s,
                    txCount: s.txCount + res.rows_processed,
                    fraudCount: s.fraudCount + res.fraud_detected,
                    filesProcessed: s.filesProcessed + 1,
                }));
            }
            // Phase 4+: Alternate between syncs and manual transactions
            else {
                const action = Math.random();

                // ~30% chance: Sync a random bank connection
                if (action < 0.3 && connIdsRef.current.length > 0) {
                    // Submit a batch of transactions instead of sync
                    const batchSize = Math.floor(Math.random() * 3) + 2;
                    const bankName = BANK_CONFIGS[Math.floor(Math.random() * BANK_CONFIGS.length)]?.bank_name || 'Bank';
                    addLog('info', `Processing batch from ${bankName}...`);
                    let batchFraud = 0;
                    for (let j = 0; j < batchSize; j++) {
                        let s = randomAccount(), r = randomAccount();
                        while (r === s) r = randomAccount();
                        const a = randomAmount();
                        const tx = await submitManualTransaction({ sender: s, receiver: r, amount: a, description: randomDesc() });
                        if (tx.is_fraud) batchFraud++;
                    }
                    addLog('sync', `↻ ${bankName}: ${batchSize} transactions processed`);
                    if (batchFraud > 0) {
                        addLog('fraud', `⚠ ${batchFraud} fraud alert${batchFraud > 1 ? 's' : ''} from ${bankName}!`);
                    }
                    setStats(s => ({
                        ...s,
                        txCount: s.txCount + batchSize,
                        fraudCount: s.fraudCount + batchFraud,
                    }));
                }
                // ~70% chance: Submit manual transaction
                else {
                    let sender = randomAccount();
                    let receiver = randomAccount();
                    while (receiver === sender) receiver = randomAccount();
                    const amount = randomAmount();
                    const desc = randomDesc();

                    const tx = await submitManualTransaction({
                        sender,
                        receiver,
                        amount,
                        description: desc,
                    });

                    const riskPct = (tx.risk_score * 100).toFixed(1);
                    if (tx.is_fraud) {
                        addLog('fraud', `⚠ FRAUD: ${sender}→${receiver} ₹${amount.toLocaleString()} (${riskPct}% risk) — ${desc}`);
                        setStats(s => ({ ...s, txCount: s.txCount + 1, fraudCount: s.fraudCount + 1 }));
                    } else {
                        addLog('tx', `${sender}→${receiver} ₹${amount.toLocaleString()} — risk ${riskPct}% — ${desc}`);
                        setStats(s => ({ ...s, txCount: s.txCount + 1 }));
                    }
                }
            }
        } catch (err) {
            addLog('info', `Error: ${(err as Error).message}`);
        }

        phaseRef.current += 1;
    }, [addLog]);


    const startSimulation = () => {
        if (running) return;
        setRunning(true);
        phaseRef.current = 0;
        connIdsRef.current = [];
        setLog([]);
        setStats({ txCount: 0, fraudCount: 0, bankLinks: 0, filesProcessed: 0 });
        addLog('info', '▶ Simulation started — SAGRA pipeline active');

        // Run first phase immediately, then every 2s
        runPhase();
        intervalRef.current = setInterval(() => {
            runPhase();
        }, 2000);
    };

    const stopSimulation = () => {
        setRunning(false);
        if (intervalRef.current) {
            clearInterval(intervalRef.current);
            intervalRef.current = null;
        }
        addLog('info', '■ Simulation stopped');
    };

    // Cleanup on unmount
    useEffect(() => {
        return () => {
            if (intervalRef.current) clearInterval(intervalRef.current);
        };
    }, []);

    if (!visible) return null;

    const typeIcon = (type: LogEntry['type']) => {
        switch (type) {
            case 'fraud': return <AlertTriangle size={10} className="text-red-400 flex-shrink-0" />;
            case 'bank': return <CheckCircle2 size={10} className="text-emerald-400 flex-shrink-0" />;
            case 'sync': return <Activity size={10} className="text-blue-400 flex-shrink-0" />;
            case 'upload': return <CheckCircle2 size={10} className="text-violet-400 flex-shrink-0" />;
            case 'tx': return <Zap size={10} className="text-amber-400 flex-shrink-0" />;
            default: return <Shield size={10} className="text-zinc-500 flex-shrink-0" />;
        }
    };

    const typeColor = (type: LogEntry['type']) => {
        switch (type) {
            case 'fraud': return 'text-red-400';
            case 'bank': return 'text-emerald-400';
            case 'sync': return 'text-blue-400';
            case 'upload': return 'text-violet-400';
            case 'tx': return 'text-[var(--text-secondary)]';
            default: return 'text-zinc-500';
        }
    };

    return (
        <div
            className="fixed bottom-4 right-4 z-[9999] font-mono animate-fade-in"
            style={{ width: minimized ? '200px' : '420px' }}
        >
            <div className="rounded-xl border border-[var(--border)] bg-[#0a0a0a]/95 backdrop-blur-xl shadow-2xl shadow-black/50 overflow-hidden">
                {/* Header */}
                <div className="px-4 py-2.5 border-b border-[var(--border)] flex items-center gap-2.5 bg-[#111]/80">
                    <div className="relative flex-shrink-0">
                        {running ? (
                            <span className="relative flex h-2 w-2">
                                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
                                <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500" />
                            </span>
                        ) : (
                            <span className="inline-flex rounded-full h-2 w-2 bg-zinc-600" />
                        )}
                    </div>
                    <span className="text-[10px] font-semibold text-[var(--text-primary)] flex-1 tracking-wide">
                        DEMO SIMULATION
                    </span>

                    {/* Minimize */}
                    <button
                        onClick={() => setMinimized(m => !m)}
                        className="text-[var(--text-muted)] hover:text-[var(--text-primary)] transition-colors p-0.5"
                    >
                        {minimized ? <Eye size={11} /> : <EyeOff size={11} />}
                    </button>

                    {/* Close */}
                    <button
                        onClick={() => { stopSimulation(); setVisible(false); }}
                        className="text-[var(--text-muted)] hover:text-red-400 transition-colors p-0.5"
                    >
                        <X size={11} />
                    </button>
                </div>

                {/* Mini stats bar (always visible) */}
                <div className="px-4 py-2 border-b border-[var(--border)] flex items-center justify-between bg-[#0d0d0d]">
                    <div className="flex items-center gap-4">
                        <div className="flex items-center gap-1.5">
                            <Zap size={9} className="text-amber-400" />
                            <span className="text-[10px] text-[var(--text-primary)]">{stats.txCount}</span>
                            <span className="text-[8px] text-[var(--text-muted)]">tx</span>
                        </div>
                        <div className="flex items-center gap-1.5">
                            <AlertTriangle size={9} className="text-red-400" />
                            <span className="text-[10px] text-red-400">{stats.fraudCount}</span>
                            <span className="text-[8px] text-[var(--text-muted)]">fraud</span>
                        </div>
                        <div className="flex items-center gap-1.5">
                            <Activity size={9} className="text-blue-400" />
                            <span className="text-[10px] text-[var(--text-primary)]">{stats.bankLinks}</span>
                            <span className="text-[8px] text-[var(--text-muted)]">banks</span>
                        </div>
                    </div>

                    {/* Play/Stop */}
                    <div className="flex items-center gap-1.5">
                        {!running ? (
                            <button
                                onClick={startSimulation}
                                className="flex items-center gap-1.5 px-3 py-1 rounded-md text-[9px] font-semibold bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 hover:bg-emerald-500/30 transition-all"
                            >
                                <Play size={9} />
                                Start
                            </button>
                        ) : (
                            <button
                                onClick={stopSimulation}
                                className="flex items-center gap-1.5 px-3 py-1 rounded-md text-[9px] font-semibold bg-red-500/20 text-red-400 border border-red-500/30 hover:bg-red-500/30 transition-all"
                            >
                                <Square size={9} />
                                Stop
                            </button>
                        )}
                    </div>
                </div>

                {/* Log (collapsible) */}
                {!minimized && (
                    <div className="max-h-[260px] overflow-y-auto custom-scrollbar bg-[#080808]">
                        {log.length === 0 ? (
                            <div className="flex flex-col items-center justify-center py-8 gap-2 text-[var(--text-muted)]">
                                <Loader2 size={16} className="opacity-30" />
                                <p className="text-[9px]">Press Start to begin simulation</p>
                                <p className="text-[8px] opacity-50">Ctrl+Shift+D to toggle this panel</p>
                            </div>
                        ) : (
                            <div className="p-3 space-y-1">
                                {log.map(entry => (
                                    <div key={entry.id} className="flex items-start gap-2 animate-fade-in">
                                        <span className="text-[8px] text-zinc-600 flex-shrink-0 w-[52px] pt-px">{entry.time}</span>
                                        {typeIcon(entry.type)}
                                        <span className={`text-[9px] leading-snug ${typeColor(entry.type)}`}>
                                            {entry.message}
                                        </span>
                                    </div>
                                ))}
                                <div ref={logEndRef} />
                            </div>
                        )}
                    </div>
                )}
            </div>
        </div>
    );
}
