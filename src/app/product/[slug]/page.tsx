'use client';

import React, { useEffect, useMemo, useState } from 'react';
import { Alert, Button, Card, Divider, Radio, Space, Typography, message, Row, Col } from 'antd';
import { useParams } from 'next/navigation';
import useSWR from 'swr';

import ProductGallery from '@/components/shop/ProductGallery';
import ProductDetailSkeleton from '@/components/shop/ProductDetailSkeleton';

import type { ProductDetailResponse, ProductVariant } from '@/types/product';
import { formatPEN } from '@/lib/money';
import { useCartStore } from '@/store/cart.store';
import { fetcher } from '@/lib/fetcher';

const { Title, Text, Paragraph } = Typography;

export default function ProductDetailPage() {
    const params = useParams<{ slug: string }>();
    const slug = params.slug;

    const addItem = useCartStore((s) => s.addItem);

    const { data, error, isLoading } = useSWR<ProductDetailResponse>(
        slug ? `/api/store/products/${slug}` : null,
        fetcher,
        {
            revalidateOnFocus: false,
            keepPreviousData: true,
        }
    );

    const [selectedSize, setSelectedSize] = useState<string | null>(null);
    const [selectedColor, setSelectedColor] = useState<string | null>(null);

    useEffect(() => {
        if (!data) return;

        const first = (data.variants ?? []).find((v) => v.stock > 0) ?? (data.variants ?? [])[0];
        if (first) {
            setSelectedSize(first.size);
            setSelectedColor(first.color);
        }
    }, [data]);

    const variants = data?.variants ?? [];

    const sizeOptions = useMemo(() => {
        const set = new Set<string>();
        for (const v of variants) set.add(v.size);
        return Array.from(set);
    }, [variants]);

    const colorOptionsForSize = useMemo(() => {
        if (!selectedSize) return [];
        const set = new Set<string>();
        for (const v of variants) {
            if (v.size === selectedSize) set.add(v.color);
        }
        return Array.from(set);
    }, [variants, selectedSize]);

    useEffect(() => {
        if (!selectedSize) return;

        if (!selectedColor) {
            setSelectedColor(colorOptionsForSize[0] ?? null);
            return;
        }

        if (selectedColor && !colorOptionsForSize.includes(selectedColor)) {
            setSelectedColor(colorOptionsForSize[0] ?? null);
        }
    }, [selectedSize, selectedColor, colorOptionsForSize]);

    const selectedVariant: ProductVariant | null = useMemo(() => {
        if (!selectedSize || !selectedColor) return null;
        return variants.find((v) => v.size === selectedSize && v.color === selectedColor) ?? null;
    }, [variants, selectedSize, selectedColor]);

    const canAdd = !!selectedVariant && selectedVariant.stock > 0;

    const onAddToCart = () => {
        if (!data || !selectedVariant) return;

        if (selectedVariant.stock <= 0) {
            message.warning('No hay stock de esa variante');
            return;
        }

        addItem(
            {
                variantId: selectedVariant.variantId,
                productId: data.product.productId,
                slug: data.product.slug,
                name: data.product.name,
                size: selectedVariant.size,
                color: selectedVariant.color,
                sku: selectedVariant.sku,
                imageUrl: data.images?.[0]?.url ?? null,
                unitPrice: selectedVariant.price,
            },
            1
        );

        message.success('Agregado al carrito');
    };

    if (isLoading && !data) {
        return <ProductDetailSkeleton />;
    }

    if (error) {
        return (
            <Card>
                <Alert
                    type="error"
                    showIcon
                    message="No se pudo cargar el producto"
                    description={error.message}
                />
            </Card>
        );
    }

    // ✅ Not found
    if (!data) {
        return (
            <Card>
                <Alert type="error" showIcon message="Producto no encontrado" />
            </Card>
        );
    }

    return (
        <div style={{ display: 'grid', gap: 16 }}>
            <Card>
                <Row gutter={[24, 24]}>
                    <Col xs={24} md={12}>
                        <ProductGallery images={data.images ?? []} />
                    </Col>

                    <Col xs={24} md={12}>
                        <Space orientation="vertical" size={10} style={{ width: '100%' }}>
                            <Title level={3} style={{ margin: 0 }}>
                                {data.product.name}
                            </Title>

                            <Text type="secondary">{selectedVariant ? `SKU: ${selectedVariant.sku}` : null}</Text>

                            <Title level={4} style={{ margin: 0 }}>
                                {formatPEN(selectedVariant?.price ?? data.product.basePrice ?? 0)}
                            </Title>

                            {data.product.description ? (
                                <Paragraph type="secondary" style={{ marginBottom: 0 }}>
                                    {data.product.description}
                                </Paragraph>
                            ) : null}

                            <Divider style={{ margin: '12px 0' }} />

                            <div>
                                <Text strong>Talla</Text>
                                <div style={{ marginTop: 8 }}>
                                    <Radio.Group
                                        value={selectedSize ?? undefined}
                                        onChange={(e) => setSelectedSize(e.target.value)}
                                        buttonStyle="solid"
                                        style={{ display: 'flex', flexWrap: 'wrap', gap: '4px' }}
                                    >
                                        {sizeOptions.map((s) => (
                                            <Radio.Button key={s} value={s}>
                                                {s}
                                            </Radio.Button>
                                        ))}
                                    </Radio.Group>
                                </div>
                            </div>

                            <div>
                                <Text strong>Color</Text>
                                <div style={{ marginTop: 8 }}>
                                    <Radio.Group
                                        value={selectedColor ?? undefined}
                                        onChange={(e) => setSelectedColor(e.target.value)}
                                        buttonStyle="solid"
                                        style={{ display: 'flex', flexWrap: 'wrap', gap: '4px' }}
                                    >
                                        {colorOptionsForSize.map((c) => {
                                            const v = variants.find((x) => x.size === selectedSize && x.color === c);
                                            const disabled = !v || v.stock <= 0;
                                            return (
                                                <Radio.Button key={c} value={c} disabled={disabled}>
                                                    {c}
                                                </Radio.Button>
                                            );
                                        })}
                                    </Radio.Group>
                                </div>

                                <Text type="secondary" style={{ display: 'block', marginTop: 8 }}>
                                    {selectedVariant
                                        ? selectedVariant.stock > 0
                                            ? `Stock: ${selectedVariant.stock}`
                                            : 'Sin stock'
                                        : 'Elige una talla y color'}
                                </Text>
                            </div>

                            <Button type="primary" size="large" disabled={!canAdd} onClick={onAddToCart}>
                                Agregar al carrito
                            </Button>

                            {!canAdd ? (
                                <Text type="secondary">Selecciona una variante con stock.</Text>
                            ) : null}

                            {/* Feedback sutil si SWR revalida y ya hay data */}
                            {isLoading && data ? <Text type="secondary">Actualizando...</Text> : null}
                        </Space>
                    </Col>
                </Row>
            </Card>
        </div>
    );
}