'use client';

interface KpiCardProps {
    label: string;
    value: string;
    change: number;
    changeLabel: string;
    invertChange?: boolean;
}

export default function KpiCard({ label, value, change, changeLabel, invertChange }: KpiCardProps) {
    const isPositive = invertChange ? change <= 0 : change >= 0;
    const displayChange = Math.abs(change);
    const sign = change >= 0 ? '+' : '−';

    return (
        <div className="rounded-lg border border-[var(--border)] bg-[var(--surface)] p-5 group hover:border-zinc-600 transition-all duration-200">
            <p className="text-[10px] font-mono uppercase tracking-widest text-[var(--text-muted)] mb-3">
                {label}
            </p>
            <p className="text-2xl font-mono font-bold text-[var(--text-primary)] mb-2 leading-none">
                {value}
            </p>
            <div className="flex items-center gap-1.5">
                <span
                    className={`text-[10px] font-mono font-semibold px-1.5 py-0.5 rounded-sm ${isPositive
                            ? 'text-emerald-400 bg-emerald-500/10'
                            : 'text-red-400 bg-red-500/10'
                        }`}
                >
                    {sign}{displayChange}%
                </span>
                <span className="text-[9px] font-mono text-[var(--text-muted)]">{changeLabel}</span>
            </div>
        </div>
    );
}
