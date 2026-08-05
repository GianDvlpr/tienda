import React from 'react';
import { Metadata } from 'next';
import { Spin } from 'antd';
import { prisma } from '@/lib/prisma';
import ColoresClient, { type ColorProductItem } from './ColoresClient';

export const metadata: Metadata = {
    title: 'Paleta de Colores | Aura Boutique',
    description: 'Explora los colores disponibles para nuestras prendas personalizables.',
};

export const revalidate = 300;

async function getColorProducts(): Promise<ColorProductItem[]> {
    const products = await prisma.product.findMany({
        where: {
            is_active: true,
            is_customizable: true,
            custom_fabric_supply_id: { not: null },
        },
        include: {
            product_image: {
                orderBy: [{ sort_order: 'asc' }, { created_at: 'desc' }],
                take: 1,
            },
        },
        orderBy: [{ name: 'asc' }],
    });

    const supplyIds = Array.from(new Set(
        products.map((p) => p.custom_fabric_supply_id).filter((id): id is string => Boolean(id))
    ));

    const stockRows = supplyIds.length
        ? await prisma.supply_color_stock.findMany({
            where: {
                supply_id: { in: supplyIds },
                color: { is_active: true },
                is_available: true,
                is_active: true,
                stock: { gt: 0 },
            },
            include: { color: true },
            orderBy: [{ color: { sort_order: 'asc' } }, { color: { name: 'asc' } }],
        })
        : [];

    const supplies = supplyIds.length
        ? await prisma.supply.findMany({
            where: { supply_id: { in: supplyIds } },
            select: { supply_id: true, name: true },
        })
        : [];
    const supplyNameById = new Map(supplies.map((s) => [s.supply_id, s.name]));

    const colorsBySupply = new Map<string, typeof stockRows>();
    for (const row of stockRows) {
        const list = colorsBySupply.get(row.supply_id) ?? [];
        list.push(row);
        colorsBySupply.set(row.supply_id, list);
    }

    return products.map((p) => {
        const supplyId = p.custom_fabric_supply_id;
        const rows = supplyId ? (colorsBySupply.get(supplyId) ?? []) : [];
        return {
            productId: p.product_id,
            slug: p.slug,
            name: p.name,
            primaryImageUrl: p.product_image[0]?.url ?? null,
            fabricName: supplyId ? (supplyNameById.get(supplyId) ?? null) : null,
            colors: rows.map((row) => ({
                name: row.color.name,
                hex: row.color.hex,
                available: Boolean(row.color.is_available && row.is_available && row.is_active && Number(row.stock) > 0),
                stock: Number(row.stock),
            })),
        };
    }).filter((p) => p.colors.length > 0);
}

export default async function ColoresPage() {
    let products: ColorProductItem[] = [];
    let error: string | null = null;

    try {
        products = await getColorProducts();
    } catch {
        error = 'No se pudo cargar la paleta de colores. Intenta nuevamente.';
    }

    if (error) {
        return <div style={{ padding: '60px 20px', textAlign: 'center', color: '#888' }}>{error}</div>;
    }

    if (!products.length) {
        return (
            <div style={{ padding: '120px 20px', textAlign: 'center' }}>
                <Spin />
            </div>
        );
    }

    return <ColoresClient initialProducts={products} />;
}