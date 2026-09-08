import type { NextConfig } from 'next';

const isGitHubPages = process.env.GITHUB_PAGES === 'true';
const nextConfig: NextConfig = isGitHubPages
  ? {
      output: 'export',
      assetPrefix: process.env.GITHUB_PAGES_BASE_PATH ?? '',
      trailingSlash: true,
      images: { unoptimized: true },
    }
  : {};

export default nextConfig;
