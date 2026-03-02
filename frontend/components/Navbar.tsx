'use client';

import { Sun, Moon } from 'lucide-react';

interface NavbarProps {
    theme: 'dark' | 'light';
    onToggleTheme: () => void;
}

export default function Navbar({ theme, onToggleTheme }: NavbarProps) {
    return (
        <header className="h-14 flex items-center justify-between px-6 border-b border-[var(--border)] bg-[var(--bg)] z-50">
            {/* Left: Logo */}
            <div className="flex items-center gap-3">
                <div className="flex items-center gap-2">
                    <div className="w-6 h-6 bg-white rounded-sm flex items-center justify-center">
                        <div className="w-3 h-3 bg-[var(--bg)] rounded-[2px]" />
                    </div>
                    <span className="text-[var(--text-primary)] font-semibold text-lg tracking-tight">
                        Quantora
                    </span>
                </div>
                <span className="hidden sm:block text-[var(--text-muted)] text-xs font-mono border-l border-[var(--border)] pl-3">
                    Network Risk Intelligence
                </span>
            </div>

            {/* Right: Status + Toggle */}
            <div className="flex items-center gap-4">
                {/* System status */}
                <div className="flex items-center gap-2">
                    <span className="relative flex h-2 w-2">
                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
                        <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500" />
                    </span>
                    <span className="text-emerald-400 text-xs font-mono tracking-wide">System Active</span>
                </div>

                {/* Divider */}
                <div className="w-px h-5 bg-[var(--border)]" />

                {/* Theme toggle */}
                <button
                    onClick={onToggleTheme}
                    aria-label="Toggle theme"
                    className="relative flex items-center gap-1.5 px-2.5 py-1.5 rounded-md border border-[var(--border)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--surface)] transition-all duration-200"
                >
                    {theme === 'dark' ? (
                        <Sun size={14} strokeWidth={1.5} />
                    ) : (
                        <Moon size={14} strokeWidth={1.5} />
                    )}
                    <span className="text-xs font-mono">{theme === 'dark' ? 'Light' : 'Dark'}</span>
                </button>
            </div>
        </header>
    );
}
