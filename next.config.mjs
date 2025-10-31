// next.config.mjs
/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // Note: output: 'standalone' can cause issues on certain hosts; enable only if needed
  // output: 'standalone',
  eslint: {
    ignoreDuringBuilds: true,
  },
  typescript: {
    // Allow Next.js build to succeed while we gate TS via separate script
    ignoreBuildErrors: true,
  },
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: '*.blob.core.windows.net',
        pathname: '/**',
      },
      {
        protocol: 'https',
        hostname: '*.blob.core.windows.net',
      },
      {
        protocol: 'https',
        hostname: '*.azurewebsites.net',
      },
    ],
  },
  // Removed deprecated experimental.turbo - using turbopack instead
  // turbopack: true, // Only enable if needed
  env: {
    CUSTOM_KEY: process.env.CUSTOM_KEY,
  },
  // Production optimizations
  compress: true,
  poweredByHeader: false,
  generateEtags: false,
  httpAgentOptions: {
    keepAlive: true,
  },
};

export default nextConfig;
