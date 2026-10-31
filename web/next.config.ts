import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
	// Preserve Next.js's platform-provided tracing root. Vercel packages this
	// app relative to the repository root, including its web/ directory prefix.
};

export default nextConfig;
