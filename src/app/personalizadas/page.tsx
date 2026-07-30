import React, { Suspense } from 'react';
import { Metadata } from 'next';
import { Spin } from 'antd';
import ShopClient from '../shop/ShopClient';

export const metadata: Metadata = {
    title: 'Prendas Personalizadas | Aura Boutique',
    description: 'Selecciona una prenda personalizable, ajusta tus medidas y solicita tu pedido por WhatsApp.',
};

export default function PersonalizedPage() {
    return (
        <Suspense fallback={<Spin size="large" style={{ display: 'block', margin: '150px auto' }} />}>
            <ShopClient customizableOnly />
        </Suspense>
    );
}
