'use client';

import React, { useState, useMemo } from 'react';
import { Drawer, Spin, Typography, Space, Divider, Radio, Flex, Button, Alert } from 'antd';
import { ShoppingFilled } from '@ant-design/icons';
import useSWR from 'swr';
import { toast } from 'sonner';

import { useUIStore } from '@/store/ui.store';
import { useCartStore } from '@/store/cart.store';
import type { ProductDetailResponse } from '@/types/product';

const fetcher = (url: string) => fetch(url).then((res) => res.json());

const { Title, Text } = Typography;

function formatPEN(amount: number) {
    return new Intl.NumberFormat('es-PE', { style: 'currency', currency: 'PEN' }).format(amount);
}

export default function QuickViewDrawer() {
    const { isQuickViewOpen, closeQuickView, quickViewProductSlug } = useUIStore();
    const addCartItem = useCartStore((s) => s.addItem);

    const [selectedSize, setSelectedSize] = useState<string | null>(null);
    const [selectedColor, setSelectedColor] = useState<string | null>(null);

    const { data, error, isLoading } = useSWR<ProductDetailResponse>(
        isQuickViewOpen && quickViewProductSlug ? `/api/store/products/${quickViewProductSlug}` : null,
        fetcher
    );

    // Reset local state when drawer closes or slug changes
    React.useEffect(() => {
        if (!isQuickViewOpen) {
            setSelectedSize(null);
            setSelectedColor(null);
        }
    }, [isQuickViewOpen, quickViewProductSlug]);

    const uniqueSizes = useMemo(() => {
        if (!data) return [];
        return Array.from(new Set(data.variants.map((v) => v.size)));
    }, [data]);

    const uniqueColors = useMemo(() => {
        if (!data) return [];
        return Array.from(new Set(data.variants.map((v) => v.color)));
    }, [data]);

    const selectedVariant = useMemo(() => {
        if (!data || !selectedSize || !selectedColor) return null;
        return data.variants.find((v) => v.size === selectedSize && v.color === selectedColor) || null;
    }, [data, selectedSize, selectedColor]);

    const canAdd = selectedVariant && selectedVariant.stock > 0;

    const onAddToCart = () => {
        if (!data || !selectedVariant) return;
        addCartItem({
            variantId: selectedVariant.variantId,
            productId: data.product.productId,
            slug: data.product.slug,
            name: data.product.name,
            size: selectedVariant.size,
            color: selectedVariant.color,
            sku: selectedVariant.sku,
            imageUrl: data.images[0]?.url || undefined,
            unitPrice: selectedVariant.price,
        }, 1);
        toast.success(`Agregado al carrito: ${data.product.name}`);
        closeQuickView();
    };

    return (
        <Drawer
            title="Vista Rápida"
            placement="right"
            onClose={closeQuickView}
            open={isQuickViewOpen}
            size="default" // Reemplaza width={400} (default es 378px aprox)
            destroyOnClose
            style={{ padding: 0 }}
        >
            {isLoading ? (
                <Flex justify="center" align="center" style={{ height: '100%' }}>
                    <Spin size="large" />
                </Flex>
            ) : error || !data ? (
                <Alert type="error" title="No se pudo cargar el producto" />
            ) : (
                <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
                    <div style={{ flex: 1, overflowY: 'auto', paddingBottom: 24 }}>
                        {/* Image */}
                        {data.images.length > 0 && (
                            <img
                                src={data.images[0].url}
                                alt={data.product.name}
                                style={{ width: '100%', aspectRatio: '4/5', objectFit: 'cover', borderRadius: 8, marginBottom: 16 }}
                            />
                        )}

                        {/* Title & Price */}
                        <Title level={4} style={{ margin: 0, fontWeight: 300, letterSpacing: 1 }}>{data.product.name.toUpperCase()}</Title>
                        <Text strong style={{ fontSize: 20, display: 'block', marginTop: 8 }}>
                            {formatPEN(selectedVariant?.price ?? data.product.basePrice)}
                        </Text>

                        <Divider />

                        <Space orientation="vertical" size="large" style={{ width: '100%' }}>
                            {/* Colors */}
                            <div>
                                <Text strong style={{ display: 'block', marginBottom: 8 }}>COLOR</Text>
                                <Radio.Group value={selectedColor} onChange={(e) => setSelectedColor(e.target.value)}>
                                    <Space wrap>
                                        {uniqueColors.map((color) => {
                                            const isAvailable = data.variants.some((v) => v.color === color && v.stock > 0);
                                            return (
                                                <Radio.Button key={color} value={color} disabled={!isAvailable}>
                                                    {color}
                                                </Radio.Button>
                                            );
                                        })}
                                    </Space>
                                </Radio.Group>
                            </div>

                            {/* Sizes */}
                            <div>
                                <Text strong style={{ display: 'block', marginBottom: 8 }}>TALLA</Text>
                                <Radio.Group value={selectedSize} onChange={(e) => setSelectedSize(e.target.value)}>
                                    <Space wrap>
                                        {uniqueSizes.map((size) => {
                                            const isAvailable = data.variants.some((v) => v.size === size && v.stock > 0 && (!selectedColor || v.color === selectedColor));
                                            return (
                                                <Radio.Button key={size} value={size} disabled={!isAvailable}>
                                                    {size}
                                                </Radio.Button>
                                            );
                                        })}
                                    </Space>
                                </Radio.Group>
                            </div>

                            <Text type="secondary" style={{ display: 'block' }}>
                                {selectedVariant
                                    ? selectedVariant.stock > 0
                                        ? `Disponible`
                                        : 'Agotado temporalmente'
                                    : 'Elige una talla y color'}
                            </Text>
                        </Space>
                    </div>

                    {/* Footer Pinned Action */}
                    <div style={{ flexShrink: 0, paddingTop: 16, borderTop: '1px solid #f0f0f0' }}>
                        <Button
                            type="primary"
                            size="large"
                            icon={<ShoppingFilled />}
                            disabled={!canAdd}
                            onClick={onAddToCart}
                            style={{ width: '100%', backgroundColor: '#000', borderRadius: 0, height: 48 }}
                        >
                            Agregar al Carrito
                        </Button>
                    </div>
                </div>
            )}
        </Drawer>
    );
}
