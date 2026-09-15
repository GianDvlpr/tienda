'use client';
import { useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { HeartOutlined, HeartFilled, EyeOutlined, PictureOutlined, LoadingOutlined, ArrowRightOutlined } from '@ant-design/icons';
import { theme } from 'antd';
import { toast } from 'sonner';
import type { ProductListItem, ProductDetailResponse } from '@/types/product';
import { useWishlistStore } from '@/store/wishlist.store';
import { useUIStore } from '@/store/ui.store';
import { getColorHex } from '@/lib/product-colors';
import styles from './shopVisual.module.css';

export default function ProductCard({ item }: { item: ProductListItem }) {
    const { token } = theme.useToken();
    const isWishlisted = useWishlistStore(state => state.items.some(x => x.productId === item.productId));
    const openQuickView = useUIStore(state => state.openQuickView);
    const [isAdding, setIsAdding] = useState(false);
    const [imageFailed, setImageFailed] = useState(false);
    const imageUrl = item.primaryImageUrl || item.secondaryImageUrl;
    const colors = item.colors || [];
    const url = `/product/${encodeURIComponent(item.slug)}`;
    const handleHeartClick = async () => {
        if (isAdding) return;
        if (isWishlisted) {
            const store = useWishlistStore.getState();
            store.items.filter(x => x.productId === item.productId).forEach(v => store.removeItem(v.variantId));
            toast.success('Eliminado de favoritos');
            return;
        }
        setIsAdding(true);
        try {
            const res = await fetch(`/api/store/products/${encodeURIComponent(item.slug)}`);
            if (!res.ok) throw new Error();
            const data: ProductDetailResponse = await res.json();
            const variant = data.variants.find(v => v.stock > 0) || data.variants[0];
            if (!variant) throw new Error();
            useWishlistStore.getState().addItem({ variantId: variant.variantId, productId: data.product.productId,
                slug: data.product.slug, name: data.product.name, size: variant.size, color: variant.color, sku: variant.sku,
                imageUrl: data.images?.[0]?.url ?? null, unitPrice: variant.price });
            toast.success('Guardado en favoritos');
        } catch { toast.error('No pudimos guardar la prenda. Inténtalo nuevamente.'); }
        finally { setIsAdding(false); }
    };
    return (
        <article className={styles.productCard} style={{ color: token.colorText }}>
            <Link href={url} className={styles.productLink}>
                <div className={styles.photo}>
                    {imageUrl && !imageFailed ? <>
                        <Image src={imageUrl} alt={item.name} fill sizes="(max-width: 1000px) 50vw, 25vw" className={styles.mainImage} onError={() => setImageFailed(true)} />
                        {item.secondaryImageUrl && item.primaryImageUrl && <Image src={item.secondaryImageUrl} alt="" aria-hidden fill sizes="(max-width: 1000px) 50vw, 25vw" className={styles.alternateImage} />}
                    </> : <span className={styles.photoFallback}><PictureOutlined /><span>Imagen no disponible</span></span>}
                    {item.variantsInStock <= 0 ? <span className={styles.productBadge}>Agotado</span> : item.isCustomizable ? <span className={styles.productBadge}>Personalizable</span> : null}
                </div>
                <div className={styles.productInfo}>
                    <h2>{item.name}</h2>
                    <p className={styles.price}>{item.minPrice !== item.maxPrice && <span>Desde </span>}S/ {item.minPrice.toFixed(2)}</p>
                    {colors.length > 0 && <div className={styles.colorSummary} aria-label={`Colores: ${colors.join(', ')}`}>
                        <span className={styles.swatches} aria-hidden>{colors.slice(0,4).map(color => <i key={color} title={color} style={{ background: getColorHex(color) }} />)}</span>
                        <span>{colors.length === 1 ? colors[0] : `${colors.length} colores`}</span>
                    </div>}
                </div>
            </Link>
            <div className={styles.imageActions}>
                <button type="button" className={styles.favorite} onClick={handleHeartClick} disabled={isAdding} aria-pressed={isWishlisted}
                aria-label={`${isWishlisted ? 'Quitar de' : 'Guardar en'} favoritos: ${item.name}`} title={isWishlisted ? 'Quitar de favoritos' : 'Guardar en favoritos'}>
                {isAdding ? <LoadingOutlined /> : isWishlisted ? <HeartFilled style={{color:'#9b4c4c'}} /> : <HeartOutlined />}
                </button>
                <button type="button" className={styles.favorite} onClick={() => openQuickView(item.slug)} aria-label={`Vista rápida: ${item.name}`} title="Vista rápida"><EyeOutlined /></button>
            </div>
            <div className={styles.cardActions}>
                <Link href={url} aria-label={`Ver prenda: ${item.name}`}>Ver prenda <ArrowRightOutlined /></Link>
            </div>
        </article>
    );
}
