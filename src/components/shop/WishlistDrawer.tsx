'use client';

import React from 'react';
import { Button, Drawer, Empty, List, Space, Typography } from 'antd';
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
            size={420}
        >
            {items.length === 0 ? (
                <Empty description="No tienes artículos favoritos" />
            ) : (
                <List
                    itemLayout="horizontal"
                    dataSource={items}
                    renderItem={(item) => (
                        <List.Item
                            actions={[
                                <Button
                                    key="cart"
                                    type="text"
                                    icon={<ShoppingFilled style={{ color: '#000' }} />}
                                    onClick={() => handleMoveToCart(item)}
                                    title="Mover al Carrito"
                                />,
                                <Button
                                    key="delete"
                                    type="text"
                                    danger
                                    icon={<DeleteFilled />}
                                    onClick={() => removeItem(item.variantId)}
                                    title="Eliminar"
                                />,
                            ]}
                        >
                            <List.Item.Meta
                                avatar={
                                    <div style={{ width: 56, height: 56, overflow: 'hidden', borderRadius: 8 }}>
                                        {item.imageUrl ? (
                                            // eslint-disable-next-line @next/next/no-img-element
                                            <img
                                                src={item.imageUrl}
                                                alt={item.name}
                                                style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                                            />
                                        ) : null}
                                    </div>
                                }
                                title={
                                    <Space orientation="vertical" size={0}>
                                        <Link href={`/product/${item.slug}`} onClick={onClose}>
                                            <Text strong>{item.name}</Text>
                                        </Link>
                                        <Text type="secondary">{`${item.size} · ${item.color}`}</Text>
                                    </Space>
                                }
                                description={
                                    <Space orientation="vertical" size={6}>
                                        <Text>{formatPEN(item.unitPrice)}</Text>
                                    </Space>
                                }
                            />
                        </List.Item>
                    )}
                />
            )}
        </Drawer>
    );
}
