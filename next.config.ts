// next.config.ts
import type { NextConfig } from "next";

const nextConfig: NextConfig = {
    productionBrowserSourceMaps: true, // ДОБАВЬТЕ ЭТУ СТРОКУ
    images: {
        formats: ['image/avif', 'image/webp'],
        deviceSizes: [640, 750, 828, 1080, 1200, 1920, 2048, 3840],
        imageSizes: [16, 32, 48, 64, 96, 128, 256, 384],
        minimumCacheTTL: 60,
        dangerouslyAllowSVG: true,
        remotePatterns: [
            {
                protocol: 'https',
                hostname: '*.supabase.co',
            },
            {
                protocol: 'https',
                hostname: '*.selcdn.ru',
            },
            {
                protocol: 'https',
                hostname: '*.selstorage.ru',
            },
            {
                protocol: 'https',
                hostname: '*.yandex.net',
            },
            {
                protocol: 'https',
                hostname: '*.userapi.com',
            },
            {
                protocol: 'https',
                hostname: '*.vk.com',
            },
            {
                protocol: 'https',
                hostname: 'avatars.yandex.net',
            },
        ],
    },
    compress: true,
    poweredByHeader: false,
    reactStrictMode: true,
    compiler: {
        removeConsole: process.env.NODE_ENV === 'production' ? {
            exclude: ['error', 'warn']
        } : false,
    },
    async headers() {
        return [
            {
                source: '/(.*)',
                headers: [
                    {
                        key: 'X-DNS-Prefetch-Control',
                        value: 'on'
                    },
                    {
                        key: 'X-XSS-Protection',
                        value: '1; mode=block'
                    },
                    {
                        key: 'X-Frame-Options',
                        value: 'SAMEORIGIN'
                    },
                    {
                        key: 'X-Content-Type-Options',
                        value: 'nosniff'
                    },
                    {
                        key: 'Referrer-Policy',
                        value: 'origin-when-cross-origin'
                    },
                ],
            },
        ];
    },
    experimental: {
        optimizeCss: true,
    },
};

export default nextConfig;