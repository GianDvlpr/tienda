'use client';

import React, { useMemo } from 'react';
import { Card, Carousel } from 'antd';
import type { ProductImage } from '@/types/product';

export default function ProductGallery({ images }: { images: ProductImage[] }) {
    const sorted = useMemo(() => [...images].sort((a, b) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0)), [images]);

    if (sorted.length === 0) {
        return (
            <Card styles={{ body: { padding: 0 } }} style={{ overflow: 'hidden' }}>
                <div style={{ width: '100%', aspectRatio: '1 / 1', background: '#f5f5f5' }} />
            </Card>
        );
    }

    return (
        <Card
            styles={{ body: { padding: 0 } }}
            style={{ overflow: 'hidden' }}
        >
            <Carousel arrows dots={true} draggable>
                {sorted.map((img) => (
                    <div key={img.imageId}>
                        <div style={{ width: '100%', aspectRatio: '1 / 1' }}>
                            {/* eslint-disable-next-line @next/next/no-img-element */}
                            <img
                                src={img.url}
                                alt="Producto"
                                style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                                loading="lazy"
                            />
                        </div>
                    </div>
                ))}
            </Carousel>
        </Card>
    );
}