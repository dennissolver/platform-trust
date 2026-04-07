import type { NextConfig } from 'next'

const nextConfig: NextConfig = {
  transpilePackages: ['@platform-trust/middleware', '@platform-trust/agent-trust-score'],
}

export default nextConfig
