'use client';

import { Col, Row } from 'antd';
import { motion, Variants } from 'framer-motion';
import type { ProductListItem } from '@/types/product';
import ProductCard from './ProductCard';

const containerVariants: Variants = {
    hidden: {},
    visible: {
        transition: {
            staggerChildren: 0.07,
        },
    },
};

const itemVariants: Variants = {
    hidden: { opacity: 0, y: 24 },
    visible: {
        opacity: 1,
        y: 0,
        transition: {
            duration: 0.45,
            ease: "easeOut",
        },
    },
};

export default function ProductGrid({ items }: { items: ProductListItem[] }) {
    return (
        <motion.div
            variants={containerVariants}
            initial="hidden"
            animate="visible"
            key={items.map(p => p.productId).join(',')}
        >
            <Row gutter={[16, 16]}>
                {items.map((p) => (
                    <Col key={p.productId} xs={12} sm={12} md={8} lg={6}>
                        <motion.div variants={itemVariants}>
                            <ProductCard item={p} />
                        </motion.div>
                    </Col>
                ))}
            </Row>
        </motion.div>
    );
}