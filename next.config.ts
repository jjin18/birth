import type { NextConfig } from 'next';
const config: NextConfig = { output: 'export', distDir: process.env.NODE_ENV === 'production' ? '.next-build' : '.next', images: { unoptimized: true }, trailingSlash: true, devIndicators: false };
export default config;
