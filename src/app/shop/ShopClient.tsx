'use client';

import React, { useEffect, useMemo, useState } from 'react';
import {
    Alert,
    Button,
    Card,
    Divider,
    Flex,
    Pagination,
    Select,
    Space,
    Typography,
    Empty,
    Drawer,
    Grid,
    Tag,
    Row,
    Col
} from 'antd';
import { FilterOutlined } from '@ant-design/icons';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import useSWR from 'swr';
import styles from '@/components/shop/productGridTransition.module.css';
import ProductGrid from '@/components/shop/ProductGrid';
import { useUIStore } from '@/store/ui.store';
import HeroSlider from '@/components/shop/HeroSlider';
import ShopFilters from '@/components/shop/ShopFilters';
import type { ProductListResponse } from '@/types/product';
import type { StoreMetaResponse } from '@/types/meta';
import { useDebounce } from '@/lib/useDebounce';
import { fetcher } from '@/lib/fetcher';
import ProductGridSkeleton from '@/components/shop/ProductGridSkeleton';
import ShopFiltersSkeleton from '@/components/shop/ShopFiltersSkeleton';
import { sortSizes } from '@/lib/sizes';


const { Title, Text } = Typography;

const SORT_OPTIONS = [
    { value: 'NEW', label: 'Novedades' },
    { value: 'PRICE_ASC', label: 'Precio: menor a mayor' },
    { value: 'PRICE_DESC', label: 'Precio: mayor a menor' },
    { value: 'NAME_ASC', label: 'Nombre: A-Z' },
    { value: 'NAME_DESC', label: 'Nombre: Z-A' },
] as const;

function parseCommaArray(param: string | null): string[] {
    if (!param) return [];
    return param.split(',').filter(Boolean);
}

