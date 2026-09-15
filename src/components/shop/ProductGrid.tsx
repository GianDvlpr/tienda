'use client';
import type { ProductListItem } from '@/types/product';
import ProductCard from './ProductCard';
import styles from './shopVisual.module.css';
export default function ProductGrid({ items }: { items: ProductListItem[] }) {
    return <div className={styles.productGrid}>{items.map(item => <ProductCard key={item.productId} item={item} />)}</div>;
}
