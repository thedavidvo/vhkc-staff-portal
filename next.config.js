/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  swcMinify: true,
  // Removed 'output: export' to enable API routes
  // API routes require server-side rendering
  images: {
    unoptimized: true,
  },
  // GitHub Pages subdirectory deployment (remove if not using GitHub Pages)
  // basePath: '/vhkc-staff-portal',
  // trailingSlash: true,
  webpack: (config, { isServer }) => {
    // Fix for case sensitivity issues on Windows
    if (!isServer) {
      config.resolve.fallback = {
        ...config.resolve.fallback,
        fs: false,
      };
    }
    // Ensure case-sensitive module resolution
    config.resolve.cacheWithContext = false;
    return config;
  },
}

module.exports = nextConfig

