'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Sidebar from '@/components/Sidebar';
import BackButton from '@/components/ui/BackButton';
import LiveTime from '@/components/ui/LiveTime';
import { AlertTriangle, Clock, Loader2 } from 'lucide-react';
import { fetchAlerts, type AlertData, type AlertsResponse } from '@/lib/api';

type AlertStatus = 'active' | 'investigating' | 'resolved';

const STATUS_CONFIG: Record<AlertStatus, { label: string; dot: string; text: string; bg: string }> = {
    active: { label: 'Active', dot: 'bg-red-500', text: 'text-red-400', bg: 'bg-red-500/10 border-red-500/25' },
    investigating: { label: 'Investigating', dot: 'bg-amber-400', text: 'text-amber-400', bg: 'bg-amber-500/10 border-amber-500/25' },
    resolved: { label: 'Resolved', dot: 'bg-zinc-500', text: 'text-zinc-400', bg: 'bg-zinc-700/30 border-zinc-600/25' },
};

function riskColor(score: number) {
    if (score >= 0.8) return 'text-red-400';
    if (score >= 0.5) return 'text-amber-400';
    return 'text-zinc-400';
}

export default function AlertsPage() {
    const router = useRouter();
    const [alertsData, setAlertsData] = useState<AlertsResponse | null>(null);
    const [loading, setLoading] = useState(true);

    // Fetch alerts from backend
    useEffect(() => {
        const load = async () => {
            try {
                const data = await fetchAlerts(50);
                setAlertsData(data);
            } catch (e) {
                console.error('[Quantora] Failed to fetch alerts:', e);
            }
            setLoading(false);
        };
        load();
        const interval = setInterval(load, 5000);
        return () => clearInterval(interval);
    }, []);

    // Loading state
    if (loading || !alertsData) {
        return (
            <div className="flex h-screen overflow-hidden bg-[var(--bg)]">
                <Sidebar />
                <div className="flex-1 flex items-center justify-center">
                    <div className="flex items-center gap-3">
                        <Loader2 size={16} className="animate-spin text-[var(--text-muted)]" />
                        <span className="text-xs font-mono text-[var(--text-muted)]">Loading alerts...</span>
                    </div>
                </div>
            </div>
        );
    }

    const alerts = alertsData.alerts;
    const active = alertsData.active;
    const investigating = alertsData.investigating;

    return (
        <div className="flex h-screen overflow-hidden bg-[var(--bg)]">
            <Sidebar />
            <div className="flex-1 flex flex-col overflow-hidden">

                {/* Header */}
                <header className="h-14 flex-shrink-0 border-b border-[var(--border)] px-6 flex items-center justify-between">
                    <div className="flex items-center gap-4">
                        <BackButton />
                        <div className="w-px h-4 bg-[var(--border)]" />
                        <AlertTriangle size={14} strokeWidth={1.5} className="text-red-400" />
                        <span className="text-xs font-semibold text-[var(--text-primary)]">Fraud Alerts</span>
                        <div className="flex items-center gap-2">
                            <span className="text-[9px] font-mono px-1.5 py-0.5 rounded-sm bg-red-500/10 border border-red-500/25 text-red-400">
                                {active} Active
                            </span>
                            {investigating > 0 && (
                                <span className="text-[9px] font-mono px-1.5 py-0.5 rounded-sm bg-amber-500/10 border border-amber-500/25 text-amber-400">
                                    {investigating} Investigating
                                </span>
                            )}
                        </div>
                    </div>
                    <div className="flex items-center gap-1.5">
                        <Clock size={11} strokeWidth={1.5} className="text-[var(--text-muted)]" />
                        <span className="text-[10px] font-mono text-[var(--text-muted)]">
                            <LiveTime format={{ hour: '2-digit', minute: '2-digit', hour12: false }} />
                        </span>
                    </div>
                </header>

                {/* Table */}
                <main className="flex-1 overflow-y-auto p-6">
                    {alerts.length === 0 ? (
                        <div className="flex items-center justify-center h-full">
                            <span className="text-xs font-mono text-[var(--text-muted)]">No fraud alerts detected.</span>
                        </div>
                    ) : (
                        <div className="rounded-lg border border-[var(--border)] bg-[var(--surface)] overflow-hidden">
                            <div className="overflow-x-auto">
                                <table className="w-full text-[11px] font-mono">
                                    <thead>
                                        <tr className="border-b border-[var(--border)]">
                                            {['Alert ID', 'Type', 'Sender → Receiver', 'Amount', 'Risk Score', 'Reason', 'Status', 'Time'].map(h => (
                                                <th
                                                    key={h}
                                                    className="px-5 py-3 text-left text-[9px] uppercase tracking-widest text-[var(--text-muted)] font-medium whitespace-nowrap"
                                                >
                                                    {h}
                                                </th>
                                            ))}
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {alerts.map((alert, i) => {
                                            const st = STATUS_CONFIG[alert.status as AlertStatus] || STATUS_CONFIG.active;
                                            return (
                                                <tr
                                                    key={alert.id}
                                                    className={`border-b border-[var(--border)] hover:bg-[var(--bg)] cursor-pointer transition-colors duration-100 ${i === alerts.length - 1 ? 'border-0' : ''
                                                        }`}
                                                >
                                                    <td className="px-5 py-3.5">
                                                        <span className="text-[var(--text-primary)] font-semibold">{alert.id}</span>
                                                    </td>
                                                    <td className="px-5 py-3.5">
                                                        <span className="text-[10px] px-1.5 py-0.5 rounded-sm bg-red-500/10 border border-red-500/25 text-red-400">
                                                            {alert.type || 'fraud'}
                                                        </span>
                                                    </td>
                                                    <td className="px-5 py-3.5 text-[var(--text-secondary)]">
                                                        <span>{alert.sender}</span>
                                                        <span className="text-[var(--text-muted)] mx-1">→</span>
                                                        <span>{alert.receiver}</span>
                                                    </td>
                                                    <td className="px-5 py-3.5 text-[var(--text-secondary)]">
                                                        ₹{(alert.amount || 0).toLocaleString()}
                                                    </td>
                                                    <td className="px-5 py-3.5">
                                                        <div className="flex items-center gap-2">
                                                            <div className="w-12 h-1 rounded-full bg-[var(--border)] overflow-hidden">
                                                                <div
                                                                    className="h-full rounded-full"
                                                                    style={{
                                                                        width: `${(alert.risk_score || 0) * 100}%`,
                                                                        backgroundColor: (alert.risk_score || 0) >= 0.8 ? '#dc2626' : (alert.risk_score || 0) >= 0.5 ? '#d97706' : '#52525b',
                                                                    }}
                                                                />
                                                            </div>
                                                            <span className={`font-semibold ${riskColor(alert.risk_score || 0)}`}>
                                                                {(alert.risk_score || 0).toFixed(2)}
                                                            </span>
                                                        </div>
                                                    </td>
                                                    <td className="px-5 py-3.5 text-[var(--text-secondary)] max-w-xs">
                                                        <span className="line-clamp-1">{alert.trigger_reason}</span>
                                                    </td>
                                                    <td className="px-5 py-3.5">
                                                        <span className={`flex items-center gap-1.5 w-fit text-[9px] px-2 py-0.5 rounded-sm border ${st.bg}`}>
                                                            <span className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${st.dot} ${alert.status === 'active' ? 'animate-pulse' : ''}`} />
                                                            <span className={st.text}>{st.label}</span>
                                                        </span>
                                                    </td>
                                                    <td className="px-5 py-3.5 text-[var(--text-muted)]">
                                                        {new Date(alert.timestamp).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: false })}
                                                    </td>
                                                </tr>
                                            );
                                        })}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    )}
                </main>
            </div>
        </div>
    );
}
