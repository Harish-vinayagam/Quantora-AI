'use client';

import { useState } from 'react';
import Sidebar from '@/components/Sidebar';
import BackButton from '@/components/ui/BackButton';
import { Settings, ToggleLeft, ToggleRight } from 'lucide-react';

// ── Reusable input ───────────────────────────────────────────────────
function WeightInput({ label, description, value, onChange }: {
    label: string;
    description: string;
    value: number;
    onChange: (v: number) => void;
}) {
    return (
        <div className="flex items-center justify-between py-4 border-b border-[var(--border)] last:border-0">
            <div>
                <p className="text-[11px] font-mono text-[var(--text-primary)]">{label}</p>
                <p className="text-[9px] font-mono text-[var(--text-muted)] mt-0.5">{description}</p>
            </div>
            <div className="flex items-center gap-2">
                <input
                    type="number"
                    min={0}
                    max={1}
                    step={0.05}
                    value={value}
                    onChange={e => onChange(parseFloat(e.target.value))}
                    className="w-20 h-8 px-2 text-right text-[11px] font-mono rounded-md border border-[var(--border)] bg-[var(--bg)] text-[var(--text-primary)] focus:outline-none focus:border-zinc-500 transition-colors"
                />
            </div>
        </div>
    );
}

// ── Slider row ───────────────────────────────────────────────────────
function ThresholdSlider({ label, description, value, onChange, color }: {
    label: string;
    description: string;
    value: number;
    onChange: (v: number) => void;
    color: string;
}) {
    return (
        <div className="py-4 border-b border-[var(--border)] last:border-0">
            <div className="flex items-center justify-between mb-2">
                <div>
                    <p className="text-[11px] font-mono text-[var(--text-primary)]">{label}</p>
                    <p className="text-[9px] font-mono text-[var(--text-muted)] mt-0.5">{description}</p>
                </div>
                <span className="text-[11px] font-mono font-semibold" style={{ color }}>{value.toFixed(2)}</span>
            </div>
            <input
                type="range"
                min={0}
                max={1}
                step={0.01}
                value={value}
                onChange={e => onChange(parseFloat(e.target.value))}
                className="w-full h-1 rounded-full appearance-none bg-[var(--border)] cursor-pointer accent-white"
            />
        </div>
    );
}

// ── Toggle row ───────────────────────────────────────────────────────
function ToggleRow({ label, description, enabled, onToggle }: {
    label: string;
    description: string;
    enabled: boolean;
    onToggle: () => void;
}) {
    return (
        <div className="flex items-center justify-between py-4 border-b border-[var(--border)] last:border-0">
            <div>
                <p className="text-[11px] font-mono text-[var(--text-primary)]">{label}</p>
                <p className="text-[9px] font-mono text-[var(--text-muted)] mt-0.5">{description}</p>
            </div>
            <button
                onClick={onToggle}
                className={`flex items-center gap-1.5 text-[10px] font-mono transition-colors duration-150 ${enabled ? 'text-emerald-400' : 'text-[var(--text-muted)]'
                    }`}
                aria-label={enabled ? 'Disable' : 'Enable'}
            >
                {enabled
                    ? <ToggleRight size={22} strokeWidth={1.5} />
                    : <ToggleLeft size={22} strokeWidth={1.5} />
                }
                {enabled ? 'Enabled' : 'Disabled'}
            </button>
        </div>
    );
}

// ── Section wrapper ───────────────────────────────────────────────────
function Section({ title, children }: { title: string; children: React.ReactNode }) {
    return (
        <div className="rounded-lg border border-[var(--border)] bg-[var(--surface)] overflow-hidden">
            <div className="px-5 py-3.5 border-b border-[var(--border)]">
                <h2 className="text-[10px] font-mono uppercase tracking-widest text-[var(--text-muted)]">{title}</h2>
            </div>
            <div className="px-5">{children}</div>
        </div>
    );
}

