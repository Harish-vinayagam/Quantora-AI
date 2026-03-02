'use client';

import { useEffect, useRef, useCallback } from 'react';
import type { Transaction } from '@/lib/mockData';

interface TransactionFeedProps {
    transactions: Transaction[];
}

const RISK_CONFIG = {
    high: {
        badge: 'bg-red-500/15 text-red-400 border border-red-500/30',
        dot: 'bg-red-500',
        label: 'High',
    },
    medium: {
        badge: 'bg-amber-500/15 text-amber-400 border border-amber-500/30',
        dot: 'bg-amber-400',
        label: 'Medium',
    },
    low: {
        badge: 'bg-zinc-700/50 text-zinc-400 border border-zinc-600/30',
        dot: 'bg-zinc-500',
        label: 'Low',
    },
};

function formatTime(date: Date): string {
    return date.toLocaleTimeString('en-US', {
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
        hour12: false,
    });
}

function formatAmount(amount: number): string {
    return new Intl.NumberFormat('en-IN', {
        style: 'currency',
        currency: 'INR',
        minimumFractionDigits: 0,
        maximumFractionDigits: 0,
    }).format(amount);
}

function TransactionRow({ tx, isNew }: { tx: Transaction; isNew: boolean }) {
    const cfg = RISK_CONFIG[tx.risk];

    return (
        <div
            className={`p-3 border-b border-[var(--border)] transition-all duration-200 ${isNew ? 'animate-slide-in' : ''
                } hover:bg-[var(--surface)] cursor-default`}
        >
            {/* Top row: IDs + badge */}
            <div className="flex items-center justify-between mb-1.5">
                <div className="flex items-center gap-1.5 text-xs font-mono text-[var(--text-primary)]">
                    <span>{tx.senderId}</span>
                    <span className="text-[var(--text-muted)]">→</span>
                    <span>{tx.receiverId}</span>
                </div>
                <span className={`text-[10px] font-mono px-1.5 py-0.5 rounded-sm flex items-center gap-1 ${cfg.badge}`}>
                    <span className={`w-1 h-1 rounded-full ${cfg.dot}`} />
                    {cfg.label}
                </span>
            </div>

            {/* Bottom row: amount + time */}
            <div className="flex items-center justify-between">
                <span className="text-sm font-mono font-semibold text-[var(--text-primary)]">
                    {formatAmount(tx.amount)}
                </span>
                <span className="text-[10px] font-mono text-[var(--text-muted)]">
                    {formatTime(tx.timestamp)}
                </span>
            </div>
        </div>
    );
}

export default function TransactionFeed({ transactions }: TransactionFeedProps) {
    const scrollRef = useRef<HTMLDivElement>(null);
    const prevLengthRef = useRef(transactions.length);

    useEffect(() => {
        if (transactions.length > prevLengthRef.current && scrollRef.current) {
            scrollRef.current.scrollTo({ top: 0, behavior: 'smooth' });
        }
        prevLengthRef.current = transactions.length;
    }, [transactions.length]);

    return (
        <div className="flex flex-col h-full overflow-hidden">
            {/* Column header */}
            <div className="px-4 py-3 border-b border-[var(--border)] flex items-center justify-between flex-shrink-0">
                <div>
                    <h2 className="text-xs font-semibold text-[var(--text-primary)] uppercase tracking-widest">
                        Live Transactions
                    </h2>
                    <p className="text-[10px] text-[var(--text-muted)] font-mono mt-0.5">
                        Updates every 3s
                    </p>
                </div>
                <div className="flex items-center gap-1.5">
                    <span className="relative flex h-1.5 w-1.5">
                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
                        <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-emerald-500" />
                    </span>
                    <span className="text-[10px] font-mono text-emerald-400">Live</span>
                </div>
            </div>

            {/* Scrollable list */}
            <div ref={scrollRef} className="flex-1 overflow-y-auto overscroll-contain scrollbar-hide">
                {transactions.map((tx, i) => (
                    <TransactionRow key={tx.id} tx={tx} isNew={i === 0} />
                ))}
            </div>

            {/* Count footer */}
            <div className="px-4 py-2 border-t border-[var(--border)] flex-shrink-0">
                <span className="text-[10px] font-mono text-[var(--text-muted)]">
                    {transactions.length} transactions
                </span>
            </div>
        </div>
    );
}
