/** @type {import('next').NextConfig} */
const nextConfig = {
  experimental: {
    turbo: true
  },
  images: {
    domains: ['localhost', '127.0.0.1'],
  },
  env: {
    NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL,
    NEXT_PUBLIC_SUPABASE_ANON_KEY: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
  },
}

module.exports = nextConfig
