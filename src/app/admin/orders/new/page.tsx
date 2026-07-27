'use client';

import React from 'react';
import { toast } from 'sonner';
import { Button, Card, Col, Form, Input, InputNumber, Row, Select, Space, Table, Tag, Typography } from 'antd';
import { DeleteOutlined, LeftOutlined, PlusOutlined, SaveOutlined } from '@ant-design/icons';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import useSWR from 'swr';
import { fetcher } from '@/lib/fetcher';
import { formatPEN } from '@/lib/money';
import type { ColumnsType } from 'antd/es/table';

const { Title, Text } = Typography;

type ProductVariant = {
    variant_id: string;
    sku: string;
    size: string;
    color: string;
    price?: number | string | null;
    stock: number;
    is_active: boolean;
};

type Product = {
    product_id: string;
    name: string;
    base_price?: number | string | null;
    is_active: boolean;
    product_variant?: ProductVariant[];
};

type SaleItem = {
    variant_id: string;
    product_name: string;
    sku: string;
    size: string;
    color: string;
    stock: number;
    qty: number;
    unit_price: number;
};

type CreatedOrderResponse = {
    order_id: string;
    code: string;
};

function getErrorMessage(error: unknown, fallback: string) {
    return error instanceof Error ? error.message : fallback;
}

const salesChannelOptions = [
    { value: 'WHATSAPP', label: 'WhatsApp' },
    { value: 'TIKTOK', label: 'TikTok' },
    { value: 'INSTAGRAM', label: 'Instagram' },
    { value: 'FACEBOOK', label: 'Facebook' },
    { value: 'OTHER', label: 'Otro canal' },
];

const statusOptions = [
    { value: 'PENDING_WS', label: 'Pendiente de pago/contacto' },
    { value: 'PAID', label: 'Pagado' },
    { value: 'CONFIRMED', label: 'Confirmado / En preparación' },
    { value: 'SHIPPED', label: 'Enviado' },
    { value: 'DELIVERED', label: 'Entregado' },
];

const paymentMethodOptions = [
    { value: 'YAPE', label: 'Yape' },
    { value: 'PLIN', label: 'Plin' },
    { value: 'TRANSFER', label: 'Transferencia' },
    { value: 'CARD', label: 'Tarjeta' },
    { value: 'CASH', label: 'Efectivo' },
    { value: 'OTHER', label: 'Otro' },
];

