'use client';

import React from 'react';
import { Button, Drawer, Empty, List, Space, Typography, Flex, theme, Card } from 'antd';
import { DeleteFilled, ShoppingFilled } from '@ant-design/icons';
import Link from 'next/link';
import { useWishlistStore } from '@/store/wishlist.store';
import { useCartStore } from '@/store/cart.store';
import { formatPEN } from '@/lib/money';
import { toast } from 'sonner';

const { Text } = Typography;

export default function WishlistDrawer({
    open,
    onClose,
}: {
    open: boolean;
    onClose: () => void;
}) {
    const { token } = theme.useToken();
    const items = useWishlistStore((s) => s.items);
    const removeItem = useWishlistStore((s) => s.removeItem);
    const addToCart = useCartStore((s) => s.addItem);

    const handleMoveToCart = (item: any) => {
        addToCart({
            variantId: item.variantId,
            productId: item.productId,
            slug: item.slug,
            name: item.name,
            size: item.size,
            color: item.color,
            sku: item.sku,
            imageUrl: item.imageUrl,
            unitPrice: item.unitPrice,
        }, 1);
        removeItem(item.variantId);
        toast.success('Movido al carrito');
    };

    return (
        <Drawer
            title="Mis Favoritos"
            open={open}
            onClose={onClose}
            size="default"
        >
            {items.length === 0 ? (
                <Empty description="No tienes artículos favoritos" />
            ) : (
                <Flex vertical gap={12}>
                    {items.map((item) => (
                        <Card key={item.variantId} size="small" variant="borderless" style={{ background: token.colorFillAlter }}>
                            <Flex align="start" gap={12}>
                                <div style={{ width: 56, height: 56, overflow: 'hidden', borderRadius: 8, flexShrink: 0 }}>
                                    {item.imageUrl ? (
                                        // eslint-disable-next-line @next/next/no-img-element
                                        <img
                                            src={item.imageUrl}
                                            alt={item.name}
                                            style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                                        />
                                    ) : null}
                                </div>
                                <div style={{ flex: 1 }}>
                                    <Link href={`/product/${item.slug}`} onClick={onClose} style={{ display: 'block', marginBottom: 4 }}>
                                        <Text strong>{item.name}</Text>
                                    </Link>
                                    <Text type="secondary" style={{ display: 'block', fontSize: 12 }}>{`${item.size} · ${item.color}`}</Text>
                                    
                                    <Flex align="center" justify="space-between" style={{ marginTop: 8 }}>
                                        <Text>{formatPEN(item.unitPrice)}</Text>
                                        <Space>
                                            <Button
                                                type="text"
                                                size="small"
                                                icon={<ShoppingFilled />}
                                                onClick={() => handleMoveToCart(item)}
                                                title="Mover al Carrito"
                                            />
                                            <Button
                                                type="text"
                                                danger
                                                size="small"
                                                icon={<DeleteFilled />}
                                                onClick={() => removeItem(item.variantId)}
                                                title="Eliminar"
                                            />
                                        </Space>
                                    </Flex>
                                </div>
                            </Flex>
                        </Card>
                    ))}
                </Flex>
            )}
        </Drawer>
    );
}
