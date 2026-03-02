'use client';

import { useMemo } from 'react';
import Sidebar from '@/components/Sidebar';
import KpiCard from '@/components/dashboard/KpiCard';
import TrendChart from '@/components/dashboard/TrendChart';
import RiskDistribution from '@/components/dashboard/RiskDistribution';
import ClusterTable from '@/components/dashboard/ClusterTable';
import { kpiMetrics, trendData, riskDistribution, riskClusters, getSystemStatus } from '@/lib/mockDashboardData';
import { Sun, Moon } from 'lucide-react';
import { useState, useEffect } from 'react';

const THREAT_COLOR = {
    High: 'text-red-400 bg-red-500/10 border-red-500/25',
    Medium: 'text-amber-400 bg-amber-500/10 border-amber-500/25',
    Low: 'text-emerald-400 bg-emerald-500/10 border-emerald-500/25',
};

export default function DashboardPage() {
    const [theme, setTheme] = useState<'dark' | 'light'>('dark');
    const [clock, setClock] = useState('');

    const status = useMemo(() => getSystemStatus(), []);

    // Live clock for "Last Updated"
    useEffect(() => {
        const tick = () =>
            setClock(
                new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false })
            );
        tick();
        const id = setInterval(tick, 1000);
        return () => clearInterval(id);
    }, []);

    const toggleTheme = () => {
        setTheme(t => {
            const next = t === 'dark' ? 'light' : 'dark';
            document.documentElement.classList.toggle('dark', next === 'dark');
            return next;
        });
    };

    useEffect(() => {
        document.documentElement.classList.add('dark');
    }, []);

    return (
        <div className="flex h-screen overflow-hidden bg-[var(--bg)]">
            {/* Sidebar */}
            <Sidebar />

            {/* Main content */}
            <div className="flex-1 flex flex-col overflow-hidden">

                {/* ── Row 1: System Status Bar ── */}
                <header className="h-14 flex-shrink-0 border-b border-[var(--border)] px-6 flex items-center justify-between">
                    <div className="flex items-center gap-4">
                        <div>
                            <span className="text-xs font-semibold text-[var(--text-primary)] tracking-tight">
                                Executive Dashboard
                            </span>
                            <span className="text-[10px] font-mono text-[var(--text-muted)] ml-2">
                                · Network Risk Intelligence
                            </span>
                        </div>
                    </div>

                    <div className="flex items-center gap-4">
                        {/* Threat level */}
                        <div className="flex items-center gap-2">
                            <span className="text-[9px] font-mono uppercase tracking-widest text-[var(--text-muted)]">
                                Threat Level
                            </span>
                            <span className={`text-[10px] font-mono font-semibold px-2 py-0.5 rounded-sm border ${THREAT_COLOR[status.threatLevel]}`}>
                                {status.threatLevel}
                            </span>
                        </div>

                        {/* Separator */}
                        <div className="w-px h-4 bg-[var(--border)]" />

                        {/* System active */}
                        <div className="flex items-center gap-1.5">
                            <span className="relative flex h-1.5 w-1.5">
                                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
                                <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-emerald-500" />
                            </span>
                            <span className="text-[10px] font-mono text-emerald-400">System Active</span>
                        </div>

                        {/* Last updated */}
                        <div className="hidden lg:flex items-center gap-1.5">
                            <span className="text-[9px] font-mono text-[var(--text-muted)]">Updated</span>
                            <span className="text-[9px] font-mono text-[var(--text-secondary)]">{clock}</span>
                        </div>

                        {/* Separator */}
                        <div className="w-px h-4 bg-[var(--border)]" />

                        {/* Theme */}
                        <button
                            onClick={toggleTheme}
                            aria-label="Toggle theme"
                            className="flex items-center gap-1.5 px-2 py-1.5 rounded-md border border-[var(--border)] text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-[var(--surface)] transition-all duration-150"
                        >
                            {theme === 'dark' ? <Sun size={12} strokeWidth={1.5} /> : <Moon size={12} strokeWidth={1.5} />}
                            <span className="text-[10px] font-mono">{theme === 'dark' ? 'Light' : 'Dark'}</span>
                        </button>
                    </div>
                </header>

                {/* ── Scrollable body ── */}
                <main className="flex-1 overflow-y-auto p-6 space-y-6">

                    {/* ── Row 2: KPI Cards ── */}
                    <section className="grid grid-cols-2 xl:grid-cols-4 gap-4">
                        {kpiMetrics.map(m => (
                            <KpiCard
                                key={m.id}
                                label={m.label}
                                value={m.value}
                                change={m.change}
                                changeLabel={m.changeLabel}
                                invertChange={m.invertChange}
                            />
                        ))}
                    </section>

                    {/* ── Row 3: Charts ── */}
                    <section className="grid grid-cols-3 gap-4">
                        {/* Trend chart — 2/3 */}
                        <div className="col-span-3 xl:col-span-2">
                            <TrendChart data={trendData} />
                        </div>
                        {/* Risk distribution — 1/3 */}
                        <div className="col-span-3 xl:col-span-1">
                            <RiskDistribution data={riskDistribution} />
                        </div>
                    </section>

                    {/* ── Row 4: Cluster Table ── */}
                    <section>
                        <ClusterTable clusters={riskClusters} />
                    </section>

                </main>
            </div>
        </div>
    );
}
