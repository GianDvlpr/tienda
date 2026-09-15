'use client';
import { Skeleton } from 'antd';
import styles from './shopVisual.module.css';
export default function ProductGridSkeleton({ count = 12 }: { count?: number }) {
    return <div className={styles.productGrid} aria-label="Cargando prendas" aria-busy="true">{Array.from({length:count},(_,i) =>
        <div key={i}><div className={styles.photo} /><div className={styles.productInfo}><Skeleton title={{width:'65%'}} paragraph={{rows:2}} /></div></div>
    )}</div>;
}
