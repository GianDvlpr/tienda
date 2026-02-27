'use client';

import { Card, Typography } from 'antd';
import Link from 'next/link';
import type { ProductListItem } from '@/types/product';

const { Text } = Typography;

function formatPrice(min: number, max: number) {
    if (min === max) return `S/ ${min.toFixed(2)}`;
    return `S/ ${min.toFixed(2)} - S/ ${max.toFixed(2)}`;
}

export default function ProductCard({ item }: { item: ProductListItem }) {
    return (
        <Link href={`/product/${item.slug}`} style={{ textDecoration: 'none' }}>
            <Card
                hoverable
                cover={
                    <div style={{ width: '100%', aspectRatio: '1 / 1', overflow: 'hidden', background: '#fafafa' }}>
                        {item.primaryImageUrl ? (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img
                                src={item.primaryImageUrl}
                                alt={item.name}
                                style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                            />
                        ) : null}
                    </div>
                }
            >
                <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                    <Text strong>{item.name}</Text>
                    <Text>{formatPrice(item.minPrice, item.maxPrice)}</Text>
                    <Text type="secondary">
                        {item.variantsInStock > 0 ? `${item.variantsInStock} variantes con stock` : 'Sin stock'}
                    </Text>
                </div>
            </Card>
        </Link>
    );
}