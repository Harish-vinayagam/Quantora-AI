'use client';

import {
    LineChart,
    Line,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    ResponsiveContainer,
    Legend,
} from 'recharts';
interface TrendPoint {
    time: string;
    total: number;
    fraud: number;
    amount: number;
}

interface TrendChartProps {
    data: TrendPoint[];
}

const CustomTooltip = ({ active, payload, label }: {
    active?: boolean;
    payload?: Array<{ value: number; name: string; color: string }>;
    label?: string;
}) => {
    if (!active || !payload?.length) return null;
    return (
        <div className="bg-[var(--surface)] border border-[var(--border)] rounded-md px-3 py-2.5 text-[11px] font-mono shadow-sm">
            <p className="text-[var(--text-muted)] mb-1.5">{label}</p>
            {payload.map(p => (
                <p key={p.name} style={{ color: p.color }} className="leading-relaxed">
                    {p.name}: <span className="font-semibold">{p.value.toLocaleString()}</span>
                </p>
            ))}
        </div>
    );
};

export default function TrendChart({ data }: TrendChartProps) {
    // Show every 3rd tick to avoid crowding
    const tickData = data.filter((_, i) => i % 3 === 0).map(d => d.time);

    return (
        <div className="rounded-lg border border-[var(--border)] bg-[var(--surface)] p-5 h-full">
            <div className="mb-4">
                <h3 className="text-xs font-semibold text-[var(--text-primary)] uppercase tracking-widest">
                    Fraud Trend
                </h3>
                <p className="text-[10px] font-mono text-[var(--text-muted)] mt-0.5">Last 24 hours · Hourly</p>
            </div>
            <ResponsiveContainer width="100%" height={220}>
                <LineChart data={data} margin={{ top: 4, right: 8, left: -24, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 4" stroke="var(--border)" vertical={false} />
                    <XAxis
                        dataKey="time"
                        ticks={tickData}
                        tick={{ fill: 'var(--text-muted)', fontSize: 9, fontFamily: 'JetBrains Mono, monospace' }}
                        axisLine={false}
                        tickLine={false}
                    />
                    <YAxis
                        tick={{ fill: 'var(--text-muted)', fontSize: 9, fontFamily: 'JetBrains Mono, monospace' }}
                        axisLine={false}
                        tickLine={false}
                    />
                    <Tooltip content={<CustomTooltip />} />
                    <Legend
                        wrapperStyle={{ fontSize: 10, fontFamily: 'JetBrains Mono, monospace', color: 'var(--text-muted)', paddingTop: 12 }}
                    />
                    <Line
                        type="monotone"
                        dataKey="total"
                        name="Transactions"
                        stroke="#3f3f46"
                        strokeWidth={1.5}
                        dot={false}
                        activeDot={{ r: 3, fill: '#3f3f46' }}
                    />
                    <Line
                        type="monotone"
                        dataKey="fraud"
                        name="Fraud Alerts"
                        stroke="#dc2626"
                        strokeWidth={1.5}
                        dot={false}
                        activeDot={{ r: 3, fill: '#dc2626' }}
                    />
                </LineChart>
            </ResponsiveContainer>
        </div>
    );
}
