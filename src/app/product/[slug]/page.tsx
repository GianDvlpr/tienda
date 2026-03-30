import React from 'react';
import { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { getProductBySlug } from '@/lib/actions/product';
import ProductDetailClient from './ProductDetailClient';

interface PageProps {
    params: Promise<{ slug: string }>;
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
    const { slug } = await params;
    const data = await getProductBySlug(slug);

    if (!data) {
        return {
            title: 'Producto no encontrado',
        };
    }

    const { product, images } = data;
    const description = product.description || `Compra ${product.name} en Aura Boutique. Alta moda femenina con envíos a todo el Perú.`;
    const imageUrl = images?.[0]?.url;

    return {
        title: product.name,
        description: description.substring(0, 160),
        openGraph: {
            title: `${product.name} | Aura Boutique`,
            description: description.substring(0, 160),
            images: imageUrl ? [{ url: imageUrl }] : [],
            type: 'article',
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
    const data = await getProductBySlug(slug);

    if (!data) {
        notFound();
    }

    // Structured Data (JSON-LD) for Google Rich Results
    const jsonLd = {
        '@context': 'https://schema.org',
        '@type': 'Product',
        name: data.product.name,
        image: data.images?.map(img => img.url) || [],
        description: data.product.description,
        sku: data.variants?.[0]?.sku,
        offers: {
            '@type': 'Offer',
            url: `https://auraboutique.me/product/${data.product.slug}`,
            priceCurrency: 'PEN',
            price: data.variants?.[0]?.price || data.product.basePrice,
            availability: data.variants?.some(v => v.stock > 0) 
                ? 'https://schema.org/InStock' 
                : 'https://schema.org/OutOfStock',
            seller: {
                '@type': 'Organization',
                name: 'Aura Boutique',
            },
        },
    };

    return (
        <>
            <script
                type="application/ld+json"
                dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
            />
            <ProductDetailClient initialData={data} />
        </>
    );
}