'use client';

import { useState, useEffect, useMemo } from 'react';
import Sidebar from '@/components/Sidebar';
import BackButton from '@/components/ui/BackButton';
import LiveTime from '@/components/ui/LiveTime';
import { Clock, List, Search, ArrowUpDown, Filter } from 'lucide-react';
import { initialTransactions, generateNewTransaction, type Transaction, type RiskLevel } from '@/lib/mockData';
import { predictFraud } from '@/lib/api';

// ── Helpers ──
function riskColor(risk: RiskLevel) {
    if (risk === 'high') return 'text-red-400';
    if (risk === 'medium') return 'text-amber-400';
    return 'text-zinc-400';
}

function riskBadge(risk: RiskLevel) {
    const map = {
        high: 'bg-red-500/10 text-red-400 border-red-500/25',
        medium: 'bg-amber-500/10 text-amber-400 border-amber-500/25',
        low: 'bg-zinc-700/40 text-zinc-400 border-zinc-600/25',
    };
    return map[risk];
}

function fraudBadge(isFraud: boolean) {
    return isFraud
        ? 'bg-red-500/15 text-red-400 border border-red-500/30'
        : 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/25';
}

function riskNumeric(risk: RiskLevel): number {
    return risk === 'high' ? 0.85 : risk === 'medium' ? 0.55 : 0.15;
}

function formatTime(d: Date): string {
    return d.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false });
}

function formatAmount(n: number): string {
    return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', minimumFractionDigits: 0 }).format(n);
}

