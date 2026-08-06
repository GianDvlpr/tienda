'use client';

import React from 'react';
import { toast } from 'sonner';
import { App, Button, Card, Col, Descriptions, Form, Input, InputNumber, Modal, Popconfirm, Row, Select, Space, Table, Tag, Typography } from 'antd';
import { ArrowRightOutlined, DeleteOutlined, LeftOutlined, PlusOutlined, SaveOutlined, ShoppingCartOutlined, ToolOutlined } from '@ant-design/icons';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import useSWR from 'swr';
import { fetcher } from '@/lib/fetcher';
import { formatPEN } from '@/lib/money';
import dayjs from 'dayjs';
import { proformaStatusMap } from '../page';
import type { ColumnsType } from 'antd/es/table';

const { Title, Text } = Typography;

type ProformaItemData = {
    proforma_item_id?: string;
    variant_id?: string | null;
    product_name: string;
    variant_size?: string | null;
    variant_color?: string | null;
    sku?: string | null;
    image_url?: string | null;
    qty: number;
    unit_price: number | string;
    line_total?: number | string;
    surcharge_type?: string | null;
    surcharge_amount?: number | string;
    is_customized?: boolean | number;
    custom_measurements_json?: string | null;
};

type ProformaData = {
    proforma_id: string;
    code: string;
    status: string;
    customer_name: string;
    customer_phone: string;
    subtotal: number | string;
    shipping_cost?: number | string;
    discount_total?: number | string;
    total: number | string;
    currency?: string;
    sales_channel?: string;
    notes?: string | null;
    converted_to_order_id?: string | null;
    created_at: string;
    updated_at?: string;
    proforma_item?: ProformaItemData[];
};

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
    custom_fabric_supply_id?: string | null;
    product_variant?: ProductVariant[];
};

type FabricColor = {
    name: string;
    hex: string;
    available: boolean;
    stock?: number;
};

