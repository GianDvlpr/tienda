import type { Metadata } from 'next';
import type { ProductDetailResponse } from '@/types/product';

export const SITE_URL = 'https://auraboutique.me';
export function absoluteUrl(path: string) { return new URL(path, SITE_URL).href; }
export function productPath(slug: string) { return '/product/' + encodeURIComponent(slug); }
export function serializeJsonLd(value: unknown) { return JSON.stringify(value).replace(/</g, '\\u003c'); }
export function plainDescription(value: string) { return value.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim(); }
export type CatalogSearch = Record<string, string | string[] | undefined>;
export function catalogMetadata(path: string, title: string, description: string, search: CatalogSearch): Metadata {
    const pageValue = typeof search.page === 'string' ? Number(search.page) : 1;
    const page = Number.isSafeInteger(pageValue) && pageValue > 1 ? pageValue : 1;
    const filtered = Object.entries(search).some(([key, value]) =>
        !['page', 'utm_source', 'utm_medium', 'utm_campaign', 'utm_content', 'utm_term', 'gclid', 'fbclid'].includes(key) && Boolean(value));
    const canonical = absoluteUrl(path + (page > 1 ? '?page=' + page : ''));
    const pageTitle = title + (page > 1 ? ' — Página ' + page : '');
    return { title: pageTitle, description, alternates: { canonical },
        robots: { index: !filtered, follow: true },
        openGraph: { title: pageTitle + ' | Aura Boutique', description, url: canonical, type: 'website', locale: 'es_PE' } };
}
export function productStructuredData(data: ProductDetailResponse) {
    const url = absoluteUrl(productPath(data.product.slug));
    return { '@context': 'https://schema.org', '@type': 'Product', '@id': url + '#product',
        name: data.product.name, url, image: data.images.map(image => image.url),
        description: plainDescription(data.product.description || data.product.name),
        offers: data.variants.map(variant => ({ '@type': 'Offer', url, sku: variant.sku,
            priceCurrency: 'PEN', price: variant.price,
            availability: variant.stock > 0 ? 'https://schema.org/InStock' : 'https://schema.org/OutOfStock',
            itemCondition: 'https://schema.org/NewCondition',
            seller: { '@type': 'Organization', name: 'Aura Boutique', url: SITE_URL } })) };
}
