import type { MetadataRoute } from 'next';
import { site } from '@/lib/site';

export default function sitemap(): MetadataRoute.Sitemap {
	// Avoid a generated lastModified: rebuilding alone does not change page content.
	return ['/', '/guide', '/updates', '/terms-of-service', '/privacy-policy'].map((path) => ({ url: new URL(path, site.url).toString() }));
}
