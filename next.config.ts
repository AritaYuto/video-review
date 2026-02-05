import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  experimental: {
    serverComponentsExternalPackages: ["node-llama-cpp"],
  },
};
export default nextConfig;
