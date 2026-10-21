import type { NextConfig } from "next";
// @ts-ignore
import withPWAInit from "next-pwa";
import createNextIntlPlugin from "next-intl/plugin";

const withNextIntl = createNextIntlPlugin();

const withPWA = withPWAInit({
  dest: "public",
  disable: process.env.NODE_ENV === "development",
});

const nextConfig: NextConfig = {
  turbopack: {
    root: process.cwd(),
  },
};

export default withNextIntl(withPWA(nextConfig));
