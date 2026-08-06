'use client';

import React, { useMemo, useState } from 'react';
import { Switch, Empty, Tooltip } from 'antd';

export type ColorItem = {
    name: string;
    hex: string;
    available: boolean;
};

export default function ColoresClient({ initialColors }: { initialColors: ColorItem[] }) {
    const [includeUnavailable, setIncludeUnavailable] = useState(false);
    const [colors] = useState<ColorItem[]>(initialColors);

    const filtered = useMemo(() => {
        if (includeUnavailable) return colors;
        return colors.filter((c) => c.available);
    }, [colors, includeUnavailable]);

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
                    description="No hay colores disponibles en este momento."
                    style={{ marginTop: 80 }}
                />
            ) : (
                <div
                    style={{
                        display: 'flex',
                        flexWrap: 'wrap',
                        justifyContent: 'center',
                        gap: 28,
                        rowGap: 36,
                    }}
                >
                    {filtered.map((color) => (
                        <Tooltip
                            key={color.name}
                            title={color.available ? color.name : `${color.name} (Agotado)`}
                        >
                            <div
                                style={{
                                    display: 'flex',
                                    flexDirection: 'column',
                                    alignItems: 'center',
                                    width: 110,
                                    opacity: color.available ? 1 : 0.45,
                                }}
                            >
                                <div
                                    style={{
                                        width: 96,
                                        height: 96,
                                        borderRadius: '999px',
                                        background: color.hex,
                                        border: '1px solid rgba(0,0,0,0.18)',
                                        boxShadow: color.available
                                            ? '0 6px 18px rgba(0,0,0,0.12)'
                                            : 'inset 0 0 0 1px rgba(255,255,255,0.6)',
                                        position: 'relative',
                                    }}
                                />
                                <span
                                    style={{
                                        marginTop: 12,
                                        fontSize: 14,
                                        fontWeight: 600,
                                        color: color.available ? '#333' : '#bbb',
                                        textAlign: 'center',
                                        lineHeight: 1.2,
                                    }}
                                >
                                    {color.name}
                                </span>
                                {!color.available && (
                                    <span
                                        style={{
                                            marginTop: 4,
                                            fontSize: 10,
                                            color: '#fff',
                                            background: '#bbb',
                                            padding: '2px 8px',
                                            borderRadius: 999,
                                            textTransform: 'uppercase',
                                            letterSpacing: '0.5px',
                                        }}
                                    >
                                        Agotado
                                    </span>
                                )}
                            </div>
                        </Tooltip>
                    ))}
                </div>
            )}
        </div>
    );
}
