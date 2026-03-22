'use client';

import React, { useState } from 'react';
import { Button, Drawer, Empty, InputNumber, List, Space, Typography, Form, Input, message, Card } from 'antd';
import { DeleteOutlined, WhatsAppOutlined, ArrowLeftOutlined } from '@ant-design/icons';
import Link from 'next/link';
import { useCartStore } from '@/store/cart.store';
import { formatPEN } from '@/lib/money';

const { Text, Title } = Typography;

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
    const clearCart = useCartStore((s) => s.clear);
    const subtotal = useCartStore((s) => s.subtotal());

    const [isCheckoutView, setIsCheckoutView] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [form] = Form.useForm();

    // The legacy direct-to-whatsapp flow is now wrapped by a Form submission to our API
    const handleCheckoutSubmit = async (values: any) => {
        setIsSubmitting(true);
        try {
            // 1. Save to Database
            const res = await fetch('/api/store/checkout', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    shipping_name: values.shipping_name,
                    shipping_phone: values.shipping_phone,
                    shipping_address: values.shipping_address,
                    items: items,
                    subtotal: subtotal
                })
            });

            if (!res.ok) {
                const err = await res.json();
                throw new Error(err.error || 'Ocurrió un error al procesar el pedido');
            }

            const data = await res.json();
            const orderCode = data.orderCode;

            // 2. Clear cart and close
            clearCart();
            setIsCheckoutView(false);
            form.resetFields();
            onClose();
            
            message.success(`Pedido ${orderCode} registrado correctamente. Nos pondremos en contacto contigo pronto.`);
        } catch (error: any) {
            message.error(error.message);
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleClose = () => {
        setIsCheckoutView(false);
        onClose();
    };

    return (
        <Drawer
            title={
                isCheckoutView ? (
                    <Space>
                        <Button type="text" icon={<ArrowLeftOutlined />} onClick={() => setIsCheckoutView(false)} />
                        <span>Completar Pedido</span>
                    </Space>
                ) : "Mi Lista"
            }
            open={open}
            onClose={handleClose}
            size={isCheckoutView ? 380 : 420}
            footer={
                !isCheckoutView && items.length > 0 && (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <Text strong>Total Ref: {formatPEN(subtotal)}</Text>
                        </div>
                        <Button 
                            type="primary" 
                            onClick={() => setIsCheckoutView(true)}
                            style={{ width: '100%', height: 40, fontSize: 16 }}
                        >
                            Proceder al Checkout
                        </Button>
                    </div>
                )
            }
        >
            {isCheckoutView ? (
                <div>
                    <Typography.Paragraph type="secondary">
                        Ingresa tus datos para registrar el pedido antes de coordinar por WhatsApp.
                    </Typography.Paragraph>
                    <Form layout="vertical" form={form} onFinish={handleCheckoutSubmit}>
                        <Form.Item label="Nombre Completo" name="shipping_name" rules={[{ required: true, message: 'Ingresa tu nombre' }]}>
                            <Input placeholder="Ej. Ana Pérez" size="large" />
                        </Form.Item>
                        <Form.Item label="Celular / WhatsApp" name="shipping_phone" rules={[{ required: true, message: 'Ingresa tu celular' }]}>
                            <Input placeholder="Ej. 999 888 777" size="large" />
                        </Form.Item>
                        <Form.Item label="Dirección de envío (Opcional)" name="shipping_address">
                            <Input.TextArea placeholder="Añade referencias si deseas delivery" rows={3} />
                        </Form.Item>

                        <Card size="small" style={{ marginTop: 24, marginBottom: 24 }}>
                             <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
                                <Text>Productos ({items.length})</Text>
                                <Text>{formatPEN(subtotal)}</Text>
                             </div>
                             <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                                <Text strong>Total Referencial</Text>
                                <Text strong>{formatPEN(subtotal)}</Text>
                             </div>
                        </Card>

                        <Button 
                            type="primary" 
                            htmlType="submit"
                            loading={isSubmitting}
                            style={{ width: '100%', height: 44, fontSize: 16, marginTop: 24 }}
                        >
                            Finalizar Pedido
                        </Button>
                    </Form>
                </div>
            ) : items.length === 0 ? (
                <Empty description="Tu lista está vacía" />
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