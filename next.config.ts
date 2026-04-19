import type { NextConfig } from 'next'

const nextConfig: NextConfig = {
  transpilePackages: ['@caistech/platform-trust-middleware', '@caistech/agent-trust-score', '@caistech/security-gate'],
}

export default nextConfig
