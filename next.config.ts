import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  experimental: {
    // Tabs already opened are shown again at once instead of waiting on the
    // server. Every save calls revalidatePath, which clears this cache.
    staleTimes: { dynamic: 60 },
  },
};

export default nextConfig;