export default function NewAdminOrderPage() {
    const [form] = Form.useForm();
    const router = useRouter();
    const { data: products, isLoading } = useSWR<Product[]>('/api/admin/products', fetcher);
    const [selectedVariantId, setSelectedVariantId] = React.useState<string>();
    const [selectedQty, setSelectedQty] = React.useState(1);
    const [selectedPrice, setSelectedPrice] = React.useState<number | null>(null);
    const [items, setItems] = React.useState<SaleItem[]>([]);
    const [isSaving, setIsSaving] = React.useState(false);

    const variantOptions = (products || []).flatMap(product =>
        (product.product_variant || []).map(variant => {
            const price = Number(variant.price ?? product.base_price ?? 0);
            const label = `${product.name} - ${variant.size} / ${variant.color} | ${variant.sku} | Stock: ${variant.stock}`;
            return {
                value: variant.variant_id,
                label,
                disabled: !product.is_active || !variant.is_active || variant.stock <= 0,
                product,
                variant,
                price,
            };
        })
    );

    const total = items.reduce((sum, item) => sum + item.qty * item.unit_price, 0);

    const handleVariantChange = (variantId: string) => {
        setSelectedVariantId(variantId);
        const option = variantOptions.find(opt => opt.value === variantId);
        setSelectedPrice(option?.price ?? 0);
    };

    const handleAddItem = () => {
        if (!selectedVariantId) {
            toast.error('Selecciona un producto');
            return;
        }

        const option = variantOptions.find(opt => opt.value === selectedVariantId);
        if (!option) {
            toast.error('Producto no encontrado');
            return;
        }

        const qty = Number(selectedQty || 0);
        const unitPrice = Number(selectedPrice ?? option.price ?? 0);

        if (!Number.isInteger(qty) || qty <= 0) {
            toast.error('Ingresa una cantidad válida');
            return;
        }

        if (qty > option.variant.stock) {
            toast.error(`Stock insuficiente. Disponibles: ${option.variant.stock}`);
            return;
        }

        if (!Number.isFinite(unitPrice) || unitPrice < 0) {
            toast.error('Ingresa un precio válido');
            return;
        }

        setItems(prev => {
            const existing = prev.find(item => item.variant_id === selectedVariantId);
            if (existing && existing.qty + qty > option.variant.stock) {
                toast.error(`Stock insuficiente. Disponibles: ${option.variant.stock}`);
                return prev;
            }

            if (existing) {
                return prev.map(item => item.variant_id === selectedVariantId
                    ? { ...item, qty: item.qty + qty, unit_price: unitPrice }
                    : item
                );
            }

            return [
                ...prev,
                {
                    variant_id: option.variant.variant_id,
                    product_name: option.product.name,
                    sku: option.variant.sku,
                    size: option.variant.size,
                    color: option.variant.color,
                    stock: option.variant.stock,
                    qty,
                    unit_price: unitPrice,
                }
            ];
        });

        setSelectedVariantId(undefined);
        setSelectedQty(1);
        setSelectedPrice(null);
    };

    const handleCreateOrder = async () => {
        if (items.length === 0) {
            toast.error('Agrega al menos un producto');
            return;
        }

        setIsSaving(true);
        try {
            const values = await form.validateFields();
            const res = await fetch('/api/admin/orders', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    ...values,
                    items: items.map(item => ({
                        variant_id: item.variant_id,
                        qty: item.qty,
                        unit_price: item.unit_price,
                    })),
                }),
            });

            const data = await res.json() as CreatedOrderResponse & { error?: string };
            if (!res.ok) throw new Error(data.error || 'Error al registrar venta');

            toast.success(`Venta registrada: ${data.code}`);
            router.push(`/admin/orders/${data.order_id}`);
        } catch (error: unknown) {
            toast.error(getErrorMessage(error, 'Revisa los datos de la venta'));
        } finally {
            setIsSaving(false);
        }
    };

    const columns: ColumnsType<SaleItem> = [
        {
            title: 'Producto',
            key: 'product',
            render: (_value, record) => (
                <Space orientation="vertical" size={2}>
                    <Text strong>{record.product_name}</Text>
                    <Text type="secondary" style={{ fontSize: 12 }}>{record.size} - {record.color} | SKU: {record.sku}</Text>
                    <Tag color={record.stock <= 3 ? 'orange' : 'blue'}>Stock: {record.stock}</Tag>
                </Space>
            ),
        },
        {
            title: 'Cantidad',
            dataIndex: 'qty',
            key: 'qty',
            width: 110,
        },
        {
            title: 'Precio Unit.',
            dataIndex: 'unit_price',
            key: 'unit_price',
            render: (value: number) => formatPEN(value),
        },
        {
            title: 'Subtotal',
            key: 'subtotal',
            render: (_value, record) => <Text strong>{formatPEN(record.qty * record.unit_price)}</Text>,
        },
        {
            title: 'Acciones',
            key: 'actions',
            width: 90,
            render: (_value, record) => (
                <Button
                    type="text"
                    danger
                    icon={<DeleteOutlined />}
                    onClick={() => setItems(prev => prev.filter(item => item.variant_id !== record.variant_id))}
                />
            ),
        },
    ];

    return (
        <Space orientation="vertical" size="large" style={{ width: '100%' }}>
            <Space>
                <Link href="/admin/orders">
                    <Button icon={<LeftOutlined />}>Volver</Button>
                </Link>
                <Title level={3} style={{ margin: 0 }}>Registrar venta manual</Title>
            </Space>

            <Row gutter={[24, 24]}>
                <Col xs={24} lg={10}>
                    <Card title="Datos de la venta" variant="borderless">
                        <Form
                            form={form}
                            layout="vertical"
                            initialValues={{
                                sales_channel: 'WHATSAPP',
                                status: 'PAID',
                                payment_method: 'YAPE',
                            }}
                        >
                            <Row gutter={12}>
                                <Col xs={24} sm={12}>
                                    <Form.Item name="sales_channel" label="Canal" rules={[{ required: true, message: 'Selecciona un canal' }]}>
                                        <Select options={salesChannelOptions} />
                                    </Form.Item>
                                </Col>
                                <Col xs={24} sm={12}>
                                    <Form.Item name="status" label="Estado inicial" rules={[{ required: true, message: 'Selecciona un estado' }]}>
                                        <Select options={statusOptions} />
                                    </Form.Item>
                                </Col>
                            </Row>

                            <Form.Item name="external_reference" label="Referencia del canal">
                                <Input placeholder="Ej. usuario TikTok, link del chat, número de operación" />
                            </Form.Item>

                            <Row gutter={12}>
                                <Col xs={24} sm={12}>
                                    <Form.Item name="payment_method" label="Método de pago">
                                        <Select allowClear options={paymentMethodOptions} />
                                    </Form.Item>
                                </Col>
                                <Col xs={24} sm={12}>
                                    <Form.Item name="payment_reference" label="Referencia de pago">
                                        <Input placeholder="Operación, voucher, etc." />
                                    </Form.Item>
                                </Col>
                            </Row>

                            <Form.Item name="shipping_name" label="Cliente" rules={[{ required: true, message: 'Ingresa el nombre del cliente' }]}>
                                <Input placeholder="Nombre completo" />
                            </Form.Item>

                            <Form.Item name="shipping_phone" label="Celular / WhatsApp" rules={[{ required: true, message: 'Ingresa el celular' }]}>
                                <Input placeholder="Ej. 987654321" />
                            </Form.Item>

                            <Form.Item name="shipping_address" label="Dirección de entrega">
                                <Input.TextArea rows={2} placeholder="Opcional si coordina recojo o se confirma luego" />
                            </Form.Item>

                            <Form.Item name="notes" label="Notas internas">
                                <Input.TextArea rows={3} placeholder="Detalles de coordinación, delivery, observaciones, etc." />
                            </Form.Item>
                        </Form>
                    </Card>
                </Col>

                <Col xs={24} lg={14}>
                    <Card title="Productos vendidos" variant="borderless">
                        <Row gutter={[12, 12]} align="bottom">
                            <Col xs={24} md={12}>
                                <Text strong>Producto / Variante</Text>
                                <Select
                                    showSearch
                                    allowClear
                                    value={selectedVariantId}
                                    onChange={handleVariantChange}
                                    options={variantOptions}
                                    loading={isLoading}
                                    optionFilterProp="label"
                                    placeholder="Buscar por producto, talla, color o SKU"
                                    style={{ width: '100%', marginTop: 8 }}
                                />
                            </Col>
                            <Col xs={12} md={4}>
                                <Text strong>Cantidad</Text>
                                <InputNumber
                                    min={1}
                                    precision={0}
                                    value={selectedQty}
                                    onChange={(value) => setSelectedQty(Number(value || 1))}
                                    style={{ width: '100%', marginTop: 8 }}
                                />
                            </Col>
                            <Col xs={12} md={4}>
                                <Text strong>Precio</Text>
                                <InputNumber
                                    min={0}
                                    precision={2}
                                    value={selectedPrice ?? undefined}
                                    onChange={(value) => setSelectedPrice(value === null ? null : Number(value))}
                                    style={{ width: '100%', marginTop: 8 }}
                                    prefix="S/"
                                />
                            </Col>
                            <Col xs={24} md={4}>
                                <Button type="primary" icon={<PlusOutlined />} onClick={handleAddItem} block>
                                    Agregar
                                </Button>
                            </Col>
                        </Row>

                        <Table
                            columns={columns}
                            dataSource={items}
                            rowKey="variant_id"
                            pagination={false}
                            style={{ marginTop: 24 }}
                        />

                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 24, gap: 16, flexWrap: 'wrap' }}>
                            <Title level={4} style={{ margin: 0 }}>Total: {formatPEN(total)}</Title>
                            <Button
                                type="primary"
                                icon={<SaveOutlined />}
                                loading={isSaving}
                                disabled={items.length === 0}
                                onClick={handleCreateOrder}
                            >
                                Registrar venta
                            </Button>
                        </div>
                    </Card>
                </Col>
            </Row>
        </Space>
    );
}
