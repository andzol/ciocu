import type { NextConfig } from "next";
import { version } from "./package.json";

const nextConfig: NextConfig = {
  // Surface the package.json version to the client (single source of truth for the live build).
  env: { NEXT_PUBLIC_APP_VERSION: version },
};

export default nextConfig;
