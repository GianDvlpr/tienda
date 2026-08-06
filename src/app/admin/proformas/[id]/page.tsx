'use client';

import React from 'react';
import { toast } from 'sonner';
import { App, Button, Card, Col, Descriptions, Form, Input, InputNumber, Modal, Popconfirm, Row, Select, Space, Table, Tag, Typography } from 'antd';
import { ArrowRightOutlined, DeleteOutlined, LeftOutlined, SaveOutlined, ShoppingCartOutlined } from '@ant-design/icons';
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
    customer_email?: string | null;
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
    const [items, setItems] = React.useState<EditableItem[]>([]);
    const [isConverting, setIsConverting] = React.useState(false);
    const [isDeleting, setIsDeleting] = React.useState(false);
    const [convertModalOpen, setConvertModalOpen] = React.useState(false);
    const [isEditing, setIsEditing] = React.useState(false);

    React.useEffect(() => {
        if (proforma) {
            form.setFieldsValue({
                customer_name: proforma.customer_name,
                customer_phone: proforma.customer_phone,
                customer_email: proforma.customer_email,
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
                    customer_email: values.customer_email || undefined,
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
            width: 90,
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
            width: 130,
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
            width: 190,
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
                                <Form.Item name="customer_email" label="Email (opcional)">
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
                                <Descriptions.Item label="Email">{proforma.customer_email || '—'}</Descriptions.Item>
                                <Descriptions.Item label="Canal">{proforma.sales_channel || '—'}</Descriptions.Item>
                                <Descriptions.Item label="Creada">{dayjs(proforma.created_at).format('DD/MM/YYYY HH:mm')}</Descriptions.Item>
                            </Descriptions>
                        )}
                    </Card>
                </Col>

                <Col xs={24} lg={14}>
                    <Card title="Productos cotizados" variant="borderless">
                        <Table
                            columns={columns}
                            dataSource={items}
                            rowKey="key"
                            pagination={false}
                            loading={isLoading}
                            scroll={{ x: 620 }}
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
        </Space>
    );
}