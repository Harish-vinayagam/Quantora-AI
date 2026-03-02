'use client';

import { useRouter } from 'next/navigation';
import Sidebar from '@/components/Sidebar';
import BackButton from '@/components/ui/BackButton';
import LiveTime from '@/components/ui/LiveTime';
import { AlertTriangle, Clock } from 'lucide-react';

type AlertStatus = 'active' | 'investigating' | 'resolved';

interface FraudAlert {
    alertId: string;
    account: string;
    riskScore: number;
    triggerReason: string;
    status: AlertStatus;
    timestamp: string;
    clusterId: string;
}

const MOCK_ALERTS: FraudAlert[] = [
    { alertId: 'ALT-0048', account: 'A001', riskScore: 0.92, triggerReason: 'Circular fund movement detected', status: 'active', timestamp: '14:10:22', clusterId: 'CLU-001' },
    { alertId: 'ALT-0047', account: 'A003', riskScore: 0.88, triggerReason: 'Multi-hop connection to flagged entity', status: 'investigating', timestamp: '14:08:15', clusterId: 'CLU-003' },
    { alertId: 'ALT-0046', account: 'A002', riskScore: 0.85, triggerReason: 'Unusual transaction velocity', status: 'active', timestamp: '14:06:41', clusterId: 'CLU-001' },
    { alertId: 'ALT-0045', account: 'B004', riskScore: 0.71, triggerReason: 'Shared device fingerprint identified', status: 'investigating', timestamp: '14:03:09', clusterId: 'CLU-002' },
    { alertId: 'ALT-0044', account: 'A006', riskScore: 0.89, triggerReason: 'Rapid sequential transfers', status: 'active', timestamp: '13:58:52', clusterId: 'CLU-006' },
    { alertId: 'ALT-0043', account: 'A004', riskScore: 0.91, triggerReason: 'Connected to known fraud cluster', status: 'active', timestamp: '13:54:30', clusterId: 'CLU-001' },
    { alertId: 'ALT-0042', account: 'B008', riskScore: 0.64, triggerReason: 'Elevated outbound volume', status: 'investigating', timestamp: '13:49:18', clusterId: 'CLU-002' },
    { alertId: 'ALT-0041', account: 'C002', riskScore: 0.43, triggerReason: 'Geographic anomaly detected', status: 'resolved', timestamp: '13:30:05', clusterId: 'CLU-005' },
    { alertId: 'ALT-0040', account: 'A005', riskScore: 0.77, triggerReason: 'Unusual behavioural pattern', status: 'resolved', timestamp: '13:12:44', clusterId: 'CLU-001' },
    { alertId: 'ALT-0039', account: 'B001', riskScore: 0.38, triggerReason: 'Moderate transaction frequency spike', status: 'resolved', timestamp: '12:58:01', clusterId: 'CLU-007' },
];

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

    const active = MOCK_ALERTS.filter(a => a.status === 'active').length;
    const investigating = MOCK_ALERTS.filter(a => a.status === 'investigating').length;

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
                            <span className="text-[9px] font-mono px-1.5 py-0.5 rounded-sm bg-amber-500/10 border border-amber-500/25 text-amber-400">
                                {investigating} Investigating
                            </span>
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
                    <div className="rounded-lg border border-[var(--border)] bg-[var(--surface)] overflow-hidden">
                        <div className="overflow-x-auto">
                            <table className="w-full text-[11px] font-mono">
                                <thead>
                                    <tr className="border-b border-[var(--border)]">
                                        {['Alert ID', 'Account', 'Risk Score', 'Trigger Reason', 'Status', 'Timestamp'].map(h => (
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
                                    {MOCK_ALERTS.map((alert, i) => {
                                        const st = STATUS_CONFIG[alert.status];
                                        return (
                                            <tr
                                                key={alert.alertId}
                                                onClick={() => router.push(`/analysis/${alert.clusterId}`)}
                                                className={`border-b border-[var(--border)] hover:bg-[var(--bg)] cursor-pointer transition-colors duration-100 ${i === MOCK_ALERTS.length - 1 ? 'border-0' : ''
                                                    }`}
                                            >
                                                {/* Alert ID */}
                                                <td className="px-5 py-3.5">
                                                    <span className="text-[var(--text-primary)] font-semibold">{alert.alertId}</span>
                                                </td>

                                                {/* Account */}
                                                <td className="px-5 py-3.5 text-[var(--text-secondary)]">
                                                    {alert.account}
                                                </td>

                                                {/* Risk Score */}
                                                <td className="px-5 py-3.5">
                                                    <div className="flex items-center gap-2">
                                                        <div className="w-12 h-1 rounded-full bg-[var(--border)] overflow-hidden">
                                                            <div
                                                                className="h-full rounded-full"
                                                                style={{
                                                                    width: `${alert.riskScore * 100}%`,
                                                                    backgroundColor: alert.riskScore >= 0.8 ? '#dc2626' : alert.riskScore >= 0.5 ? '#d97706' : '#52525b',
                                                                }}
                                                            />
                                                        </div>
                                                        <span className={`font-semibold ${riskColor(alert.riskScore)}`}>
                                                            {alert.riskScore.toFixed(2)}
                                                        </span>
                                                    </div>
                                                </td>

                                                {/* Trigger Reason */}
                                                <td className="px-5 py-3.5 text-[var(--text-secondary)] max-w-xs">
                                                    <span className="line-clamp-1">{alert.triggerReason}</span>
                                                </td>

                                                {/* Status */}
                                                <td className="px-5 py-3.5">
                                                    <span className={`flex items-center gap-1.5 w-fit text-[9px] px-2 py-0.5 rounded-sm border ${st.bg}`}>
                                                        <span className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${st.dot} ${alert.status === 'active' ? 'animate-pulse' : ''}`} />
                                                        <span className={st.text}>{st.label}</span>
                                                    </span>
                                                </td>

                                                {/* Timestamp */}
                                                <td className="px-5 py-3.5 text-[var(--text-muted)]">
                                                    {alert.timestamp}
                                                </td>
                                            </tr>
                                        );
                                    })}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </main>
            </div>
        </div>
    );
}
