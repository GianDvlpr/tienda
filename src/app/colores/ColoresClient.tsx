'use client';

import React, { useMemo, useState } from 'react';
import { Card, Switch, Empty, Image, Divider, Tooltip } from 'antd';
import Link from 'next/link';

export type ColorProductItem = {
    productId: string;
    slug: string;
    name: string;
    primaryImageUrl: string | null;
    fabricName: string | null;
    colors: {
        name: string;
        hex: string;
        available: boolean;
        stock: number;
    }[];
};

export default function ColoresClient({ initialProducts }: { initialProducts: ColorProductItem[] }) {
    const [includeUnavailable, setIncludeUnavailable] = useState(false);
    const [products] = useState<ColorProductItem[]>(initialProducts);

    const filtered = useMemo(() => {
        if (includeUnavailable) return products;

        return products
            .map((p) => ({
                ...p,
                colors: p.colors.filter((c) => c.available),
            }))
            .filter((p) => p.colors.length > 0);
    }, [products, includeUnavailable]);

    return (
        <div style={{ maxWidth: 1200, margin: '0 auto', padding: '24px 20px 60px' }}>
            <header style={{ textAlign: 'center', marginBottom: 32 }}>
                <h1
                    style={{
                        fontFamily: 'var(--font-playfair), serif',
                        fontSize: 38,
                        fontWeight: 600,
                        margin: 0,
                        letterSpacing: '-0.5px',
                    }}
                >
                    Paleta de Colores
                </h1>
                <p style={{ color: '#888', marginTop: 8, fontSize: 15 }}>
                    Colores disponibles para nuestras prendas personalizables.
                </p>

                <div
                    style={{
                        display: 'flex',
                        justifyContent: 'center',
                        alignItems: 'center',
                        gap: 12,
                        marginTop: 18,
                    }}
                >
                    <span style={{ fontSize: 13, color: '#666' }}>Mostrar también agotados</span>
                    <Switch checked={includeUnavailable} onChange={setIncludeUnavailable} size="small" />
                </div>
            </header>

            {filtered.length === 0 ? (
                <Empty
                    description="No hay prendas con colores disponibles en este momento."
                    style={{ marginTop: 80 }}
                />
            ) : (
                <div
                    style={{
                        display: 'grid',
                        gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))',
                        gap: 24,
                    }}
                >
                    {filtered.map((product) => (
                        <Card
                            key={product.productId}
                            hoverable
                            style={{
                                borderRadius: 14,
                                overflow: 'hidden',
                                border: '1px solid #eee',
                                boxShadow: '0 2px 8px rgba(0,0,0,0.04)',
                            }}
                            bodyStyle={{ padding: 18 }}
                        >
                            <Link href={`/product/${product.slug}`} style={{ display: 'block' }}>
                                <div
                                    style={{
                                        width: '100%',
                                        aspectRatio: '3 / 4',
                                        borderRadius: 10,
                                        overflow: 'hidden',
                                        background: '#fafafa',
                                        marginBottom: 14,
                                    }}
                                >
                                    {product.primaryImageUrl ? (
                                        <Image
                                            src={product.primaryImageUrl}
                                            alt={product.name}
                                            preview={false}
                                            style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                                        />
                                    ) : (
                                        <div
                                            style={{
                                                display: 'flex',
                                                alignItems: 'center',
                                                justifyContent: 'center',
                                                height: '100%',
                                                color: '#bbb',
                                                fontSize: 13,
                                            }}
                                        >
                                            Sin imagen
                                        </div>
                                    )}
                                </div>

                                <h3
                                    style={{
                                        fontFamily: 'var(--font-playfair), serif',
                                        fontSize: 20,
                                        fontWeight: 600,
                                        margin: 0,
                                        lineHeight: 1.2,
                                    }}
                                >
                                    {product.name}
                                </h3>
                            </Link>

                            {product.fabricName && (
                                <div style={{ marginTop: 4, fontSize: 12, color: '#999' }}>
                                    Tela: {product.fabricName}
                                </div>
                            )}

                            <Divider style={{ margin: '12px 0' }} />

                            <div
                                style={{
                                    display: 'flex',
                                    flexWrap: 'wrap',
                                    gap: 12,
                                    rowGap: 14,
                                }}
                            >
                                {product.colors.map((color) => (
                                    <Tooltip
                                        key={color.name}
                                        title={`${color.name}${color.available ? '' : ' (Agotado)'}`}
                                    >
                                        <div style={{ display: 'inline-flex', flexDirection: 'column', alignItems: 'center', maxWidth: 64 }}>
                                            <span
                                                style={{
                                                    display: 'block',
                                                    width: 30,
                                                    height: 30,
                                                    borderRadius: '999px',
                                                    background: color.hex,
                                                    border: '1px solid rgba(0,0,0,0.18)',
                                                    boxShadow: color.available ? 'none' : 'inset 0 0 0 1px rgba(255,255,255,0.6)',
                                                    opacity: color.available ? 1 : 0.45,
                                                    position: 'relative',
                                                }}
                                            />
                                            <span
                                                style={{
                                                    marginTop: 5,
                                                    fontSize: 10.5,
                                                    color: color.available ? '#555' : '#bbb',
                                                    textAlign: 'center',
                                                    lineHeight: 1.1,
                                                    wordBreak: 'break-word',
                                                }}
                                            >
                                                {color.name}
                                            </span>
                                            {!color.available && (
                                                <span
                                                    style={{
                                                        position: 'absolute',
                                                        marginTop: -30,
                                                        fontSize: 8,
                                                        color: '#fff',
                                                        background: '#bbb',
                                                        padding: '1px 4px',
                                                        borderRadius: 4,
                                                    }}
                                                >
                                                    Agot.
                                                </span>
                                            )}
                                        </div>
                                    </Tooltip>
                                ))}
                            </div>
                        </Card>
                    ))}
                </div>
            )}
        </div>
    );
}