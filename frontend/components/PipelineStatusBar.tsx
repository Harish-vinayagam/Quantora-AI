'use client';

import { useState, useEffect } from 'react';
import { Activity, Database, Network, BarChart3, CheckCircle2, Zap } from 'lucide-react';
import { fetchHealth } from '@/lib/api';

export default function PipelineStatusBar() {
    const [health, setHealth] = useState<Record<string, unknown> | null>(null);

    useEffect(() => {
        const load = async () => {
            try {
                const h = await fetchHealth();
                setHealth(h);
            } catch { /* quiet */ }
        };
        load();
        const interval = setInterval(load, 6000);
        return () => clearInterval(interval);
    }, []);

    if (!health) return null;

    const stages = [
        { name: 'Data Input', status: 'active', icon: Activity, color: '#22c55e' },
        { name: 'SAGRA Engine', status: 'processing', icon: Database, color: '#3b82f6' },
        { name: 'Graph Engine', status: 'active', icon: Network, color: '#8b5cf6' },
        { name: 'Dashboard', status: 'serving', icon: BarChart3, color: '#22c55e' },
    ];

    return (
        <div className="w-full border-b border-[var(--border)] bg-[var(--surface)]">
            <div className="flex items-center justify-between px-4 py-2">
                <div className="flex items-center gap-1">
                    {stages.map((stage, i) => (
                        <div key={stage.name} className="flex items-center gap-1">
                            {i > 0 && (
                                <div className="flex items-center gap-0.5 px-1">
                                    <div className="w-4 h-px" style={{ backgroundColor: stage.color, opacity: 0.5 }} />
                                    <Zap size={8} style={{ color: stage.color }} />
                                    <div className="w-4 h-px" style={{ backgroundColor: stage.color, opacity: 0.5 }} />
                                </div>
                            )}
                            <div
                                className="flex items-center gap-1.5 px-2 py-1 rounded border"
                                style={{ borderColor: `${stage.color}30`, backgroundColor: `${stage.color}08` }}
                            >
                                <stage.icon size={10} style={{ color: stage.color }} />
                                <span className="text-[9px] font-mono text-[var(--text-secondary)]">
                                    {stage.name}
                                </span>
                                <CheckCircle2 size={8} style={{ color: stage.color }} />
                            </div>
                        </div>
                    ))}
                </div>

                <div className="flex items-center gap-3">
                    <div className="flex items-center gap-1">
                        <span className="text-[8px] font-mono text-[var(--text-muted)] uppercase">Txns</span>
                        <span className="text-[9px] font-mono text-[var(--text-secondary)]">
                            {String(health.transactions_stored || 0)}
                        </span>
                    </div>
                    <div className="flex items-center gap-1">
                        <span className="text-[8px] font-mono text-[var(--text-muted)] uppercase">Nodes</span>
                        <span className="text-[9px] font-mono text-[var(--text-secondary)]">
                            {String(health.graph_nodes || 0)}
                        </span>
                    </div>
                    <div className="flex items-center gap-1">
                        <span className="text-[8px] font-mono text-[var(--text-muted)] uppercase">Alerts</span>
                        <span className="text-[9px] font-mono text-[var(--text-secondary)]">
                            {String(health.active_alerts || 0)}
                        </span>
                    </div>
                    <div className="flex items-center gap-1">
                        <span className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse" />
                        <span className="text-[9px] font-mono text-green-400">
                            {String(health.status || 'UNKNOWN').toUpperCase()}
                        </span>
                    </div>
                </div>
            </div>
        </div>
    );
}
