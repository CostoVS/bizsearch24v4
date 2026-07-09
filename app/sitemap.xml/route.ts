import { NextResponse } from 'next/server';
import { SA_PROVINCES } from '@/lib/locations';

export const dynamic = 'force-dynamic';

export async function GET() {
  const baseUrl = process.env.APP_URL || 'https://searchbiz.co.za';

  const baseRoutes = [
    '',
    '/directory',
    '/services',
    '/news',
    '/tools',
    '/premium-partners',
    '/posts',
    '/terms',
    '/qa',
    '/ai-chat',
  ];

  const provinceRoutes = SA_PROVINCES.map((p) => `/${p.slug}`);
  
  const townRoutes: string[] = [];
  SA_PROVINCES.forEach((province) => {
    province.towns.forEach((town) => {
      if (town.toLowerCase() !== 'all locations') {
        const slug = town.toLowerCase().trim().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');
        townRoutes.push(`/${slug}`);
      }
    });
  });

  const allPaths = Array.from(new Set([...baseRoutes, ...provinceRoutes, ...townRoutes]));

  const sitemapXml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${allPaths.map((path) => {
  const priority = path === '' ? '1.0' : path.split('/').length > 2 ? '0.6' : '0.8';
  return `  <url>
    <loc>${baseUrl}${path}</loc>
    <lastmod>${new Date().toISOString().split('T')[0]}</lastmod>
    <changefreq>weekly</changefreq>
    <priority>${priority}</priority>
  </url>`;
}).join('\n')}
</urlset>`;

  return new NextResponse(sitemapXml, {
    headers: {
      'Content-Type': 'application/xml',
      'Cache-Control': 'public, max-age=86400, s-maxage=86400',
    },
  });
}
