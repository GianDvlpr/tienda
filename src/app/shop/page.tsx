'use client';

import React, { useEffect, useMemo, useState, Suspense } from 'react';
import {
    Alert,
    Card,
    Checkbox,
    Collapse,
    Divider,
    Flex,
    Input,
    Pagination,
    Select,
    Slider,
    Space,
    Spin,
    Switch,
    Typography,
    Empty,
} from 'antd';
import { useRouter, useSearchParams } from 'next/navigation';
import useSWR from 'swr';
import styles from '@/components/shop/productGridTransition.module.css';
import ProductGrid from '@/components/shop/ProductGrid';
import type { ProductListResponse } from '@/types/product';
import type { StoreMetaResponse } from '@/types/meta';
import { useDebounce } from '@/lib/useDebounce';
import { fetcher } from '@/lib/fetcher';
import ProductGridSkeleton from '@/components/shop/ProductGridSkeleton';
import ShopFiltersSkeleton from '@/components/shop/ShopFiltersSkeleton';

const { Title, Text } = Typography;

const SORT_OPTIONS = [
    { value: 'NEW', label: 'Novedades' },
    { value: 'PRICE_ASC', label: 'Precio: menor a mayor' },
    { value: 'PRICE_DESC', label: 'Precio: mayor a menor' },
    { value: 'NAME_ASC', label: 'Nombre: A-Z' },
    { value: 'NAME_DESC', label: 'Nombre: Z-A' },
] as const;

function parseJsonArray(param: string | null): string[] {
    if (!param) return [];
    try {
        const v = JSON.parse(param);
        return Array.isArray(v) ? v.map(String) : [];
    } catch {
        return [];
    }
}

