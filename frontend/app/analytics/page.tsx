'use client';

import { useState, useEffect } from 'react';
import Sidebar from '@/components/Sidebar';
import BackButton from '@/components/ui/BackButton';
import LiveTime from '@/components/ui/LiveTime';
import { BarChart3, Clock, ShieldAlert, Activity, TrendingUp, PieChart, Loader2 } from 'lucide-react';
import { fetchTransactionStats, type TransactionStats } from '@/lib/api';

// ── Stat Card ────────────────────────────────────────────────────
function StatCard({ label, value, sub, icon: Icon, accent }: {
    label: string;
    value: string;
    sub?: string;
    icon: React.ElementType;
    accent: string;
}) {
    return (
        <div className="rounded-lg border border-[var(--border)] bg-[var(--surface)] p-5 group hover:border-zinc-600 transition-all duration-200">
            <div className="flex items-center justify-between mb-3">
                <p className="text-[10px] font-mono uppercase tracking-widest text-[var(--text-muted)]">{label}</p>
                <div className={`w-7 h-7 rounded-md flex items-center justify-center ${accent}`}>
                    <Icon size={14} strokeWidth={1.5} />
                </div>
            </div>
            <p className="text-2xl font-mono font-bold text-[var(--text-primary)] mb-1 leading-none">{value}</p>
            {sub && <p className="text-[9px] font-mono text-[var(--text-muted)]">{sub}</p>}
        </div>
    );
}

// ── Horizontal Bar ───────────────────────────────────────────────
function DistributionBar({ label, count, total, color }: {
    label: string; count: number; total: number; color: string;
}) {
    const pct = total > 0 ? (count / total) * 100 : 0;
    return (
        <div className="flex items-center gap-3">
            <span className="w-16 text-[10px] font-mono text-[var(--text-muted)] text-right">{label}</span>
            <div className="flex-1 h-2 rounded-full bg-[var(--border)] overflow-hidden">
                <div className={`h-full rounded-full ${color} transition-all duration-700`} style={{ width: `${pct}%` }} />
            </div>
            <span className="w-10 text-[10px] font-mono text-[var(--text-secondary)] text-right">{count}</span>
        </div>
    );
}

