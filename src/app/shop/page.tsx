'use client';

import React, { useEffect, useMemo, useState } from 'react';
import { Card, Checkbox, Divider, Flex, Input, Pagination, Select, Slider, Space, Spin, Switch, Typography, message, Empty } from 'antd';
import { useRouter, useSearchParams } from 'next/navigation';
import ProductGrid from '@/components/shop/ProductGrid';
import type { ProductListResponse } from '@/types/product';

const { Title, Text } = Typography;

const SORT_OPTIONS = [
    { value: 'NEW', label: 'Novedades' },
    { value: 'PRICE_ASC', label: 'Precio: menor a mayor' },
    { value: 'PRICE_DESC', label: 'Precio: mayor a menor' },
    { value: 'NAME_ASC', label: 'Nombre: A-Z' },
    { value: 'NAME_DESC', label: 'Nombre: Z-A' },
] as const;

// Por ahora hardcode (luego lo traemos de BD con endpoint)
const COLLECTIONS = [
    { value: 'otono', label: 'Otoño' },
    { value: 'capsula', label: 'Closet cápsula' },
];

const SIZES = ['XS', 'S', 'M', 'L', 'XL'];
const COLORS = ['Negro', 'Blanco', 'Arena', 'Camel', 'Rojo'];

function parseJsonArray(param: string | null): string[] {
    if (!param) return [];
    try {
        const v = JSON.parse(param);
        return Array.isArray(v) ? v.map(String) : [];
    } catch {
        return [];
    }
}

