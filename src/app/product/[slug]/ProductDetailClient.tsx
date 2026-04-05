'use client';

import { toast } from 'sonner';
import React, { useEffect, useMemo, useState } from 'react';
import { Alert, Button, Card, Divider, Radio, Space, Typography, Row, Col, Flex, Grid, Modal, Image, theme } from 'antd';
import { WhatsAppOutlined, HeartOutlined, HeartFilled, ShoppingCartOutlined, GiftOutlined } from '@ant-design/icons';
import Link from 'next/link';


import ProductGallery from '@/components/shop/ProductGallery';
import ProductDetailSkeleton from '@/components/shop/ProductDetailSkeleton';
import type { ProductDetailResponse, ProductVariant } from '@/types/product';
import { formatPEN } from '@/lib/money';
import { useCartStore } from '@/store/cart.store';
import { useWishlistStore } from '@/store/wishlist.store';

const { Title, Text, Paragraph } = Typography;

interface ProductDetailClientProps {
    initialData: ProductDetailResponse;
}

export default function ProductDetailClient({ initialData }: ProductDetailClientProps) {
    const { token } = theme.useToken();
    const screens = Grid.useBreakpoint();
    const isMobile = !screens.md;

    const addCartItem = useCartStore((s) => s.addItem);
    const addWishlistItem = useWishlistStore((s) => s.addItem);
    const removeWishlistItem = useWishlistStore((s) => s.removeItem);
    const isInWishlist = useWishlistStore((s) => s.isInWishlist);

    const [selectedSize, setSelectedSize] = useState<string | null>(null);
    const [selectedColor, setSelectedColor] = useState<string | null>(null);
    const [isSizeGuideOpen, setIsSizeGuideOpen] = useState(false);

    useEffect(() => {
        if (!initialData) return;

        const first = (initialData.variants ?? []).find((v) => v.stock > 0) ?? (initialData.variants ?? [])[0];
        if (first) {
            setSelectedSize(first.size);
            setSelectedColor(first.color);
        }
    }, [initialData]);

    const variants = initialData?.variants ?? [];

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
    const isWishlisted = selectedVariant ? isInWishlist(selectedVariant.variantId) : false;

    const onAddToCart = () => {
        if (!initialData || !selectedVariant) return;

        if (selectedVariant.stock <= 0) {
            toast.warning('No hay stock de esa variante');
            return;
        }

        addCartItem({
            variantId: selectedVariant.variantId,
            productId: initialData.product.productId,
            slug: initialData.product.slug,
            name: initialData.product.name,
            size: selectedVariant.size,
            color: selectedVariant.color,
            sku: selectedVariant.sku,
            imageUrl: initialData.images?.[0]?.url ?? null,
            unitPrice: selectedVariant.price,
        }, 1);

        toast.success('Agregado a tu carrito');
    };

    const onToggleWishlist = () => {
        if (!initialData || !selectedVariant) return;

        if (isWishlisted) {
            removeWishlistItem(selectedVariant.variantId);
            toast.success('Eliminado de tus favoritos');
        } else {
            addWishlistItem({
                variantId: selectedVariant.variantId,
                productId: initialData.product.productId,
                slug: initialData.product.slug,
                name: initialData.product.name,
                size: selectedVariant.size,
                color: selectedVariant.color,
                sku: selectedVariant.sku,
                imageUrl: initialData.images?.[0]?.url ?? null,
                unitPrice: selectedVariant.price,
            });
            toast.success('Agregado a tus favoritos');
        }
    };

    const handleWhatsAppConsult = () => {
        if (!initialData || !selectedVariant) return;
        const text = `Hola Aura Boutique, deseo consultar por la siguiente prenda:\n\n*${initialData.product.name}*\nTalla: ${selectedVariant.size}\nColor: ${selectedVariant.color}\nSKU: ${selectedVariant.sku}\nPrecio Ref: ${formatPEN(selectedVariant.price)}\n\n¿Tienen disponibilidad?`;

        const waNumber = process.env.NEXT_PUBLIC_WHATSAPP_NUMBER || '51907360760';
        window.open(`https://wa.me/${waNumber}?text=${encodeURIComponent(text)}`, '_blank');
    };

    return (
        <div style={{ maxWidth: 1200, margin: '0 auto', padding: 24, paddingTop: 100 }}>
            <div style={{ display: 'grid', gap: 16 }}>
                <Card variant="borderless">
                    <Row gutter={[24, 24]}>
                        <Col xs={24} md={12}>
                            <ProductGallery images={initialData.images ?? []} />
                        </Col>

                        <Col xs={24} md={12}>
                            <Space orientation="vertical" size={10} style={{ width: '100%' }}>
                                <Title level={3} style={{ margin: 0 }}>
                                    {initialData.product.name}
                                </Title>

                                <Text type="secondary">{selectedVariant ? `SKU: ${selectedVariant.sku}` : null}</Text>

                                <Title level={4} style={{ margin: 0 }}>
                                    {formatPEN(selectedVariant?.price ?? initialData.product.basePrice ?? 0)}
                                </Title>

                                {initialData.product.description ? (
                                    <Paragraph type="secondary" style={{ marginBottom: 0 }}>
                                        {initialData.product.description}
                                    </Paragraph>
                                ) : null}

                                <Divider style={{ margin: '12px 0' }} />

                                <div>
                                    <Flex align="center" justify="space-between">
                                        <Text strong>Talla</Text>
                                        {initialData.product.size_guide_url && (
                                            <Button 
                                                type="link" 
                                                size="small" 
                                                onClick={() => setIsSizeGuideOpen(true)}
                                                style={{ padding: 0, height: 'auto' }}
                                            >
                                                Guía de Tallas
                                            </Button>
                                        )}
                                    </Flex>
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
                                                ? `Disponible`
                                                : 'Agotado temporalmente'
                                            : 'Elige una talla y color'}
                                    </Text>
                                </div>

                                <Flex gap="middle" wrap="wrap" style={{ marginTop: 16 }}>
                                    <Button
                                        type="primary"
                                        size="large"
                                        icon={<ShoppingCartOutlined />}
                                        disabled={!canAdd}
                                        onClick={onAddToCart}
                                        style={{ flex: 1, minWidth: 200 }}
                                    >
                                        Agregar al Carrito
                                    </Button>

                                    <Button
                                        size="large"
                                        icon={isWishlisted ? <HeartFilled style={{ color: '#ff4d4f' }} /> : <HeartOutlined />}
                                        disabled={!canAdd}
                                        onClick={onToggleWishlist}
                                        style={{ flex: 1, minWidth: 200 }}
                                    >
                                        {isWishlisted ? 'En Favoritos' : 'Añadir a Deseos'}
                                    </Button>

                                    <Button
                                        size="large"
                                        icon={<WhatsAppOutlined />}
                                        disabled={!canAdd}
                                        onClick={handleWhatsAppConsult}
                                        style={{ color: '#25D366', borderColor: '#25D366', flex: 1, minWidth: 200 }}
                                    >
                                        WhatsApp
                                    </Button>
                                </Flex>
                                 {!canAdd ? (
                                    <Text type="secondary" style={{ color: 'red' }}>Selecciona una variante disponible para consultar.</Text>
                                ) : null}

                                {initialData.bundles && initialData.bundles.length > 0 && (
                                    <div style={{ marginTop: 32 }}>
                                        <Divider orientation="start">

                                            <Space>
                                                <GiftOutlined style={{ color: '#C89F53' }} />
                                                <Text strong style={{ color: '#C89F53' }}>Combo Ahorro</Text>
                                            </Space>
                                        </Divider>
                                        
                                        {initialData.bundles.map(bundle => {
                                            const otherItems = bundle.items.filter(i => i.productId !== initialData.product.productId);
                                            return (
                                                <Card 
                                                    key={bundle.bundle_id} 
                                                    size="small" 
                                                    style={{ 
                                                        borderColor: '#C89F53', 
                                                        background: '#fffdf9',
                                                        marginBottom: 16
                                                    }}
                                                >
                                                    <Space direction="vertical" style={{ width: '100%', gap: 8 }}>
                                                        <Text strong>{bundle.name}</Text>
                                                        <Text type="secondary" style={{ fontSize: 13, display: 'block' }}>
                                                            {bundle.description || `Lleva este producto junto a ${otherItems.map(i => i.name).join(', ')} y ahorra ${formatPEN(bundle.discount_amount)}.`}
                                                        </Text>
                                                        
                                                        <Flex gap="small" wrap="wrap" align="center" style={{ marginTop: 8 }}>
                                                            {otherItems.map(item => (
                                                                <Link key={item.productId} href={`/product/${item.slug}`}>
                                                                    <Card size="small" hoverable style={{ width: 120 }}>
                                                                        <div style={{ textAlign: 'center' }}>
                                                                            <img 
                                                                                src={item.primaryImageUrl || '/placeholder.png'} 
                                                                                style={{ width: '100%', height: 120, objectFit: 'cover', borderRadius: 4 }} 
                                                                                alt={item.name}
                                                                            />
                                                                            <Text ellipsis style={{ display: 'block', fontSize: 11, marginTop: 4 }}>
                                                                                {item.name}
                                                                            </Text>
                                                                        </div>
                                                                    </Card>
                                                                </Link>
                                                            ))}
                                                            
                                                            <div style={{ marginLeft: 'auto' }}>
                                                                <Button 
                                                                    type="primary" 
                                                                    ghost 
                                                                    size="small"
                                                                    onClick={() => {
                                                                       onAddToCart();
                                                                       toast.info(`¡Genial! Solo añade el ${otherItems[0].name} para aplicar el descuento.`);
                                                                    }}
                                                                >
                                                                    Añadir este y Ver el Otro
                                                                </Button>
                                                            </div>
                                                        </Flex>
                                                    </Space>
                                                </Card>
                                            )
                                        })}
                                    </div>
                                )}

                            </Space>
                        </Col>
                    </Row>
                </Card>
            </div>
            
            {isMobile && (
                <div style={{
                    position: 'fixed',
                    bottom: 0,
                    left: 0,
                    right: 0,
                    background: token.colorBgContainer,
                    padding: '12px 16px',
                    boxShadow: token.boxShadowSecondary,
                    zIndex: 999,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    gap: 12
                }}>
                    <div style={{ flex: 1 }}>
                        <Text strong style={{ display: 'block', fontSize: 16 }}>{formatPEN(selectedVariant?.price ?? initialData.product.basePrice ?? 0)}</Text>
                        <Text type="secondary" style={{ fontSize: 12 }}>{selectedVariant ? `Talla: ${selectedVariant.size}` : 'Seleccione variante'}</Text>
                    </div>
                    <Button
                        type="primary"
                        size="large"
                        icon={<ShoppingCartOutlined />}
                        disabled={!canAdd}
                        onClick={onAddToCart}
                        style={{ borderRadius: 24, padding: '0 24px', flexShrink: 0 }}
                    >
                        Comprar
                    </Button>
                </div>
            )}

            <Modal
                title="Guía de Tallas"
                open={isSizeGuideOpen}
                onCancel={() => setIsSizeGuideOpen(false)}
                footer={null}
                width={700}
                centered
            >
                {initialData.product.size_guide_url ? (
                    <div style={{ textAlign: 'center' }}>
                        <Image 
                            src={initialData.product.size_guide_url} 
                            alt="Guía de tallas" 
                            style={{ maxWidth: '100%', borderRadius: 8 }} 
                        />
                    </div>
                ) : (
                    <Text type="secondary">Guía de tallas no disponible para este producto.</Text>
                )}
            </Modal>
        </div>
    );
}
