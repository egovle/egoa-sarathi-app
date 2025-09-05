
// Trigger new deployment with final, comprehensive fixes
/** @type {import('next').NextConfig} */
const nextConfig = {
  output: 'standalone',
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'placehold.co',
        port: '',
        pathname: '/**',
      },
      {
        protocol: "https",
        hostname: "firebasestorage.googleapis.com",
      },
      {
        protocol: 'https',
        hostname: 'goasarthi.in',
      },
       {
        protocol: 'https',
        hostname: 'egoa-sarathi-app--egoasarthi.asia-east1.hosted.app',
      }
    ],
  },
};

module.exports = nextConfig;
