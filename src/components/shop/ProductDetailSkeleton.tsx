'use client';

import React from 'react';
import { Card, Divider, Skeleton, Space } from 'antd';

export default function ProductDetailSkeleton() {
    return (
        <Card>
            <div
                style={{
                    display: 'grid',
                    gridTemplateColumns: 'minmax(0, 1fr) minmax(0, 1fr)',
                    gap: 24,
                }}
            >
                {/* Galería */}
                <div style={{ display: 'grid', gap: 12 }}>
                    <div style={{ width: '100%', aspectRatio: '1 / 1', background: '#fafafa', borderRadius: 12 }} />
                    <div style={{ display: 'flex', gap: 8 }}>
                        {Array.from({ length: 4 }).map((_, i) => (
                            <div
                                key={i}
                                style={{
                                    width: 70,
                                    height: 70,
                                    background: '#fafafa',
                                    borderRadius: 10,
                                }}
                            />
                        ))}
                    </div>
                </div>

                {/* Info */}
                <div>
                    <Space orientation="vertical" size={10} style={{ width: '100%' }}>
                        <Skeleton active title={{ width: '70%' }} paragraph={false} />
                        <Skeleton.Input active style={{ width: 160, height: 20 }} />
                        <Skeleton.Input active style={{ width: 140, height: 28 }} />

                        <Skeleton active title={false} paragraph={{ rows: 3 }} />

                        <Divider style={{ margin: '12px 0' }} />

                        <div>
                            <Skeleton.Input active style={{ width: 120, height: 18 }} />
                            <div style={{ marginTop: 8, display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                                {Array.from({ length: 5 }).map((_, i) => (
                                    <Skeleton.Button key={i} active style={{ width: 56 }} />
                                ))}
                            </div>
                        </div>

                        <div>
                            <Skeleton.Input active style={{ width: 120, height: 18 }} />
                            <div style={{ marginTop: 8, display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                                {Array.from({ length: 4 }).map((_, i) => (
                                    <Skeleton.Button key={i} active style={{ width: 90 }} />
                                ))}
                            </div>
                        </div>

                        <Skeleton.Button active style={{ width: 220, height: 40 }} />
                    </Space>
                </div>
            </div>
        </Card>
    );
}