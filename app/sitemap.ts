import { MetadataRoute } from 'next'
import { SA_PROVINCES } from '@/lib/locations';

export default function sitemap(): MetadataRoute.Sitemap {
  const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'https://searchbiz.co.za';

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
    '/visual-sitemap',
    '/sitemap',
    '/google-business-guide',
    '/how-money-works',
    '/claim-business',
    '/create-ad',
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

  return allPaths.map((path) => {
    const priority = path === '' ? 1.0 : path.split('/').length > 2 ? 0.6 : 0.8;
    return {
      url: `${baseUrl}${path}`,
      lastModified: new Date(),
      changeFrequency: 'weekly',
      priority: priority,
    };
  });
}
