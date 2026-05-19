import type { NextConfig } from "next";
import path from "path";

const nextConfig: NextConfig = {
  turbopack: {
    root: path.resolve(__dirname),
  },

  allowedDevOrigins: [
    "valid-titanium-clearly-appearance.trycloudflare.com",
    "*.trycloudflare.com",
  ],

  experimental: {
    serverActions: {
      allowedOrigins: [
        "valid-titanium-clearly-appearance.trycloudflare.com",
        "*.trycloudflare.com",
      ],
    },
  },
};

export default nextConfig;
