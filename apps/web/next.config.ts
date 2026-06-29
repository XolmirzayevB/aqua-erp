import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "standalone",
  outputFileTracingRoot: require("path").join(__dirname, "../../"),
  transpilePackages: ["@aqua/shared"],
  // Build artefaktini ishlab chiqaramiz; type va lint tekshiruvi alohida CI bosqichida (ci.yml)
  typescript: { ignoreBuildErrors: true },
  eslint: { ignoreDuringBuilds: true },
};

export default nextConfig;
