import { MetadataRoute } from 'next';
import { getActiveProductSlugs } from '@/lib/actions/product';

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
    const baseUrl = 'https://auraboutique.me';
    
    // Static routes
    const routes = [
        '',
        '/links',
        '/shop',
        '/reclamaciones',
    ].map((route) => ({
        url: `${baseUrl}${route}`,
        lastModified: new Date(),
        changeFrequency: 'daily' as const,
        priority: route === '' ? 1 : 0.8,
    }));

    // Dynamic product routes
    try {
        const slugs = await getActiveProductSlugs();
        const productRoutes = slugs.map((slug) => ({
            url: `${baseUrl}/product/${slug}`,
            lastModified: new Date(),
            changeFrequency: 'weekly' as const,
            priority: 0.7,
        }));
        
        return [...routes, ...productRoutes];
    } catch (e) {
        console.error('Sitemap generation error:', e);
        return routes;
    }
}
