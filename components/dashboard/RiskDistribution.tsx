'use client';

import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer } from 'recharts';
import type { RiskDistributionPoint } from '@/lib/mockDashboardData';

interface RiskDistributionProps {
    data: RiskDistributionPoint[];
}

const CustomTooltip = ({ active, payload }: {
    active?: boolean;
    payload?: Array<{ name: string; value: number; payload: { color: string } }>;
}) => {
    if (!active || !payload?.length) return null;
    const item = payload[0];
    return (
        <div className="bg-[#111] border border-[#2a2a2a] rounded-md px-3 py-2 text-[11px] font-mono shadow-sm">
            <p style={{ color: item.payload.color }} className="font-semibold">
                {item.name}: {item.value}%
            </p>
        </div>
    );
};

export default function RiskDistribution({ data }: RiskDistributionProps) {
    return (
        <div className="rounded-lg border border-[var(--border)] bg-[var(--surface)] p-5 h-full">
            <div className="mb-4">
                <h3 className="text-xs font-semibold text-[var(--text-primary)] uppercase tracking-widest">
                    Risk Distribution
                </h3>
                <p className="text-[10px] font-mono text-[var(--text-muted)] mt-0.5">Current snapshot</p>
            </div>

            {/* Donut chart */}
            <ResponsiveContainer width="100%" height={160}>
                <PieChart>
                    <Pie
                        data={data}
                        dataKey="value"
                        nameKey="label"
                        cx="50%"
                        cy="50%"
                        innerRadius={48}
                        outerRadius={72}
                        strokeWidth={0}
                        paddingAngle={2}
                    >
                        {data.map((entry, i) => (
                            <Cell key={i} fill={entry.color} />
                        ))}
                    </Pie>
                    <Tooltip content={<CustomTooltip />} />
                </PieChart>
            </ResponsiveContainer>

            {/* Legend */}
            <div className="space-y-2 mt-3">
                {data.map(item => (
                    <div key={item.label} className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                            <span
                                className="w-2 h-2 rounded-full flex-shrink-0"
                                style={{ backgroundColor: item.color }}
                            />
                            <span className="text-[11px] font-mono text-[var(--text-secondary)]">{item.label} Risk</span>
                        </div>
                        <div className="flex items-center gap-2">
                            <div className="w-20 h-1 rounded-full bg-[var(--border)] overflow-hidden">
                                <div
                                    className="h-full rounded-full"
                                    style={{ width: `${item.value}%`, backgroundColor: item.color }}
                                />
                            </div>
                            <span className="text-[11px] font-mono text-[var(--text-primary)] w-7 text-right">
                                {item.value}%
                            </span>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
}
