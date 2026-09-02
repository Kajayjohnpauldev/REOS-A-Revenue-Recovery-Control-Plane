import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Hide the Next.js dev-tools indicator — RevivalOS ships its own draggable
  // "Ask RevivalOS" helper orb instead.
  devIndicators: false,
};

export default nextConfig;
