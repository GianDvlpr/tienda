'use client';

import React, { useMemo, useState } from 'react';
import { Button, Card, Divider, Form, Input, Radio, Space, Typography, message, List } from 'antd';
import { useRouter } from 'next/navigation';
import { useCartStore } from '@/store/cart.store';
import { formatPEN } from '@/lib/money';
import { checkoutSchema, type CheckoutFormValues } from '@/lib/checkout.schema';
import type { CheckoutRequest, CheckoutResponse } from '@/types/order';

const { Title, Text } = Typography;

export default function CheckoutPage() {
    const router = useRouter();

    const items = useCartStore((s) => s.items);
    const subtotal = useCartStore((s) => s.subtotal());
    const clear = useCartStore((s) => s.clear);

    const [submitting, setSubmitting] = useState(false);

    const shippingCost = 0; // luego lo calculas por ciudad/distrito
    const total = useMemo(() => subtotal + shippingCost, [subtotal, shippingCost]);

    const [form] = Form.useForm<CheckoutFormValues>();

    const cartPayloadItems = useMemo(
        () => items.map((x) => ({ variantId: x.variantId, qty: x.qty })),
        [items]
    );

    const onFinish = async (values: CheckoutFormValues) => {
        if (items.length === 0) {
            message.warning('Tu carrito está vacío');
            return;
        }

        // Validación zod (extra)
        const parsed = checkoutSchema.safeParse(values);
        if (!parsed.success) {
            message.error('Revisa los datos del formulario');
            return;
        }

        const payload: CheckoutRequest = {
            items: cartPayloadItems,

            // Por ahora usamos shipping como customer también (MVP)
            customerName: values.shippingName,
            customerPhone: values.shippingPhone,
            customerEmail: null,

            shippingName: values.shippingName,
            shippingPhone: values.shippingPhone,
            shippingAddress: values.shippingAddress,
            shippingCity: values.shippingCity ?? null,
            shippingReference: values.shippingReference ?? null,

            notes: values.notes ?? null,
            paymentMethod: values.paymentMethod ?? 'YAPE',
        };

        try {
            setSubmitting(true);
            const res = await fetch('/api/store/checkout', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload),
            });

            if (!res.ok) {
                const err = await res.json().catch(() => ({}));
                throw new Error(err?.error ?? `HTTP ${res.status}`);
            }

            const json = (await res.json()) as CheckoutResponse;

            clear();
            message.success('Pedido creado');

            router.push(`/order/${json.code}`);
        } catch (e: any) {
            message.error(e?.message ?? 'No se pudo crear el pedido');
        } finally {
            setSubmitting(false);
        }
    };

    return (
        <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1fr) 380px', gap: 16 }}>
            <Card>
                <Title level={3} style={{ marginTop: 0 }}>Checkout</Title>

                <Form
                    form={form}
                    layout="vertical"
                    initialValues={{ paymentMethod: 'YAPE' }}
                    onFinish={onFinish}
                >
                    <Title level={5}>Datos de envío</Title>

                    <Form.Item
                        label="Nombre completo"
                        name="shippingName"
                        rules={[{ required: true, message: 'Ingresa tu nombre' }]}
                    >
                        <Input placeholder="Ej: Gian Franco" />
                    </Form.Item>

                    <Form.Item
                        label="Teléfono (WhatsApp)"
                        name="shippingPhone"
                        rules={[{ required: true, message: 'Ingresa tu teléfono' }]}
                    >
                        <Input placeholder="Ej: 999888777" />
                    </Form.Item>

                    <Form.Item
                        label="Dirección"
                        name="shippingAddress"
                        rules={[{ required: true, message: 'Ingresa tu dirección' }]}
                    >
                        <Input placeholder="Ej: Av. X, Mz Y Lt Z, distrito" />
                    </Form.Item>

                    <Form.Item label="Ciudad / Distrito (opcional)" name="shippingCity">
                        <Input placeholder="Ej: Lima - Surco" />
                    </Form.Item>

                    <Form.Item label="Referencia (opcional)" name="shippingReference">
                        <Input placeholder="Ej: Frente al parque, portón negro" />
                    </Form.Item>

                    <Form.Item label="Nota (opcional)" name="notes">
                        <Input.TextArea rows={3} placeholder="Ej: Entregar en recepción" />
                    </Form.Item>

                    <Divider />

                    <Title level={5}>Método de pago</Title>
                    <Form.Item name="paymentMethod">
                        <Radio.Group>
                            <Radio value="YAPE">Yape</Radio>
                            <Radio value="PLIN">Plin</Radio>
                            <Radio value="TRANSFER">Transferencia</Radio>
                        </Radio.Group>
                    </Form.Item>

                    <Button type="primary" htmlType="submit" loading={submitting} disabled={items.length === 0}>
                        Confirmar pedido
                    </Button>

                    {items.length === 0 ? (
                        <div style={{ marginTop: 12 }}>
                            <Text type="secondary">Agrega productos al carrito para continuar.</Text>
                        </div>
                    ) : null}
                </Form>
            </Card>

            <Card>
                <Title level={5} style={{ marginTop: 0 }}>Resumen</Title>

                <List
                    dataSource={items}
                    renderItem={(x) => (
                        <List.Item>
                            <List.Item.Meta
                                title={<Text strong>{x.name}</Text>}
                                description={
                                    <Text type="secondary">{`${x.size} · ${x.color} · x${x.qty}`}</Text>
                                }
                            />
                            <Text>{formatPEN(x.unitPrice * x.qty)}</Text>
                        </List.Item>
                    )}
                />

                <Divider />

                <Space orientation="vertical" style={{ width: '100%' }} size={6}>
                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                        <Text type="secondary">Subtotal</Text>
                        <Text>{formatPEN(subtotal)}</Text>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                        <Text type="secondary">Envío</Text>
                        <Text>{formatPEN(shippingCost)}</Text>
                    </div>
                    <Divider style={{ margin: '8px 0' }} />
                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                        <Text strong>Total</Text>
                        <Text strong>{formatPEN(total)}</Text>
                    </div>
                </Space>
            </Card>
        </div>
    );
}