export default function AnalyticsPage() {
    const [stats, setStats] = useState<TransactionStats | null>(null);
    const [loading, setLoading] = useState(true);

    // Fetch stats from backend
    useEffect(() => {
        const load = async () => {
            try {
                const data = await fetchTransactionStats();
                setStats(data);
            } catch (e) {
                console.error('[Quantora] Failed to fetch stats:', e);
            }
            setLoading(false);
        };
        load();
        const interval = setInterval(load, 3000);
        return () => clearInterval(interval);
    }, []);

    // Loading state
    if (loading || !stats) {
        return (
            <div className="flex h-screen overflow-hidden bg-[var(--bg)]">
                <Sidebar />
                <div className="flex-1 flex items-center justify-center">
                    <div className="flex items-center gap-3">
                        <Loader2 size={16} className="animate-spin text-[var(--text-muted)]" />
                        <span className="text-xs font-mono text-[var(--text-muted)]">Loading analytics...</span>
                    </div>
                </div>
            </div>
        );
    }

    const fraudRate = stats.fraud_rate.toFixed(1);
    const avgRisk = stats.avg_risk.toFixed(2);
    const safeCount = stats.total - stats.fraud_count;

    return (
        <div className="flex h-screen overflow-hidden bg-[var(--bg)]">
            <Sidebar />
            <div className="flex-1 flex flex-col overflow-hidden">

                {/* Header */}
                <header className="h-14 flex-shrink-0 border-b border-[var(--border)] px-6 flex items-center justify-between">
                    <div className="flex items-center gap-4">
                        <BackButton />
                        <div className="w-px h-4 bg-[var(--border)]" />
                        <BarChart3 size={14} strokeWidth={1.5} className="text-[var(--text-secondary)]" />
                        <span className="text-xs font-semibold text-[var(--text-primary)]">Fraud Analytics</span>
                        <span className="text-[10px] font-mono text-[var(--text-muted)]">· SAGRA Engine</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                        <Clock size={11} strokeWidth={1.5} className="text-[var(--text-muted)]" />
                        <span className="text-[10px] font-mono text-[var(--text-muted)]">
                            <LiveTime format={{ hour: '2-digit', minute: '2-digit', hour12: false }} />
                        </span>
                    </div>
                </header>

                {/* Content */}
                <main className="flex-1 overflow-y-auto p-6 space-y-6">

                    {/* KPI Row */}
                    <section className="grid grid-cols-2 xl:grid-cols-4 gap-4">
                        <StatCard
                            label="Total Transactions"
                            value={stats.total.toLocaleString()}
                            sub="From SAGRA backend"
                            icon={Activity}
                            accent="bg-blue-500/10 text-blue-400"
                        />
                        <StatCard
                            label="Fraud Detected"
                            value={stats.fraud_count.toLocaleString()}
                            sub="Flagged by SAGRA"
                            icon={ShieldAlert}
                            accent="bg-red-500/10 text-red-400"
                        />
                        <StatCard
                            label="Fraud Rate"
                            value={`${fraudRate}%`}
                            sub="Of total volume"
                            icon={TrendingUp}
                            accent="bg-amber-500/10 text-amber-400"
                        />
                        <StatCard
                            label="Avg Risk Score"
                            value={avgRisk}
                            sub="Across all transactions"
                            icon={PieChart}
                            accent="bg-emerald-500/10 text-emerald-400"
                        />
                    </section>

                    {/* Charts Row */}
                    <section className="grid grid-cols-1 xl:grid-cols-2 gap-4">

                        {/* Risk Score Distribution */}
                        <div className="rounded-lg border border-[var(--border)] bg-[var(--surface)] p-5">
                            <h3 className="text-[10px] font-mono uppercase tracking-widest text-[var(--text-muted)] mb-5">
                                Risk Score Distribution
                            </h3>
                            <div className="space-y-3">
                                <DistributionBar label="High" count={stats.high_count} total={stats.total} color="bg-red-500" />
                                <DistributionBar label="Medium" count={stats.medium_count} total={stats.total} color="bg-amber-400" />
                                <DistributionBar label="Low" count={stats.low_count} total={stats.total} color="bg-zinc-500" />
                            </div>
                            <div className="mt-4 pt-3 border-t border-[var(--border)] flex items-center justify-between">
                                <span className="text-[9px] font-mono text-[var(--text-muted)]">Total Scored</span>
                                <span className="text-[11px] font-mono font-semibold text-[var(--text-primary)]">{stats.total}</span>
                            </div>
                        </div>

                        {/* Fraud vs Safe */}
                        <div className="rounded-lg border border-[var(--border)] bg-[var(--surface)] p-5">
                            <h3 className="text-[10px] font-mono uppercase tracking-widest text-[var(--text-muted)] mb-5">
                                Fraud vs Safe
                            </h3>

                            {/* Visual ring */}
                            <div className="flex items-center justify-center mb-5">
                                <div className="relative w-36 h-36">
                                    <svg viewBox="0 0 100 100" className="w-full h-full -rotate-90">
                                        {/* Safe arc */}
                                        <circle
                                            cx="50" cy="50" r="40"
                                            fill="none" stroke="#3f3f46" strokeWidth="10"
                                            strokeDasharray={`${(safeCount / Math.max(stats.total, 1)) * 251.3} 251.3`}
                                        />
                                        {/* Fraud arc */}
                                        <circle
                                            cx="50" cy="50" r="40"
                                            fill="none" stroke="#dc2626" strokeWidth="10"
                                            strokeDasharray={`${(stats.fraud_count / Math.max(stats.total, 1)) * 251.3} 251.3`}
                                            strokeDashoffset={`-${(safeCount / Math.max(stats.total, 1)) * 251.3}`}
                                        />
                                    </svg>
                                    <div className="absolute inset-0 flex flex-col items-center justify-center">
                                        <span className="text-lg font-mono font-bold text-[var(--text-primary)]">{fraudRate}%</span>
                                        <span className="text-[8px] font-mono text-[var(--text-muted)]">FRAUD</span>
                                    </div>
                                </div>
                            </div>

                            {/* Legend */}
                            <div className="flex items-center justify-center gap-6">
                                <div className="flex items-center gap-2">
                                    <span className="w-2 h-2 rounded-full bg-red-500" />
                                    <span className="text-[10px] font-mono text-[var(--text-secondary)]">Fraud · {stats.fraud_count}</span>
                                </div>
                                <div className="flex items-center gap-2">
                                    <span className="w-2 h-2 rounded-full bg-zinc-500" />
                                    <span className="text-[10px] font-mono text-[var(--text-secondary)]">Safe · {safeCount}</span>
                                </div>
                            </div>
                        </div>
                    </section>
                </main>
            </div>
        </div>
    );
}
