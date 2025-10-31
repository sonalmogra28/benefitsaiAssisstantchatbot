// next.config.mjs
/** @type {import('next').NextConfig} */
const nextConfig = {
    reactStrictMode: true,
    eslint: {
      ignoreDuringBuilds: true,
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
    webpack: (config, { isServer }) => {
      if (isServer) {
        // Add polyfills for server-side rendering
        config.resolve.fallback = {
          ...config.resolve.fallback,
          canvas: false,
          fs: false,
          path: false,
          crypto: false,
        };
      }
      
      return config;
    },
  };

export default nextConfig;
