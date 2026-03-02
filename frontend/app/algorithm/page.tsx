'use client';

import Sidebar from '@/components/Sidebar';
import BackButton from '@/components/ui/BackButton';
import { Brain, Layers, Activity, GitBranch, Zap, Shield } from 'lucide-react';

// ── Section wrapper ──
function Section({ title, icon: Icon, children }: { title: string; icon: React.ElementType; children: React.ReactNode }) {
    return (
        <div className="rounded-lg border border-[var(--border)] bg-[var(--surface)] overflow-hidden">
            <div className="px-5 py-3.5 border-b border-[var(--border)] flex items-center gap-2.5">
                <Icon size={13} strokeWidth={1.5} className="text-[var(--text-secondary)]" />
                <h2 className="text-[11px] font-mono font-semibold text-[var(--text-primary)] uppercase tracking-wide">{title}</h2>
            </div>
            <div className="p-5">{children}</div>
        </div>
    );
}

// ── Formula block ──
function Formula({ label, formula, color }: { label: string; formula: string; color: string }) {
    return (
        <div className="flex items-start gap-3 py-3 border-b border-[var(--border)] last:border-0">
            <span className={`flex-shrink-0 w-8 h-8 rounded-md flex items-center justify-center text-[10px] font-mono font-bold ${color}`}>
                {label}
            </span>
            <code className="text-[12px] font-mono text-[var(--text-primary)] leading-relaxed pt-1.5">{formula}</code>
        </div>
    );
}

// ── Explanation card ──
function ExplainCard({ title, icon: Icon, description, accent }: {
    title: string; icon: React.ElementType; description: string; accent: string;
}) {
    return (
        <div className="rounded-lg border border-[var(--border)] bg-[var(--bg)] p-4 hover:border-zinc-600 transition-all duration-200">
            <div className="flex items-center gap-2 mb-2.5">
                <div className={`w-6 h-6 rounded-md flex items-center justify-center ${accent}`}>
                    <Icon size={12} strokeWidth={1.5} />
                </div>
                <h4 className="text-[11px] font-mono font-semibold text-[var(--text-primary)]">{title}</h4>
            </div>
            <p className="text-[10px] font-mono text-[var(--text-secondary)] leading-relaxed">{description}</p>
        </div>
    );
}

