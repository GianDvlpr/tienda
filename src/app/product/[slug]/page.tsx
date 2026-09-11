import React, { cache } from 'react';
import { absoluteUrl, productPath, plainDescription, productStructuredData, serializeJsonLd } from '@/lib/seo';
import { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { getProductBySlug } from '@/lib/actions/product';
import ProductDetailClient from './ProductDetailClient';

const loadProduct = cache(getProductBySlug);

interface PageProps {
    params: Promise<{ slug: string }>;
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
    const { slug } = await params;
    const data = await loadProduct(slug);

    if (!data) {
        return {
            title: 'Producto no encontrado',
            robots: { index: false, follow: true },
        };
    }

    const { product, images } = data;
    const description = plainDescription(product.description || `Compra ${product.name} en Aura Boutique. Alta moda femenina con envíos a todo el Perú.`);
    const imageUrl = images?.[0]?.url;

    return {
        title: product.name,
        alternates: { canonical: absoluteUrl(productPath(product.slug)) },
        description: description.substring(0, 160),
        openGraph: {
            title: `${product.name} | Aura Boutique`,
            description: description.substring(0, 160),
            images: imageUrl ? [{ url: imageUrl }] : [],
            type: 'website',
            url: absoluteUrl(productPath(product.slug)),
        },
        twitter: {
            card: 'summary_large_image',
            title: `${product.name} | Aura Boutique`,
            description: description.substring(0, 160),
            images: imageUrl ? [imageUrl] : [],
        },
    };
}

export default async function ProductDetailPage({ params }: PageProps) {
    const { slug } = await params;
    const data = await loadProduct(slug);

    if (!data) {
        notFound();
    }

    const jsonLd = productStructuredData(data);

    return (
        <>
            <script
                type="application/ld+json"
                dangerouslySetInnerHTML={{ __html: serializeJsonLd(jsonLd) }}
            />
            <ProductDetailClient initialData={data} />
        </>
    );
}