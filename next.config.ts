import type { NextConfig } from "next";

const isProduction = process.env.NODE_ENV === "production";

const nextConfig: NextConfig = {
  // Pin the workspace root so a stray lockfile in a parent dir isn't picked up.
  turbopack: {
    root: __dirname,
  },
  logging: isProduction
    ? false
    : {
        browserToTerminal: true,
        fetches: {
          fullUrl: true,
          hmrRefreshes: true,
        },
        serverFunctions: true,
      },
};

export default nextConfig;