export default function ShopClient({ customizableOnly = false }: { customizableOnly?: boolean }) {
    const sp = useSearchParams();
    const pathname = usePathname();
    const screens = Grid.useBreakpoint();
    const isDesktop = screens.lg;

    const [showSidebar, setShowSidebar] = useState(true);

    const [collection, setCollection] = useState<string | undefined>(
        sp.get('collection') ?? undefined
    );
    const [collections, setCollections] = useState<{ value: string; label: string }[]>([]);

    const isFilterDrawerOpen = useUIStore((s) => s.isFilterDrawerOpen);
    const setFilterDrawerOpen = useUIStore((s) => s.setFilterDrawerOpen);

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
    const [sizes, setSizes] = useState<string[]>(parseCommaArray(sp.get('sizes')));
    const [colors, setColors] = useState<string[]>(parseCommaArray(sp.get('colors')));
    const debouncedSizes = useDebounce(sizes, 150);
    const debouncedColors = useDebounce(colors, 150);
    const [onlyInStock, setOnlyInStock] = useState<boolean>((sp.get('onlyInStock') ?? '0') === '1');
    const [sort, setSort] = useState<string>(sp.get('sort') ?? 'NEW');
    const [page, setPage] = useState<number>(Number(sp.get('page') ?? 1));
    const [pageSize, setPageSize] = useState<number>(Number(sp.get('pageSize') ?? 12));

    useEffect(() => {
        setQ(sp.get('q') ?? '');
    }, [sp]);

    useEffect(() => {
        setPage(1);
    }, [debouncedQ]);

    const metaKey = useMemo(() => {
        const params = new URLSearchParams();
        if (collection) params.set('collection', collection);
        if (customizableOnly) params.set('customizable', '1');
        params.set('onlyInStock', onlyInStock ? '1' : '0');
        return `/api/store/meta?${params.toString()}`;
    }, [collection, customizableOnly, onlyInStock]);

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

        const sizesFromMeta = meta.filters?.sizes ?? [];
        const colors = meta.filters?.colors ?? [];
        setSizeOptions(sortSizes(sizesFromMeta));
        setColorOptions(colors);


        setSizes((prev) => prev.filter((x) => sizesFromMeta.includes(x)));
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

    const queryString = useMemo(() => {
        const params = new URLSearchParams();

        if (collection) params.set('collection', collection);
        if (customizableOnly) params.set('customizable', '1');
        if (debouncedQ.trim()) params.set('q', debouncedQ.trim());

        if (price[0] !== priceBounds.min) params.set('minPrice', String(price[0]));
        if (price[1] !== priceBounds.max) params.set('maxPrice', String(price[1]));

        if (debouncedSizes.length) params.set('sizes', debouncedSizes.join(','));
        if (debouncedColors.length) params.set('colors', debouncedColors.join(','));

        if (onlyInStock) params.set('onlyInStock', '1');
        if (sort !== 'NEW') params.set('sort', sort);

        if (page > 1) params.set('page', String(page));
        if (pageSize !== 12) params.set('pageSize', String(pageSize));

        return params.toString();
    }, [collection, customizableOnly, debouncedQ, price, priceBounds, debouncedSizes, debouncedColors, onlyInStock, sort, page, pageSize]);

    useEffect(() => {
        setPage(1);
    }, [debouncedSizes, debouncedColors]);

    useEffect(() => {
        window.history.replaceState(null, '', `${pathname}?${queryString}`);
    }, [pathname, queryString]);

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

    const handleClearAll = () => {
        setCollection(undefined);
        setSizes([]);
        setColors([]);
        setOnlyInStock(false);
        setPrice([priceBounds.min, priceBounds.max]);
        setPriceUI([priceBounds.min, priceBounds.max]);
        resetPage();
    };

    const hasActiveFilters = collection || sizes.length > 0 || colors.length > 0 || onlyInStock || price[0] > priceBounds.min || price[1] < priceBounds.max;

    const filterProps = {
        collections,
        collection,
        setCollection: (v: string | undefined) => { setCollection(v); resetPage(); },
        onlyInStock,
        setOnlyInStock: (v: boolean) => { setOnlyInStock(v); resetPage(); },
        priceBounds,
        priceUI,
        setPriceUI,
        onPriceChangeComplete: (v: [number, number]) => { setPrice(v); resetPage(); },
        sizeOptions,
        sizes,
        setSizes: (v: string[]) => { setSizes(v); resetPage(); },
        colorOptions,
        colors,
        setColors: (v: string[]) => { setColors(v); resetPage(); },
        metaLoading
    };

    return (
        <div style={{ paddingBottom: 64 }}>
            <HeroSlider />

            <div id="shop-grid" style={{ maxWidth: 1400, margin: '0 auto', padding: '48px 24px 24px' }}>
                {customizableOnly && (
                    <Card variant="borderless" style={{ marginBottom: 24, background: 'linear-gradient(135deg, rgba(200,159,83,0.12), rgba(255,255,255,0.85))' }}>
                        <Title level={2} style={{ marginTop: 0 }}>Prendas personalizadas</Title>
                        <Text type="secondary">
                            Elige una prenda, selecciona talla y color, y ajusta tus medidas antes de pedirla por WhatsApp.
                        </Text>
                    </Card>
                )}

                {(metaError || productsError) ? (
                    <Alert
                        type="error"
                        showIcon
                        message="Ocurrió un error"
                        description={(metaError?.message ?? productsError?.message) || 'Error'}
                        style={{ marginBottom: 24 }}
                    />
                ) : null}

                <Row gutter={[32, 32]}>
                    {isDesktop && showSidebar && (
                        <Col lg={6}>
                            <Card variant="borderless" style={{ position: 'sticky', top: 100 }}>
                                <Flex justify="space-between" align="center" style={{ marginBottom: 24 }}>
                                    <Title level={4} style={{ margin: 0 }}>Filtros</Title>
                                    {hasActiveFilters && (
                                        <Button type="link" onClick={handleClearAll} style={{ padding: 0 }}>Limpiar</Button>
                                    )}
                                </Flex>
                                {metaLoading && !meta ? <ShopFiltersSkeleton /> : <ShopFilters {...filterProps} />}
                            </Card>
                        </Col>
                    )}

                    {!isDesktop && (
                        <Drawer
                            title="Filtrar Productos"
                            placement="left"
                            onClose={() => setFilterDrawerOpen(false)}
                            open={isFilterDrawerOpen}
                            extra={hasActiveFilters && <Button type="link" onClick={handleClearAll}>Limpiar</Button>}
                        >
                            {metaLoading && !meta ? <ShopFiltersSkeleton /> : <ShopFilters {...filterProps} />}
                        </Drawer>
                    )}

                    <Col xs={24} lg={isDesktop && showSidebar ? 18 : 24}>
                        <Flex justify="space-between" align="center" wrap="wrap" gap={16} style={{ marginBottom: 24 }}>
                            <Flex wrap="wrap" gap={8} align="center" style={{ flex: 1 }}>
                                {isDesktop && (
                                    <Button 
                                        icon={<FilterOutlined />} 
                                        onClick={() => setShowSidebar(!showSidebar)}
                                    >
                                        {showSidebar ? 'Ocultar Filtros' : 'Mostrar Filtros'}
                                    </Button>
                                )}
                                {!isDesktop && (
                                    <Button 
                                        icon={<FilterOutlined />} 
                                        onClick={() => setFilterDrawerOpen(true)}
                                    >
                                        Filtros {hasActiveFilters ? '(Activos)' : ''}
                                    </Button>
                                )}
                                
                                {collection && (
                                    <Tag closable onClose={() => setCollection(undefined)} style={{ padding: '4px 10px', fontSize: 14, borderRadius: 16 }}>
                                        {collections.find(c => c.value === collection)?.label || 'Colección'}
                                    </Tag>
                                )}
                                {sizes.map(s => (
                                    <Tag key={s} closable onClose={() => setSizes(sizes.filter(x => x !== s))} style={{ padding: '4px 10px', fontSize: 14, borderRadius: 16 }}>
                                        Talla: {s}
                                    </Tag>
                                ))}
                                {colors.map(c => (
                                    <Tag key={c} closable onClose={() => setColors(colors.filter(x => x !== c))} style={{ padding: '4px 10px', fontSize: 14, borderRadius: 16 }}>
                                        Color: {c}
                                    </Tag>
                                ))}
                                {onlyInStock && (
                                    <Tag closable onClose={() => setOnlyInStock(false)} style={{ padding: '4px 10px', fontSize: 14, borderRadius: 16 }}>
                                        Con stock
                                    </Tag>
                                )}
                            </Flex>

                            <Select
                                value={sort}
                                onChange={(v) => {
                                    setSort(v);
                                    resetPage();
                                }}
                                options={SORT_OPTIONS as any}
                                style={{ minWidth: 200 }}
                                placeholder="Ordenar por"
                                size="large"
                            />
                        </Flex>

                        <Card variant="borderless" style={{ background: 'transparent' }} styles={{ body: { padding: 0 } }}>
                            {productsLoading && !data ? (
                                <ProductGridSkeleton count={pageSize} />
                            ) : !data || data.items.length === 0 ? (
                                <div style={{ textAlign: 'center', padding: '64px 0', background: '#fff', borderRadius: 12 }}>
                                    <Empty 
                                        description={<Text type="secondary" style={{ fontSize: 16 }}>No hay productos que coincidan con estos filtros</Text>} 
                                    />
                                    {hasActiveFilters && (
                                        <Button type="primary" onClick={handleClearAll} style={{ marginTop: 16, background: '#000', borderColor: '#000' }}>
                                            Limpiar Filtros
                                        </Button>
                                    )}
                                </div>
                            ) : (
                                <>
                                    <div className={`${styles.grid} ${productsLoading ? styles.gridLoading : ''}`}>
                                        <ProductGrid items={data.items} />
                                    </div>
                                    <Divider />
                                    <Flex justify="space-between" align="center" wrap="wrap" gap={12}>
                                        <Text type="secondary" style={{ fontWeight: 500 }}>Mostrando {data.items.length} de {data.total}</Text>
                                        <Pagination
                                            current={data.page}
                                            pageSize={data.pageSize}
                                            total={data.total}
                                            showSizeChanger={false}
                                            onChange={(p, ps) => {
                                                setPage(p);
                                                if (ps) setPageSize(ps);
                                                window.scrollTo({ top: document.getElementById('shop-grid')?.offsetTop || 0, behavior: 'smooth' });
                                            }}
                                        />
                                    </Flex>

                                    {productsLoading && data ? (
                                        <div style={{ marginTop: 12 }}>
                                            <Text type="secondary">Actualizando...</Text>
                                        </div>
                                    ) : null}
                                </>
                            )}
                        </Card>
                    </Col>
                </Row>
            </div>
        </div>
    );
}
