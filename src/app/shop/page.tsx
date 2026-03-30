import React, { Suspense } from 'react';
import { Metadata } from 'next';
import { Spin } from 'antd';
import ShopClient from './ShopClient';

export const metadata: Metadata = {
    title: 'Catálogo de Moda | Aura Boutique',
    description: 'Explora nuestra colección exclusiva de moda femenina. Filtra por talla, color y precio para encontrar tu look perfecto. Vestidos, blusas y más con envíos a todo el Perú.',
    openGraph: {
        title: 'Catálogo de Moda | Aura Boutique',
        description: 'Encuentra las mejores tendencias en moda femenina. Vestidos exclusivos y más.',
    },
};

export default function ShopPage() {
    return (
        <Suspense fallback={<Spin size="large" style={{ display: 'block', margin: '150px auto' }} />}>
            <ShopClient />
        </Suspense>
    );
}