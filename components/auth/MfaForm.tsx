'use client';

import { useState, useRef, useEffect, FormEvent, KeyboardEvent } from 'react';
import { ShieldCheck, AlertCircle, RotateCcw } from 'lucide-react';
import { mockAuthService } from '@/lib/authConfig';

interface MfaFormProps {
    sessionToken: string;
    identifier: string;
    onSuccess: (accessToken: string) => void;
    onBack: () => void;
}

const CODE_LENGTH = 6;
const COUNTDOWN_SECONDS = 30;

export default function MfaForm({ sessionToken, identifier, onSuccess, onBack }: MfaFormProps) {
    const [digits, setDigits] = useState<string[]>(Array(CODE_LENGTH).fill(''));
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [countdown, setCountdown] = useState(COUNTDOWN_SECONDS);
    const [canResend, setCanResend] = useState(false);
    const inputRefs = useRef<(HTMLInputElement | null)[]>([]);

    // Auto-focus first input on mount
    useEffect(() => {
        inputRefs.current[0]?.focus();
    }, []);

    // Countdown timer
    useEffect(() => {
        if (countdown <= 0) {
            setCanResend(true);
            return;
        }
        const t = setTimeout(() => setCountdown(c => c - 1), 1000);
        return () => clearTimeout(t);
    }, [countdown]);

    const handleResend = () => {
        setDigits(Array(CODE_LENGTH).fill(''));
        setError(null);
        setCountdown(COUNTDOWN_SECONDS);
        setCanResend(false);
        inputRefs.current[0]?.focus();
    };

    const handleDigitChange = (index: number, value: string) => {
        // Accept only single digit
        const digit = value.replace(/\D/g, '').slice(-1);
        const next = [...digits];
        next[index] = digit;
        setDigits(next);
        setError(null);

        // Auto-advance
        if (digit && index < CODE_LENGTH - 1) {
            inputRefs.current[index + 1]?.focus();
        }

        // Auto-submit when complete
        if (digit && index === CODE_LENGTH - 1) {
            const code = [...next].join('');
            if (code.length === CODE_LENGTH) submitCode(code);
        }
    };

    const handleKeyDown = (index: number, e: KeyboardEvent<HTMLInputElement>) => {
        if (e.key === 'Backspace') {
            if (digits[index]) {
                const next = [...digits];
                next[index] = '';
                setDigits(next);
            } else if (index > 0) {
                inputRefs.current[index - 1]?.focus();
                const next = [...digits];
                next[index - 1] = '';
                setDigits(next);
            }
        } else if (e.key === 'ArrowLeft' && index > 0) {
            inputRefs.current[index - 1]?.focus();
        } else if (e.key === 'ArrowRight' && index < CODE_LENGTH - 1) {
            inputRefs.current[index + 1]?.focus();
        }
    };

    // Handle paste on any digit box
    const handlePaste = (e: React.ClipboardEvent) => {
        e.preventDefault();
        const pasted = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, CODE_LENGTH);
        if (!pasted) return;
        const next = Array(CODE_LENGTH).fill('');
        pasted.split('').forEach((d, i) => (next[i] = d));
        setDigits(next);
        const focusIdx = Math.min(pasted.length, CODE_LENGTH - 1);
        inputRefs.current[focusIdx]?.focus();
        if (pasted.length === CODE_LENGTH) submitCode(pasted);
    };

    const submitCode = async (code: string) => {
        setError(null);
        setLoading(true);
        try {
            const { accessToken } = await mockAuthService.verifyMfa(sessionToken, code);
            onSuccess(accessToken);
        } catch (err: unknown) {
            setError(err instanceof Error ? err.message : 'Verification failed.');
            setDigits(Array(CODE_LENGTH).fill(''));
            setTimeout(() => inputRefs.current[0]?.focus(), 50);
        } finally {
            setLoading(false);
        }
    };

    const handleSubmit = (e: FormEvent) => {
        e.preventDefault();
        const code = digits.join('');
        if (code.length < CODE_LENGTH) {
            setError('Please enter the complete 6-digit code.');
            return;
        }
        submitCode(code);
    };

    // Mask identifier for display
    const maskedId = identifier.includes('@')
        ? identifier.replace(/(.{2}).+(@.+)/, '$1••••$2')
        : identifier.replace(/(.{2}).+(.{2})$/, '$1••••$2');

    return (
        <form onSubmit={handleSubmit} className="space-y-6" noValidate>
            {/* Description */}
            <div className="space-y-1">
                <p className="text-sm text-[var(--text-secondary)] leading-relaxed">
                    Enter the 6-digit verification code sent to{' '}
                    <span className="font-mono text-[var(--text-primary)]">{maskedId}</span>
                </p>
                <p className="text-[10px] font-mono text-[var(--text-muted)]">
                    Code expires in {countdown > 0 ? `${countdown}s` : 'expired'}
                </p>
            </div>

            {/* OTP boxes */}
            <div className="flex gap-2.5 justify-center" onPaste={handlePaste}>
                {digits.map((digit, i) => (
                    <input
                        key={i}
                        ref={el => { inputRefs.current[i] = el; }}
                        type="text"
                        inputMode="numeric"
                        maxLength={1}
                        value={digit}
                        onChange={e => handleDigitChange(i, e.target.value)}
                        onKeyDown={e => handleKeyDown(i, e)}
                        disabled={loading}
                        aria-label={`Digit ${i + 1}`}
                        className={`
              w-11 h-12 text-center text-lg font-mono font-semibold rounded-md border
              bg-[var(--surface)] text-[var(--text-primary)] caret-transparent
              focus:outline-none transition-all duration-150
              disabled:opacity-50
              ${error
                                ? 'border-red-500/50 focus:border-red-500 focus:ring-1 focus:ring-red-500/20'
                                : digit
                                    ? 'border-zinc-500 focus:border-zinc-400 focus:ring-1 focus:ring-zinc-400/20'
                                    : 'border-[var(--border)] focus:border-zinc-500 focus:ring-1 focus:ring-zinc-500/20'
                            }
            `}
                    />
                ))}
            </div>

            {/* Error */}
            {error && (
                <div className="flex items-start gap-2.5 px-3 py-3 rounded-md border border-red-500/30 bg-red-500/8 animate-fade-in">
                    <AlertCircle size={14} className="text-red-400 flex-shrink-0 mt-0.5" strokeWidth={1.5} />
                    <p className="text-xs text-red-400 font-mono">{error}</p>
                </div>
            )}

            {/* Verify button */}
            <button
                type="submit"
                disabled={loading || digits.join('').length < CODE_LENGTH}
                className="w-full h-10 rounded-md bg-white text-black text-sm font-semibold tracking-tight
          hover:bg-zinc-100 active:bg-zinc-200 disabled:opacity-40 disabled:cursor-not-allowed
          transition-all duration-150 flex items-center justify-center gap-2"
            >
                {loading ? (
                    <>
                        <span className="w-3.5 h-3.5 border-2 border-black/30 border-t-black rounded-full animate-spin" />
                        Verifying...
                    </>
                ) : (
                    <>
                        <ShieldCheck size={14} strokeWidth={2} />
                        Verify Code
                    </>
                )}
            </button>

            {/* Resend + back */}
            <div className="flex items-center justify-between">
                <button
                    type="button"
                    onClick={onBack}
                    disabled={loading}
                    className="text-[11px] font-mono text-[var(--text-muted)] hover:text-[var(--text-secondary)] transition-colors duration-150 disabled:opacity-40"
                >
                    ← Change account
                </button>
                {canResend ? (
                    <button
                        type="button"
                        onClick={handleResend}
                        disabled={loading}
                        className="flex items-center gap-1 text-[11px] font-mono text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors duration-150 disabled:opacity-40"
                    >
                        <RotateCcw size={11} strokeWidth={1.5} />
                        Resend code
                    </button>
                ) : (
                    <span className="text-[11px] font-mono text-[var(--text-muted)]">
                        Resend in {countdown}s
                    </span>
                )}
            </div>
        </form>
    );
}
