'use client';

// Root route — redirects to /dashboard (if authenticated) or /login.
// The middleware.ts handles actual enforcement; this is just a clean
// client-side redirect so the root "/" URL never shows blank content.

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function RootPage() {
    const router = useRouter();

    useEffect(() => {
        // Check for the auth token in localStorage (set by loginUser in api.ts)
        const token =
            typeof window !== 'undefined'
                ? localStorage.getItem('quantora_token')
                : null;

        if (token) {
            router.replace('/dashboard');
        } else {
            router.replace('/login');
        }
    }, [router]);

    // Brief blank screen while redirect happens; middleware will catch
    // any edge case before the client render even finishes.
    return null;
}
