'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { loginUser } from '@/lib/api';
import { Eye, EyeOff, ArrowRight, AlertCircle, Activity } from 'lucide-react';

export default function LoginPage() {
    const router = useRouter();
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');
        setLoading(true);

        try {
            await loginUser(email, password);
            router.push('/dashboard');
        } catch (err: unknown) {
            setError(err instanceof Error ? err.message : 'Authentication failed');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen bg-[var(--bg)] flex items-center justify-center p-4">
            {/* Subtle grid background */}
            <div className="fixed inset-0 pointer-events-none opacity-[0.02]"
                style={{
                    backgroundImage: `linear-gradient(var(--border) 1px, transparent 1px), linear-gradient(90deg, var(--border) 1px, transparent 1px)`,
                    backgroundSize: '40px 40px',
                }}
            />

            <div className="w-full max-w-sm relative z-10">
                {/* Logo — matches Sidebar Quantora branding */}
                <div className="flex items-center justify-center gap-3 mb-10">
                    <div className="w-8 h-8 bg-white rounded-sm flex items-center justify-center flex-shrink-0">
                        <div className="w-4 h-4 bg-[var(--bg)] rounded-[2px]" />
                    </div>
                    <div>
                        <span className="text-[var(--text-primary)] font-semibold text-base tracking-tight">Quantora</span>
                        <span className="text-[9px] font-mono text-[var(--text-muted)] ml-2 uppercase tracking-widest">v3.0</span>
                    </div>
                </div>

                {/* Card */}
                <div className="bg-[var(--surface)] border border-[var(--border)] rounded-lg p-6">
                    {/* Header */}
                    <div className="flex items-center justify-between mb-6">
                        <div>
                            <h2 className="text-xs font-semibold text-[var(--text-primary)] uppercase tracking-widest">
                                Sign In
                            </h2>
                            <p className="text-[10px] font-mono text-[var(--text-muted)] mt-0.5">
                                Enterprise Fraud Intelligence Platform
                            </p>
                        </div>
                        <div className="flex items-center gap-1.5">
                            <span className="relative flex h-1.5 w-1.5">
                                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
                                <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-emerald-500" />
                            </span>
                            <span className="text-[9px] font-mono text-emerald-400">Online</span>
                        </div>
                    </div>

                    {error && (
                        <div className="flex items-center gap-2 p-2.5 rounded-md bg-red-500/10 border border-red-500/20 text-red-400 text-[11px] font-mono mb-4">
                            <AlertCircle className="w-3.5 h-3.5 flex-shrink-0" />
                            {error}
                        </div>
                    )}

                    <form onSubmit={handleSubmit} className="space-y-3">
                        <div>
                            <label className="block text-[9px] font-mono uppercase tracking-widest text-[var(--text-muted)] mb-1.5">Email</label>
                            <input
                                type="email"
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                placeholder="admin@quantora.ai"
                                className="w-full px-3 py-2 bg-[var(--bg)] border border-[var(--border)] rounded-md text-[12px] font-mono text-[var(--text-primary)] placeholder-[var(--text-muted)] focus:outline-none focus:border-zinc-500 transition-colors"
                                required
                            />
                        </div>

                        <div>
                            <label className="block text-[9px] font-mono uppercase tracking-widest text-[var(--text-muted)] mb-1.5">Password</label>
                            <div className="relative">
                                <input
                                    type={showPassword ? 'text' : 'password'}
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                    placeholder="••••••••"
                                    className="w-full px-3 py-2 pr-9 bg-[var(--bg)] border border-[var(--border)] rounded-md text-[12px] font-mono text-[var(--text-primary)] placeholder-[var(--text-muted)] focus:outline-none focus:border-zinc-500 transition-colors"
                                    required
                                    minLength={6}
                                />
                                <button
                                    type="button"
                                    onClick={() => setShowPassword(!showPassword)}
                                    className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[var(--text-muted)] hover:text-[var(--text-primary)] transition-colors"
                                >
                                    {showPassword ? <EyeOff size={13} /> : <Eye size={13} />}
                                </button>
                            </div>
                        </div>

                        <button
                            type="submit"
                            disabled={loading}
                            className="w-full flex items-center justify-center gap-2 px-4 py-2.5 mt-2 bg-white text-[var(--bg)] rounded-md text-[11px] font-mono font-semibold uppercase tracking-widest hover:bg-zinc-200 disabled:opacity-40 disabled:cursor-not-allowed transition-all duration-150"
                        >
                            {loading ? (
                                <div className="w-3.5 h-3.5 border-2 border-[var(--bg)]/30 border-t-[var(--bg)] rounded-full animate-spin" />
                            ) : (
                                <>
                                    Authenticate
                                    <ArrowRight size={12} strokeWidth={2} />
                                </>
                            )}
                        </button>
                    </form>

                    {/* Credential hint */}
                    <div className="mt-5 pt-4 border-t border-[var(--border)]">
                        <p className="text-[9px] font-mono text-[var(--text-muted)] uppercase tracking-widest mb-2">Authorized Credentials</p>
                        <div className="space-y-1.5">
                            <div className="flex items-center justify-between text-[10px] font-mono text-[var(--text-secondary)]">
                                <span className="text-amber-400/80">Admin</span>
                                <span>admin@quantora.ai</span>
                            </div>
                            <div className="flex items-center justify-between text-[10px] font-mono text-[var(--text-secondary)]">
                                <span className="text-blue-400/80">Analyst</span>
                                <span>analyst@quantora.ai</span>
                            </div>
                            <p className="text-[9px] font-mono text-[var(--text-muted)] mt-1">
                                Password: quantora2024
                            </p>
                        </div>
                    </div>
                </div>

                {/* Footer info */}
                <div className="mt-6 flex items-center justify-center gap-4">
                    <div className="flex items-center gap-1.5">
                        <Activity size={10} className="text-[var(--text-muted)]" />
                        <span className="text-[9px] font-mono text-[var(--text-muted)]">SAGRA v2.0</span>
                    </div>
                    <div className="w-px h-3 bg-[var(--border)]" />
                    <span className="text-[9px] font-mono text-[var(--text-muted)]">Sentinel Adaptive Graph Risk Algorithm</span>
                </div>
            </div>
        </div>
    );
}
