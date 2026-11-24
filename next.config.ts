import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  async redirects() {
    return [
      // The platform console moved from /super_admin to /admin; keep old links and bookmarks working.
      { source: '/super_admin', destination: '/admin', permanent: false },
      { source: '/super_admin/:path*', destination: '/admin/:path*', permanent: false },
    ];
  },
};

export default nextConfig;
