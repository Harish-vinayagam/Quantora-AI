import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import './globals.css';
import SimulationOverlay from '@/components/SimulationOverlay';
import { ThemeProvider } from '@/components/ThemeProvider';

const inter = Inter({ subsets: ['latin'] });

export const metadata: Metadata = {
    title: 'Quantora — Network Risk Intelligence',
    description: 'Internal fraud intelligence dashboard for real-time transaction network analysis.',
};

export default function RootLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    return (
        <html lang="en" className="dark" suppressHydrationWarning>
            <head>
                <link
                    href="https://fonts.googleapis.com/css2?family=JetBrains+Mono:wght@300;400;500&family=Inter:wght@300;400;500;600&display=swap"
                    rel="stylesheet"
                />
            </head>
            <body className={`${inter.className} antialiased`}>
                <ThemeProvider>
                    {children}
                    <SimulationOverlay />
                </ThemeProvider>
            </body>
        </html>
    );
}
