'use client';

import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Alert, Drawer, Pagination, Grid, theme } from 'antd';
import { SlidersOutlined, CloseOutlined } from '@ant-design/icons';
import ShopTrust from '@/components/shop/ShopTrust';
import visual from '@/components/shop/shopVisual.module.css';
import { usePathname, useSearchParams } from 'next/navigation';
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

export default function ShopClient({ customizableOnly = false, initialData }: { customizableOnly?: boolean; initialData?: ProductListResponse }) {
    const sp = useSearchParams();
    const pathname = usePathname();
    const screens = Grid.useBreakpoint();
    const { token } = theme.useToken();
    const shopVariables = { "--shop-text": token.colorText, "--shop-muted": token.colorTextSecondary, "--shop-border": token.colorBorderSecondary, "--shop-surface": token.colorBgContainer } as React.CSSProperties;
    const isMobile = !screens.sm;

    const [priceSelection, setPriceSelection] = useState<{ min: string | null; max: string | null }>({ min: sp.get('minPrice'), max: sp.get('maxPrice') });

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

    const previousQ = useRef(debouncedQ);
    useEffect(() => {
        if (previousQ.current !== debouncedQ) setPage(1);
        previousQ.current = debouncedQ;
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

        {
            const nextMin = Math.max(safeMin, priceSelection.min == null ? safeMin : Number(priceSelection.min));
            const nextMax = Math.min(safeMax, priceSelection.max == null ? safeMax : Number(priceSelection.max));
            const next: [number, number] = nextMin > nextMax ? [safeMin, safeMax] : [nextMin, nextMax];

            setPriceUI(next);
            setPrice(next);
        }
    }, [meta, priceSelection]);

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

    const previousOptions = useRef(JSON.stringify([debouncedSizes, debouncedColors]));
    useEffect(() => {
        const nextOptions = JSON.stringify([debouncedSizes, debouncedColors]);
        if (previousOptions.current !== nextOptions) setPage(1);
        previousOptions.current = nextOptions;
    }, [debouncedSizes, debouncedColors]);

    useEffect(() => {
        window.history.replaceState(null, '', `${pathname}?${queryString}`);
    }, [pathname, queryString]);

    const [initialQuery] = useState(queryString);
    const productsKey = useMemo(() => `/api/store/products?${queryString}`, [queryString]);

    const {
        data,
        error: productsError,
        isLoading: productsLoading,
    } = useSWR<ProductListResponse>(productsKey, fetcher, {
        fallbackData: queryString === initialQuery ? initialData : undefined,
        revalidateOnFocus: false,
        keepPreviousData: true,
    });

    const resetPage = () => setPage(1);

    const handleClearAll = () => {
        setQ('');
        setPriceSelection({ min: null, max: null });
        setCollection(undefined);
        setSizes([]);
        setColors([]);
        setOnlyInStock(false);
        setPrice([priceBounds.min, priceBounds.max]);
        setPriceUI([priceBounds.min, priceBounds.max]);
        resetPage();
    };

    const priceActive = price[0] > priceBounds.min || price[1] < priceBounds.max;
    const activeFilterCount = Number(Boolean(collection)) + sizes.length + colors.length + Number(onlyInStock) + Number(priceActive) + Number(Boolean(q.trim()));
    const chips = [
        ...(q.trim() ? [{ label: 'Búsqueda: ' + q, clear: () => { setQ(''); resetPage(); } }] : []),
        ...(collection ? [{ label: collections.find(c => c.value === collection)?.label || collection, clear: () => { setCollection(undefined); resetPage(); } }] : []),
        ...sizes.map(size => ({ label: 'Talla: ' + size, clear: () => { setSizes(sizes.filter(s => s !== size)); resetPage(); } })),
        ...colors.map(color => ({ label: color, clear: () => { setColors(colors.filter(c => c !== color)); resetPage(); } })),
        ...(onlyInStock ? [{ label: 'Con stock', clear: () => { setOnlyInStock(false); resetPage(); } }] : []),
        ...(priceActive ? [{ label: 'S/ ' + price[0] + ' — S/ ' + price[1], clear: () => { setPriceSelection({ min: null, max: null }); setPrice([priceBounds.min,priceBounds.max]); setPriceUI([priceBounds.min,priceBounds.max]); resetPage(); } }] : []),
    ];

    const filterProps = {
        collections,
        collection,
        setCollection: (v: string | undefined) => { setCollection(v); resetPage(); },
        onlyInStock,
        setOnlyInStock: (v: boolean) => { setOnlyInStock(v); resetPage(); },
        priceBounds,
        priceUI,
        setPriceUI,
        onPriceChangeComplete: (v: [number, number]) => { setPriceSelection({ min: String(v[0]), max: String(v[1]) }); setPrice(v); resetPage(); },
        sizeOptions,
        sizes,
        setSizes: (v: string[]) => { setSizes(v); resetPage(); },
        colorOptions,
        colors,
        setColors: (v: string[]) => { setColors(v); resetPage(); },
        metaLoading
    };

    return (
        <div className={visual.shop} style={shopVariables}>
            <HeroSlider />
            <section id="shop-grid" className={visual.catalog} aria-labelledby="collection-title">
                <div className={visual.catalogHeading}>
                    <h1 id="collection-title">{customizableOnly ? 'Prendas personalizadas para mujer' : 'Nuestra colección'}</h1>
                    <span className={visual.count} role="status" aria-live="polite">{productsLoading && !data ? 'Buscando prendas…' : data ? data.total + (data.total === 1 ? ' prenda' : ' prendas') : ''}</span>
                </div>
                {customizableOnly && <p className={visual.customNote}>Elige una prenda, selecciona talla y color, y ajusta tus medidas antes de pedirla por WhatsApp.</p>}
                <div className={visual.toolbar}>
                    <button type="button" className={visual.filterButton} onClick={() => setFilterDrawerOpen(true)} aria-haspopup="dialog" aria-expanded={isFilterDrawerOpen}>
                        <SlidersOutlined />Filtros {activeFilterCount > 0 && <span className={visual.filterCount}>{activeFilterCount}</span>}
                    </button>
                    <div className={visual.sort}><label htmlFor="shop-sort">Ordenar por</label>
                        <select id="shop-sort" aria-label="Ordenar prendas" value={sort} onChange={e => { setSort(e.target.value); resetPage(); }}>
                            {SORT_OPTIONS.map(option => <option key={option.value} value={option.value}>{option.label}</option>)}
                        </select>
                    </div>
                </div>
                {chips.length > 0 && <div className={visual.activeFilters} aria-label="Filtros activos">
                    {chips.map(chip => <button type="button" key={chip.label} onClick={chip.clear} aria-label={'Quitar filtro: ' + chip.label}>{chip.label}<CloseOutlined /></button>)}
                    <button type="button" className={visual.clear} onClick={handleClearAll}>Limpiar todo</button>
                </div>}
                <Drawer title="Encuentra tu prenda" placement="left" size={isMobile ? '100vw' : 420} open={isFilterDrawerOpen}
                    onClose={() => setFilterDrawerOpen(false)} rootStyle={shopVariables} styles={{ body: { padding:24 } }}
                    footer={<div className={visual.drawerFooter}>
                        <button type="button" className={visual.filterButton} onClick={handleClearAll}>Limpiar</button>
                        <button type="button" className={visual.primary} style={{flex:1}} onClick={() => setFilterDrawerOpen(false)}>Ver resultados</button>
                    </div>}>
                    <p style={{fontSize:12,marginBottom:24,color:token.colorTextSecondary}}>Combina tus preferencias. El catálogo se actualiza mientras eliges.</p>
                    {metaLoading && !meta ? <ShopFiltersSkeleton /> : <ShopFilters {...filterProps} />}
                </Drawer>
                {(metaError || productsError) && <Alert type="error" showIcon title="No pudimos actualizar el catálogo" description="Intenta nuevamente en unos momentos." style={{marginBottom:24}} />}
                {productsLoading && !data ? <ProductGridSkeleton count={pageSize} /> : data && data.items.length > 0 ? <>
                    <div className={styles.grid + (productsLoading ? ' ' + styles.gridLoading : '')} aria-busy={productsLoading}><ProductGrid items={data.items} /></div>
                    <div className={visual.resultsFooter}>
                        <span className={visual.count}>Mostrando {data.items.length} de {data.total} prendas</span>
                        <Pagination current={data.page} pageSize={data.pageSize} total={data.total} showSizeChanger={false} hideOnSinglePage
                            itemRender={(targetPage,type,element) => {
                                if (!['page','prev','next'].includes(type) || targetPage < 1 || targetPage > Math.ceil(data.total / data.pageSize)) return element;
                                const params = new URLSearchParams(queryString);
                                if (targetPage > 1) params.set('page',String(targetPage)); else params.delete('page');
                                const href = pathname + (params.size ? '?' + params.toString() : '');
                                return <a href={href} aria-label={'Página ' + targetPage}>{type === 'page' ? targetPage : type === 'prev' ? '‹' : '›'}</a>;
                            }}
                            onChange={(p,ps) => { setPage(p); if (ps) setPageSize(ps); document.getElementById('shop-grid')?.scrollIntoView({behavior:window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'instant' : 'smooth'}); }} />
                    </div>
                </> : !productsError && <div className={visual.empty}>
                    <h2>No encontramos esa combinación</h2>
                    <p>Prueba con otra talla, color o rango de precio para descubrir más prendas.</p>
                    {activeFilterCount > 0 && <button type="button" className={visual.primary} onClick={handleClearAll}>Ver todas las prendas</button>}
                </div>}
            </section>
            <ShopTrust />
        </div>
    );
}
