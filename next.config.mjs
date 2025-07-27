/** @type {import('next').NextConfig} */
import withPWA from 'next-pwa';

const pwaConfig = {
  dest: 'public',
  register: true,
  skipWaiting: true,
  disable: process.env.NODE_ENV === 'development',
  fallbacks: {
    document: '/offline',
  },
};

const withPWAConfig = withPWA(pwaConfig);

const nextConfig = {
  // Removing 'output: export' to enable API routes
  eslint: {
    ignoreDuringBuilds: true,
  },
  typescript: {
    ignoreBuildErrors: true,
  },
  images: {
    unoptimized: true,
  },
  // Add environment variables for Google Maps API and other services
  env: {
    NEXT_PUBLIC_GOOGLE_MAPS_API_KEY: "AIzaSyCkzMyvUKcEB1ioQs9WSjPvetC9QYoWg3U",
    // Note: For security reasons, the Gemini API key should be set in Vercel environment variables
    // and not hardcoded here. This is just a fallback for development.
    GEMINI_API_KEY: process.env.GEMINI_API_KEY || "",
  },

}

export default withPWAConfig(nextConfig);
