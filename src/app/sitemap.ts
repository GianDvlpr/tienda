import { MetadataRoute } from 'next';
import { prisma } from '@/lib/prisma';
import { absoluteUrl, productPath } from '@/lib/seo';
export const dynamic = 'force-dynamic';
export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
    // Do not publish a misleading partial sitemap when the database is unavailable.
    const products = await prisma.product.findMany({ where: { is_active: true }, select: { slug: true } });
    return [
        ...['/shop', '/personalizadas', '/links', '/colores', '/terms', '/returns', '/reclamaciones'].map(path => ({ url: absoluteUrl(path) })),
        ...products.map(product => ({ url: absoluteUrl(productPath(product.slug)) })),
    ];
}
