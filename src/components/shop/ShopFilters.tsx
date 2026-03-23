'use client';

import React from 'react';
import { Select, Switch, Slider, Collapse, Typography, Space, Divider, Flex } from 'antd';
import { CheckOutlined } from '@ant-design/icons';

const { Text } = Typography;

const COLOR_MAP: Record<string, string> = {
    'negro': '#000000',
    'blanco': '#ffffff',
    'rojo': '#df1b1b',
    'azul': '#1b40df',
    'verde': '#1bdf50',
    'amarillo': '#dfcc1b',
    'naranja': '#df761b',
    'rosado': '#ffb6c1',
    'morado': '#800080',
    'gris': '#808080',
    'beige': '#f5f5dc',
    'marrón': '#8b4513',
    'celeste': '#87ceeb',
    'vino': '#722f37',
    'lila': '#c8a2c8',
};

interface ShopFiltersProps {
    collections: { value: string; label: string }[];
    collection: string | undefined;
    setCollection: (v: string | undefined) => void;
    onlyInStock: boolean;
    setOnlyInStock: (v: boolean) => void;
    priceBounds: { min: number; max: number };
    priceUI: [number, number];
    setPriceUI: (v: [number, number]) => void;
    onPriceChangeComplete: (v: [number, number]) => void;
    sizeOptions: string[];
    sizes: string[];
    setSizes: (v: string[]) => void;
    colorOptions: string[];
    colors: string[];
    setColors: (v: string[]) => void;
    metaLoading: boolean;
}

export default function ShopFilters({
    collections,
    collection,
    setCollection,
    onlyInStock,
    setOnlyInStock,
    priceBounds,
    priceUI,
    setPriceUI,
    onPriceChangeComplete,
    sizeOptions,
    sizes,
    setSizes,
    colorOptions,
    colors,
    setColors,
    metaLoading,
}: ShopFiltersProps) {

    const handleSizeToggle = (size: string) => {
        if (sizes.includes(size)) {
            setSizes(sizes.filter((s) => s !== size));
        } else {
            setSizes([...sizes, size]);
        }
    };

    const handleColorToggle = (color: string) => {
        if (colors.includes(color)) {
            setColors(colors.filter((c) => c !== color));
        } else {
            setColors([...colors, color]);
        }
    };

    return (
        <Space orientation="vertical" size="large" style={{ width: '100%' }}>
            <div>
                <Text strong style={{ fontSize: 16 }}>Colección</Text>
                <Select
                    allowClear
                    placeholder="Todas las colecciones"
                    value={collection}
                    onChange={(v) => setCollection(v)}
                    options={collections}
                    style={{ width: '100%', marginTop: 12 }}
                    loading={metaLoading}
                    size="large"
                />
            </div>

            <Flex align="center" justify="space-between">
                <Text strong style={{ fontSize: 16 }}>Solo con stock</Text>
                <Switch
                    checked={onlyInStock}
                    onChange={setOnlyInStock}
                />
            </Flex>

            <Divider style={{ margin: 0 }} />

            <div>
                <Flex justify="space-between" align="center" style={{ marginBottom: 12 }}>
                    <Text strong style={{ fontSize: 16 }}>Precio</Text>
                    <Text type="secondary" style={{ fontSize: 14 }}>{`S/ ${priceUI[0]} - S/ ${priceUI[1]}`}</Text>
                </Flex>
                <Slider
                    range
                    min={priceBounds.min}
                    max={priceBounds.max}
                    step={1}
                    value={priceUI}
                    onChange={(v) => setPriceUI(v as [number, number])}
                    onChangeComplete={(v) => onPriceChangeComplete(v as [number, number])}
                    disabled={metaLoading}
                    styles={{
                        track: { backgroundColor: '#000' },
                        handle: { borderColor: '#000', backgroundColor: '#fff' }
                    }}
                />
            </div>

            <Collapse
                ghost
                defaultActiveKey={['props']}
                expandIconPlacement="end"
                items={[
                    {
                        key: 'props',
                        label: <Text strong style={{ fontSize: 16 }}>Tallas y Colores</Text>,
                        children: (
                            <Space orientation="vertical" size={24} style={{ width: '100%', paddingTop: 8 }}>
                                <div>
                                    <Text type="secondary" strong style={{ display: 'block', marginBottom: 12 }}>TALLAS</Text>
                                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                                        {sizeOptions.map((s) => {
                                            const isActive = sizes.includes(s);
                                            return (
                                                <button
                                                    key={s}
                                                    onClick={() => handleSizeToggle(s)}
                                                    disabled={metaLoading}
                                                    style={{
                                                        padding: '8px 16px',
                                                        borderRadius: '6px',
                                                        border: isActive ? '1px solid #000' : '1px solid #d9d9d9',
                                                        backgroundColor: isActive ? '#000' : '#fff',
                                                        color: isActive ? '#fff' : '#000',
                                                        fontWeight: isActive ? 600 : 400,
                                                        cursor: metaLoading ? 'not-allowed' : 'pointer',
                                                        transition: 'all 0.2s',
                                                        opacity: metaLoading ? 0.6 : 1,
                                                    }}
                                                >
                                                    {s}
                                                </button>
                                            );
                                        })}
                                    </div>
                                </div>

                                <div>
                                    <Text type="secondary" strong style={{ display: 'block', marginBottom: 12 }}>COLORES</Text>
                                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 12 }}>
                                        {colorOptions.map((c) => {
                                            const isActive = colors.includes(c);
                                            const hex = COLOR_MAP[c.toLowerCase()] || '#ccc';
                                            const isWhite = hex === '#ffffff' || hex === '#fff';
                                            
                                            // Make tick mark visible on both dark and light colors
                                            const tickColor = isWhite ? '#000' : '#fff';

                                            return (
                                                <div 
                                                    key={c}
                                                    style={{ 
                                                        display: 'flex', 
                                                        flexDirection: 'column', 
                                                        alignItems: 'center', 
                                                        gap: 4,
                                                        cursor: metaLoading ? 'not-allowed' : 'pointer',
                                                        opacity: metaLoading ? 0.6 : 1
                                                    }}
                                                    onClick={() => !metaLoading && handleColorToggle(c)}
                                                >
                                                    <div
                                                        style={{
                                                            width: 36,
                                                            height: 36,
                                                            borderRadius: '50%',
                                                            backgroundColor: hex,
                                                            border: isWhite ? '1px solid #d9d9d9' : '1px solid transparent',
                                                            boxShadow: isActive ? '0 0 0 2px #fff, 0 0 0 4px #000' : 'none',
                                                            display: 'flex',
                                                            alignItems: 'center',
                                                            justifyContent: 'center',
                                                            transition: 'all 0.2s',
                                                        }}
                                                    >
                                                        {isActive && <CheckOutlined style={{ color: tickColor, fontSize: 16 }} />}
                                                    </div>
                                                    <Text style={{ fontSize: 12, fontWeight: isActive ? 600 : 400 }}>{c}</Text>
                                                </div>
                                            );
                                        })}
                                    </div>
                                </div>
                            </Space>
                        ),
                    },
                ]}
            />
        </Space>
    );
}
