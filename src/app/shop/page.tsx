import { Suspense } from 'react';
import { notFound } from 'next/navigation';
import ShopClient from '@/app/shop/ShopClient';
import { listStoreProducts, querySchema } from '@/lib/store-products';
import { catalogMetadata, type CatalogSearch } from '@/lib/seo';
type Props = { searchParams: Promise<CatalogSearch> };
export async function generateMetadata({ searchParams }: Props) {
    return catalogMetadata('/shop', 'Ropa de mujer en Perú', 'Descubre la ropa de mujer de Aura Boutique: explora nuestras prendas, compara tallas, colores y precios, y elige tu próximo look.', await searchParams);
}
export default async function CatalogPage({ searchParams }: Props) {
    const search = await searchParams;
    const parsed = querySchema.safeParse(search);
    if (!parsed.success) notFound();
    const initialData = await listStoreProducts(parsed.data);
    if (initialData.page > 1 && initialData.items.length === 0) notFound();
    return <Suspense fallback={<p>Cargando catálogo…</p>}>
        <ShopClient key={JSON.stringify(search)} initialData={initialData} />
    </Suspense>;
}
