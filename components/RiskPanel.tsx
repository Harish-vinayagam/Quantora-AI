'use client';

import { useEffect, useRef, useState } from 'react';
import type { RiskScore } from '@/lib/riskEngine';
import type { GraphNode } from '@/lib/mockData';

interface RiskPanelProps {
    selectedNode: GraphNode | null;
    riskScore: RiskScore;
}

const RISK_STYLES = {
    high: {
        label: 'HIGH RISK',
        barColor: 'bg-red-500',
        textColor: 'text-red-400',
        borderColor: 'border-red-500/20',
        bgColor: 'bg-red-500/8',
    },
    medium: {
        label: 'MEDIUM RISK',
        barColor: 'bg-amber-400',
        textColor: 'text-amber-400',
        borderColor: 'border-amber-500/20',
        bgColor: 'bg-amber-500/8',
    },
    low: {
        label: 'LOW RISK',
        barColor: 'bg-zinc-400',
        textColor: 'text-zinc-400',
        borderColor: 'border-zinc-600/30',
        bgColor: 'bg-zinc-800/20',
    },
};

function AnimatedBar({ percentage, risk }: { percentage: number; risk: 'high' | 'medium' | 'low' }) {
    const barRef = useRef<HTMLDivElement>(null);
    const styles = RISK_STYLES[risk];

    useEffect(() => {
        const bar = barRef.current;
        if (!bar) return;
        bar.style.width = '0%';
        requestAnimationFrame(() => {
            requestAnimationFrame(() => {
                bar.style.transition = 'width 0.8s cubic-bezier(0.4, 0, 0.2, 1)';
                bar.style.width = `${percentage}%`;
            });
        });
    }, [percentage]);

    return (
        <div className="h-1.5 w-full bg-[var(--surface)] rounded-full overflow-hidden">
            <div ref={barRef} className={`h-full rounded-full ${styles.barColor}`} style={{ width: 0 }} />
        </div>
    );
}

const EXPLANATION_ICONS: Record<string, string> = {
    'Connected to suspicious fraud cluster': '⬡',
    'Unusual transaction velocity detected': '⚡',
    'Shared device fingerprint identified': '◈',
    'Multi-hop connection to flagged entity': '⤳',
    'Rapid fund movement across accounts': '↺',
    'Circular transaction pattern detected': '⊙',
    'Indirect link to suspicious cluster': '⬡',
    'Elevated transaction frequency': '⚡',
    'Transaction amount exceeds baseline': '▲',
    'Connected to medium-risk entity': '◇',
    'No direct connections to flagged nodes': '✓',
    'Transaction patterns within normal range': '✓',
    'No shared device identifiers found': '✓',
    'Select a node on the graph to analyze its risk profile.': '◎',
};

export default function RiskPanel({ selectedNode, riskScore }: RiskPanelProps) {
    const styles = RISK_STYLES[riskScore.label];
    const [animKey, setAnimKey] = useState(0);

    useEffect(() => {
        setAnimKey(k => k + 1);
    }, [selectedNode?.id]);

    return (
        <div className="flex flex-col h-full overflow-hidden">
            {/* Header */}
            <div className="px-4 py-3 border-b border-[var(--border)] flex-shrink-0">
                <h2 className="text-xs font-semibold text-[var(--text-primary)] uppercase tracking-widest">
                    Risk Intelligence
                </h2>
                <p className="text-[10px] text-[var(--text-muted)] font-mono mt-0.5">
                    {selectedNode ? `Entity: ${selectedNode.id}` : 'No entity selected'}
                </p>
            </div>

            <div className="flex-1 overflow-y-auto p-4 space-y-5">
                {/* Risk score card */}
                <div key={animKey} className={`rounded-lg p-4 border ${styles.borderColor} ${styles.bgColor} animate-fade-in`}>
                    <div className="flex items-end justify-between mb-3">
                        <div>
                            <div className="text-3xl font-mono font-bold text-[var(--text-primary)]">
                                {riskScore.value.toFixed(2)}
                            </div>
                            <div className={`text-[10px] font-mono mt-0.5 ${styles.textColor}`}>
                                {styles.label}
                            </div>
                        </div>
                        <div className="text-right">
                            <div className={`text-2xl font-mono font-bold ${styles.textColor}`}>
                                {riskScore.percentage}%
                            </div>
                            <div className="text-[10px] font-mono text-[var(--text-muted)] mt-0.5">
                                confidence
                            </div>
                        </div>
                    </div>
                    <AnimatedBar key={animKey} percentage={riskScore.percentage} risk={riskScore.label} />
                </div>

                {/* Node metadata */}
                {selectedNode && (
                    <div className="space-y-2 animate-fade-in">
                        <h3 className="text-[10px] font-mono uppercase tracking-widest text-[var(--text-muted)]">
                            Entity Details
                        </h3>
                        <div className="space-y-1">
                            {[
                                { label: 'Account ID', value: selectedNode.id },
                                { label: 'Group', value: selectedNode.group === 'fraud-cluster' ? 'Fraud Cluster' : 'Normal' },
                                { label: 'Classification', value: selectedNode.isSuspicious ? 'Suspicious' : 'Clean' },
                            ].map(item => (
                                <div key={item.label} className="flex justify-between items-center py-1.5 border-b border-[var(--border)]">
                                    <span className="text-[11px] font-mono text-[var(--text-muted)]">{item.label}</span>
                                    <span className="text-[11px] font-mono text-[var(--text-primary)]">{item.value}</span>
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                {/* Explanations */}
                <div className="space-y-2 animate-fade-in">
                    <h3 className="text-[10px] font-mono uppercase tracking-widest text-[var(--text-muted)]">
                        Signal Analysis
                    </h3>
                    <div className="space-y-2">
                        {riskScore.explanations.map((exp, i) => (
                            <div
                                key={i}
                                className="flex items-start gap-2.5 p-2.5 rounded-md bg-[var(--surface)] border border-[var(--border)]"
                                style={{ animationDelay: `${i * 60}ms` }}
                            >
                                <span className="text-[var(--text-muted)] text-xs mt-0.5 flex-shrink-0 font-mono">
                                    {EXPLANATION_ICONS[exp] ?? '·'}
                                </span>
                                <span className="text-[11px] text-[var(--text-secondary)] leading-relaxed">
                                    {exp}
                                </span>
                            </div>
                        ))}
                    </div>
                </div>

                {/* API stub notice */}
                <div className="p-2.5 rounded-md border border-[var(--border)] bg-[var(--surface)]">
                    <p className="text-[9px] font-mono text-[var(--text-muted)] leading-relaxed">
            // API READY — Replace calculateRisk() in lib/riskEngine.ts with live endpoint
                    </p>
                </div>
            </div>
        </div>
    );
}
