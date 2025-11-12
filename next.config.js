/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  swcMinify: true,
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
  async rewrites() {
    return [
      {
        source: '/com.chrome.devtools.json',
        destination: '/api/devtools',
      },
    ];
  },
}

module.exports = nextConfig

