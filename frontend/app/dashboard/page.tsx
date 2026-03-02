'use client';

import { useState, useEffect } from 'react';
import Sidebar from '@/components/Sidebar';
import PipelineStatusBar from '@/components/PipelineStatusBar';
import KpiCard from '@/components/dashboard/KpiCard';
import TrendChart from '@/components/dashboard/TrendChart';
import RiskDistribution from '@/components/dashboard/RiskDistribution';
import ClusterTable from '@/components/dashboard/ClusterTable';
import { fetchDashboard, type DashboardData } from '@/lib/api';
import { Sun, Moon, Loader2 } from 'lucide-react';

const THREAT_COLOR = {
    High: 'text-red-400 bg-red-500/10 border-red-500/25',
    Medium: 'text-amber-400 bg-amber-500/10 border-amber-500/25',
    Low: 'text-emerald-400 bg-emerald-500/10 border-emerald-500/25',
};

export default function DashboardPage() {
    const [theme, setTheme] = useState<'dark' | 'light'>('dark');
    const [clock, setClock] = useState('');
    const [dashboard, setDashboard] = useState<DashboardData | null>(null);
    const [loading, setLoading] = useState(true);

    // Fetch dashboard data from backend
    useEffect(() => {
        const load = async () => {
            try {
                const data = await fetchDashboard();
                setDashboard(data);
            } catch (e) {
                console.error('[Quantora] Failed to fetch dashboard:', e);
            }
            setLoading(false);
        };
        load();
        const interval = setInterval(load, 5000);
        return () => clearInterval(interval);
    }, []);

    // Live clock
    useEffect(() => {
        const tick = () =>
            setClock(
                new Date().toLocaleTimeString('en-US', {
                    hour: '2-digit',
                    minute: '2-digit',
                    second: '2-digit',
                    hour12: false,
                })
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

    // Loading state
    if (loading || !dashboard) {
        return (
            <div className="flex h-screen overflow-hidden bg-[var(--bg)]">
                <Sidebar />
                <div className="flex-1 flex items-center justify-center">
                    <div className="flex items-center gap-3">
                        <Loader2 size={16} className="animate-spin text-[var(--text-muted)]" />
                        <span className="text-xs font-mono text-[var(--text-muted)]">
                            Loading dashboard from SAGRA backend...
                        </span>
                    </div>
                </div>
            </div>
        );
    }

    const threatColor = THREAT_COLOR[dashboard.threat_level] || THREAT_COLOR.Low;

    return (
        <div className="flex h-screen overflow-hidden bg-[var(--bg)]">
            <Sidebar />
            <div className="flex-1 flex flex-col overflow-hidden">

                {/* Pipeline status bar — Bank CBS → SAGRA → Dashboard */}
                <PipelineStatusBar />

                {/* System Status Bar */}
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
                            <span className={`text-[10px] font-mono font-semibold px-2 py-0.5 rounded-sm border ${threatColor}`}>
                                {dashboard.threat_level}
                            </span>
                        </div>

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

                {/* Scrollable body */}
                <main className="flex-1 overflow-y-auto p-6 space-y-6">

                    {/* KPI Cards */}
                    <section className="grid grid-cols-2 xl:grid-cols-4 gap-4">
                        {dashboard.kpis.map(m => (
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

                    {/* Charts */}
                    <section className="grid grid-cols-3 gap-4">
                        <div className="col-span-3 xl:col-span-2">
                            <TrendChart data={dashboard.trend} />
                        </div>
                        <div className="col-span-3 xl:col-span-1">
                            <RiskDistribution data={dashboard.risk_distribution} />
                        </div>
                    </section>

                    {/* Cluster Table */}
                    <section>
                        <ClusterTable clusters={dashboard.clusters} />
                    </section>

                </main>
            </div>
        </div>
    );
}
