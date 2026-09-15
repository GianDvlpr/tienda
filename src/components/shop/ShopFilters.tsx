'use client';
import { Select, Switch, Slider } from 'antd';
import { CheckOutlined } from '@ant-design/icons';
import { getColorHex } from '@/lib/product-colors';
import styles from './shopVisual.module.css';
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


export default function ShopFilters(p: ShopFiltersProps) {
    return <div>
        <fieldset className={styles.filterSection}><legend>Colección</legend>
            <Select aria-label="Colección" allowClear placeholder="Todas las colecciones" value={p.collection} onChange={p.setCollection} options={p.collections} style={{width:'100%'}} size="large" loading={p.metaLoading} />
        </fieldset>
        <fieldset className={styles.filterSection}><legend>Disponibilidad</legend>
            <label style={{display:'flex',justifyContent:'space-between',gap:12,fontSize:13}}>Solo prendas con stock <Switch aria-label="Solo prendas con stock" checked={p.onlyInStock} onChange={p.setOnlyInStock} /></label>
        </fieldset>
        <fieldset className={styles.filterSection}><legend>Precio</legend>
            <p style={{fontSize:13,marginBottom:16}}>S/ {p.priceUI[0]} — S/ {p.priceUI[1]}</p>
            <Slider range min={p.priceBounds.min} max={p.priceBounds.max} step={1} value={p.priceUI}
                onChange={v => p.setPriceUI(v as [number,number])} onChangeComplete={v => p.onPriceChangeComplete(v as [number,number])} disabled={p.metaLoading || p.priceBounds.min === p.priceBounds.max} />
        </fieldset>
        <fieldset className={styles.filterSection}><legend>Tallas</legend><div className={styles.options}>
            {p.sizeOptions.map(size => <button type="button" key={size} className={styles.option} aria-pressed={p.sizes.includes(size)} disabled={p.metaLoading}
                onClick={() => p.setSizes(p.sizes.includes(size) ? p.sizes.filter(s => s !== size) : [...p.sizes,size])}>{size}</button>)}
            {!p.sizeOptions.length && <span>No hay tallas para estos filtros.</span>}
        </div></fieldset>
        <fieldset className={styles.filterSection}><legend>Colores</legend><div className={styles.options}>
            {p.colorOptions.map(color => <button type="button" key={color} className={styles.option} aria-pressed={p.colors.includes(color)} disabled={p.metaLoading}
                onClick={() => p.setColors(p.colors.includes(color) ? p.colors.filter(c => c !== color) : [...p.colors,color])}>
                <i style={{background:getColorHex(color)}} aria-hidden />{color}{p.colors.includes(color) && <CheckOutlined />}</button>)}
            {!p.colorOptions.length && <span>No hay colores para estos filtros.</span>}
        </div></fieldset>
    </div>;
}
