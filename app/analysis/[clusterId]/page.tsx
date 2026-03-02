'use client';

import { useParams } from 'next/navigation';
import Link from 'next/link';
import Sidebar from '@/components/Sidebar';
import BackButton from '@/components/ui/BackButton';
import { Shield } from 'lucide-react';

export default function ClusterAnalysisPage() {
    const params = useParams();
    const clusterId = params?.clusterId as string;

    return (
        <div className="flex h-screen overflow-hidden bg-[var(--bg)]">
            <Sidebar />
            <div className="flex-1 flex flex-col overflow-hidden">
                {/* Header */}
                <header className="h-14 flex-shrink-0 border-b border-[var(--border)] px-6 flex items-center justify-between">
                    <div className="flex items-center gap-4">
                        <BackButton />
                        <div className="w-px h-4 bg-[var(--border)]" />
                        <span className="text-xs font-semibold text-[var(--text-primary)]">
                            Cluster Analysis · <span className="font-mono text-red-400">{clusterId}</span>
                        </span>
                    </div>
                    <Link
                        href="/"
                        className="flex items-center gap-1.5 text-[10px] font-mono text-[var(--text-muted)] hover:text-[var(--text-primary)] border border-[var(--border)] hover:border-zinc-500 rounded-md px-2.5 py-1.5 transition-all duration-150"
                    >
                        <Shield size={11} strokeWidth={1.5} /> Open Risk Intelligence Graph
                    </Link>
                </header>

                {/* Body placeholder — routes to real graph page */}
                <main className="flex-1 overflow-y-auto p-6 flex items-center justify-center">
                    <div className="text-center space-y-4 max-w-sm">
                        <div className="w-12 h-12 rounded-full border border-[var(--border)] bg-[var(--surface)] flex items-center justify-center mx-auto">
                            <Shield size={20} strokeWidth={1.5} className="text-[var(--text-muted)]" />
                        </div>
                        <div>
                            <h2 className="text-sm font-semibold text-[var(--text-primary)] mb-1">
                                {clusterId} — Deep Analysis
                            </h2>
                            <p className="text-[11px] font-mono text-[var(--text-muted)] leading-relaxed">
                                This view will render the full interactive graph and intelligence panel
                                for this specific cluster. Connect to the Risk Intelligence graph or
                                your backend API to populate.
                            </p>
                        </div>
                        <Link
                            href="/"
                            className="inline-flex items-center gap-2 px-4 py-2 rounded-md bg-[var(--surface)] border border-[var(--border)] text-[11px] font-mono text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:border-zinc-500 transition-all duration-150"
                        >
                            View Risk Intelligence Graph →
                        </Link>
                    </div>
                </main>
            </div>
        </div>
    );
}
