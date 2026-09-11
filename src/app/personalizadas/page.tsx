import { Suspense } from 'react';
import { notFound } from 'next/navigation';
import ShopClient from '@/app/shop/ShopClient';
import { listStoreProducts, querySchema } from '@/lib/store-products';
import { catalogMetadata, type CatalogSearch } from '@/lib/seo';
type Props = { searchParams: Promise<CatalogSearch> };
export async function generateMetadata({ searchParams }: Props) {
    return catalogMetadata('/personalizadas', 'Prendas personalizadas para mujer', 'Elige una prenda personalizable, selecciona talla y color, ajusta tus medidas y solicita tu pedido por WhatsApp en Aura Boutique.', await searchParams);
}
export default async function CatalogPage({ searchParams }: Props) {
    const search = await searchParams;
    const parsed = querySchema.safeParse({ ...search, customizable: '1' });
    if (!parsed.success) notFound();
    const initialData = await listStoreProducts(parsed.data);
    if (initialData.page > 1 && initialData.items.length === 0) notFound();
    return <Suspense fallback={<p>Cargando catálogo…</p>}>
        <ShopClient key={JSON.stringify(search)} customizableOnly initialData={initialData} />
    </Suspense>;
}
