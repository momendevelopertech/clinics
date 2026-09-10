import { withSerwist } from "@serwist/turbopack";
import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  experimental: {
    optimizePackageImports: [
      "lucide-react",
      "radix-ui",
      "@radix-ui/react-hover-card",
      "@radix-ui/react-popover",
      "@radix-ui/react-separator",
      "date-fns",
    ],
  },
};

export default withSerwist(nextConfig);
