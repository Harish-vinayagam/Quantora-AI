'use client';

import { useState, useRef, FormEvent } from 'react';
import { Eye, EyeOff, Lock, AlertCircle } from 'lucide-react';
import { mockAuthService } from '@/lib/authConfig';

interface LoginFormProps {
    onSuccess: (sessionToken: string, identifier: string) => void;
}

export default function LoginForm({ onSuccess }: LoginFormProps) {
    const [identifier, setIdentifier] = useState('');
    const [password, setPassword] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const handleSubmit = async (e: FormEvent) => {
        e.preventDefault();
        setError(null);

        if (!identifier.trim()) {
            setError('Email or Employee ID is required.');
            return;
        }
        if (password.length < 4) {
            setError('Password must be at least 4 characters.');
            return;
        }

        setLoading(true);
        try {
            const { sessionToken } = await mockAuthService.login(identifier, password);
            onSuccess(sessionToken, identifier);
        } catch (err: unknown) {
            setError(err instanceof Error ? err.message : 'Authentication failed.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <form onSubmit={handleSubmit} className="space-y-5" noValidate>
            {/* Error banner */}
            {error && (
                <div className="flex items-start gap-2.5 px-3 py-3 rounded-md border border-red-500/30 bg-red-500/8 animate-fade-in">
                    <AlertCircle size={14} className="text-red-400 flex-shrink-0 mt-0.5" strokeWidth={1.5} />
                    <p className="text-xs text-red-400 font-mono leading-relaxed">{error}</p>
                </div>
            )}

            {/* Identifier field */}
            <div className="space-y-1.5">
                <label htmlFor="identifier" className="text-[11px] font-mono uppercase tracking-widest text-[var(--text-muted)]">
                    Email or Employee ID
                </label>
                <input
                    id="identifier"
                    type="text"
                    autoComplete="username"
                    autoFocus
                    value={identifier}
                    onChange={e => setIdentifier(e.target.value)}
                    placeholder="name@quantora.com"
                    className="w-full h-10 px-3 rounded-md border border-[var(--border)] bg-[var(--surface)] text-[var(--text-primary)] placeholder-[var(--text-muted)] text-sm font-mono 
            focus:outline-none focus:border-zinc-500 focus:ring-1 focus:ring-zinc-500/30 transition-all duration-150"
                    disabled={loading}
                />
            </div>

            {/* Password field */}
            <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                    <label htmlFor="password" className="text-[11px] font-mono uppercase tracking-widest text-[var(--text-muted)]">
                        Password
                    </label>
                    <button
                        type="button"
                        tabIndex={-1}
                        className="text-[10px] font-mono text-[var(--text-muted)] hover:text-[var(--text-secondary)] transition-colors duration-150"
                        onClick={() => { }}
                    >
                        Forgot password?
                    </button>
                </div>
                <div className="relative">
                    <input
                        id="password"
                        type={showPassword ? 'text' : 'password'}
                        autoComplete="current-password"
                        value={password}
                        onChange={e => setPassword(e.target.value)}
                        placeholder="••••••••"
                        className="w-full h-10 px-3 pr-10 rounded-md border border-[var(--border)] bg-[var(--surface)] text-[var(--text-primary)] placeholder-[var(--text-muted)] text-sm font-mono 
              focus:outline-none focus:border-zinc-500 focus:ring-1 focus:ring-zinc-500/30 transition-all duration-150"
                        disabled={loading}
                    />
                    <button
                        type="button"
                        tabIndex={-1}
                        onClick={() => setShowPassword(v => !v)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-[var(--text-muted)] hover:text-[var(--text-secondary)] transition-colors duration-150"
                        aria-label={showPassword ? 'Hide password' : 'Show password'}
                    >
                        {showPassword ? <EyeOff size={14} strokeWidth={1.5} /> : <Eye size={14} strokeWidth={1.5} />}
                    </button>
                </div>
            </div>

            {/* Submit */}
            <button
                type="submit"
                disabled={loading}
                className="w-full h-10 rounded-md bg-white text-black text-sm font-semibold tracking-tight
          hover:bg-zinc-100 active:bg-zinc-200 disabled:opacity-50 disabled:cursor-not-allowed
          transition-all duration-150 flex items-center justify-center gap-2"
            >
                {loading ? (
                    <>
                        <span className="w-3.5 h-3.5 border-2 border-black/30 border-t-black rounded-full animate-spin" />
                        Verifying...
                    </>
                ) : (
                    <>
                        <Lock size={13} strokeWidth={2} />
                        Sign In
                    </>
                )}
            </button>
        </form>
    );
}
