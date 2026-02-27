'use client';

import React, { useMemo, useState } from 'react';
import { Card } from 'antd';
import type { ProductImage } from '@/types/product';

export default function ProductGallery({ images }: { images: ProductImage[] }) {
    const sorted = useMemo(() => [...images].sort((a, b) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0)), [images]);
    const [active, setActive] = useState(0);

    const activeUrl = sorted[active]?.url ?? null;

    return (
        <div style={{ display: 'grid', gap: 12 }}>
            <Card
                styles={{ body: { padding: 0 } }}
                style={{ overflow: 'hidden' }}
            >
                <div style={{ width: '100%', aspectRatio: '1 / 1' }}>
                    {activeUrl ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                            src={activeUrl}
                            alt="Producto"
                            style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                        />
                    ) : null}
                </div>
            </Card>

            {sorted.length > 1 ? (
                <div style={{ display: 'flex', gap: 8, overflowX: 'auto', paddingBottom: 4 }}>
                    {sorted.map((img, idx) => (
                        <button
                            key={img.imageId}
                            type="button"
                            onClick={() => setActive(idx)}
                            style={{
                                border: idx === active ? '2px solid #1677ff' : '1px solid #e5e5e5',
                                borderRadius: 10,
                                padding: 0,
                                background: 'transparent',
                                cursor: 'pointer',
                                flex: '0 0 auto',
                            }}
                            aria-label={`Imagen ${idx + 1}`}
                        >
                            <div style={{ width: 70, height: 70, borderRadius: 8, overflow: 'hidden' }}>
                                {/* eslint-disable-next-line @next/next/no-img-element */}
                                <img
                                    src={img.url}
                                    alt="Thumb"
                                    style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                                />
                            </div>
                        </button>
                    ))}
                </div>
            ) : null}
        </div>
    );
}