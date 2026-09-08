import type { NextConfig } from 'next';

const isGitHubPages = process.env.GITHUB_PAGES === 'true';
const nextConfig: NextConfig = isGitHubPages
  ? {
      output: 'export',
      assetPrefix: process.env.GITHUB_PAGES_BASE_PATH ?? '',
      // The local exporter arranges HTML into folders after prerendering.
      // vinext beta skips nested routes when trailing-slash redirects are on.
      trailingSlash: process.env.LOCAL_CLASSROOM !== 'true',
      images: { unoptimized: true },
    }
  : {};

export default nextConfig;