type EditableItem = {
    key: string;
    proforma_item_id?: string;
    variant_id?: string | null;
    product_name: string;
    size?: string | null;
    color?: string | null;
    sku?: string | null;
    qty: number;
    unit_price: number;
    surcharge_type?: 'CONFECCION' | 'DELIVERY';
    surcharge_amount: number;
    is_customized: boolean;
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

const proformaStatusOptions = Object.entries(proformaStatusMap).map(([value, conf]) => ({
    value,
    label: conf.label,
})).filter(opt => opt.value !== 'CONVERTED');

export default function ProformaDetailPage({ params }: { params: Promise<{ id: string }> }) {
    const { id } = React.use(params);
    const router = useRouter();
    const { message } = App.useApp();
    const [form] = Form.useForm();
    const { data: proforma, isLoading, mutate } = useSWR<ProformaData>(`/api/admin/proformas/${id}`, fetcher);
    const { data: products, isLoading: isLoadingProducts } = useSWR<Product[]>('/api/admin/products', fetcher);
    const [items, setItems] = React.useState<EditableItem[]>([]);
    const [isConverting, setIsConverting] = React.useState(false);
    const [isDeleting, setIsDeleting] = React.useState(false);
    const [convertModalOpen, setConvertModalOpen] = React.useState(false);
    const [isEditing, setIsEditing] = React.useState(false);

    const [selectedVariantId, setSelectedVariantId] = React.useState<string>();
    const [selectedQty, setSelectedQty] = React.useState(1);
    const [selectedPrice, setSelectedPrice] = React.useState<number | null>(null);

    const [customModalOpen, setCustomModalOpen] = React.useState(false);
    const [customProductId, setCustomProductId] = React.useState<string>();
    const [customName, setCustomName] = React.useState('');
    const [customPrice, setCustomPrice] = React.useState<number | null>(null);
    const [customQty, setCustomQty] = React.useState(1);
    const [customSize, setCustomSize] = React.useState<string | undefined>();
    const [customColor, setCustomColor] = React.useState<string | undefined>();
    const [fabricSupplyId, setFabricSupplyId] = React.useState<string | undefined>();
    const [customSurchargeType, setCustomSurchargeType] = React.useState<'CONFECCION' | 'DELIVERY'>('CONFECCION');
    const [customSurchargeAmount, setCustomSurchargeAmount] = React.useState<number>(0);

    const { data: fabricColors } = useSWR<FabricColor[]>(
        fabricSupplyId ? `/api/store/custom-colors?supplyId=${fabricSupplyId}` : null,
        fetcher
    );

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

    const selectedCustomProduct = (products || []).find(p => p.product_id === customProductId);
    const allSystemSizes = React.useMemo(() => Array.from(new Set(
        (products || []).flatMap(p => (p.product_variant || []).map(v => v.size)).filter(Boolean)
    )).sort(), [products]);
    const customSizes = selectedCustomProduct
        ? Array.from(new Set((selectedCustomProduct.product_variant || []).map(v => v.size).filter(Boolean))).sort()
        : allSystemSizes;
    const customColorOptions = (fabricColors && fabricColors.length > 0 ? fabricColors : (products || [])
        .flatMap(p => (p.product_variant || []).map(v => v.color))
        .filter((color, index, arr) => color && arr.indexOf(color) === index)
        .map(color => ({ name: color, hex: '', available: true }))).map(color => ({
        value: color.name,
        label: color.name,
        disabled: color.available === false,
    }));

    React.useEffect(() => {
        if (proforma) {
            form.setFieldsValue({
                customer_name: proforma.customer_name,
                customer_phone: proforma.customer_phone,
                sales_channel: proforma.sales_channel,
                status: proforma.status,
                shipping_cost: Number(proforma.shipping_cost || 0),
                discount_total: Number(proforma.discount_total || 0),
                notes: proforma.notes,
            });
            setItems((proforma.proforma_item || []).map(item => ({
                key: item.proforma_item_id || item.variant_id || `${item.product_name}-${Math.random().toString(36).slice(2, 6)}`,
                proforma_item_id: item.proforma_item_id,
                variant_id: item.variant_id,
                product_name: item.product_name,
                size: item.variant_size,
                color: item.variant_color,
                sku: item.sku,
                qty: item.qty,
                unit_price: Number(item.unit_price || 0),
                surcharge_type: item.surcharge_type === 'CONFECCION' || item.surcharge_type === 'DELIVERY'
                    ? item.surcharge_type
                    : undefined,
                surcharge_amount: Number(item.surcharge_amount || 0),
                is_customized: item.is_customized === true || item.is_customized === 1,
            })));
        }
    }, [proforma, form]);

    const isConverted = proforma?.status === 'CONVERTED';
    const isCancelled = proforma?.status === 'CANCELLED';
    const editable = !isConverted && !isCancelled;

    const subtotal = items.reduce((sum, item) => sum + item.qty * (item.unit_price + item.surcharge_amount), 0);
    const shippingCost = Number(form.getFieldValue('shipping_cost') || 0);
    const discountTotal = Number(form.getFieldValue('discount_total') || 0);
    const total = Math.max(0, subtotal + shippingCost - discountTotal);

    const updateItem = (key: string, patch: Partial<EditableItem>) => {
        setItems(prev => prev.map(item => item.key === key ? { ...item, ...patch } : item));
    };

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

        setItems(prev => {
            const existing = prev.find(item => item.variant_id === option.variant.variant_id);
            if (existing) {
                return prev.map(item =>
                    item.variant_id === option.variant.variant_id
                        ? { ...item, qty: item.qty + qty, unit_price: unitPrice }
                        : item
                );
            }
            return [
                ...prev,
                {
                    key: `v-${option.variant.variant_id}`,
                    variant_id: option.variant.variant_id,
                    product_name: option.product.name,
                    sku: option.variant.sku,
                    size: option.variant.size,
                    color: option.variant.color,
                    qty,
                    unit_price: unitPrice,
                    surcharge_amount: 0,
                    is_customized: false,
                }
            ];
        });

        setSelectedVariantId(undefined);
        setSelectedQty(1);
        setSelectedPrice(null);
    };

    const openCustomModal = () => {
        setCustomProductId(undefined);
        setCustomName('');
        setCustomPrice(null);
        setCustomQty(1);
        setCustomSize(undefined);
        setCustomColor(undefined);
        setFabricSupplyId(undefined);
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
            setFabricSupplyId(product.custom_fabric_supply_id || undefined);
        } else {
            setFabricSupplyId(undefined);
        }
        setCustomSize(undefined);
        setCustomColor(undefined);
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
                product_name: name,
                sku: firstVariant?.sku,
                size: customSize || firstVariant?.size,
                color: customColor || firstVariant?.color,
                qty,
                unit_price: price,
                surcharge_type: customSurchargeType,
                surcharge_amount: surchargeAmount,
                is_customized: true,
            }
        ]);

        setCustomModalOpen(false);
    };

    const handleSave = async () => {
        try {
            const values = await form.validateFields();
            setIsConverting(true);
            const res = await fetch(`/api/admin/proformas/${id}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    customer_name: values.customer_name,
                    customer_phone: values.customer_phone,
                    sales_channel: values.sales_channel,
                    status: values.status,
                    shipping_cost: values.shipping_cost || 0,
                    discount_total: values.discount_total || 0,
                    notes: values.notes || undefined,
                    items: items.map(item => ({
                        proforma_item_id: item.proforma_item_id,
                        variant_id: item.variant_id || undefined,
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

            const data = await res.json() as ProformaData & { error?: string };
            if (!res.ok) throw new Error(data.error || 'Error al guardar la proforma');

            toast.success('Proforma guardada');
            setIsEditing(false);
            mutate();
        } catch (error: unknown) {
            toast.error(getErrorMessage(error, 'Revisa los datos de la proforma'));
        } finally {
            setIsConverting(false);
        }
    };

    type ConvertResponse = {
    order_id: string;
    code: string;
    error?: string;
};

    const handleConvert = async () => {
        if (items.length === 0) {
            toast.error('La proforma no tiene productos');
            return;
        }

        setIsConverting(true);
        try {
            const res = await fetch(`/api/admin/proformas/${id}/convert`, { method: 'POST' });
            const data = await res.json() as ConvertResponse;
            if (!res.ok) throw new Error(data.error || 'Error al convertir la proforma');

            message.success(`Proforma ${proforma?.code} convertida a pedido ${data.code}`);
            router.push(`/admin/orders/${data.order_id}`);
        } catch (error: unknown) {
            const msg = getErrorMessage(error, 'No se pudo convertir la proforma a pedido');
            if (msg.includes('no tiene variante')) {
                message.warning(msg);
            } else {
                message.error(msg);
            }
        } finally {
            setIsConverting(false);
        }
    };

    const handleDelete = async () => {
        setIsDeleting(true);
        try {
            const res = await fetch(`/api/admin/proformas/${id}`, { method: 'DELETE' });
            if (!res.ok) {
                const data = await res.json() as { error?: string };
                throw new Error(data.error || 'Error al eliminar la proforma');
            }
            toast.success('Proforma eliminada');
            router.push('/admin/proformas');
        } catch (error: unknown) {
            toast.error(getErrorMessage(error, 'No se pudo eliminar la proforma'));
        } finally {
            setIsDeleting(false);
        }
    };

    const columns: ColumnsType<EditableItem> = [
        {
            title: 'Producto',
            key: 'product',
            render: (_value, record) => (
                <Space orientation="vertical" size={2}>
                    <Space size={4}>
                        <Text strong>{record.product_name}</Text>
                        {record.is_customized && <Tag color="gold" style={{ marginInlineEnd: 0 }}>Pers.</Tag>}
                    </Space>
                    {record.size || record.color ? (
                        <Text type="secondary" style={{ fontSize: 12 }}>
                            {[record.size, record.color].filter(Boolean).join(' - ')}{record.sku ? ` | SKU: ${record.sku}` : ''}
                        </Text>
                    ) : (
                        <Text type="secondary" style={{ fontSize: 12 }}>Producto personalizado</Text>
                    )}
                </Space>
            ),
        },
        {
            title: 'Cantidad',
            key: 'qty',
            width: 80,
            render: (_value, record) => isEditing ? (
                <InputNumber
                    min={1}
                    precision={0}
                    value={record.qty}
                    onChange={(value) => updateItem(record.key, { qty: Number(value || 1) })}
                    style={{ width: '100%' }}
                />
            ) : record.qty,
        },
        {
            title: 'Precio base',
            key: 'unit_price',
            width: 120,
            render: (_value, record) => isEditing ? (
                <InputNumber
                    min={0}
                    precision={2}
                    prefix="S/"
                    value={record.unit_price}
                    onChange={(value) => updateItem(record.key, { unit_price: Number(value || 0) })}
                    style={{ width: '100%' }}
                />
            ) : formatPEN(record.unit_price),
        },
        {
            title: 'Recargo',
            key: 'surcharge',
            width: 225,
            render: (_value, record) => {
                if (isEditing) {
                    return (
                        <Space size={4} wrap={false}>
                            <Select
                                size="small"
                                allowClear
                                placeholder="Sin recargo"
                                value={record.surcharge_type}
                                onChange={(value) => updateItem(record.key, { surcharge_type: value || undefined })}
                                style={{ width: 105 }}
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
                    );
                }
                if (!record.surcharge_type) return <Text type="secondary">—</Text>;
                return (
                    <Tag color={record.surcharge_type === 'CONFECCION' ? 'magenta' : 'cyan'}>
                        {record.surcharge_type === 'CONFECCION' ? 'Confección' : 'Delivery'} +{formatPEN(record.surcharge_amount)}
                    </Tag>
                );
            },
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
            width: 50,
            render: (_value, record) => isEditing ? (
                <Button
                    type="text"
                    danger
                    icon={<DeleteOutlined />}
                    onClick={() => setItems(prev => prev.filter(item => item.key !== record.key))}
                />
            ) : null,
        },
    ];

    if (isLoading) {
        return <Card loading />;
    }

    if (!proforma) {
        return <Card><Text type="secondary">Proforma no encontrada</Text></Card>;
    }

    const statusConf = proformaStatusMap[proforma.status] || { label: proforma.status, color: 'default' };

    return (
        <Space orientation="vertical" size="large" style={{ width: '100%' }}>
            <Space style={{ justifyContent: 'space-between', width: '100%', flexWrap: 'wrap', gap: 12 }}>
                <Space>
                    <Link href="/admin/proformas">
                        <Button icon={<LeftOutlined />}>Volver</Button>
                    </Link>
                    <Title level={3} style={{ margin: 0 }}>
                        {proforma.code} <Tag color={statusConf.color} style={{ marginLeft: 8 }}>{statusConf.label}</Tag>
                        {isConverted && proforma.converted_to_order_id && (
                            <Link href={`/admin/orders/${proforma.converted_to_order_id}`} style={{ marginLeft: 8 }}>
                                <Tag color="blue" icon={<ArrowRightOutlined />}>Ver pedido</Tag>
                            </Link>
                        )}
                    </Title>
                </Space>
                <Space>
                    {editable && !isEditing && (
                        <>
                            <Button onClick={() => setIsEditing(true)}>Editar</Button>
                            <Popconfirm title="Eliminar esta proforma?" description="No se puede convertir a pedido después de eliminar." onConfirm={handleDelete} okText="Eliminar" cancelText="Cancelar" okButtonProps={{ danger: true }} disabled={isDeleting}>
                                <Button danger icon={<DeleteOutlined />} loading={isDeleting}>Eliminar</Button>
                            </Popconfirm>
                            <Button
                                type="primary"
                                icon={<ShoppingCartOutlined />}
                                onClick={() => setConvertModalOpen(true)}
                            >
                                Convertir a Pedido
                            </Button>
                        </>
                    )}
                    {editable && isEditing && (
                        <>
                            <Button onClick={() => { setIsEditing(false); mutate(); }}>Cancelar</Button>
                            <Button type="primary" icon={<SaveOutlined/>} loading={isConverting} onClick={handleSave}>
                                Guardar cambios
                            </Button>
                        </>
                    )}
                </Space>
            </Space>

            <Row gutter={[24, 24]}>
                <Col xs={24} lg={10}>
                    <Card title="Datos del cliente" variant="borderless">
                        {isEditing ? (
                            <Form form={form} layout="vertical">
                                <Row gutter={12}>
                                    <Col xs={24} sm={12}>
                                        <Form.Item name="sales_channel" label="Canal" rules={[{ required: true, message: 'Selecciona un canal' }]}>
                                            <Select options={salesChannelOptions} />
                                        </Form.Item>
                                    </Col>
                                    <Col xs={24} sm={12}>
                                        <Form.Item name="status" label="Estado">
                                            <Select options={proformaStatusOptions} />
                                        </Form.Item>
                                    </Col>
                                </Row>
                                <Form.Item name="customer_name" label="Cliente" rules={[{ required: true, message: 'Ingresa el nombre del cliente' }]}>
                                    <Input />
                                </Form.Item>
                                <Form.Item name="customer_phone" label="Celular / WhatsApp" rules={[{ required: true, message: 'Ingresa el celular' }]}>
                                    <Input />
                                </Form.Item>
                                <Row gutter={12}>
                                    <Col xs={24} sm={12}>
                                        <Form.Item name="shipping_cost" label="Envío (delivery)">
                                            <InputNumber min={0} precision={2} prefix="S/" style={{ width: '100%' }} />
                                        </Form.Item>
                                    </Col>
                                    <Col xs={24} sm={12}>
                                        <Form.Item name="discount_total" label="Descuento">
                                            <InputNumber min={0} precision={2} prefix="S/" style={{ width: '100%' }} />
                                        </Form.Item>
                                    </Col>
                                </Row>
                                <Form.Item name="notes" label="Notas internas">
                                    <Input.TextArea rows={3} />
                                </Form.Item>
                            </Form>
                        ) : (
                            <Descriptions column={1} size="small">
                                <Descriptions.Item label="Cliente">{proforma.customer_name}</Descriptions.Item>
                                <Descriptions.Item label="Celular">{proforma.customer_phone}</Descriptions.Item>
                                <Descriptions.Item label="Canal">{proforma.sales_channel || '—'}</Descriptions.Item>
                                <Descriptions.Item label="Creada">{dayjs(proforma.created_at).format('DD/MM/YYYY HH:mm')}</Descriptions.Item>
                            </Descriptions>
                        )}
                    </Card>
                </Col>

                <Col xs={24} lg={14}>
                    <Card title="Productos cotizados" variant="borderless">
                        {isEditing && (
                            <>
                                <Row gutter={[12, 12]} align="bottom">
                                    <Col xs={24} md={12}>
                                        <Text strong>Producto del catálogo</Text>
                                        <Select
                                            showSearch
                                            allowClear
                                            value={selectedVariantId}
                                            onChange={handleVariantChange}
                                            options={variantOptions}
                                            loading={isLoadingProducts}
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
                            </>
                        )}
                        <Table
                            columns={columns}
                            dataSource={items}
                            rowKey="key"
                            pagination={false}
                            loading={isLoading}
                            scroll={{ x: 750 }}
                            tableLayout="fixed"
                            style={{ marginTop: isEditing ? 24 : 0 }}
                        />
                        <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 24 }}>
                            <Space orientation="vertical" size={2} align="end">
                                <Text type="secondary">Subtotal: {formatPEN(subtotal)}</Text>
                                {shippingCost > 0 && <Text type="secondary">Envío: +{formatPEN(shippingCost)}</Text>}
                                {discountTotal > 0 && <Text type="danger">Descuento: -{formatPEN(discountTotal)}</Text>}
                                <Title level={4} style={{ margin: 0 }}>Total: {formatPEN(total)}</Title>
                            </Space>
                        </div>
                    </Card>
                </Col>
            </Row>

            <Modal
                title="Convertir a pedido"
                open={convertModalOpen}
                onOk={handleConvert}
                onCancel={() => setConvertModalOpen(false)}
                okText="Sí, convertir a pedido"
                cancelText="Cancelar"
                confirmLoading={isConverting}
                okButtonProps={{ icon: <ShoppingCartOutlined /> }}
            >
                <Space orientation="vertical" size={4} style={{ marginTop: 8 }}>
                    <Text>
                        Al convertir esta proforma (<Text strong>{proforma.code}</Text>) se creará un pedido con los mismos productos y se descontará el stock.
                    </Text>
                    <Text type="secondary">
                        La proforma quedará marcada como convertida y enlazada al pedido creado.
                    </Text>
                </Space>
            </Modal>

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
                                loading={isLoadingProducts}
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
                                <Form.Item label="Talla">
                                    <Select
                                        showSearch
                                        allowClear
                                        value={customSize}
                                        onChange={(value) => setCustomSize(value)}
                                        options={customSizes.map(size => ({ value: size, label: size }))}
                                        placeholder={selectedCustomProduct ? 'Tallas del producto' : 'Tallas del catálogo'}
                                    />
                                </Form.Item>
                            </Col>
                            <Col span={12}>
                                <Form.Item label="Color" tooltip="Colores disponibles según la tela asociada al producto">
                                    <Select
                                        showSearch
                                        allowClear
                                        value={customColor}
                                        onChange={(value) => setCustomColor(value)}
                                        options={customColorOptions}
                                        placeholder={customProductId ? 'Según la tela asociada' : 'Colores del catálogo'}
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