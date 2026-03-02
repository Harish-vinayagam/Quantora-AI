'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { LayoutDashboard, Network, Bell, Settings } from 'lucide-react';

const NAV_ITEMS = [
    { label: 'Dashboard', href: '/dashboard', icon: LayoutDashboard },
    { label: 'Risk Intelligence', href: '/', icon: Network },
    { label: 'Alerts', href: '/alerts', icon: Bell },
    { label: 'Settings', href: '/settings', icon: Settings },
];

export default function Sidebar() {
    const pathname = usePathname();

    function isActive(href: string) {
        if (href === '/') return pathname === '/';
        return pathname === href || pathname?.startsWith(href + '/');
    }

    return (
        <aside className="w-52 flex-shrink-0 h-full border-r border-[var(--border)] bg-[var(--bg)] flex flex-col">
            {/* Logo */}
            <Link href="/" className="h-14 flex items-center gap-2.5 px-4 border-b border-[var(--border)] hover:bg-[var(--surface)] transition-colors duration-150">
                <div className="w-6 h-6 bg-white rounded-sm flex items-center justify-center flex-shrink-0">
                    <div className="w-3 h-3 bg-[var(--bg)] rounded-[2px]" />
                </div>
                <span className="text-[var(--text-primary)] font-semibold text-sm tracking-tight">Quantora</span>
            </Link>

            {/* Nav */}
            <nav className="flex-1 py-3 px-2 space-y-0.5">
                {NAV_ITEMS.map(({ label, href, icon: Icon }) => {
                    const active = isActive(href);
                    return (
                        <Link
                            key={href}
                            href={href}
                            className={`relative flex items-center gap-2.5 px-3 py-2 rounded-md text-[11px] font-mono transition-all duration-150 ${active
                                ? 'bg-[var(--surface)] text-[var(--text-primary)] font-semibold border border-[var(--border)]'
                                : 'text-[var(--text-muted)] hover:text-[var(--text-secondary)] hover:bg-[var(--surface)] border border-transparent'
                                }`}
                        >
                            {/* Accent left bar */}
                            {active && (
                                <span className="absolute left-0 top-1/2 -translate-y-1/2 w-0.5 h-4 bg-white rounded-full" />
                            )}
                            <Icon size={13} strokeWidth={active ? 2 : 1.5} />
                            {label}
                        </Link>
                    );
                })}
            </nav>

            {/* Footer */}
            <div className="px-4 py-3 border-t border-[var(--border)]">
                <p className="text-[9px] font-mono text-[var(--text-muted)] opacity-60">
                    Quantora © 2026 · Internal
                </p>
            </div>
        </aside>
    );
}
