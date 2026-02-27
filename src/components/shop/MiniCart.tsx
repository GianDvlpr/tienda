'use client';

import React from 'react';
import { Button, Drawer, Empty, InputNumber, List, Space, Typography } from 'antd';
import { DeleteOutlined } from '@ant-design/icons';
import Link from 'next/link';
import { useCartStore } from '@/store/cart.store';
import { formatPEN } from '@/lib/money';

const { Text } = Typography;

export default function MiniCart({
    open,
    onClose,
}: {
    open: boolean;
    onClose: () => void;
}) {
    const items = useCartStore((s) => s.items);
    const removeItem = useCartStore((s) => s.removeItem);
    const setQty = useCartStore((s) => s.setQty);
    const subtotal = useCartStore((s) => s.subtotal());

    return (
        <Drawer
            title="Carrito"
            open={open}
            onClose={onClose}
            size={420}
            footer={
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <Text strong>Subtotal: {formatPEN(subtotal)}</Text>
                    <Link href="/checkout" onClick={onClose}>
                        <Button type="primary" disabled={items.length === 0}>
                            Ir a pagar
                        </Button>
                    </Link>
                </div>
            }
        >
            {items.length === 0 ? (
                <Empty description="Tu carrito está vacío" />
            ) : (
                <List
                    itemLayout="horizontal"
                    dataSource={items}
                    renderItem={(item) => (
                        <List.Item
                            actions={[
                                <Button
                                    key="delete"
                                    type="text"
                                    danger
                                    icon={<DeleteOutlined />}
                                    onClick={() => removeItem(item.variantId)}
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
                                        <Space>
                                            <Text type="secondary">Cantidad</Text>
                                            <InputNumber
                                                min={1}
                                                value={item.qty}
                                                onChange={(v) => setQty(item.variantId, Number(v ?? 1))}
                                            />
                                        </Space>
                                        <Text type="secondary">
                                            Total: {formatPEN(item.unitPrice * item.qty)}
                                        </Text>
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