export default function TransactionsPage() {
    const [transactions, setTransactions] = useState<Transaction[]>(initialTransactions);
    const [search, setSearch] = useState('');
    const [fraudOnly, setFraudOnly] = useState(false);
    const [sortByRisk, setSortByRisk] = useState(false);

    // Live data feed
    useEffect(() => {
        const interval = setInterval(() => {
            const newTx = generateNewTransaction();
            predictFraud({
                sender: parseInt(newTx.senderId.replace(/\D/g, '')) || 0,
                receiver: parseInt(newTx.receiverId.replace(/\D/g, '')) || 0,
                amount: newTx.amount,
            }).then(res => {
                const riskLabel: RiskLevel = res.risk_score > 0.7 ? 'high' : res.risk_score > 0.4 ? 'medium' : 'low';
                newTx.risk = riskLabel;
                newTx.isFraud = res.fraud_prediction === 1;
            }).catch(() => { });
            setTransactions(prev => [newTx, ...prev].slice(0, 200));
        }, 3000);
        return () => clearInterval(interval);
    }, []);

    // Filtered + sorted list
    const filtered = useMemo(() => {
        let list = [...transactions];
        if (fraudOnly) list = list.filter(t => t.isFraud);
        if (search.trim()) {
            const q = search.trim().toLowerCase();
            list = list.filter(t => t.senderId.toLowerCase().includes(q));
        }
        if (sortByRisk) list.sort((a, b) => riskNumeric(b.risk) - riskNumeric(a.risk));
        return list;
    }, [transactions, fraudOnly, search, sortByRisk]);

    return (
        <div className="flex h-screen overflow-hidden bg-[var(--bg)]">
            <Sidebar />
            <div className="flex-1 flex flex-col overflow-hidden">

                {/* Header */}
                <header className="h-14 flex-shrink-0 border-b border-[var(--border)] px-6 flex items-center justify-between">
                    <div className="flex items-center gap-4">
                        <BackButton />
                        <div className="w-px h-4 bg-[var(--border)]" />
                        <List size={14} strokeWidth={1.5} className="text-[var(--text-secondary)]" />
                        <span className="text-xs font-semibold text-[var(--text-primary)]">Transactions</span>
                        <span className="text-[9px] font-mono px-1.5 py-0.5 rounded-sm bg-zinc-700/40 border border-zinc-600/25 text-zinc-400">
                            {filtered.length} records
                        </span>
                    </div>
                    <div className="flex items-center gap-1.5">
                        <Clock size={11} strokeWidth={1.5} className="text-[var(--text-muted)]" />
                        <span className="text-[10px] font-mono text-[var(--text-muted)]">
                            <LiveTime format={{ hour: '2-digit', minute: '2-digit', hour12: false }} />
                        </span>
                    </div>
                </header>

                {/* Toolbar */}
                <div className="flex-shrink-0 border-b border-[var(--border)] px-6 py-3 flex items-center gap-3">
                    {/* Search */}
                    <div className="relative flex-1 max-w-xs">
                        <Search size={12} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-[var(--text-muted)]" />
                        <input
                            type="text"
                            placeholder="Search by sender…"
                            value={search}
                            onChange={e => setSearch(e.target.value)}
                            className="w-full h-8 pl-8 pr-3 text-[11px] font-mono rounded-md border border-[var(--border)] bg-[var(--bg)] text-[var(--text-primary)] placeholder:text-[var(--text-muted)] focus:outline-none focus:border-zinc-500 transition-colors"
                        />
                    </div>

                    {/* Fraud only */}
                    <button
                        onClick={() => setFraudOnly(v => !v)}
                        className={`flex items-center gap-1.5 h-8 px-3 text-[10px] font-mono rounded-md border transition-all ${fraudOnly
                            ? 'border-red-500/40 bg-red-500/10 text-red-400'
                            : 'border-[var(--border)] text-[var(--text-muted)] hover:text-[var(--text-secondary)] hover:bg-[var(--surface)]'
                            }`}
                    >
                        <Filter size={11} />
                        Fraud Only
                    </button>

                    {/* Sort by risk */}
                    <button
                        onClick={() => setSortByRisk(v => !v)}
                        className={`flex items-center gap-1.5 h-8 px-3 text-[10px] font-mono rounded-md border transition-all ${sortByRisk
                            ? 'border-amber-500/40 bg-amber-500/10 text-amber-400'
                            : 'border-[var(--border)] text-[var(--text-muted)] hover:text-[var(--text-secondary)] hover:bg-[var(--surface)]'
                            }`}
                    >
                        <ArrowUpDown size={11} />
                        Sort by Risk
                    </button>
                </div>

                {/* Table */}
                <main className="flex-1 overflow-y-auto">
                    <div className="overflow-x-auto">
                        <table className="w-full text-[11px] font-mono">
                            <thead className="sticky top-0 bg-[var(--surface)] z-10">
                                <tr className="border-b border-[var(--border)]">
                                    {['TX ID', 'Sender', 'Receiver', 'Amount', 'Risk Score', 'Status', 'Timestamp'].map(h => (
                                        <th key={h} className="px-5 py-3 text-left text-[9px] uppercase tracking-widest text-[var(--text-muted)] font-medium whitespace-nowrap">
                                            {h}
                                        </th>
                                    ))}
                                </tr>
                            </thead>
                            <tbody>
                                {filtered.map((tx, i) => (
                                    <tr
                                        key={tx.id}
                                        className={`border-b border-[var(--border)] hover:bg-[var(--surface)] transition-colors duration-100 ${i === 0 ? 'animate-slide-in' : ''}`}
                                    >
                                        {/* TX ID */}
                                        <td className="px-5 py-3.5">
                                            <span className="text-[var(--text-primary)] font-semibold">{tx.id}</span>
                                        </td>

                                        {/* Sender */}
                                        <td className="px-5 py-3.5 text-[var(--text-secondary)]">{tx.senderId}</td>

                                        {/* Receiver */}
                                        <td className="px-5 py-3.5 text-[var(--text-secondary)]">{tx.receiverId}</td>

                                        {/* Amount */}
                                        <td className="px-5 py-3.5 text-[var(--text-primary)] font-semibold">
                                            {formatAmount(tx.amount)}
                                        </td>

                                        {/* Risk Score */}
                                        <td className="px-5 py-3.5">
                                            <div className="flex items-center gap-2">
                                                <div className="w-12 h-1 rounded-full bg-[var(--border)] overflow-hidden">
                                                    <div
                                                        className="h-full rounded-full transition-all"
                                                        style={{
                                                            width: `${riskNumeric(tx.risk) * 100}%`,
                                                            backgroundColor: tx.risk === 'high' ? '#dc2626' : tx.risk === 'medium' ? '#d97706' : '#52525b',
                                                        }}
                                                    />
                                                </div>
                                                <span className={`font-semibold ${riskColor(tx.risk)}`}>
                                                    {riskNumeric(tx.risk).toFixed(2)}
                                                </span>
                                            </div>
                                        </td>

                                        {/* Fraud Status */}
                                        <td className="px-5 py-3.5">
                                            <span className={`text-[9px] font-mono px-2 py-0.5 rounded-sm ${fraudBadge(!!tx.isFraud)}`}>
                                                {tx.isFraud ? 'FRAUD' : 'SAFE'}
                                            </span>
                                        </td>

                                        {/* Timestamp */}
                                        <td className="px-5 py-3.5 text-[var(--text-muted)]">
                                            {formatTime(tx.timestamp)}
                                        </td>
                                    </tr>
                                ))}

                                {filtered.length === 0 && (
                                    <tr>
                                        <td colSpan={7} className="px-5 py-12 text-center text-[var(--text-muted)] text-xs font-mono">
                                            No transactions match your filters.
                                        </td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                </main>
            </div>
        </div>
    );
}
