'use client';

import { useRouter } from 'next/navigation';
import { ArrowUpRight } from 'lucide-react';

interface ClusterData {
    clusterId: string;
    nodeCount: number;
    riskLevel: number;
    primaryActor: string;
    isExpanded: boolean;
}

interface ClusterTableProps {
    clusters: ClusterData[];
}

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

    if (!clusters || clusters.length === 0) {
        return (
            <div className="rounded-lg border border-[var(--border)] bg-[var(--surface)] p-8 text-center">
                <p className="text-xs font-mono text-[var(--text-muted)]">No risk clusters detected yet</p>
                <p className="text-[10px] font-mono text-[var(--text-muted)] mt-1">Submit transactions to build the network graph</p>
            </div>
        );
    }

    return (
        <div className="rounded-lg border border-[var(--border)] bg-[var(--surface)] overflow-hidden">
            <div className="px-5 py-4 border-b border-[var(--border)] flex items-center justify-between">
                <div>
                    <h3 className="text-xs font-semibold text-[var(--text-primary)] uppercase tracking-widest">
                        Top Risk Clusters
                    </h3>
                    <p className="text-[10px] font-mono text-[var(--text-muted)] mt-0.5">
                        {clusters.length} detected · Derived from SAGRA scoring
                    </p>
                </div>
            </div>

            <div className="overflow-x-auto">
                <table className="w-full text-[11px] font-mono">
                    <thead>
                        <tr className="border-b border-[var(--border)]">
                            {['Cluster ID', 'Nodes', 'Risk Score', 'Primary Actor', 'Action'].map(h => (
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
                            const badge = riskBadge(cluster.riskLevel);
                            return (
                                <tr
                                    key={cluster.clusterId}
                                    className={`border-b border-[var(--border)] hover:bg-[var(--bg)] transition-colors duration-100 ${i === clusters.length - 1 ? 'border-0' : ''}`}
                                >
                                    <td className="px-5 py-3.5">
                                        <span className="text-[var(--text-primary)] font-semibold">{cluster.clusterId}</span>
                                    </td>
                                    <td className="px-5 py-3.5 text-[var(--text-secondary)]">
                                        {cluster.nodeCount}
                                    </td>
                                    <td className="px-5 py-3.5">
                                        <div className="flex items-center gap-2.5">
                                            {scoreBar(cluster.riskLevel)}
                                            <span className={`text-[9px] px-1.5 py-0.5 rounded-sm ${badge.className}`}>
                                                {badge.label}
                                            </span>
                                        </div>
                                    </td>
                                    <td className="px-5 py-3.5 text-[var(--text-secondary)]">
                                        {cluster.primaryActor}
                                    </td>
                                    <td className="px-5 py-3.5">
                                        <button
                                            onClick={() => router.push(`/network`)}
                                            className="flex items-center gap-1 text-[var(--text-secondary)] hover:text-[var(--text-primary)] border border-[var(--border)] hover:border-zinc-500 rounded-md px-2.5 py-1.5 transition-all duration-150"
                                        >
                                            View Graph <ArrowUpRight size={10} strokeWidth={1.5} />
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
