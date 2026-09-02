/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  webpack: (config) => {
    // Privy's SDK optionally references a Farcaster mini-app package we
    // don't use (no Farcaster login method is configured) — aliasing it
    // out avoids a harmless "module not found" build warning.
    config.resolve.alias["@farcaster/mini-app-solana"] = false;
    return config;
  },
};

export default nextConfig;
