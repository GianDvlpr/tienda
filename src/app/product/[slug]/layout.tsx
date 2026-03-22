import { Metadata } from 'next';
import { prisma } from '@/lib/prisma';

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
    const resolvedParams = await params;
    const slug = decodeURIComponent(resolvedParams.slug);

    try {
        const productRows = await prisma.$queryRaw<any[]>`
            SELECT TOP 1 p.name, p.description, i.url as image_url
            FROM dbo.product p
            OUTER APPLY (
                SELECT TOP 1 url FROM dbo.product_image WHERE product_id = p.product_id ORDER BY sort_order ASC
            ) i
            WHERE p.slug = ${slug} AND p.is_active = 1
        `;

        const p = productRows?.[0];

        if (!p) {
            return { title: 'Producto no encontrado | Aura Boutique' };
        }

        const title = `${p.name} | Aura Boutique`;
        const description = p.description || `Visualiza ${p.name} y mucho más en Aura Boutique.`;
        const images = p.image_url ? [p.image_url] : [];

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
