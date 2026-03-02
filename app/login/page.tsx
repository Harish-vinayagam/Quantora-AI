'use client';

import { useState } from 'react';
import { Shield } from 'lucide-react';
import LoginForm from '@/components/auth/LoginForm';
import MfaForm from '@/components/auth/MfaForm';

type AuthStep = 'credentials' | 'mfa' | 'success';

export default function LoginPage() {
    const [step, setStep] = useState<AuthStep>('credentials');
    const [sessionToken, setSessionToken] = useState('');
    const [identifier, setIdentifier] = useState('');

    const handleCredentialsSuccess = (token: string, id: string) => {
        setSessionToken(token);
        setIdentifier(id);
        setStep('mfa');
    };

    const handleMfaSuccess = (_accessToken: string) => {
        setStep('success');
        // In production: store accessToken in a secure cookie / context and redirect.
        // e.g. router.push('/dashboard')
        setTimeout(() => {
            window.location.href = '/dashboard';
        }, 1800);
    };

    const handleBack = () => {
        setStep('credentials');
        setSessionToken('');
    };

    return (
        <div className="min-h-screen bg-[var(--bg)] flex flex-col items-center justify-center px-4">
            {/* Card */}
            <div className="w-full max-w-sm animate-fade-in">

                {/* Header */}
                <div className="mb-8 text-center">
                    <div className="flex items-center justify-center gap-2 mb-3">
                        <div className="w-6 h-6 bg-white rounded-sm flex items-center justify-center">
                            <div className="w-3 h-3 bg-[var(--bg)] rounded-[2px]" />
                        </div>
                        <span className="text-white font-semibold text-lg tracking-tight">Quantora</span>
                    </div>
                    <p className="text-[11px] font-mono text-[var(--text-muted)] tracking-widest uppercase">
                        Network Risk Intelligence
                    </p>
                </div>

                {/* Authentication card */}
                <div className="rounded-xl border border-[var(--border)] bg-[var(--surface)] p-7 shadow-sm">

                    {/* Step indicator title */}
                    <div className="mb-6">
                        <div className="flex items-center gap-2 mb-1">
                            <Shield size={14} strokeWidth={1.5} className="text-[var(--text-muted)]" />
                            <h1 className="text-sm font-semibold text-[var(--text-primary)]">
                                {step === 'credentials' && 'Sign In'}
                                {step === 'mfa' && 'Two-Factor Verification'}
                                {step === 'success' && 'Access Granted'}
                            </h1>
                        </div>
                        <p className="text-[10px] font-mono text-[var(--text-muted)] ml-5">
                            {step === 'credentials' && 'Enter your credentials to continue'}
                            {step === 'mfa' && 'Step 2 of 2 — Verify your identity'}
                            {step === 'success' && 'Redirecting to dashboard...'}
                        </p>
                    </div>

                    {/* Step progress dots */}
                    <div className="flex items-center gap-1.5 mb-6 ml-5">
                        {(['credentials', 'mfa'] as const).map((s, i) => (
                            <span
                                key={s}
                                className={`h-1 rounded-full transition-all duration-300 ${step === 'success' || (step === 'mfa' && i === 0) || (step === s)
                                    ? step === s || step === 'success'
                                        ? 'w-4 bg-white'
                                        : 'w-4 bg-zinc-500'
                                    : 'w-2 bg-zinc-700'
                                    }`}
                            />
                        ))}
                    </div>

                    {/* Form content */}
                    {step === 'credentials' && (
                        <LoginForm onSuccess={handleCredentialsSuccess} />
                    )}

                    {step === 'mfa' && (
                        <MfaForm
                            sessionToken={sessionToken}
                            identifier={identifier}
                            onSuccess={handleMfaSuccess}
                            onBack={handleBack}
                        />
                    )}

                    {step === 'success' && (
                        <div className="text-center py-4 space-y-3 animate-fade-in">
                            <div className="w-10 h-10 rounded-full bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center mx-auto">
                                <Shield size={18} strokeWidth={1.5} className="text-emerald-400" />
                            </div>
                            <div>
                                <p className="text-sm font-semibold text-[var(--text-primary)]">Authenticated</p>
                                <p className="text-[11px] font-mono text-[var(--text-muted)] mt-1">
                                    Redirecting to dashboard...
                                </p>
                            </div>
                            <div className="flex justify-center">
                                <span className="w-4 h-4 border-2 border-zinc-600 border-t-white rounded-full animate-spin" />
                            </div>
                        </div>
                    )}
                </div>

                {/* Security note */}
                <div className="mt-5 text-center space-y-1">
                    <div className="flex items-center justify-center gap-1.5">
                        <Shield size={10} strokeWidth={1.5} className="text-[var(--text-muted)]" />
                        <p className="text-[9px] font-mono text-[var(--text-muted)]">
                            Protected by enterprise-grade encryption
                        </p>
                    </div>
                </div>

                {/* Footer */}
                <div className="mt-4 text-center">
                    <p className="text-[9px] font-mono text-[var(--text-muted)] opacity-60">
                        Quantora © 2026 &nbsp;·&nbsp; Internal Use Only
                    </p>
                </div>
            </div>
        </div>
    );
}
