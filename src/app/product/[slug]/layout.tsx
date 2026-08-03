import { Metadata } from 'next';
import { prisma } from '@/lib/prisma';

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
    const resolvedParams = await params;
    const slug = decodeURIComponent(resolvedParams.slug);

    try {
        const p = await prisma.product.findFirst({
            where: { slug, is_active: true },
            select: {
                name: true,
                description: true,
                product_image: { orderBy: { sort_order: 'asc' }, take: 1, select: { url: true } },
            },
        });

        if (!p) {
            return { title: 'Producto no encontrado | Aura Boutique' };
        }

        const title = `${p.name} | Aura Boutique`;
        const description = p.description || `Visualiza ${p.name} y mucho más en Aura Boutique.`;
        const images = p.product_image[0]?.url ? [p.product_image[0].url] : [];

        return {
            title,
            description,
            openGraph: {
                title,
                description,
                images,
                type: 'website',
                siteName: 'Aura Boutique',
            },
            twitter: {
                card: 'summary_large_image',
                title,
                description,
                images,
            }
        };
    } catch {
        return { title: 'Aura Boutique' };
    }
}

export default function ProductLayout({ children }: { children: React.ReactNode }) {
    return <>{children}</>;
}
