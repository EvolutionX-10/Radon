import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
	// The website builds independently of the bot and its root dependencies.
	turbopack: { root: __dirname },
	outputFileTracingRoot: __dirname
};

export default nextConfig;
