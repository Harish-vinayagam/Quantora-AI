/** @type {import('next').NextConfig} */
const nextConfig = {
    // Proxy API requests to the SAGRA backend during development.
    // In production, configure this at the reverse proxy / load balancer level.
    async rewrites() {
        return [
            {
                source: '/api/sagra/:path*',
                destination: 'http://localhost:8000/:path*',
            },
        ];
    },
};

module.exports = nextConfig;
