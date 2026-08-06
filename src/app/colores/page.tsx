import React from 'react';
import { Metadata } from 'next';
import { Spin } from 'antd';
import { prisma } from '@/lib/prisma';
import ColoresClient, { type ColorItem } from './ColoresClient';

export const metadata: Metadata = {
    title: 'Paleta de Colores | Aura Boutique',
    description: 'Explora los colores disponibles para nuestras prendas personalizables.',
};

export const revalidate = 300;

async function getAllColors(): Promise<ColorItem[]> {
    const colors = await prisma.custom_color.findMany({
        where: { is_active: true },
        include: {
            supply_color_stock: {
                where: { is_available: true, is_active: true, stock: { gt: 0 } },
                select: { supply_id: true },
            },
        },
        orderBy: [{ sort_order: 'asc' }, { name: 'asc' }],
    });

    return colors.map((color) => ({
        name: color.name,
        hex: color.hex,
        available: color.is_available && color.supply_color_stock.length > 0,
    }));
}

export default async function ColoresPage() {
    let colors: ColorItem[] = [];
    let error: string | null = null;

    try {
        colors = await getAllColors();
    } catch {
        error = 'No se pudo cargar la paleta de colores. Intenta nuevamente.';
    }

    if (error) {
        return <div style={{ padding: '60px 20px', textAlign: 'center', color: '#888' }}>{error}</div>;
    }

    if (!colors.length) {
        return (
            <div style={{ padding: '120px 20px', textAlign: 'center' }}>
                <Spin />
            </div>
        );
    }

    return <ColoresClient initialColors={colors} />;
}
