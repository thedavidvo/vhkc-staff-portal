/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  swcMinify: true,
  output: 'export',
  images: {
    unoptimized: true,
  },
  // If deploying to a subdirectory, uncomment and set your repo name:
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

