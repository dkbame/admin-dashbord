/** @type {import('next').NextConfig} */
const nextConfig = {
  experimental: {
    // Removed turbo: true as it was causing build issues
  },
  images: {
    domains: ['localhost', '127.0.0.1', 'fnpwgnlvjhtddovkeuch.supabase.co'],
    unoptimized: true, // For Netlify deployment
  },
  env: {
    NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL,
    NEXT_PUBLIC_SUPABASE_ANON_KEY: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
  },
  // Remove problematic settings for Netlify
  // trailingSlash: true,
  // output: 'standalone',
}

module.exports = nextConfig
