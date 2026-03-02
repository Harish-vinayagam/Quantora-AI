'use client';

import { useRouter } from 'next/navigation';
import { ArrowLeft } from 'lucide-react';

interface BackButtonProps {
    fallback?: string;
    label?: string;
}

export default function BackButton({ fallback = '/dashboard', label = 'Back' }: BackButtonProps) {
    const router = useRouter();

    const handleBack = () => {
        if (typeof window !== 'undefined' && window.history.length > 1) {
            router.back();
        } else {
            router.push(fallback);
        }
    };

    return (
        <button
            onClick={handleBack}
            className="flex items-center gap-1.5 text-[11px] font-mono text-[var(--text-muted)] hover:text-[var(--text-primary)] transition-colors duration-150"
        >
            <ArrowLeft size={12} strokeWidth={1.5} />
            {label}
        </button>
    );
}
