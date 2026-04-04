'use client';

import React, { useMemo, useState } from 'react';
import { Card, Flex, Image, theme } from 'antd';
import type { ProductImage } from '@/types/product';

export default function ProductGallery({ images }: { images: ProductImage[] }) {
    const { token } = theme.useToken();
    // Sort images by sort_order
    const sorted = useMemo(() => [...images].sort((a, b) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0)), [images]);
    const [activeIndex, setActiveIndex] = useState(0);
    const [isPreviewOpen, setIsPreviewOpen] = useState(false);

    if (sorted.length === 0) {
        return (
            <Card styles={{ body: { padding: 0 } }} style={{ overflow: 'hidden' }}>
                <div style={{ width: '100%', aspectRatio: '3 / 4', background: token.colorFillAlter }} />
            </Card>
        );
    }

    return (
        <Flex gap={16} vertical={false} style={{ width: '100%' }} align="start">
            {/* --- Thumbnails Rail (Desktop: Left) --- */}
            {sorted.length > 1 && (
                <div className="gallery-thumbs-rail-desktop">
                    <Flex vertical gap={12} style={{ width: 80, flexShrink: 0 }}>
                        {sorted.map((img, idx) => (
                            <div 
                                key={img.imageId || idx} 
                                onClick={() => setActiveIndex(idx)}
                                style={{ 
                                    cursor: 'pointer',
                                    borderRadius: 8,
                                    overflow: 'hidden',
                                    border: `2px solid ${activeIndex === idx ? token.colorPrimary : 'transparent'}`,
                                    transition: 'all 0.2s ease',
                                    opacity: activeIndex === idx ? 1 : 0.7,
                                    transform: activeIndex === idx ? 'scale(1.02)' : 'scale(1)'
                                }}
                            >
                                <img 
                                    src={img.url} 
                                    alt={`thumb-${idx}`} 
                                    style={{ width: '100%', aspectRatio: '3 / 4', objectFit: 'cover', display: 'block' }} 
                                />
                            </div>
                        ))}
                    </Flex>
                </div>
            )}

            {/* --- Main Display --- */}
            <div style={{ flex: 1, minWidth: 0 }}>
                <Card 
                    styles={{ body: { padding: 0 } }} 
                    style={{ 
                        overflow: 'hidden', 
                        borderRadius: 12,
                        background: token.colorFillAlter,
                        boxShadow: 'none',
                        border: `1px solid ${token.colorBorderSecondary}`
                    }}
                >
                    <Image.PreviewGroup
                        items={sorted.map(img => img.url)}
                        preview={{
                            open: isPreviewOpen,
                            current: activeIndex,
                            onChange: (current) => setActiveIndex(current),
                            onVisibleChange: (visible) => setIsPreviewOpen(visible),
                        }}
                    >
                        <div className="main-image-container" onClick={() => setIsPreviewOpen(true)}>
                            <Image
                                preview={false}
                                src={sorted[activeIndex]?.url}
                                alt="Vista ampliada del producto"
                                style={{ width: '100%', height: '100%', objectFit: 'contain' }}
                                wrapperStyle={{ width: '100%', display: 'block' }}
                                placeholder={
                                    <div style={{ width: '100%', height: '100%', background: token.colorFillAlter }} />
                                }
                            />
                        </div>
                    </Image.PreviewGroup>
                </Card>

                {/* --- Thumbnails Rail (Mobile: Bottom) --- */}
                {sorted.length > 1 && (
                    <div className="gallery-thumbs-rail-mobile">
                        <Flex gap={10} style={{ overflowX: 'auto', padding: '12px 2px', scrollbarWidth: 'none' }}>
                            {sorted.map((img, idx) => (
                                <div 
                                    key={img.imageId || idx} 
                                    onClick={() => setActiveIndex(idx)}
                                    style={{ 
                                        width: 64,
                                        flexShrink: 0,
                                        cursor: 'pointer',
                                        borderRadius: 6,
                                        overflow: 'hidden',
                                        border: `2px solid ${activeIndex === idx ? token.colorPrimary : 'transparent'}`,
                                        opacity: activeIndex === idx ? 1 : 0.8
                                    }}
                                >
                                    <img 
                                        src={img.url} 
                                        alt={`thumb-mob-${idx}`} 
                                        style={{ width: '100%', aspectRatio: '3 / 4', objectFit: 'cover', display: 'block' }} 
                                    />
                                </div>
                            ))}
                        </Flex>
                    </div>
                )}
            </div>

            <style jsx>{`
                .main-image-container {
                    width: 100%;
                    aspect-ratio: 3 / 4;
                    max-height: 700px;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    cursor: zoom-in;
                }
                .gallery-thumbs-rail-mobile {
                    display: none;
                }
                .gallery-thumbs-rail-desktop {
                    display: block;
                }
                
                @media (max-width: 768px) {
                    .gallery-thumbs-rail-desktop {
                        display: none;
                    }
                    .gallery-thumbs-rail-mobile {
                        display: block;
                    }
                }
            `}</style>
        </Flex>
    );
}