export default function AlgorithmPage() {
    return (
        <div className="flex h-screen overflow-hidden bg-[var(--bg)]">
            <Sidebar />
            <div className="flex-1 flex flex-col overflow-hidden">

                {/* Header */}
                <header className="h-14 flex-shrink-0 border-b border-[var(--border)] px-6 flex items-center justify-between">
                    <div className="flex items-center gap-4">
                        <BackButton />
                        <div className="w-px h-4 bg-[var(--border)]" />
                        <Brain size={14} strokeWidth={1.5} className="text-[var(--text-secondary)]" />
                        <span className="text-xs font-semibold text-[var(--text-primary)]">Algorithm</span>
                        <span className="text-[10px] font-mono text-[var(--text-muted)]">· SAGRA Documentation</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                        <span className="text-[9px] font-mono px-2 py-0.5 rounded-sm bg-emerald-500/10 border border-emerald-500/25 text-emerald-400">
                            v1.0 · Production
                        </span>
                    </div>
                </header>

                {/* Content */}
                <main className="flex-1 overflow-y-auto p-6 space-y-5">

                    {/* ── What is Sentinel? ── */}
                    <Section title="What is Sentinel?" icon={Shield}>
                        <p className="text-[11px] font-mono text-[var(--text-secondary)] leading-relaxed mb-4">
                            <span className="text-[var(--text-primary)] font-semibold">SAGRA</span> (Sentinel Adaptive Graph Risk Algorithm) is a graph-native
                            adaptive fraud scoring engine powering Quantora AI. It combines transactional, topological, and network density
                            signals into a single deterministic risk score for every transaction in real time.
                        </p>
                        <p className="text-[11px] font-mono text-[var(--text-secondary)] leading-relaxed mb-4">
                            Unlike traditional rule-based or row-level ML systems, SAGRA analyzes the <span className="text-[var(--text-primary)]">structural context</span> of
                            each transaction within the broader financial network — detecting coordinated fraud rings, fan-out attacks,
                            and layering schemes that single-transaction models miss entirely.
                        </p>
                        <div className="mt-4 p-3 rounded-md bg-[var(--bg)] border border-[var(--border)]">
                            <p className="text-[9px] font-mono text-[var(--text-muted)] uppercase tracking-widest mb-1">Research Lineage</p>
                            <p className="text-[10px] font-mono text-[var(--text-secondary)]">
                                Prototyped & validated in <span className="text-[var(--text-primary)]">&quot;SAGRA — Sentinel Adaptive Graph Risk Algorithm.ipynb&quot;</span> →
                                Migrated to production backend (FastAPI + NetworkX).
                            </p>
                        </div>
                    </Section>

                    {/* ── Risk Formula ── */}
                    <Section title="Risk Formula" icon={Layers}>
                        <p className="text-[10px] font-mono text-[var(--text-muted)] mb-4">
                            SAGRA computes four components per transaction, aggregated via weighted combination.
                        </p>
                        <div className="rounded-md border border-[var(--border)] bg-[var(--bg)] px-5 py-2">
                            <Formula
                                label="TRS"
                                formula="TRS = min(amount / 10000, 1)"
                                color="bg-blue-500/10 text-blue-400"
                            />
                            <Formula
                                label="GRS"
                                formula="GRS = min(sender_degree × 5, 1)"
                                color="bg-purple-500/10 text-purple-400"
                            />
                            <Formula
                                label="NDB"
                                formula="NDB = 0.3  if sender_degree > 0.05  else 0"
                                color="bg-amber-500/10 text-amber-400"
                            />
                            <Formula
                                label="FRS"
                                formula="FRS = 0.5 × TRS  +  0.3 × GRS  +  0.2 × NDB"
                                color="bg-red-500/10 text-red-400"
                            />
                        </div>

                        <div className="mt-4 flex items-center gap-3 p-3 rounded-md bg-[var(--bg)] border border-[var(--border)]">
                            <div className="text-[10px] font-mono text-[var(--text-muted)]">Decision Boundary →</div>
                            <code className="text-[11px] font-mono text-[var(--text-primary)]">
                                FRS &gt; 0.7 → <span className="text-red-400 font-semibold">FRAUD</span>
                            </code>
                            <span className="text-[var(--text-muted)]">|</span>
                            <code className="text-[11px] font-mono text-[var(--text-primary)]">
                                FRS ≤ 0.7 → <span className="text-emerald-400 font-semibold">SAFE</span>
                            </code>
                        </div>
                    </Section>

                    {/* ── Component Explanations ── */}
                    <Section title="Risk Components" icon={Activity}>
                        <div className="grid grid-cols-1 xl:grid-cols-2 gap-3">
                            <ExplainCard
                                title="Transaction Risk (TRS)"
                                icon={Activity}
                                accent="bg-blue-500/10 text-blue-400"
                                description="Normalizes transaction amount to [0,1]. Amounts approaching $10,000 carry maximum monetary risk due to regulatory reporting thresholds (BSA/AML). This is the strongest individual predictor, weighted at 50%."
                            />
                            <ExplainCard
                                title="Graph Risk (GRS)"
                                icon={GitBranch}
                                accent="bg-purple-500/10 text-purple-400"
                                description="Converts sender degree centrality into a risk signal. High-degree senders are statistically more likely to be involved in fan-out attacks, money mule networks, or layering schemes. Amplified by 5× to flag hub nodes early."
                            />
                            <ExplainCard
                                title="Network Density Boost (NDB)"
                                icon={Zap}
                                accent="bg-amber-500/10 text-amber-400"
                                description="Activates a +0.3 risk boost when sender connectivity exceeds a minimum threshold (degree > 0.05). This makes SAGRA adaptive — nodes becoming increasingly connected receive automatic risk escalation, catching 'smurfing' patterns."
                            />
                            <ExplainCard
                                title="Adaptive Thresholding"
                                icon={Shield}
                                accent="bg-emerald-500/10 text-emerald-400"
                                description="The NDB threshold (0.05) can be dynamically tuned per customer segment, time-of-day, or via online learning feedback loops. The decision boundary (0.7) and component weights can be optimized via grid search or Bayesian optimization."
                            />
                        </div>
                    </Section>

                    {/* ── Architecture Note ── */}
                    <div className="rounded-lg border border-[var(--border)] bg-[var(--surface)] p-5">
                        <p className="text-[9px] font-mono uppercase tracking-widest text-[var(--text-muted)] mb-3">Pipeline Architecture</p>
                        <div className="flex flex-wrap items-center gap-2 text-[10px] font-mono">
                            {['Transaction Event', 'Graph Update', 'Centrality Extraction', 'SAGRA Scoring', 'Fraud Decision'].map((step, i) => (
                                <span key={step} className="flex items-center gap-2">
                                    <span className="px-2.5 py-1 rounded-md bg-[var(--bg)] border border-[var(--border)] text-[var(--text-secondary)]">
                                        {step}
                                    </span>
                                    {i < 4 && <span className="text-[var(--text-muted)]">→</span>}
                                </span>
                            ))}
                        </div>
                    </div>

                </main>
            </div>
        </div>
    );
}
