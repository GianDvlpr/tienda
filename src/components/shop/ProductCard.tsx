'use client';

import { useState, MouseEvent } from 'react';
import { Card, Typography, Tooltip } from 'antd';
import { HeartFilled, EyeFilled } from '@ant-design/icons';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import type { ProductListItem } from '@/types/product';
import { useWishlistStore } from '@/store/wishlist.store';
import { useUIStore } from '@/store/ui.store';

const { Text } = Typography;

function formatPrice(min: number, max: number) {
    if (min === max) return `S/ ${min.toFixed(2)}`;
    return `S/ ${min.toFixed(2)} - S/ ${max.toFixed(2)}`;
}

export default function ProductCard({ item }: { item: ProductListItem }) {
    const router = useRouter();
    const [isHovered, setIsHovered] = useState(false);
    
    // El store necesita la variante específica (talla, color). 
    // Por eso, en la cuadrícula general solo chequeamos si ALGUNA variante de este producto está en Favoritos.
    const isWishlisted = useWishlistStore((state) => 
        state.items.some(x => x.productId === item.productId)
    );

    const isOutOfStock = item.variantsInStock <= 0;
    
    // para demostrar la etiqueta "NUEVO" (ej. los últimos agregados basados en el ID o stock).
    const isNew = item.variantsInStock > 50; 

    const openQuickView = useUIStore((s) => s.openQuickView);
    const [isAdding, setIsAdding] = useState(false);

    const handleHeartClick = async (e: MouseEvent) => {
        e.preventDefault(); // Previene que el Link envuelva el clic y nos mande a la página
        e.stopPropagation();
        
        if (isWishlisted) {
            const store = useWishlistStore.getState();
            // Delete all variants for this product
            const variantsToRemove = store.items.filter(x => x.productId === item.productId);
            variantsToRemove.forEach(v => store.removeItem(v.variantId));
            toast.success('Eliminado de favoritos');
        } else {
            if (isAdding) return;
            setIsAdding(true);
            const loadingId = toast.loading('Agregando a favoritos...');
            try {
                const res = await fetch(`/api/store/products/${item.slug}`);
                if (!res.ok) throw new Error();
                const data = await res.json();
                const variants = data.variants;
                if (!variants || variants.length === 0) throw new Error('Sin variantes');
                
                const variant = variants.find((v: any) => v.stock > 0) || variants[0];
                
                useWishlistStore.getState().addItem({
                    variantId: variant.variantId,
                    productId: data.product.productId,
                    slug: data.product.slug,
                    name: data.product.name,
                    size: variant.size,
                    color: variant.color,
                    sku: variant.sku,
                    imageUrl: data.images?.[0]?.url ?? null,
                    unitPrice: variant.price,
                });
                toast.success('Guardado en favoritos', { id: loadingId });
            } catch (err) {
                toast.error('Hubo un error al agregar', { id: loadingId });
                router.push(`/product/${item.slug}`);
            } finally {
                setIsAdding(false);
            }
        }
    };

    return (
        <Link href={`/product/${item.slug}`} style={{ textDecoration: 'none' }}>
            <Card
                hoverable
                variant="borderless"
                onMouseEnter={() => setIsHovered(true)}
                onMouseLeave={() => setIsHovered(false)}
                styles={{ 
                    body: { padding: '16px 4px' },
                    cover: { overflow: 'hidden' }
                }}
                style={{ background: 'transparent' }}
                cover={
                    <div style={{ width: '100%', aspectRatio: '1 / 1', position: 'relative', overflow: 'hidden' }}>
                        {/* Overlay: AGOTADO */}
                        {isOutOfStock && (
                            <div style={{
                                position: 'absolute',
                                top: 12,
                                left: 12,
                                zIndex: 10,
                                background: '#000',
                                color: '#fff',
                                padding: '4px 10px',
                                fontSize: 11,
                                fontWeight: 700,
                                letterSpacing: 1,
                            }}>
                                AGOTADO
                            </div>
                        )}
                        
                        {/* Overlay: NUEVO */}
                        {!isOutOfStock && isNew && (
                            <div style={{
                                position: 'absolute',
                                top: 12,
                                left: 12,
                                zIndex: 10,
                                background: '#fff',
                                color: '#000',
                                padding: '4px 10px',
                                fontSize: 11,
                                fontWeight: 700,
                                letterSpacing: 1,
                                boxShadow: '0 2px 8px rgba(0,0,0,0.1)'
                            }}>
                                NUEVO
                            </div>
                        )}

                        {/* Hover Overlay: Botón Favoritos (Corazón Rápido) */}
                        <div 
                            onClick={handleHeartClick}
                            style={{
                                position: 'absolute',
                                top: 12,
                                right: 12,
                                zIndex: 10,
                                width: 36,
                                height: 36,
                                borderRadius: '50%',
                                background: 'rgba(255,255,255,0.9)',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
                                opacity: isHovered || isWishlisted ? 1 : 0,
                                transform: isHovered || isWishlisted ? 'scale(1)' : 'scale(0.8)',
                                transition: 'all 0.2s',
                            }}
                        >
                            <Tooltip title={isWishlisted ? "En favoritos" : "Guardar en favoritos"}>
                                {isWishlisted ? (
                                    <HeartFilled style={{ color: '#ff4d4f', fontSize: 18 }} />
                                ) : (
                                    <HeartFilled style={{ color: 'rgba(0,0,0,0.15)', fontSize: 18 }} />
                                )}
                            </Tooltip>
                        </div>

                        {/* Hover Overlay: Botón Vista Rápida (Ojo) */}
                        <div 
                            onClick={(e) => { e.preventDefault(); e.stopPropagation(); openQuickView(item.slug); }}
                            style={{
                                position: 'absolute',
                                top: 56, // Desplazado hacia abajo del corazón
                                right: 12,
                                zIndex: 10,
                                width: 36,
                                height: 36,
                                borderRadius: '50%',
                                background: 'rgba(255,255,255,0.9)',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
                                opacity: isHovered ? 1 : 0,
                                transform: isHovered ? 'scale(1)' : 'scale(0.8)',
                                transition: 'all 0.2s',
                            }}
                        >
                            <Tooltip title="Vista Rápida">
                                <EyeFilled style={{ color: '#000', fontSize: 18 }} />
                            </Tooltip>
                        </div>

                        {item.primaryImageUrl ? (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img
                                src={item.primaryImageUrl}
                                alt={item.name}
                                style={{ 
                                    width: '100%', 
                                    height: '100%', 
                                    objectFit: 'cover',
                                    transition: 'transform 0.6s cubic-bezier(0.25, 0.46, 0.45, 0.94)',
                                    transform: isHovered ? 'scale(1.08)' : 'scale(1)'
                                }}
                            />
                        ) : (
                            <div style={{ width: '100%', height: '100%', background: '#f5f5f5' }} />
                        )}
                    </div>
                }
            >
                <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                    <Text strong style={{ fontSize: 15, transition: 'color 0.2s', color: isHovered ? '#666' : '#000' }}>
                        {item.name}
                    </Text>
                    <Text style={{ fontSize: 14 }}>{formatPrice(item.minPrice, item.maxPrice)}</Text>
                </div>
            </Card>
        </Link>
    );
}