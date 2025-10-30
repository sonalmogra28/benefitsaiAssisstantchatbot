// next.config.mjs
/** @type {import('next').NextConfig} */
const nextConfig = {
    reactStrictMode: true,
<<<<<<< HEAD
    output: 'standalone',
=======
    // output: 'standalone', // Commented out to fix build issues
>>>>>>> main
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
<<<<<<< HEAD
=======
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
>>>>>>> main
  };

export default nextConfig;
