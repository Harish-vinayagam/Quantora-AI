'use client';

interface Metric {
    label: string;
    value: string | number;
    sublabel?: string;
}

interface MetricsFooterProps {
    totalTransactions: number;
    activeAlerts: number;
    suspiciousClusters: number;
}

export default function MetricsFooter({
    totalTransactions,
    activeAlerts,
    suspiciousClusters,
}: MetricsFooterProps) {
    const metrics: Metric[] = [
        {
            label: 'Total Transactions Processed',
            value: totalTransactions.toLocaleString(),
            sublabel: 'all time',
        },
        {
            label: 'Active Alerts',
            value: activeAlerts,
            sublabel: 'requires review',
        },
        {
            label: 'Suspicious Clusters Detected',
            value: suspiciousClusters,
            sublabel: 'fraud networks',
        },
    ];

    return (
        <footer className="h-10 border-t border-[var(--border)] bg-[var(--bg)] flex items-center px-6 gap-0">
            {metrics.map((m, i) => (
                <div key={m.label} className="flex items-center">
                    <div className="flex items-center gap-3">
                        <span className="text-[10px] font-mono text-[var(--text-muted)]">{m.label}</span>
                        <span className="text-[11px] font-mono font-semibold text-[var(--text-primary)]">
                            {m.value}
                        </span>
                        {m.sublabel && (
                            <span className="text-[9px] font-mono text-[var(--text-muted)] opacity-60">
                                /{m.sublabel}
                            </span>
                        )}
                    </div>
                    {i < metrics.length - 1 && (
                        <div className="w-px h-4 bg-[var(--border)] mx-5" />
                    )}
                </div>
            ))}
        </footer>
    );
}
