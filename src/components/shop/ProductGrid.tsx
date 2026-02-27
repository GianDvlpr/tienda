'use client';

import { Col, Row } from 'antd';
import type { ProductListItem } from '@/types/product';
import ProductCard from './ProductCard';

export default function ProductGrid({ items }: { items: ProductListItem[] }) {
    return (
        <Row gutter={[16, 16]}>
            {items.map((p) => (
                <Col key={p.productId} xs={12} sm={12} md={8} lg={6}>
                    <ProductCard item={p} />
                </Col>
            ))}
        </Row>
    );
}