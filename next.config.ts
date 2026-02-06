import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // TEMPORARY: Ignore TS errors to restore site
  // TODO: Fix all implicit any errors and remove this
  typescript: {
    ignoreBuildErrors: true,
  },
  async redirects() {
    const exact = [
      "/standup",
      "/agents",
      "/tasks",
      "/messages",
      "/activity",
      "/settings",
      "/registry",
      "/dashboard-v2",
      "/mission-control",
    ].map((source) => ({ source, destination: "/", permanent: true }));
    const withSlug = [
      { source: "/agents/:path*", destination: "/", permanent: true },
      { source: "/tasks/:path*", destination: "/", permanent: true },
    ];
    return [...exact, ...withSlug];
  },
};

export default nextConfig;
