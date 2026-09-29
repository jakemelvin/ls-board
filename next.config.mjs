/** @type {import('next').NextConfig} */
const nextConfig = {
  ...(process.env.BUILD_STANDALONE === 'true' ? { output: 'standalone' } : {}),
  images: {
    unoptimized: true,
  },
}

export default nextConfig
