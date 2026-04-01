import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 's3-media*.s3.amazonaws.com',
      },
      {
        protocol: 'https',
        hostname: '*.yelpcdn.com',
      },
    ],
  },
};

export default nextConfig;
