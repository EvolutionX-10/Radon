import type { Metadata } from 'next';
import { site } from '@/lib/site';

export function pageMetadata(title: string, description: string, path: string): Metadata {
	return {
		title: { absolute: `${title} | Radon` },
		description,
		alternates: { canonical: path },
		openGraph: {
			type: 'website',
			locale: 'en_US',
			siteName: 'Radon',
			title: `${title} | Radon`,
			description,
			url: new URL(path, site.url).toString(),
			images: [
				{
					url: `${site.url}/opengraph-image`,
					width: 1200,
					height: 630,
					alt: 'Radon — game rewards, moderation, and a better Discord community.'
				}
			]
		},
		twitter: { card: 'summary_large_image', title: `${title} | Radon`, description, images: [`${site.url}/opengraph-image`] }
	};
}
