/** @type {import('tailwindcss').Config} */
module.exports = {
    darkMode: 'class',
    content: [
        './app/**/*.{js,ts,jsx,tsx,mdx}',
        './components/**/*.{js,ts,jsx,tsx,mdx}',
    ],
    theme: {
        extend: {
            colors: {
                background: 'var(--bg)',
                surface: 'var(--surface)',
                border: 'var(--border)',
                text: {
                    primary: 'var(--text-primary)',
                    secondary: 'var(--text-secondary)',
                    muted: 'var(--text-muted)',
                },
                risk: {
                    low: '#6b7280',
                    medium: '#d97706',
                    high: '#dc2626',
                },
                accent: '#e2e8f0',
            },
            fontFamily: {
                sans: ['Inter', 'system-ui', 'sans-serif'],
                mono: ['JetBrains Mono', 'Fira Code', 'monospace'],
            },
            animation: {
                'slide-in': 'slideIn 0.3s ease-out',
                'pulse-risk': 'pulseRisk 2s cubic-bezier(0.4, 0, 0.6, 1) infinite',
                'bar-fill': 'barFill 0.8s ease-out forwards',
                'fade-in': 'fadeIn 0.2s ease-out',
            },
            keyframes: {
                slideIn: {
                    '0%': { transform: 'translateX(-100%)', opacity: '0' },
                    '100%': { transform: 'translateX(0)', opacity: '1' },
                },
                pulseRisk: {
                    '0%, 100%': { opacity: '1' },
                    '50%': { opacity: '0.4' },
                },
                barFill: {
                    '0%': { width: '0%' },
                    '100%': { width: 'var(--bar-width)' },
                },
                fadeIn: {
                    '0%': { opacity: '0', transform: 'translateY(4px)' },
                    '100%': { opacity: '1', transform: 'translateY(0)' },
                },
            },
        },
    },
    plugins: [],
};
