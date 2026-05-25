import type { NextConfig } from "next";
import path from "path";

const nextConfig: NextConfig = {
  turbopack: {
    root: path.resolve(__dirname),
  },

  allowedDevOrigins: [
    "x8b8ttvn-3000.brs.devtunnels.ms",
    "*.devtunnels.ms",
    "*.brs.devtunnels.ms",
  ],

  experimental: {
    serverActions: {
      allowedOrigins: [
        "x8b8ttvn-3000.brs.devtunnels.ms",
        "*.devtunnels.ms",
        "*.brs.devtunnels.ms",
      ],
    },
  },
};

export default nextConfig;
