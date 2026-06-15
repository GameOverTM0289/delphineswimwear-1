import type { MetadataRoute } from 'next';

const SITE = (process.env.NEXT_PUBLIC_SITE_URL ?? 'https://delphineswimwear.com').replace(
  /\/$/,
  '',
);

// Allow crawling of the storefront; keep the admin dashboard and API out of
// the index. The sitemap pointer helps search engines find every page.
export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: '*',
        allow: '/',
        disallow: ['/admin', '/api', '/order/', '/checkout'],
      },
    ],
    sitemap: `${SITE}/sitemap.xml`,
    host: SITE,
  };
}
