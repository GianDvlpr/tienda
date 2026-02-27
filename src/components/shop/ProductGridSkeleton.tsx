'use client';

import React from 'react';
import { Card, Col, Row, Skeleton } from 'antd';

export default function ProductGridSkeleton({ count = 12 }: { count?: number }) {
    const items = Array.from({ length: count });

    return (
        <Row gutter={[16, 16]}>
            {items.map((_, idx) => (
                <Col key={idx} xs={12} sm={12} md={8} lg={6}>
                    <Card
                        cover={
                            <div style={{ width: '100%', aspectRatio: '1 / 1', background: '#fafafa' }} />
                        }
                    >
                        <Skeleton active title={{ width: '80%' }} paragraph={{ rows: 2 }} />
                    </Card>
                </Col>
            ))}
        </Row>
    );
}