export default function ShopPage() {
    const router = useRouter();
    const sp = useSearchParams();

    // Estado de filtros (inicializa desde querystring)
    const [collection, setCollection] = useState<string | undefined>(sp.get('collection') ?? undefined);
    const [q, setQ] = useState<string>(sp.get('q') ?? '');
    const [price, setPrice] = useState<[number, number]>([
        Number(sp.get('minPrice') ?? 0),
        Number(sp.get('maxPrice') ?? 500),
    ]);
    const [sizes, setSizes] = useState<string[]>(parseJsonArray(sp.get('sizes')));
    const [colors, setColors] = useState<string[]>(parseJsonArray(sp.get('colors')));
    const [onlyInStock, setOnlyInStock] = useState<boolean>((sp.get('onlyInStock') ?? '0') === '1');
    const [sort, setSort] = useState<string>(sp.get('sort') ?? 'NEW');
    const [page, setPage] = useState<number>(Number(sp.get('page') ?? 1));
    const [pageSize, setPageSize] = useState<number>(Number(sp.get('pageSize') ?? 12));

    // Data
    const [loading, setLoading] = useState(false);
    const [data, setData] = useState<ProductListResponse | null>(null);

    const queryString = useMemo(() => {
        const params = new URLSearchParams();

        if (collection) params.set('collection', collection);
        if (q.trim()) params.set('q', q.trim());

        params.set('minPrice', String(price[0]));
        params.set('maxPrice', String(price[1]));

        if (sizes.length) params.set('sizes', JSON.stringify(sizes));
        if (colors.length) params.set('colors', JSON.stringify(colors));

        params.set('onlyInStock', onlyInStock ? '1' : '0');
        params.set('sort', sort);

        params.set('page', String(page));
        params.set('pageSize', String(pageSize));

        return params.toString();
    }, [collection, q, price, sizes, colors, onlyInStock, sort, page, pageSize]);

    // Mantener URL actualizada (shareable)
    useEffect(() => {
        router.replace(`/shop?${queryString}`);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [queryString]);

    // Fetch
    useEffect(() => {
        const controller = new AbortController();
        const run = async () => {
            try {
                setLoading(true);
                const res = await fetch(`/api/store/products?${queryString}`, { signal: controller.signal });
                if (!res.ok) throw new Error(`HTTP ${res.status}`);
                const json = (await res.json()) as ProductListResponse;
                setData(json);
            } catch (e: any) {
                if (e?.name !== 'AbortError') {
                    message.error('No se pudo cargar la tienda');
                }
            } finally {
                setLoading(false);
            }
        };
        run();
        return () => controller.abort();
    }, [queryString]);

    // Cuando cambias filtros, vuelve a page 1
    const resetPage = () => setPage(1);

    return (
        <Space direction="vertical" size={16} style={{ width: '100%' }}>
            <Title level={3} style={{ margin: 0 }}>Tienda</Title>

            <Card>
                <Flex gap={16} wrap="wrap" align="flex-start">
                    <div style={{ minWidth: 220 }}>
                        <Text strong>Colección</Text>
                        <Select
                            allowClear
                            placeholder="Todas"
                            value={collection}
                            onChange={(v) => { setCollection(v); resetPage(); }}
                            options={COLLECTIONS}
                            style={{ width: '100%', marginTop: 8 }}
                        />
                    </div>

                    <div style={{ minWidth: 260, flex: 1 }}>
                        <Text strong>Buscar</Text>
                        <Input
                            placeholder="Ej: vestido, blazer, falda..."
                            value={q}
                            onChange={(e) => { setQ(e.target.value); resetPage(); }}
                            style={{ marginTop: 8 }}
                        />
                    </div>

                    <div style={{ minWidth: 260 }}>
                        <Text strong>Orden</Text>
                        <Select
                            value={sort}
                            onChange={(v) => { setSort(v); resetPage(); }}
                            options={SORT_OPTIONS as any}
                            style={{ width: '100%', marginTop: 8 }}
                        />
                    </div>

                    <div style={{ minWidth: 220 }}>
                        <Text strong>Solo con stock</Text>
                        <div style={{ marginTop: 8 }}>
                            <Switch checked={onlyInStock} onChange={(v) => { setOnlyInStock(v); resetPage(); }} />
                        </div>
                    </div>
                </Flex>

                <Divider />

                <Flex gap={24} wrap="wrap" align="flex-start">
                    <div style={{ minWidth: 320 }}>
                        <Text strong>Precio (S/)</Text>
                        <Slider
                            range
                            min={0}
                            max={500}
                            step={5}
                            value={price}
                            onChange={(v) => { setPrice(v as [number, number]); resetPage(); }}
                            style={{ marginTop: 8 }}
                        />
                        <Text type="secondary">{`S/ ${price[0]} - S/ ${price[1]}`}</Text>
                    </div>

                    <div style={{ minWidth: 260 }}>
                        <Text strong>Tallas</Text>
                        <Checkbox.Group
                            options={SIZES}
                            value={sizes}
                            onChange={(v) => { setSizes(v as string[]); resetPage(); }}
                            style={{ marginTop: 8, display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 8 }}
                        />
                    </div>

                    <div style={{ minWidth: 260 }}>
                        <Text strong>Colores</Text>
                        <Checkbox.Group
                            options={COLORS}
                            value={colors}
                            onChange={(v) => { setColors(v as string[]); resetPage(); }}
                            style={{ marginTop: 8, display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 8 }}
                        />
                    </div>
                </Flex>
            </Card>

            <Card>
                {loading ? (
                    <div style={{ padding: 40, textAlign: 'center' }}>
                        <Spin />
                    </div>
                ) : !data || data.items.length === 0 ? (
                    <Empty description="No hay productos con esos filtros" />
                ) : (
                    <>
                        <ProductGrid items={data.items} />
                        <Divider />
                        <Flex justify="space-between" align="center" wrap="wrap" gap={12}>
                            <Text type="secondary">{`Total: ${data.total}`}</Text>
                            <Pagination
                                current={data.page}
                                pageSize={data.pageSize}
                                total={data.total}
                                showSizeChanger
                                pageSizeOptions={[12, 24, 48]}
                                onChange={(p, ps) => {
                                    setPage(p);
                                    setPageSize(ps);
                                }}
                            />
                        </Flex>
                    </>
                )}
            </Card>
        </Space>
    );
}