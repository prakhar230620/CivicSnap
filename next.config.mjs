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
  // Optimizing for Vercel deployment
  distDir: '.next',
  reactStrictMode: true,
  swcMinify: false,
  pageExtensions: ['js', 'jsx', 'ts', 'tsx'],
  trailingSlash: true,
  eslint: {
    ignoreDuringBuilds: true,
  },
  typescript: {
    ignoreBuildErrors: true,
  },
  images: {
    unoptimized: true,
  },
  poweredByHeader: false,
  experimental: {
    serverActions: {
      allowedOrigins: ['localhost:3000', 'civicsnap.vercel.app'],
    },
    serverComponents: true,
  },
  serverExternalPackages: ['genkit', '@genkit-ai/firebase', '@genkit-ai/googleai', '@google/genai'],
  // Add environment variables for Google Maps API and other services
  env: {
    NEXT_PUBLIC_GOOGLE_MAPS_API_KEY: "AIzaSyCkzMyvUKcEB1ioQs9WSjPvetC9QYoWg3U",
    // Note: For security reasons, the Gemini API key should be set in Vercel environment variables
    // and not hardcoded here. This is just a fallback for development.
    GEMINI_API_KEY: process.env.GEMINI_API_KEY || "",
  },

}

export default withPWAConfig(nextConfig);