function ShopContent() {
    const router = useRouter();
    const sp = useSearchParams();

    const [collection, setCollection] = useState<string | undefined>(
        sp.get('collection') ?? undefined
    );
    const [collections, setCollections] = useState<{ value: string; label: string }[]>([]);

    const [q, setQ] = useState<string>(sp.get('q') ?? '');
    const debouncedQ = useDebounce(q, 300);

    const [priceBounds, setPriceBounds] = useState<{ min: number; max: number }>({
        min: 0,
        max: 500,
    });
    const [price, setPrice] = useState<[number, number]>([
        Number(sp.get('minPrice') ?? 0),
        Number(sp.get('maxPrice') ?? 500),
    ]);

    const [priceUI, setPriceUI] = useState<[number, number]>([
        Number(sp.get('minPrice') ?? 0),
        Number(sp.get('maxPrice') ?? 500),
    ]);

    const [sizeOptions, setSizeOptions] = useState<string[]>([]);
    const [colorOptions, setColorOptions] = useState<string[]>([]);
    const [sizes, setSizes] = useState<string[]>(parseJsonArray(sp.get('sizes')));
    const [colors, setColors] = useState<string[]>(parseJsonArray(sp.get('colors')));
    const debouncedSizes = useDebounce(sizes, 150);
    const debouncedColors = useDebounce(colors, 150);
    const [onlyInStock, setOnlyInStock] = useState<boolean>((sp.get('onlyInStock') ?? '0') === '1');
    const [sort, setSort] = useState<string>(sp.get('sort') ?? 'NEW');
    const [page, setPage] = useState<number>(Number(sp.get('page') ?? 1));
    const [pageSize, setPageSize] = useState<number>(Number(sp.get('pageSize') ?? 12));

    useEffect(() => {
        setPage(1);
    }, [debouncedQ]);

    const metaKey = useMemo(() => {
        const params = new URLSearchParams();
        if (collection) params.set('collection', collection);
        params.set('onlyInStock', onlyInStock ? '1' : '0');
        return `/api/store/meta?${params.toString()}`;
    }, [collection, onlyInStock]);

    const {
        data: meta,
        error: metaError,
        isLoading: metaLoading,
    } = useSWR<StoreMetaResponse>(metaKey, fetcher, {
        revalidateOnFocus: false,
        keepPreviousData: true,
    });

    useEffect(() => {
        if (!meta) return;

        setCollections((meta.collections ?? []).map((c) => ({ value: c.slug, label: c.name })));

        const sizes = meta.filters?.sizes ?? [];
        const colors = meta.filters?.colors ?? [];
        setSizeOptions(sizes);
        setColorOptions(colors);

        setSizes((prev) => prev.filter((x) => sizes.includes(x)));
        setColors((prev) => prev.filter((x) => colors.includes(x)));

        const min = Math.floor(Number(meta.priceRange?.minPrice ?? 0));
        const max = Math.ceil(Number(meta.priceRange?.maxPrice ?? 0));
        const safeMin = Number.isFinite(min) ? min : 0;
        const safeMax = Number.isFinite(max) ? max : safeMin + 1;

        setPriceBounds({ min: safeMin, max: safeMax });

        setPrice((prev) => {
            const nextMin = Math.max(safeMin, prev[0] ?? safeMin);
            const nextMax = Math.min(safeMax, prev[1] ?? safeMax);
            const next: [number, number] = nextMin > nextMax ? [safeMin, safeMax] : [nextMin, nextMax];

            setPriceUI(next);
            return next;
        });
    }, [meta]);

    // Query string para listado
    const queryString = useMemo(() => {
        const params = new URLSearchParams();

        if (collection) params.set('collection', collection);
        if (debouncedQ.trim()) params.set('q', debouncedQ.trim());

        params.set('minPrice', String(price[0]));
        params.set('maxPrice', String(price[1]));

        if (debouncedSizes.length) params.set('sizes', JSON.stringify(debouncedSizes));
        if (debouncedColors.length) params.set('colors', JSON.stringify(debouncedColors));

        params.set('onlyInStock', onlyInStock ? '1' : '0');
        params.set('sort', sort);

        params.set('page', String(page));
        params.set('pageSize', String(pageSize));

        return params.toString();
    }, [collection, debouncedQ, price, debouncedSizes, debouncedColors, onlyInStock, sort, page, pageSize]);

    useEffect(() => {
        setPage(1);
    }, [debouncedSizes, debouncedColors]);

    useEffect(() => {
        router.replace(`/shop?${queryString}`);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [queryString]);

    const productsKey = useMemo(() => `/api/store/products?${queryString}`, [queryString]);

    const {
        data,
        error: productsError,
        isLoading: productsLoading,
    } = useSWR<ProductListResponse>(productsKey, fetcher, {
        revalidateOnFocus: false,
        keepPreviousData: true,
    });

    const resetPage = () => setPage(1);

    return (
        <Space orientation="vertical" size={16} style={{ width: '100%' }}>
            <Title level={3} style={{ margin: 0 }}>
                Tienda
            </Title>

            {(metaError || productsError) ? (
                <Alert
                    type="error"
                    showIcon
                    message="Ocurrió un error"
                    description={(metaError?.message ?? productsError?.message) || 'Error'}
                />
            ) : null}

            {metaLoading && !meta ? (
                <ShopFiltersSkeleton />
            ) : (
                <Card>
                    <Flex gap={16} wrap="wrap" align="flex-start">
                        <div style={{ minWidth: 220 }}>
                            <Text strong>Colección</Text>
                            <Select
                                allowClear
                                placeholder="Todas"
                                value={collection}
                                onChange={(v) => {
                                    setCollection(v);
                                    resetPage();
                                }}
                                options={collections}
                                style={{ width: '100%', marginTop: 8 }}
                                loading={metaLoading}
                            />
                        </div>

                        <div style={{ minWidth: 260, flex: 1 }}>
                            <Text strong>Buscar</Text>
                            <Input
                                placeholder="Ej: vestido, blazer, falda..."
                                value={q}
                                onChange={(e) => setQ(e.target.value)}
                                style={{ marginTop: 8 }}
                                allowClear
                            />
                        </div>

                        <div style={{ minWidth: 260 }}>
                            <Text strong>Orden</Text>
                            <Select
                                value={sort}
                                onChange={(v) => {
                                    setSort(v);
                                    resetPage();
                                }}
                                options={SORT_OPTIONS as any}
                                style={{ width: '100%', marginTop: 8 }}
                            />
                        </div>

                        <div style={{ minWidth: 220 }}>
                            <Text strong>Solo con stock</Text>
                            <div style={{ marginTop: 8 }}>
                                <Switch
                                    checked={onlyInStock}
                                    onChange={(v) => {
                                        setOnlyInStock(v);
                                        resetPage();
                                    }}
                                />
                            </div>
                        </div>
                    </Flex>

                    <Divider style={{ margin: '16px 0' }} />

                    <Collapse
                        ghost
                        items={[
                            {
                                key: 'advanced-filters',
                                label: <Text strong>Filtros avanzados</Text>,
                                children: (
                                    <Flex gap={24} wrap="wrap" align="flex-start" style={{ paddingTop: 8 }}>
                                        <div style={{ flex: 1, minWidth: 200 }}>
                                            <Text strong>Precio (S/)</Text>
                                            <Slider
                                                range
                                                min={priceBounds.min}
                                                max={priceBounds.max}
                                                step={1}
                                                value={priceUI}
                                                onChange={(v) => setPriceUI(v as [number, number])}
                                                onChangeComplete={(v) => {
                                                    setPrice(v as [number, number]);
                                                    resetPage();
                                                }}
                                                style={{ marginTop: 8 }}
                                                disabled={metaLoading}
                                            />
                                            <Text type="secondary">{`S/ ${priceUI[0]} - S/ ${priceUI[1]}`}</Text>
                                        </div>

                                        <div style={{ minWidth: 260 }}>
                                            <Text strong>Tallas</Text>
                                            <Checkbox.Group
                                                options={sizeOptions}
                                                value={sizes}
                                                onChange={(v) => {
                                                    setSizes(v as string[]);
                                                }}
                                                style={{
                                                    marginTop: 8,
                                                    display: 'grid',
                                                    gridTemplateColumns: 'repeat(3, 1fr)',
                                                    gap: 8,
                                                }}
                                                disabled={metaLoading}
                                            />
                                        </div>

                                        <div style={{ minWidth: 260 }}>
                                            <Text strong>Colores</Text>
                                            <Checkbox.Group
                                                options={colorOptions}
                                                value={colors}
                                                onChange={(v) => {
                                                    setColors(v as string[]);
                                                }}
                                                style={{
                                                    marginTop: 8,
                                                    display: 'grid',
                                                    gridTemplateColumns: 'repeat(2, 1fr)',
                                                    gap: 8,
                                                }}
                                                disabled={metaLoading}
                                            />
                                        </div>
                                    </Flex>
                                ),
                            },
                        ]}
                    />
                </Card>

            )}

            <Card>
                {productsLoading && !data ? (
                    <ProductGridSkeleton count={pageSize} />
                ) : !data || data.items.length === 0 ? (
                    <Empty description="No hay productos con esos filtros" />
                ) : (
                    <>
                        <div className={`${styles.grid} ${productsLoading ? styles.gridLoading : ''}`}>
                            <ProductGrid items={data.items} />
                        </div>
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

                        {/* Si está revalidando y ya hay data previa, opcional: feedback sutil */}
                        {productsLoading && data ? (
                            <div style={{ marginTop: 12 }}>
                                <Text type="secondary">Actualizando...</Text>
                            </div>
                        ) : null}
                    </>
                )}
            </Card>
        </Space>
    );
}

export default function ShopPage() {
    return (
        <Suspense fallback={<Spin size="large" style={{ display: 'block', margin: '50px auto' }} />}>
            <ShopContent />
        </Suspense>
    );
}