// middleware.ts  — Next.js Edge Middleware for route protection
// Runs on the server/edge before any page is rendered.
// Because localStorage is client-only, we rely on a lightweight
// httpOnly cookie ("quantora_token") that mirrors the localStorage token.
// The login page must set this cookie on successful auth.

import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

// Routes that do NOT require authentication
const PUBLIC_ROUTES = ['/login'];

// Routes that should redirect an already-authenticated user away (e.g. login)
const AUTH_ROUTES = ['/login'];

export function middleware(request: NextRequest) {
    const { pathname } = request.nextUrl;

    // Retrieve auth token from cookie (set by login page)
    const token = request.cookies.get('quantora_token')?.value;
    const isAuthenticated = !!token;

    // Allow public assets and Next.js internals through
    if (
        pathname.startsWith('/_next') ||
        pathname.startsWith('/api') ||
        pathname.startsWith('/icon') ||
        pathname.includes('.')
    ) {
        return NextResponse.next();
    }

    // If unauthenticated and trying to access a protected route → redirect to /login
    if (!isAuthenticated && !PUBLIC_ROUTES.includes(pathname)) {
        const loginUrl = new URL('/login', request.url);
        loginUrl.searchParams.set('from', pathname); // preserve intended destination
        return NextResponse.redirect(loginUrl);
    }

    // If already authenticated and trying to visit /login → redirect to /dashboard
    if (isAuthenticated && AUTH_ROUTES.includes(pathname)) {
        return NextResponse.redirect(new URL('/dashboard', request.url));
    }

    return NextResponse.next();
}

export const config = {
    // Match all routes except static files
    matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
};
