'use client';

import { toast } from 'sonner';
import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Alert, Button, Card, Divider, Input, Radio, Space, Typography, Row, Col, Flex, Grid, Modal, Image, theme } from 'antd';
import { WhatsAppOutlined, HeartOutlined, HeartFilled, ShoppingCartOutlined } from '@ant-design/icons';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';


import ProductGallery from '@/components/shop/ProductGallery';
import type { BundlePromotion, ProductDetailResponse, ProductVariant } from '@/types/product';
import { formatPEN } from '@/lib/money';
import { useCartStore } from '@/store/cart.store';
import { useWishlistStore } from '@/store/wishlist.store';
import { useUIStore } from '@/store/ui.store';
import { sortSizes } from '@/lib/sizes';
import { CUSTOM_COLOR_OPTIONS, CUSTOM_MEASUREMENT_LABELS, CUSTOM_ORDER_NOTICE, getAvailableCustomColorName, getMeasurementsForSize, parseSizeGuideJson, type CustomColorOption } from '@/lib/customization';


const { Title, Text, Paragraph } = Typography;

const CUSTOM_SIZE_OPTIONS = ['XS', 'S', 'M', 'L', 'XL'];

function normalizeColor(color?: string | null) {
    return String(color || '').trim().normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
}

function getBundleDescription(bundle: BundlePromotion, otherItemNames: string[]) {
    if (bundle.description) return bundle.description;

    const offers: string[] = [];
    if (Number(bundle.bundle_price || 0) > 0) offers.push(`conjunto por ${formatPEN(bundle.bundle_price!)}`);
    if (!Number(bundle.bundle_price || 0) && Number(bundle.discount_amount || 0) > 0) offers.push(`ahorra ${formatPEN(bundle.discount_amount)}`);
    if (Number(bundle.tier_2_price || 0) > 0) offers.push(`2 conjuntos por ${formatPEN(bundle.tier_2_price!)}`);
    if (Number(bundle.tier_3_price || 0) > 0) offers.push(`3 conjuntos por ${formatPEN(bundle.tier_3_price!)}`);

    if (offers.length > 0) return `Lleva este producto junto a ${otherItemNames.join(', ')}: ${offers.join(' · ')}.`;
    return `Lleva este producto junto a ${otherItemNames.join(', ')} y arma tu conjunto.`;
}

interface ProductDetailClientProps {
    initialData: ProductDetailResponse;
}

