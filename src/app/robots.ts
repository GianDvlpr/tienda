import { MetadataRoute } from 'next';
import { absoluteUrl } from '@/lib/seo';

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: '*',
      allow: '/',
      disallow: [
        '/admin/',
        '/track/',
        '/order/',
        '/api/',
        '/checkout/',
        '/perfil/',
        '/success',
      ],
    },
    sitemap: absoluteUrl('/sitemap.xml'),
  };
}
