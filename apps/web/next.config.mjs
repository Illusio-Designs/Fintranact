/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  env: {
    // Mock mode is ON by default so the app displays with no backend (Vercel demo).
    // Set NEXT_PUBLIC_USE_MOCK=false and NEXT_PUBLIC_API_URL to use the real API.
    NEXT_PUBLIC_USE_MOCK: process.env.NEXT_PUBLIC_USE_MOCK ?? 'true',
    NEXT_PUBLIC_API_URL: process.env.NEXT_PUBLIC_API_URL ?? '',
  },
};

export default nextConfig;
