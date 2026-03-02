'use client';

import { useRouter } from 'next/navigation';
import type { RiskCluster, ClusterStatus } from '@/lib/mockDashboardData';
import { ArrowUpRight } from 'lucide-react';

interface ClusterTableProps {
    clusters: RiskCluster[];
}

const STATUS_CONFIG: Record<ClusterStatus, { label: string; dot: string; text: string }> = {
    active: { label: 'Active', dot: 'bg-red-500', text: 'text-red-400' },
    monitoring: { label: 'Monitoring', dot: 'bg-amber-400', text: 'text-amber-400' },
    contained: { label: 'Contained', dot: 'bg-zinc-500', text: 'text-zinc-400' },
};

function riskBadge(score: number) {
    if (score >= 0.8) return { label: 'High', className: 'bg-red-500/12 text-red-400 border border-red-500/25' };
    if (score >= 0.5) return { label: 'Medium', className: 'bg-amber-500/12 text-amber-400 border border-amber-500/25' };
    return { label: 'Low', className: 'bg-zinc-700/40 text-zinc-400 border border-zinc-600/25' };
}

function scoreBar(score: number) {
    const color = score >= 0.8 ? '#dc2626' : score >= 0.5 ? '#d97706' : '#52525b';
    return (
        <div className="flex items-center gap-2">
            <div className="w-16 h-1 rounded-full bg-[var(--border)] overflow-hidden">
                <div className="h-full rounded-full" style={{ width: `${score * 100}%`, backgroundColor: color }} />
            </div>
            <span className="font-mono text-[11px] text-[var(--text-primary)]">{score.toFixed(2)}</span>
        </div>
    );
}

export default function ClusterTable({ clusters }: ClusterTableProps) {
    const router = useRouter();

    return (
        <div className="rounded-lg border border-[var(--border)] bg-[var(--surface)] overflow-hidden">
            {/* Header */}
            <div className="px-5 py-4 border-b border-[var(--border)] flex items-center justify-between">
                <div>
                    <h3 className="text-xs font-semibold text-[var(--text-primary)] uppercase tracking-widest">
                        Top Risk Clusters
                    </h3>
                    <p className="text-[10px] font-mono text-[var(--text-muted)] mt-0.5">
                        {clusters.filter(c => c.status === 'active').length} active · Updated live
                    </p>
                </div>
            </div>

            {/* Table */}
            <div className="overflow-x-auto">
                <table className="w-full text-[11px] font-mono">
                    <thead>
                        <tr className="border-b border-[var(--border)]">
                            {['Cluster ID', 'Accounts', 'Avg Risk Score', 'Status', 'Last Activity', 'Action'].map(h => (
                                <th
                                    key={h}
                                    className="px-5 py-2.5 text-left text-[9px] uppercase tracking-widest text-[var(--text-muted)] font-medium whitespace-nowrap"
                                >
                                    {h}
                                </th>
                            ))}
                        </tr>
                    </thead>
                    <tbody>
                        {clusters.map((cluster, i) => {
                            const st = STATUS_CONFIG[cluster.status];
                            const badge = riskBadge(cluster.avgRiskScore);
                            return (
                                <tr
                                    key={cluster.clusterId}
                                    className={`border-b border-[var(--border)] hover:bg-[var(--bg)] transition-colors duration-100 ${i === clusters.length - 1 ? 'border-0' : ''
                                        }`}
                                >
                                    {/* Cluster ID */}
                                    <td className="px-5 py-3.5">
                                        <span className="text-[var(--text-primary)] font-semibold">{cluster.clusterId}</span>
                                    </td>

                                    {/* Accounts */}
                                    <td className="px-5 py-3.5 text-[var(--text-secondary)]">
                                        {cluster.accountsInvolved}
                                    </td>

                                    {/* Risk score */}
                                    <td className="px-5 py-3.5">
                                        <div className="flex items-center gap-2.5">
                                            {scoreBar(cluster.avgRiskScore)}
                                            <span className={`text-[9px] px-1.5 py-0.5 rounded-sm ${badge.className}`}>
                                                {badge.label}
                                            </span>
                                        </div>
                                    </td>

                                    {/* Status */}
                                    <td className="px-5 py-3.5">
                                        <div className="flex items-center gap-1.5">
                                            <span className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${st.dot} ${cluster.status === 'active' ? 'animate-pulse' : ''}`} />
                                            <span className={st.text}>{st.label}</span>
                                        </div>
                                    </td>

                                    {/* Last activity */}
                                    <td className="px-5 py-3.5 text-[var(--text-muted)]">
                                        {cluster.lastActivity}
                                    </td>

                                    {/* Action */}
                                    <td className="px-5 py-3.5">
                                        <button
                                            onClick={() => router.push(`/analysis/${cluster.clusterId}`)}
                                            className="flex items-center gap-1 text-[var(--text-secondary)] hover:text-[var(--text-primary)] border border-[var(--border)] hover:border-zinc-500 rounded-md px-2.5 py-1.5 transition-all duration-150"
                                        >
                                            View Details <ArrowUpRight size={10} strokeWidth={1.5} />
                                        </button>
                                    </td>
                                </tr>
                            );
                        })}
                    </tbody>
                </table>
            </div>
        </div>
    );
}