// ── Page ─────────────────────────────────────────────────────────────
export default function SettingsPage() {
    const [txWeight, setTxWeight] = useState(0.40);
    const [behWeight, setBehWeight] = useState(0.35);
    const [graphWeight, setGraphWeight] = useState(0.25);
    const [highThresh, setHighThresh] = useState(0.75);
    const [medThresh, setMedThresh] = useState(0.45);
    const [realtime, setRealtime] = useState(true);
    const [adaptive, setAdaptive] = useState(false);
    const [saved, setSaved] = useState(false);

    const handleSave = () => {
        setSaved(true);
        setTimeout(() => setSaved(false), 2000);
    };

    return (
        <div className="flex h-screen overflow-hidden bg-[var(--bg)]">
            <Sidebar />
            <div className="flex-1 flex flex-col overflow-hidden">

                {/* Header */}
                <header className="h-14 flex-shrink-0 border-b border-[var(--border)] px-6 flex items-center justify-between">
                    <div className="flex items-center gap-4">
                        <BackButton />
                        <div className="w-px h-4 bg-[var(--border)]" />
                        <Settings size={14} strokeWidth={1.5} className="text-[var(--text-muted)]" />
                        <span className="text-xs font-semibold text-[var(--text-primary)]">System Settings</span>
                    </div>
                    <button
                        onClick={handleSave}
                        className={`h-8 px-4 rounded-md text-[11px] font-mono font-semibold transition-all duration-200 ${saved
                            ? 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/30'
                            : 'bg-white text-black hover:bg-zinc-100'
                            }`}
                    >
                        {saved ? '✓ Saved' : 'Save Changes'}
                    </button>
                </header>

                {/* Scrollable body */}
                <main className="flex-1 overflow-y-auto p-6">
                    <div className="max-w-2xl space-y-4">

                        {/* 1. Risk Configuration */}
                        <Section title="Risk Configuration">
                            <WeightInput
                                label="Transaction Risk Weight"
                                description="Weight applied to transaction pattern scoring"
                                value={txWeight}
                                onChange={setTxWeight}
                            />
                            <WeightInput
                                label="Behavioural Risk Weight"
                                description="Weight applied to entity behaviour anomaly scoring"
                                value={behWeight}
                                onChange={setBehWeight}
                            />
                            <WeightInput
                                label="Graph Risk Weight"
                                description="Weight applied to network topology risk scoring"
                                value={graphWeight}
                                onChange={setGraphWeight}
                            />
                            <div className="py-3 flex items-center gap-2">
                                <span className="text-[9px] font-mono text-[var(--text-muted)]">Total weight:</span>
                                <span className={`text-[9px] font-mono font-semibold ${Math.abs(txWeight + behWeight + graphWeight - 1) < 0.01 ? 'text-emerald-400' : 'text-amber-400'
                                    }`}>
                                    {(txWeight + behWeight + graphWeight).toFixed(2)}
                                    {Math.abs(txWeight + behWeight + graphWeight - 1) < 0.01 ? ' ✓' : ' (should sum to 1.00)'}
                                </span>
                            </div>
                        </Section>

                        {/* 2. Alert Thresholds */}
                        <Section title="Alert Thresholds">
                            <ThresholdSlider
                                label="High Risk Threshold"
                                description="Entities scoring above this trigger a High risk alert"
                                value={highThresh}
                                onChange={setHighThresh}
                                color="#dc2626"
                            />
                            <ThresholdSlider
                                label="Medium Risk Threshold"
                                description="Entities scoring above this trigger a Medium risk alert"
                                value={medThresh}
                                onChange={setMedThresh}
                                color="#d97706"
                            />
                        </Section>

                        {/* 3. System Controls */}
                        <Section title="System Controls">
                            <ToggleRow
                                label="Enable Real-Time Mode"
                                description="Stream live transaction data and update graph continuously"
                                enabled={realtime}
                                onToggle={() => setRealtime(v => !v)}
                            />
                            <ToggleRow
                                label="Enable Adaptive Threshold"
                                description="Automatically adjust risk thresholds based on daily patterns"
                                enabled={adaptive}
                                onToggle={() => setAdaptive(v => !v)}
                            />
                        </Section>

                        {/* API stub note */}
                        <div className="px-4 py-3 rounded-md border border-[var(--border)] bg-[var(--surface)]">
                            <p className="text-[9px] font-mono text-[var(--text-muted)] leading-relaxed">
                // UI ONLY — Connect Save Changes to your config API endpoint to persist settings
                            </p>
                        </div>
                    </div>
                </main>
            </div>
        </div>
    );
}
