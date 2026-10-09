import type { NextConfig } from "next";
import { hostname, networkInterfaces } from "node:os";

function getDevelopmentOrigins(): string[] {
  const origins = new Set<string>(['**.ngrok-free.dev', hostname()]);

  for (const addresses of Object.values(networkInterfaces())) {
    for (const address of addresses ?? []) {
      if (!address.internal && address.family === 'IPv4') {
        origins.add(address.address);
      }
    }
  }

  const configuredAppUrl = process.env.NEXT_PUBLIC_APP_URL;

  if (configuredAppUrl) {
    try {
      origins.add(new URL(configuredAppUrl).hostname);
    } catch {
      // Ignore an invalid app URL here; env validation reports the error.
    }
  }

  return [...origins];
}

const developmentOrigins = getDevelopmentOrigins();

const nextConfig: NextConfig = {
  agentRules: false,
  allowedDevOrigins: developmentOrigins,
  experimental:
    process.env.NODE_ENV === 'development'
      ? {
          serverActions: {
            allowedOrigins: developmentOrigins,
          },
        }
      : undefined,
};

export default nextConfig;
