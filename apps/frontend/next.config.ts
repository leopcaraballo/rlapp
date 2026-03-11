import type { NextConfig } from "next";

const distDir = process.env.NEXT_DIST_DIR?.trim();

const nextConfig: NextConfig = {
  /* config options here */
  distDir: distDir && distDir.length > 0 ? distDir : ".next",
  output: "standalone",
  reactCompiler: true,
};

export default nextConfig;
