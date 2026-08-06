'use client';

import React from 'react';
import { toast } from 'sonner';
import { Button, Card, Col, Form, Input, InputNumber, Modal, Row, Select, Space, Table, Tag, Typography } from 'antd';
import { DeleteOutlined, LeftOutlined, PlusOutlined, SaveOutlined, ToolOutlined } from '@ant-design/icons';
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

type ProformaItem = {
    key: string;
    variant_id?: string;
    product_id?: string;
    product_name: string;
    sku?: string;
    size?: string;
    color?: string;
    qty: number;
    unit_price: number;
    surcharge_type?: 'CONFECCION' | 'DELIVERY';
    surcharge_amount: number;
    is_customized: boolean;
};

type CreatedProformaResponse = {
    proforma_id: string;
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
    { value: 'SHOP', label: 'Shop' },
    { value: 'OTHER', label: 'Otro canal' },
];

const proformaStatusOptions = [
    { value: 'DRAFT', label: 'Borrador' },
    { value: 'SENT', label: 'Enviada al cliente' },
    { value: 'ACCEPTED', label: 'Aceptada por el cliente' },
];

export default function NewProformaPage() {
    const [form] = Form.useForm();
    const router = useRouter();
    const { data: products, isLoading } = useSWR<Product[]>('/api/admin/products', fetcher);
    const [selectedVariantId, setSelectedVariantId] = React.useState<string>();
    const [selectedQty, setSelectedQty] = React.useState(1);
    const [selectedPrice, setSelectedPrice] = React.useState<number | null>(null);
    const [items, setItems] = React.useState<ProformaItem[]>([]);
    const [isSaving, setIsSaving] = React.useState(false);

    const [customModalOpen, setCustomModalOpen] = React.useState(false);
    const [customProductId, setCustomProductId] = React.useState<string>();
    const [customName, setCustomName] = React.useState('');
    const [customPrice, setCustomPrice] = React.useState<number | null>(null);
    const [customQty, setCustomQty] = React.useState(1);
    const [customSurchargeType, setCustomSurchargeType] = React.useState<'CONFECCION' | 'DELIVERY'>('CONFECCION');
    const [customSurchargeAmount, setCustomSurchargeAmount] = React.useState<number>(0);

    const variantOptions = (products || []).flatMap(product =>
        (product.product_variant || []).map(variant => {
            const variantPrice = Number(variant.price ?? 0);
            const price = variantPrice > 0 ? variantPrice : Number(product.base_price ?? 0);
            const label = `${product.name} - ${variant.size} / ${variant.color} | ${variant.sku} | Stock: ${variant.stock}`;
            return {
                value: variant.variant_id,
                label,
                product,
                variant,
                price,
            };
        })
    );

    const subtotal = items.reduce((sum, item) => sum + item.qty * (item.unit_price + item.surcharge_amount), 0);
    const shippingCost = Number(Form.useWatch('shipping_cost', form) || 0);
    const discountTotal = Number(Form.useWatch('discount_total', form) || 0);
    const total = Math.max(0, subtotal + shippingCost - discountTotal);

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

        if (!Number.isFinite(unitPrice) || unitPrice < 0) {
            toast.error('Ingresa un precio válido');
            return;
        }

        const existing = items.find(item => item.variant_id === option.variant.variant_id);
        if (existing) {
            setItems(prev => prev.map(item =>
                item.variant_id === option.variant.variant_id
                    ? { ...item, qty: item.qty + qty, unit_price: unitPrice }
                    : item
            ));
        } else {
            setItems(prev => [
                ...prev,
                {
                    key: `v-${option.variant.variant_id}`,
                    variant_id: option.variant.variant_id,
                    product_id: option.product.product_id,
                    product_name: option.product.name,
                    sku: option.variant.sku,
                    size: option.variant.size,
                    color: option.variant.color,
                    qty,
                    unit_price: unitPrice,
                    surcharge_amount: 0,
                    is_customized: false,
                }
            ]);
        }

        setSelectedVariantId(undefined);
        setSelectedQty(1);
        setSelectedPrice(null);
    };

    const openCustomModal = () => {
        setCustomProductId(undefined);
        setCustomName('');
        setCustomPrice(null);
        setCustomQty(1);
        setCustomSurchargeType('CONFECCION');
        setCustomSurchargeAmount(0);
        setCustomModalOpen(true);
    };

    const handleCustomProductChange = (productId: string) => {
        setCustomProductId(productId);
        const product = (products || []).find(p => p.product_id === productId);
        if (product) {
            setCustomName(product.name);
            setCustomPrice(Number(product.base_price ?? 0));
        }
    };

    const handleAddCustomItem = () => {
        const name = customName.trim();
        const qty = Number(customQty || 0);
        const price = Number(customPrice ?? 0);
        const surchargeAmount = Number(customSurchargeAmount || 0);

        if (!name) {
            toast.error('Ingresa el nombre del producto');
            return;
        }

        if (!Number.isInteger(qty) || qty <= 0) {
            toast.error('Ingresa una cantidad válida');
            return;
        }

        if (!Number.isFinite(price) || price < 0) {
            toast.error('Ingresa un precio base válido');
            return;
        }

        if (!Number.isFinite(surchargeAmount) || surchargeAmount < 0) {
            toast.error('Ingresa un recargo válido');
            return;
        }

        const product = (products || []).find(p => p.product_id === customProductId);
        const firstVariant = product?.product_variant?.[0];

        setItems(prev => [
            ...prev,
            {
                key: `c-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
                variant_id: firstVariant?.variant_id,
                product_id: customProductId,
                product_name: name,
                sku: firstVariant?.sku,
                size: firstVariant?.size,
                color: firstVariant?.color,
                qty,
                unit_price: price,
                surcharge_type: customSurchargeType,
                surcharge_amount: surchargeAmount,
                is_customized: true,
            }
        ]);

        setCustomModalOpen(false);
    };

    const updateItem = (key: string, patch: Partial<ProformaItem>) => {
        setItems(prev => prev.map(item => item.key === key ? { ...item, ...patch } : item));
    };

    const handleCreateProforma = async () => {
        if (items.length === 0) {
            toast.error('Agrega al menos un producto');
            return;
        }

        setIsSaving(true);
        try {
            const values = await form.validateFields();
            const res = await fetch('/api/admin/proformas', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    customer_name: values.customer_name,
                    customer_phone: values.customer_phone,
                    customer_email: values.customer_email || undefined,
                    shipping_cost: values.shipping_cost || 0,
                    discount_total: values.discount_total || 0,
                    notes: values.notes || undefined,
                    sales_channel: values.sales_channel,
                    status: values.status,
                    items: items.map(item => ({
                        variant_id: item.variant_id,
                        product_name: item.product_name,
                        size: item.size,
                        color: item.color,
                        sku: item.sku,
                        qty: item.qty,
                        unit_price: item.unit_price,
                        surcharge_type: item.surcharge_type,
                        surcharge_amount: item.surcharge_amount,
                        is_customized: item.is_customized,
                    })),
                }),
            });

            const data = await res.json() as CreatedProformaResponse & { error?: string };
            if (!res.ok) throw new Error(data.error || 'Error al crear proforma');

            toast.success(`Proforma creada: ${data.code}`);
            router.push(`/admin/proformas/${data.proforma_id}`);
        } catch (error: unknown) {
            toast.error(getErrorMessage(error, 'Revisa los datos de la proforma'));
        } finally {
            setIsSaving(false);
        }
    };

    const columns: ColumnsType<ProformaItem> = [
        {
            title: 'Producto',
            key: 'product',
            render: (_value, record) => (
                <Space orientation="vertical" size={2}>
                    <Space size={4}>
                        <Text strong>{record.product_name}</Text>
                        {record.is_customized && <Tag color="gold" style={{ marginInlineEnd: 0 }}>Pers.</Tag>}
                    </Space>
                    {record.size && record.color ? (
                        <Text type="secondary" style={{ fontSize: 12 }}>{record.size} - {record.color}{record.sku ? ` | SKU: ${record.sku}` : ''}</Text>
                    ) : (
                        <Text type="secondary" style={{ fontSize: 12 }}>Producto personalizado</Text>
                    )}
                </Space>
            ),
        },
        {
            title: 'Cantidad',
            key: 'qty',
            width: 90,
            render: (_value, record) => (
                <InputNumber
                    min={1}
                    precision={0}
                    value={record.qty}
                    onChange={(value) => updateItem(record.key, { qty: Number(value || 1) })}
                    style={{ width: '100%' }}
                />
            ),
        },
        {
            title: 'Precio base',
            key: 'unit_price',
            width: 140,
            render: (_value, record) => (
                <InputNumber
                    min={0}
                    precision={2}
                    prefix="S/"
                    value={record.unit_price}
                    onChange={(value) => updateItem(record.key, { unit_price: Number(value || 0) })}
                    style={{ width: '100%' }}
                />
            ),
        },
        {
            title: 'Recargo',
            key: 'surcharge',
            width: 190,
            render: (_value, record) => (
                <Space size={4} wrap={false}>
                    <Select
                        size="small"
                        allowClear
                        placeholder="Sin recargo"
                        value={record.surcharge_type}
                        onChange={(value) => updateItem(record.key, { surcharge_type: value || undefined })}
                        style={{ width: 110 }}
                        options={[
                            { value: 'CONFECCION', label: 'Confección' },
                            { value: 'DELIVERY', label: 'Delivery' },
                        ]}
                    />
                    <InputNumber
                        size="small"
                        min={0}
                        precision={2}
                        prefix="S/"
                        disabled={!record.surcharge_type}
                        value={record.surcharge_amount}
                        onChange={(value) => updateItem(record.key, { surcharge_amount: Number(value || 0) })}
                        style={{ width: 90 }}
                    />
                </Space>
            ),
        },
        {
            title: 'Subtotal',
            key: 'subtotal',
            width: 110,
            render: (_value, record) => (
                <Text strong>{formatPEN(record.qty * (record.unit_price + record.surcharge_amount))}</Text>
            ),
        },
        {
            title: 'Acciones',
            key: 'actions',
            width: 60,
            render: (_value, record) => (
                <Button
                    type="text"
                    danger
                    icon={<DeleteOutlined />}
                    onClick={() => setItems(prev => prev.filter(item => item.key !== record.key))}
                />
            ),
        },
    ];

    return (
        <Space orientation="vertical" size="large" style={{ width: '100%' }}>
            <Space>
                <Link href="/admin/proformas">
                    <Button icon={<LeftOutlined />}>Volver</Button>
                </Link>
                <Title level={3} style={{ margin: 0 }}>Nueva proforma</Title>
            </Space>

            <Row gutter={[24, 24]}>
                <Col xs={24} lg={10}>
                    <Card title="Datos del cliente" variant="borderless">
                        <Form
                            form={form}
                            layout="vertical"
                            initialValues={{
                                sales_channel: 'WHATSAPP',
                                status: 'DRAFT',
                            }}
                        >
                            <Row gutter={12}>
                                <Col xs={24} sm={12}>
                                    <Form.Item name="sales_channel" label="Canal" rules={[{ required: true, message: 'Selecciona un canal' }]}>
                                        <Select options={salesChannelOptions} />
                                    </Form.Item>
                                </Col>
                                <Col xs={24} sm={12}>
                                    <Form.Item name="status" label="Estado" rules={[{ required: true, message: 'Selecciona un estado' }]}>
                                        <Select options={proformaStatusOptions} />
                                    </Form.Item>
                                </Col>
                            </Row>

                            <Form.Item name="customer_name" label="Cliente" rules={[{ required: true, message: 'Ingresa el nombre del cliente' }]}>
                                <Input placeholder="Nombre completo" />
                            </Form.Item>

                            <Form.Item name="customer_phone" label="Celular / WhatsApp" rules={[{ required: true, message: 'Ingresa el celular' }]}>
                                <Input placeholder="Ej. 987654321" />
                            </Form.Item>

                            <Form.Item name="customer_email" label="Email (opcional)">
                                <Input placeholder="cliente@correo.com" />
                            </Form.Item>

                            <Row gutter={12}>
                                <Col xs={24} sm={12}>
                                    <Form.Item name="shipping_cost" label="Envío (delivery)">
                                        <InputNumber min={0} precision={2} prefix="S/" style={{ width: '100%' }} placeholder="0.00" />
                                    </Form.Item>
                                </Col>
                                <Col xs={24} sm={12}>
                                    <Form.Item name="discount_total" label="Descuento">
                                        <InputNumber min={0} precision={2} prefix="S/" style={{ width: '100%' }} placeholder="0.00" />
                                    </Form.Item>
                                </Col>
                            </Row>

                            <Form.Item name="notes" label="Notas internas">
                                <Input.TextArea rows={3} placeholder="Detalles de coordinación, observaciones, etc." />
                            </Form.Item>
                        </Form>
                    </Card>
                </Col>

                <Col xs={24} lg={14}>
                    <Card title="Productos cotizados" variant="borderless">
                        <Row gutter={[12, 12]} align="bottom">
                            <Col xs={24} md={12}>
                                <Text strong>Producto del catálogo</Text>
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

                        <Button
                            type="dashed"
                            icon={<ToolOutlined />}
                            onClick={openCustomModal}
                            block
                            style={{ marginTop: 16 }}
                        >
                            Agregar producto personalizado (confección / delivery)
                        </Button>

                        <Table
                            columns={columns}
                            dataSource={items}
                            rowKey="key"
                            pagination={false}
                            style={{ marginTop: 24 }}
                            scroll={{ x: 700 }}
                        />

                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 24, gap: 16, flexWrap: 'wrap' }}>
                            <Space orientation="vertical" size={2}>
                                <Text type="secondary">Subtotal: {formatPEN(subtotal)}</Text>
                                {shippingCost > 0 && (
                                    <Text type="secondary">Envío: +{formatPEN(shippingCost)}</Text>
                                )}
                                {discountTotal > 0 && (
                                    <Text type="danger">Descuento: -{formatPEN(discountTotal)}</Text>
                                )}
                                <Title level={4} style={{ margin: 0 }}>Total: {formatPEN(total)}</Title>
                            </Space>
                            <Button
                                type="primary"
                                icon={<SaveOutlined />}
                                loading={isSaving}
                                disabled={items.length === 0}
                                onClick={handleCreateProforma}
                            >
                                Guardar proforma
                            </Button>
                        </div>
                    </Card>
                </Col>
            </Row>

            <Modal
                title="Producto personalizado"
                open={customModalOpen}
                onOk={handleAddCustomItem}
                onCancel={() => setCustomModalOpen(false)}
                okText="Agregar a la proforma"
                cancelText="Cancelar"
                destroyOnClose
            >
                <Space orientation="vertical" size="middle" style={{ width: '100%', marginTop: 16 }}>
                    <Form layout="vertical" onFinish={handleAddCustomItem}>
                        <Form.Item label="Producto base (opcional, para precio registrado)">
                            <Select
                                showSearch
                                allowClear
                                value={customProductId}
                                onChange={handleCustomProductChange}
                                options={(products || []).map(product => ({
                                    value: product.product_id,
                                    label: `${product.name}${product.base_price ? ` | S/${Number(product.base_price)}` : ''}`,
                                }))}
                                optionFilterProp="label"
                                placeholder="Buscar producto del catálogo"
                                loading={isLoading}
                            />
                        </Form.Item>
                        <Form.Item label="Nombre del producto" required>
                            <Input value={customName} onChange={(e) => setCustomName(e.target.value)} placeholder="Ej. Chaleco personalizado" />
                        </Form.Item>
                        <Row gutter={12}>
                            <Col span={12}>
                                <Form.Item label="Precio base (S/)" required>
                                    <InputNumber
                                        min={0}
                                        precision={2}
                                        prefix="S/"
                                        value={customPrice ?? undefined}
                                        onChange={(value) => setCustomPrice(value === null ? null : Number(value))}
                                        style={{ width: '100%' }}
                                    />
                                </Form.Item>
                            </Col>
                            <Col span={12}>
                                <Form.Item label="Cantidad" required>
                                    <InputNumber
                                        min={1}
                                        precision={0}
                                        value={customQty}
                                        onChange={(value) => setCustomQty(Number(value || 1))}
                                        style={{ width: '100%' }}
                                    />
                                </Form.Item>
                            </Col>
                        </Row>
                        <Row gutter={12}>
                            <Col span={12}>
                                <Form.Item label="Tipo de recargo">
                                    <Select
                                        value={customSurchargeType}
                                        onChange={setCustomSurchargeType}
                                        options={[
                                            { value: 'CONFECCION', label: 'Confección' },
                                            { value: 'DELIVERY', label: 'Delivery' },
                                        ]}
                                    />
                                </Form.Item>
                            </Col>
                            <Col span={12}>
                                <Form.Item label="Monto del recargo (S/)">
                                    <InputNumber
                                        min={0}
                                        precision={2}
                                        prefix="S/"
                                        value={customSurchargeAmount}
                                        onChange={(value) => setCustomSurchargeAmount(Number(value || 0))}
                                        style={{ width: '100%' }}
                                    />
                                </Form.Item>
                            </Col>
                        </Row>
                    </Form>
                </Space>
            </Modal>
        </Space>
    );
}