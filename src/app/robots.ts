import { MetadataRoute } from 'next';

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: '*',
      allow: '/',
      disallow: [
        '/admin/',
        '/api/',
        '/checkout/',
        '/perfil/',
        '/success',
      ],
    },
    sitemap: 'https://auraboutique.me/sitemap.xml',
  };
}