export default function ProductDetailClient({ initialData }: ProductDetailClientProps) {
    const searchParams = useSearchParams();
    const { token } = theme.useToken();
    const screens = Grid.useBreakpoint();
    const isMobile = !screens.md;

    const addCartItem = useCartStore((s) => s.addItem);
    const setCartOpen = useUIStore((s) => s.setCartOpen);
    const addWishlistItem = useWishlistStore((s) => s.addItem);
    const removeWishlistItem = useWishlistStore((s) => s.removeItem);
    const isInWishlist = useWishlistStore((s) => s.isInWishlist);

    const [selectedSize, setSelectedSize] = useState<string | null>(null);
    const [selectedColor, setSelectedColor] = useState<string | null>(null);
    const [isSizeGuideOpen, setIsSizeGuideOpen] = useState(false);
    const [isCustomizationOpen, setIsCustomizationOpen] = useState(false);
    const [customSize, setCustomSize] = useState('S');
    const [customColor, setCustomColor] = useState(getAvailableCustomColorName());
    const [customColorOptions, setCustomColorOptions] = useState<CustomColorOption[]>(CUSTOM_COLOR_OPTIONS.map((color) => ({ ...color })));
    const [customMeasurements, setCustomMeasurements] = useState<Record<string, string>>({});
    const [customBundle, setCustomBundle] = useState<BundlePromotion | null>(null);
    const [customBundleMeasurements, setCustomBundleMeasurements] = useState<Record<string, Record<string, string>>>({});
    const [customBundleColors, setCustomBundleColors] = useState<Record<string, string>>({});
    const hasAutoOpenedCustomization = useRef(false);

    useEffect(() => {
        if (!initialData) return;

        const first = (initialData.variants ?? []).find((v) => v.stock > 0) ?? (initialData.variants ?? [])[0];
        if (first) {
            setSelectedSize(first.size);
            setSelectedColor(first.color);
        }
    }, [initialData]);

    useEffect(() => {
        const params = new URLSearchParams();
        if (initialData.product.customFabricSupplyId) params.set('supplyId', initialData.product.customFabricSupplyId);

        fetch(`/api/store/custom-colors?${params.toString()}`)
            .then((res) => res.ok ? res.json() : null)
            .then((data) => {
                if (Array.isArray(data) && data.length > 0) setCustomColorOptions(data);
            })
            .catch(() => undefined);
    }, [initialData.product.customFabricSupplyId]);

    const variants = initialData?.variants ?? [];

    const sizeOptions = useMemo(() => {
        const set = new Set<string>();
        for (const v of variants) set.add(v.size);
        return sortSizes(Array.from(set));
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

    const selectedImage = useMemo(() => {
        const images = initialData.images ?? [];
        if (!selectedColor) return images[0] ?? null;
        return images.find((img) => normalizeColor(img.color) === normalizeColor(selectedColor)) ?? images[0] ?? null;
    }, [initialData.images, selectedColor]);

    const canAdd = !!selectedVariant && selectedVariant.stock > 0;
    const isWishlisted = selectedVariant ? isInWishlist(selectedVariant.variantId) : false;
    const isCustomizable = !!initialData.product.isCustomizable;
    const customizationType = initialData.product.customizationType === 'PANTS' ? 'PANTS' : 'UPPER';
    const customizationLabels = CUSTOM_MEASUREMENT_LABELS[customizationType];
    const customizationSurcharge = Number(initialData.product.customizationSurcharge ?? 5);

    const customizationReferenceVariant = useMemo(() => {
        if (!isCustomizable) return null;
        return variants.find((v) => selectedColor && v.color === selectedColor)
            ?? variants.find((v) => v.stock > 0)
            ?? variants[0]
            ?? null;
    }, [isCustomizable, selectedColor, variants]);

    const availableSizes = useMemo(() => {
        const set = new Set<string>();
        for (const variant of variants) {
            if (variant.stock > 0) set.add(variant.size);
        }
        return set;
    }, [variants]);

    useEffect(() => {
        if (!isCustomizable || !customSize) return;
        setCustomMeasurements(getMeasurementsForSize(initialData.product.size_guide_json, customSize, customizationLabels));
    }, [customSize, initialData.product.size_guide_json, isCustomizable, customizationLabels]);

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
            imageUrl: selectedImage?.url ?? null,
            unitPrice: selectedVariant.price,
        }, 1);

        toast.success('Agregado a tu carrito');
    };

    const openCustomization = () => {
        if (!initialData || !customizationReferenceVariant) return;
        if (!selectedColor && !customizationReferenceVariant.color) {
            toast.warning('Elige un color para personalizar');
            return;
        }
        const initialSize = CUSTOM_SIZE_OPTIONS.includes(selectedSize || '') ? selectedSize! : 'S';
        setCustomSize(initialSize);
        setCustomColor(getAvailableCustomColorName(selectedColor || customizationReferenceVariant.color, customColorOptions));
        setCustomMeasurements(getMeasurementsForSize(initialData.product.size_guide_json, initialSize, customizationLabels));
        setIsCustomizationOpen(true);
    };

    useEffect(() => {
        if (hasAutoOpenedCustomization.current) return;
        if (searchParams.get('personalizar') !== '1') return;
        if (!isCustomizable || !customizationReferenceVariant) return;

        hasAutoOpenedCustomization.current = true;
        const initialSize = CUSTOM_SIZE_OPTIONS.includes(selectedSize || '') ? selectedSize! : 'S';
        setCustomSize(initialSize);
        setCustomColor(getAvailableCustomColorName(selectedColor || customizationReferenceVariant.color, customColorOptions));
        setCustomMeasurements(getMeasurementsForSize(initialData.product.size_guide_json, initialSize, customizationLabels));
        setIsCustomizationOpen(true);
    }, [customColorOptions, customizationLabels, customizationReferenceVariant, initialData.product.size_guide_json, isCustomizable, searchParams, selectedSize]);

    const onAddCustomizedToCart = () => {
        if (!initialData || !customizationReferenceVariant) return;
        const missing = customizationLabels.filter((label) => !String(customMeasurements[label] || '').trim());
        if (missing.length > 0) {
            toast.warning(`Completa las medidas: ${missing.join(', ')}`);
            return;
        }

        addCartItem({
            cartItemId: `${customizationReferenceVariant.variantId}:custom:${Date.now()}`,
            variantId: customizationReferenceVariant.variantId,
            productId: initialData.product.productId,
            slug: initialData.product.slug,
            name: initialData.product.name,
            size: customSize,
            color: customColor,
            sku: customizationReferenceVariant.sku,
            imageUrl: selectedImage?.url ?? null,
            unitPrice: Number(customizationReferenceVariant.price) + customizationSurcharge,
            isCustomized: true,
            customMeasurements,
            customizationSurcharge,
        }, 1);

        setIsCustomizationOpen(false);
        setCartOpen(true);
        toast.success('Prenda personalizada agregada a tu carrito');
    };

    const openBundleCustomization = (bundle: BundlePromotion) => {
        if (!selectedVariant || !canAdd) {
            toast.warning('Elige una talla y color disponible');
            return;
        }

        const otherItems = bundle.items.filter((item) => item.productId !== initialData.product.productId);
        const missingCustomizable = otherItems.some((item) => !item.isCustomizable || !item.variantId);
        if (missingCustomizable || !isCustomizable) {
            toast.warning('Todos los productos del conjunto deben permitir personalización y tener variante disponible');
            return;
        }

        const nextMeasurements: Record<string, Record<string, string>> = {
            [initialData.product.productId]: getMeasurementsForSize(initialData.product.size_guide_json, selectedVariant.size, customizationLabels),
        };
        const nextColors: Record<string, string> = {
            [initialData.product.productId]: getAvailableCustomColorName(selectedColor || selectedVariant.color, customColorOptions),
        };

        otherItems.forEach((item) => {
            const type = item.customizationType === 'PANTS' ? 'PANTS' : 'UPPER';
            nextMeasurements[item.productId] = getMeasurementsForSize(item.sizeGuideJson, item.size, CUSTOM_MEASUREMENT_LABELS[type]);
            nextColors[item.productId] = getAvailableCustomColorName(item.color, customColorOptions);
        });

        setCustomBundleMeasurements(nextMeasurements);
        setCustomBundleColors(nextColors);
        setCustomBundle(bundle);
    };

    const onAddCustomizedBundleToCart = () => {
        if (!customBundle || !selectedVariant) return;

        const otherItems = customBundle.items.filter((item) => item.productId !== initialData.product.productId);
        const lines = [
            {
                productId: initialData.product.productId,
                variantId: selectedVariant.variantId,
                name: initialData.product.name,
                slug: initialData.product.slug,
                size: selectedVariant.size,
                color: customBundleColors[initialData.product.productId] || getAvailableCustomColorName(selectedVariant.color, customColorOptions),
                sku: selectedVariant.sku,
                unitPrice: Number(selectedVariant.price),
                imageUrl: selectedImage?.url ?? null,
                customizationType,
            },
            ...otherItems.map((item) => ({
                productId: item.productId,
                variantId: item.variantId!,
                name: item.name,
                slug: item.slug,
                size: item.size || 'UN',
                color: customBundleColors[item.productId] || getAvailableCustomColorName(item.color, customColorOptions),
                sku: item.sku || '',
                unitPrice: Number(item.unitPrice || 0),
                imageUrl: item.primaryImageUrl ?? null,
                customizationType: item.customizationType === 'PANTS' ? 'PANTS' : 'UPPER',
            })),
        ];

        for (const line of lines) {
            const labels = CUSTOM_MEASUREMENT_LABELS[line.customizationType as 'PANTS' | 'UPPER'];
            const missing = labels.filter((label) => !String(customBundleMeasurements[line.productId]?.[label] || '').trim());
            if (missing.length > 0) {
                toast.warning(`Completa medidas de ${line.name}: ${missing.join(', ')}`);
                return;
            }
        }

        const groupId = `bundle-${customBundle.bundle_id}-${Date.now()}`;
        const bundleSurcharge = Number(customBundle.customization_surcharge ?? 8);
        lines.forEach((line, index) => {
            addCartItem({
                cartItemId: `${line.variantId}:custom-bundle:${groupId}`,
                variantId: line.variantId,
                productId: line.productId,
                slug: line.slug,
                name: line.name,
                size: line.size,
                color: line.color,
                sku: line.sku,
                imageUrl: line.imageUrl,
                unitPrice: line.unitPrice + (index === 0 ? bundleSurcharge : 0),
                isCustomized: true,
                customMeasurements: customBundleMeasurements[line.productId],
                customizationSurcharge: index === 0 ? bundleSurcharge : 0,
                customizationGroupId: groupId,
                customizationGroupLabel: `Conjunto personalizado: ${customBundle.name}`,
            }, 1);
        });

        setCustomBundle(null);
        setCartOpen(true);
        toast.success('Conjunto personalizado agregado a tu carrito');
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
                imageUrl: selectedImage?.url ?? null,
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

    const [showStickyBar, setShowStickyBar] = useState(false);

    useEffect(() => {
        const handleScroll = () => {
            if (window.scrollY > 700) {
                setShowStickyBar(true);
            } else {
                setShowStickyBar(false);
            }
        };
        window.addEventListener('scroll', handleScroll);
        return () => window.removeEventListener('scroll', handleScroll);
    }, []);

    return (
        <div style={{ maxWidth: 1200, margin: '0 auto', padding: isMobile ? '12px' : 24, paddingTop: isMobile ? 84 : 100, paddingBottom: isMobile ? 92 : 24 }}>
             {/* Sticky Barra Compra Móvil */}
              {isMobile && showStickyBar && (
                <div style={{
                    position: 'fixed',
                    bottom: 0,
                    left: 0,
                    right: 0,
                    backgroundColor: 'rgba(255, 255, 255, 0.95)',
                    backdropFilter: 'blur(10px)',
                    borderTop: '1px solid #f0f0f0',
                    padding: '12px 16px',
                    zIndex: 1000,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    boxShadow: '0 -4px 12px rgba(0,0,0,0.05)',
                    animation: 'slideUp 0.3s ease'
                }}>
                    <div style={{ flex: 1, minWidth: 0, marginRight: 12 }}>
                        <Text strong ellipsis style={{ display: 'block', fontSize: 13 }}>{initialData.product.name}</Text>
                        <Text style={{ color: '#C89F53', fontWeight: 700 }}>{formatPEN(selectedVariant?.price ?? initialData.product.basePrice)}</Text>
                    </div>
                    <Space size="small">
                        <Button 
                            type="primary" 
                            size="middle"
                            icon={<ShoppingCartOutlined />}
                            onClick={onAddToCart}
                            disabled={!canAdd}
                            style={{ 
                                backgroundColor: '#C89F53', 
                                borderColor: '#C89F53',
                                borderRadius: '20px',
                                fontWeight: 600
                            }}
                        >
                            Añadir
                        </Button>
                        <Button 
                            icon={<WhatsAppOutlined />} 
                            onClick={handleWhatsAppConsult}
                            style={{ borderRadius: '50%', width: 40, height: 40, padding: 0 }}
                        />
                    </Space>

                    <style jsx>{`
                        @keyframes slideUp {
                            from { transform: translateY(100%); }
                            to { transform: translateY(0); }
                        }
                    `}</style>
                </div>
            )}

            <div style={{ display: 'grid', gap: 16 }}>

                <Card variant="borderless" styles={{ body: { padding: isMobile ? 16 : 24 } }}>
                    <Row gutter={[24, 24]}>
                        <Col xs={24} md={12}>
                            <ProductGallery images={initialData.images ?? []} selectedColor={selectedColor} />
                        </Col>

                        <Col xs={24} md={12}>
                            <Space orientation="vertical" size={10} style={{ width: '100%' }}>


                                <Title level={3} style={{ margin: 0, fontSize: isMobile ? 26 : undefined, lineHeight: 1.1 }}>
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
                                    <Flex align="center" justify="space-between" style={{ marginBottom: 8 }}>
                                        {isCustomizable ? (
                                            <Button
                                                type="link"
                                                size="small"
                                                disabled={!customizationReferenceVariant}
                                                onClick={openCustomization}
                                                style={{ padding: 0, height: 'auto' }}
                                            >
                                                Personalizar prenda
                                            </Button>
                                        ) : <span />}
                                        {(initialData.product.size_guide_url || initialData.product.size_guide_json) && (
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
                                        style={{ flex: 1, minWidth: isMobile ? '100%' : 200 }}
                                    >
                                        Agregar al Carrito
                                    </Button>

                                    <Button
                                        size="large"
                                        icon={isWishlisted ? <HeartFilled style={{ color: '#ff4d4f' }} /> : <HeartOutlined />}
                                        disabled={!canAdd}
                                        onClick={onToggleWishlist}
                                        style={{ flex: 1, minWidth: isMobile ? '100%' : 200 }}
                                    >
                                        {isWishlisted ? 'En Favoritos' : 'Añadir a Deseos'}
                                    </Button>

                                    <Button
                                        size="large"
                                        icon={<WhatsAppOutlined />}
                                        disabled={!canAdd}
                                        onClick={handleWhatsAppConsult}
                                        style={{ color: '#25D366', borderColor: '#25D366', flex: 1, minWidth: isMobile ? '100%' : 200 }}
                                    >
                                        WhatsApp
                                    </Button>
                                </Flex>
                                 {!canAdd ? (
                                    <Text type="secondary" style={{ color: 'red' }}>Selecciona una variante disponible para consultar.</Text>
                                ) : null}

                                {initialData.bundles && initialData.bundles.length > 0 && (
                                    <div style={{ marginTop: 32 }}>
                                        <Divider>



                                            <Space>
                                                <Text strong style={{ fontSize: 16 }}>Arma tu conjunto</Text>
                                            </Space>

                                        </Divider>
                                        
                                        {initialData.bundles.map(bundle => {
                                            const otherItems = bundle.items.filter(i => i.productId !== initialData.product.productId);
                                            return (
                                                <Card 
                                                    key={bundle.bundle_id} 
                                                    size="small" 
                                                    style={{ 
                                                        borderColor: 'rgba(200, 159, 83, 0.4)', 
                                                        background: 'transparent',
                                                        marginBottom: 16
                                                    }}
                                                >

                                                    <Space orientation="vertical" style={{ width: '100%', gap: 8 }}>
                                                        <Text strong>{bundle.name}</Text>
                                                        <Text type="secondary" style={{ fontSize: 13, display: 'block' }}>
                                                            {getBundleDescription(bundle, otherItems.map(i => i.name))}
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
                                                            
                                                            <div style={{ marginLeft: isMobile ? 0 : 'auto', width: isMobile ? '100%' : undefined }}>
                                                                <Button 
                                                                    type="primary" 
                                                                    size="middle"
                                                                    icon={<ShoppingCartOutlined />}
                                                                    style={{ 
                                                                        backgroundColor: '#C89F53', 
                                                                        borderColor: '#C89F53',
                                                                        borderRadius: '20px',
                                                                        padding: '0 24px',
                                                                        fontWeight: 600,
                                                                        width: isMobile ? '100%' : undefined,
                                                                        boxShadow: '0 2px 8px rgba(200, 159, 83, 0.2)'
                                                                    }}
                                                                    onClick={() => {
                                                                        // 1. Add current product (selected variant)
                                                                        if (selectedVariant) {
                                                                            addCartItem({
                                                                                productId: initialData.product.productId,
                                                                                variantId: selectedVariant.variantId,
                                                                                name: initialData.product.name,
                                                                                slug: initialData.product.slug,
                                                                                size: selectedVariant.size,
                                                                                color: selectedVariant.color,
                                                                                sku: selectedVariant.sku,
                                                                                unitPrice: Number(selectedVariant.price),
                                                                                imageUrl: selectedImage?.url
                                                                            }, 1);
                                                                        }

                                                                        // 2. Add other items in the bundle
                                                                        otherItems.forEach((item: any) => {
                                                                            if (item.variantId) {
                                                                                addCartItem({
                                                                                    productId: item.productId,
                                                                                    variantId: item.variantId,
                                                                                    name: item.name,
                                                                                    slug: item.slug,
                                                                                    size: item.size,
                                                                                    color: item.color,
                                                                                    sku: item.sku,
                                                                                    unitPrice: item.unitPrice,
                                                                                    imageUrl: item.primaryImageUrl
                                                                                }, 1);
                                                                            }
                                                                        });
                                                                        toast.success("Conjunto añadido al carrito");
                                                                    }}
                                                                >
                                                                    Añadir conjunto
                                                                </Button>

                                                                <Button
                                                                    size="middle"
                                                                    style={{
                                                                        marginTop: 8,
                                                                        borderColor: '#C89F53',
                                                                        color: '#C89F53',
                                                                        borderRadius: '20px',
                                                                        padding: '0 18px',
                                                                        fontWeight: 600,
                                                                        width: isMobile ? '100%' : undefined,
                                                                    }}
                                                                    onClick={() => openBundleCustomization(bundle)}
                                                                >
                                                                    Personalizar conjunto (+{formatPEN(Number(bundle.customization_surcharge ?? 8))})
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
            
            {isMobile && !showStickyBar && (
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
                    <div style={{ flex: 1, minWidth: 0 }}>
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
                title="Personalizar prenda"
                open={isCustomizationOpen}
                onCancel={() => setIsCustomizationOpen(false)}
                onOk={onAddCustomizedToCart}
                okText="Confirmar medidas"
                cancelText="Cancelar"
                width={isMobile ? 'calc(100vw - 24px)' : 620}
                centered
            >
                <Space orientation="vertical" size="middle" style={{ width: '100%' }}>
                    <Alert type="info" showIcon message={CUSTOM_ORDER_NOTICE} />
                    <div>
                        <Text strong>{initialData.product.name}</Text>
                        <Text type="secondary" style={{ display: 'block', marginTop: 2 }}>
                            Color {customColor} / Precio personalizado {formatPEN((customizationReferenceVariant?.price ?? initialData.product.basePrice ?? 0) + customizationSurcharge)}
                        </Text>
                    </div>
                    <div>
                        <Text strong>Color personalizado</Text>
                        <Radio.Group
                            value={customColor}
                            onChange={(event) => setCustomColor(event.target.value)}
                            style={{
                                display: 'grid',
                                gridTemplateRows: 'repeat(2, auto)',
                                gridAutoFlow: 'column',
                                gridAutoColumns: 'max-content',
                                gap: 8,
                                marginTop: 8,
                                overflowX: 'auto',
                                paddingBottom: 8,
                                maxWidth: '100%',
                            }}
                        >
                            {customColorOptions.map((color) => (
                                <Radio.Button
                                    key={color.name}
                                    value={color.name}
                                    disabled={!color.available}
                                    style={{ height: 'auto', padding: '6px 10px' }}
                                >
                                    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
                                        <span style={{ width: 14, height: 14, borderRadius: '50%', background: color.hex, border: `1px solid ${token.colorBorderSecondary}` }} />
                                        {color.name}{!color.available ? ' (Agotado)' : ''}
                                    </span>
                                </Radio.Button>
                            ))}
                        </Radio.Group>
                    </div>
                    <div>
                        <Text strong>Talla personalizada</Text>
                        <Radio.Group
                            value={customSize}
                            onChange={(event) => setCustomSize(event.target.value)}
                            buttonStyle="solid"
                            style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginTop: 8 }}
                        >
                            {CUSTOM_SIZE_OPTIONS.map((size) => (
                                <Radio.Button key={size} value={size}>{size}</Radio.Button>
                            ))}
                        </Radio.Group>
                    </div>
                    <div style={{ overflowX: 'auto' }}>
                        <table style={{ width: '100%', borderCollapse: 'collapse', border: `1px solid ${token.colorBorderSecondary}` }}>
                            <thead>
                                <tr>
                                    <th style={{ padding: 10, textAlign: 'left', border: `1px solid ${token.colorBorderSecondary}`, background: token.colorBgLayout }}>Medida</th>
                                    <th style={{ padding: 10, textAlign: 'left', border: `1px solid ${token.colorBorderSecondary}`, background: token.colorBgLayout }}>Valor</th>
                                </tr>
                            </thead>
                            <tbody>
                                {customizationLabels.map((label) => (
                                    <tr key={label}>
                                        <td style={{ padding: 10, border: `1px solid ${token.colorBorderSecondary}`, fontWeight: 600 }}>{label}</td>
                                        <td style={{ padding: 10, border: `1px solid ${token.colorBorderSecondary}` }}>
                                            <Input
                                                value={customMeasurements[label] || ''}
                                                onChange={(event) => setCustomMeasurements((prev) => ({ ...prev, [label]: event.target.value }))}
                                                placeholder="Medida en cm"
                                            />
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </Space>
            </Modal>

            <Modal
                title="Personalizar conjunto completo"
                open={!!customBundle}
                onCancel={() => setCustomBundle(null)}
                onOk={onAddCustomizedBundleToCart}
                okText="Confirmar conjunto"
                cancelText="Cancelar"
                width={isMobile ? 'calc(100vw - 24px)' : 760}
                centered
            >
                {customBundle && selectedVariant && (
                    <Space orientation="vertical" size="middle" style={{ width: '100%' }}>
                        <Alert type="info" showIcon message={CUSTOM_ORDER_NOTICE} />
                        <Text type="secondary">
                            Se aplicará un solo recargo de conjunto personalizado de {formatPEN(Number(customBundle.customization_surcharge ?? 8))}.
                        </Text>
                        {[
                            {
                                productId: initialData.product.productId,
                                name: initialData.product.name,
                                size: selectedVariant.size,
                                color: selectedVariant.color,
                                customizationType,
                            },
                            ...customBundle.items
                                .filter((item) => item.productId !== initialData.product.productId)
                                .map((item) => ({
                                    productId: item.productId,
                                    name: item.name,
                                    size: item.size || 'UN',
                                    color: item.color || 'UN',
                                    customizationType: item.customizationType === 'PANTS' ? 'PANTS' : 'UPPER',
                                })),
                        ].map((line) => {
                            const labels = CUSTOM_MEASUREMENT_LABELS[line.customizationType as 'PANTS' | 'UPPER'];
                            return (
                                <Card key={line.productId} size="small" title={`${line.name} - ${line.size} / ${customBundleColors[line.productId] || line.color}`}>
                                    <div style={{ marginBottom: 12 }}>
                                        <Text strong style={{ fontSize: 12 }}>Color personalizado</Text>
                                        <Radio.Group
                                            value={customBundleColors[line.productId] || getAvailableCustomColorName(line.color, customColorOptions)}
                                            onChange={(event) => setCustomBundleColors((prev) => ({ ...prev, [line.productId]: event.target.value }))}
                                            style={{
                                                display: 'grid',
                                                gridTemplateRows: 'repeat(2, auto)',
                                                gridAutoFlow: 'column',
                                                gridAutoColumns: 'max-content',
                                                gap: 8,
                                                marginTop: 8,
                                                overflowX: 'auto',
                                                paddingBottom: 8,
                                                maxWidth: '100%',
                                            }}
                                        >
                                            {customColorOptions.map((color) => (
                                                <Radio.Button
                                                    key={color.name}
                                                    value={color.name}
                                                    disabled={!color.available}
                                                    style={{ height: 'auto', padding: '5px 8px' }}
                                                >
                                                    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
                                                        <span style={{ width: 12, height: 12, borderRadius: '50%', background: color.hex, border: `1px solid ${token.colorBorderSecondary}` }} />
                                                        {color.name}{!color.available ? ' (Agotado)' : ''}
                                                    </span>
                                                </Radio.Button>
                                            ))}
                                        </Radio.Group>
                                    </div>
                                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: 12 }}>
                                        {labels.map((label) => (
                                            <div key={label}>
                                                <Text strong style={{ fontSize: 12 }}>{label}</Text>
                                                <Input
                                                    value={customBundleMeasurements[line.productId]?.[label] || ''}
                                                    onChange={(event) => setCustomBundleMeasurements((prev) => ({
                                                        ...prev,
                                                        [line.productId]: {
                                                            ...(prev[line.productId] || {}),
                                                            [label]: event.target.value,
                                                        },
                                                    }))}
                                                    placeholder="Medida en cm"
                                                    style={{ marginTop: 6 }}
                                                />
                                            </div>
                                        ))}
                                    </div>
                                </Card>
                            );
                        })}
                    </Space>
                )}
            </Modal>

            <Modal
                title="Guía de Tallas"
                open={isSizeGuideOpen}
                onCancel={() => setIsSizeGuideOpen(false)}
                footer={null}
                width={isMobile ? 'calc(100vw - 24px)' : 700}
                centered
            >
                {(() => {
                    const hasJson = !!initialData.product.size_guide_json;
                    const hasUrl = !!initialData.product.size_guide_url;

                    if (!hasJson && !hasUrl) {
                        return <Text type="secondary">Guía de tallas no disponible para este producto.</Text>;
                    }

                    if (hasUrl) {
                        return (
                            <div style={{ textAlign: 'center' }}>
                                <Image
                                    src={initialData.product.size_guide_url!}
                                    alt="Guía de tallas"
                                    style={{ maxWidth: '100%', borderRadius: 8 }}
                                />
                            </div>
                        );
                    }

                    const sizeGuide = hasJson ? parseSizeGuideJson(initialData.product.size_guide_json) : null;
                    const table = sizeGuide ? (
                        <div style={{ overflowX: 'auto', marginBottom: 24 }}>
                            <table style={{ width: '100%', borderCollapse: 'collapse', border: `1px solid ${token.colorBorderSecondary}`, backgroundColor: token.colorBgContainer }}>
                                <thead>
                                    <tr>
                                        <th style={{ padding: '12px 8px', border: `1px solid ${token.colorBorderSecondary}`, background: token.colorBgLayout, textAlign: 'left', minWidth: 100 }}>Medida (cm)</th>
                                        {(sizeGuide.columns || []).map((col, i) => {
                                            const available = availableSizes.has(col);
                                            return (
                                                <th key={i} style={{ padding: '12px 8px', border: `1px solid ${token.colorBorderSecondary}`, background: token.colorBgLayout, textAlign: 'center', opacity: available ? 1 : 0.35 }}>
                                                    {col}
                                                    {!available && <Text type="secondary" style={{ display: 'block', fontSize: 10 }}>Sin stock</Text>}
                                                </th>
                                            );
                                        })}
                                    </tr>
                                </thead>
                                <tbody>
                                    {(sizeGuide.rows || []).map((row, i) => (
                                        <tr key={i}>
                                            <td style={{ padding: '12px 8px', border: `1px solid ${token.colorBorderSecondary}`, fontWeight: 600 }}>{row.label}</td>
                                            {row.values.map((val, j) => {
                                                const available = availableSizes.has((sizeGuide.columns || [])[j]);
                                                return (
                                                    <td key={j} style={{ padding: '12px 8px', border: `1px solid ${token.colorBorderSecondary}`, textAlign: 'center', opacity: available ? 1 : 0.35 }}>
                                                        {val}
                                                    </td>
                                                );
                                            })}
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    ) : null;

                    return table;
                })()}

            </Modal>
        </div>
    );
}
