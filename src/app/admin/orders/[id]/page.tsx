'use client';
import { toast } from 'sonner';

import React, { useState } from 'react';
import { Card, Select, Button, Typography, Space, Descriptions, Table, Row, Col, Input, Tag, Alert, Form, InputNumber, Popconfirm } from 'antd';
import { CloseOutlined, DeleteOutlined, EditOutlined, LeftOutlined, PlusOutlined, SaveOutlined, PrinterOutlined, WhatsAppOutlined } from '@ant-design/icons';
import useSWR from 'swr';
import { useParams } from 'next/navigation';
import { fetcher } from '@/lib/fetcher';
import { formatPEN } from '@/lib/money';
import Link from 'next/link';
import dayjs from 'dayjs';
import type { ColumnsType } from 'antd/es/table';

export const statusMap: Record<string, { label: string, color: string }> = {
    'PENDING_WS': { label: 'Pend. WhatsApp', color: 'orange' },
    'PAID': { label: 'Orden generada / Pagada', color: 'gold' },
    'CONFIRMED': { label: 'Confirmado', color: 'blue' },
    'SHIPPED': { label: 'Enviado', color: 'cyan' },
    'DELIVERED': { label: 'Entregado', color: 'green' },
    'CANCELLED': { label: 'Cancelado', color: 'red' },
};

const salesChannelMap: Record<string, { label: string, color: string }> = {
    SHOP: { label: 'Shop', color: 'blue' },
    WHATSAPP: { label: 'WhatsApp', color: 'green' },
    TIKTOK: { label: 'TikTok', color: 'purple' },
    INSTAGRAM: { label: 'Instagram', color: 'magenta' },
    FACEBOOK: { label: 'Facebook', color: 'geekblue' },
    OTHER: { label: 'Otro', color: 'default' },
};

const { Title, Text } = Typography;

const salesChannelOptions = [
    { value: 'SHOP', label: 'Shop' },
    { value: 'WHATSAPP', label: 'WhatsApp' },
    { value: 'TIKTOK', label: 'TikTok' },
    { value: 'INSTAGRAM', label: 'Instagram' },
    { value: 'FACEBOOK', label: 'Facebook' },
    { value: 'OTHER', label: 'Otro canal' },
];

const statusOptions = [
    { value: 'PENDING_WS', label: 'Pendiente WhatsApp' },
    { value: 'PAID', label: 'Orden generada / Pagada' },
    { value: 'CONFIRMED', label: 'Confirmado / En Preparación' },
    { value: 'SHIPPED', label: 'Enviado / En Tránsito' },
    { value: 'DELIVERED', label: 'Entregado' },
    { value: 'CANCELLED', label: 'Cancelado' },
];

const paymentMethodOptions = [
    { value: 'CULQI', label: 'Culqi' },
    { value: 'YAPE', label: 'Yape' },
    { value: 'PLIN', label: 'Plin' },
    { value: 'TRANSFER', label: 'Transferencia' },
    { value: 'CARD', label: 'Tarjeta' },
    { value: 'CASH', label: 'Efectivo' },
    { value: 'OTHER', label: 'Otro' },
];

type OrderItem = {
    order_item_id: string;
    variant_id: string;
    qty: number;
    unit_price: number | string;
    line_total: number | string;
    product_name: string;
    variant_size: string;
    variant_color: string;
    sku: string;
};

type EditableOrderItem = {
    variant_id: string;
    product_name: string;
    sku: string;
    size: string;
    color: string;
    qty: number;
    unit_price: number;
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
    product_variant?: ProductVariant[];
};

type AdminOrderDetail = {
    order_id: string;
    code: string;
    status: string;
    shipping_name: string;
    shipping_dni?: string | null;
    shipping_phone: string;
    shipping_address?: string | null;
    subtotal: number | string;
    shipping_cost?: number | string | null;
    discount_total?: number | string | null;
    bundle_discount?: number | string | null;
    coupon_discount?: number | string | null;
    coupon_code?: string | null;
    total: number | string;
    notes?: string | null;
    created_at: string;
    sales_channel?: string | null;
    external_reference?: string | null;
    payment_method?: string | null;
    payment_reference?: string | null;
    order_item?: OrderItem[];
};

function getErrorMessage(error: unknown) {
    return error instanceof Error ? error.message : 'Error al actualizar pedido';
}

export default function OrderDetailPage() {
    const params = useParams();
    const id = params.id as string;
    const [form] = Form.useForm();

    const { data: order, isLoading, mutate } = useSWR<AdminOrderDetail>(id ? `/api/admin/orders/${id}` : null, fetcher);
    const [isEditing, setIsEditing] = useState(false);
    const { data: products, isLoading: productsLoading } = useSWR<Product[]>(isEditing ? '/api/admin/products' : null, fetcher);

    const [editItems, setEditItems] = useState<EditableOrderItem[]>([]);
    const [selectedVariantId, setSelectedVariantId] = useState<string>();
    const [selectedQty, setSelectedQty] = useState(1);
    const [selectedPrice, setSelectedPrice] = useState<number | null>(null);
    const [isSaving, setIsSaving] = useState(false);

    const originalQtyByVariant = new Map((order?.order_item || []).map(item => [item.variant_id, item.qty]));
    const variantOptions = (products || []).flatMap(product =>
        (product.product_variant || []).map(variant => {
            const price = Number(variant.price ?? product.base_price ?? 0);
            const availableStock = variant.stock + (originalQtyByVariant.get(variant.variant_id) || 0);
            const inactiveLabel = !product.is_active || !variant.is_active ? ' | Inactivo' : '';
            return {
                value: variant.variant_id,
                label: `${product.name} - ${variant.size} / ${variant.color} | ${variant.sku} | Disponible: ${availableStock}${inactiveLabel}`,
                disabled: availableStock <= 0,
                product,
                variant,
                price,
                availableStock,
            };
        })
    );

    const editSubtotal = editItems.reduce((sum, item) => sum + item.qty * item.unit_price, 0);
    const editTotal = order ? Math.max(0, editSubtotal + Number(order.shipping_cost || 0) - Number(order.discount_total || 0)) : editSubtotal;

    const handleStartEdit = () => {
        if (!order) return;

        form.setFieldsValue({
            status: order.status,
            sales_channel: order.sales_channel || 'SHOP',
            external_reference: order.external_reference || undefined,
            payment_method: order.payment_method || undefined,
            payment_reference: order.payment_reference || undefined,
            shipping_name: order.shipping_name,
            shipping_dni: order.shipping_dni || '',
            shipping_phone: order.shipping_phone,
            shipping_address: order.shipping_address || '',
            notes: order.notes || '',
        });
        setEditItems((order.order_item || []).map(item => ({
            variant_id: item.variant_id,
            product_name: item.product_name,
            sku: item.sku,
            size: item.variant_size,
            color: item.variant_color,
            qty: item.qty,
            unit_price: Number(item.unit_price),
        })));
        setSelectedVariantId(undefined);
        setSelectedQty(1);
        setSelectedPrice(null);
        setIsEditing(true);
    };

    const handleCancelEdit = () => {
        setIsEditing(false);
        setEditItems([]);
        setSelectedVariantId(undefined);
        setSelectedQty(1);
        setSelectedPrice(null);
    };

    const handleSave = async () => {
        if (editItems.length === 0) {
            toast.error('El pedido debe tener al menos un producto');
            return;
        }

        setIsSaving(true);
        try {
            const values = await form.validateFields();
            const res = await fetch(`/api/admin/orders/${id}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    ...values,
                    items: editItems.map(item => ({
                        variant_id: item.variant_id,
                        qty: item.qty,
                        unit_price: item.unit_price,
                    })),
                }),
            });

            if (!res.ok) {
                const err = await res.json();
                throw new Error(err.error || 'Error al actualizar pedido');
            }

            toast.success('Pedido actualizado con éxito');
            setIsEditing(false);
            setEditItems([]);
            mutate();
        } catch (error: unknown) {
            toast.error(getErrorMessage(error));
        } finally {
            setIsSaving(false);
        }
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
        const currentQty = editItems.find(item => item.variant_id === selectedVariantId)?.qty || 0;

        if (!Number.isInteger(qty) || qty <= 0) {
            toast.error('Ingresa una cantidad válida');
            return;
        }

        if (currentQty + qty > option.availableStock) {
            toast.error(`Stock insuficiente. Disponibles: ${option.availableStock}`);
            return;
        }

        if (!Number.isFinite(unitPrice) || unitPrice < 0) {
            toast.error('Ingresa un precio válido');
            return;
        }

        setEditItems(prev => {
            const existing = prev.find(item => item.variant_id === selectedVariantId);
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
                    qty,
                    unit_price: unitPrice,
                }
            ];
        });

        setSelectedVariantId(undefined);
        setSelectedQty(1);
        setSelectedPrice(null);
    };

    const updateEditItem = (variantId: string, patch: Partial<Pick<EditableOrderItem, 'qty' | 'unit_price'>>) => {
        setEditItems(prev => prev.map(item => item.variant_id === variantId ? { ...item, ...patch } : item));
    };

    const handleContactWhatsApp = () => {
        if (!order || !order.shipping_phone) return;
        
        let text = `Hola ${order.shipping_name}, hemos recibido tu pedido *${order.code}*.\n\n`;
        text += `El monto total de tu pedido es de *${formatPEN(Number(order.total))}*.\n`;
        text += `Por favor, envíanos la constancia de pago por este medio para proceder con el envío a la dirección: ${order.shipping_address || 'Tu dirección acordada'}.\n\n`;
        text += `¡Gracias por tu compra en Aura Boutique!`;
        
        const encodedText = encodeURIComponent(text);
        const phone = order.shipping_phone.replace(/\D/g, ''); // limpia espacios y símbolos 
        window.open(`https://wa.me/${phone}?text=${encodedText}`, '_blank');
    };

    const handlePrint = () => {
        if (!order) return;
        const printWindow = window.open('', '_blank');
        if (!printWindow) return;

        // Extraer resumen de items para impresión
        const itemsList = order.order_item?.map((item) => `<li>${item.qty}x ${item.product_name} (${item.variant_size})</li>`).join('') || '';

        const html = `
            <html>
                <head>
                    <title>Etiqueta de Envio - ${order.code}</title>
                    <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css">
                    <style>
                        body { font-family: 'Inter', 'Helvetica Neue', Helvetica, Arial, sans-serif; padding: 20px; color: #000; margin: 0; background: #f0f0f0; }
                        .label { 
                            max-width: 10cm; 
                            margin: 0 auto; 
                            background: #fff; 
                            border: 2px solid #000; 
                            padding: 24px; 
                            box-sizing: border-box; 
                        }
                        .header { display: flex; justify-content: space-between; align-items: baseline; border-bottom: 2px solid #000; padding-bottom: 12px; margin-bottom: 12px; }
                        .header h2 { margin: 0; font-size: 22px; font-weight: 900; letter-spacing: -0.5px; }
                        .order-code { font-size: 16px; font-weight: bold; padding: 4px 8px; border: 1px solid #000; }
                        
                        .section-title { font-size: 10px; color: #666; text-transform: uppercase; font-weight: bold; margin: 12px 0 2px 0; letter-spacing: 0.5px; }
                        
                        .sender-box { border: 1px solid #ddd; padding: 10px; font-size: 11px; margin-bottom: 16px; background: #fafafa; }
                        .sender-box strong { display: block; font-size: 12px; margin-bottom: 2px; color: #000; }
                        
                        .receiver-box { font-size: 14px; margin-bottom: 16px; }
                        .receiver-box .name { font-size: 20px; font-weight: 900; margin-bottom: 4px; text-transform: uppercase; }
                        .receiver-box .details { margin: 2px 0; }
                        .receiver-box .address { font-size: 16px; font-weight: bold; margin-top: 8px; padding: 8px; background: #fff; border: 2px dashed #000; }
                        
                        .contents { border-top: 2px solid #000; padding-top: 12px; margin-top: 12px; font-size: 12px; }
                        .contents ul { margin: 4px 0 0; padding-left: 16px; }
                        
                        .qr-section { margin-top: 20px; display: flex; align-items: center; justify-content: space-between; border-top: 2px solid #000; padding-top: 16px; }
                        .qr-code { width: 80px; height: 80px; }
                        .qr-text { font-size: 11px; color: #333; text-align: right; max-width: 60%; }
                        .qr-text strong { font-size: 14px; color: #000; display: block; margin-bottom: 4px; }

                        .footer { margin-top: 24px; font-size: 12px; font-weight: bold; text-align: center; border: 2px solid #000; padding: 12px; background: #000; color: #fff; text-transform: uppercase; letter-spacing: 1px; }
                        .date { text-align: center; font-size: 10px; color: #666; margin-top: 8px; }
                        
                        @media print {
                            body { padding: 0; background: #fff; }
                            .label { border: none; padding: 0; width: 10cm; max-width: 10cm; height: 15cm; page-break-after: always; }
                        }
                    </style>
                </head>
                <body>
                    <div class="label">
                        <div class="header">
                            <h2>AURA BOUTIQUE</h2>
                            <div class="order-code">#${order.code}</div>
                        </div>
                        
                        <div class="section-title">Remitente</div>
                        <div class="sender-box">
                            <strong>AURA BOUTIQUE (ALMACÉN PRINCIPAL)</strong>
                            Taller y Despachos<br/>
                            Lima, Perú
                        </div>
                        
                        <div class="section-title">Destinatario / Entregar A:</div>
                        <div class="receiver-box">
                            <div class="name">${order.shipping_name}</div>
                            <div class="details">DNI: ${order.shipping_dni || 'No registrado'}</div>
                            <div class="details">📞 ${order.shipping_phone}</div>
                            <div class="address" style="${!order.shipping_address ? 'color: #999;' : ''}">
                                📍 ${order.shipping_address || 'Dirección de Recojo / Tienda Física'}
                            </div>
                        </div>

                        <div class="contents">
                            <strong>CONTENIDO DEL PAQUETE (${order.order_item?.length || 0} items)</strong>
                            <ul>${itemsList}</ul>
                        </div>
                        
                        <div class="qr-section">
                            <img class="qr-code" src="https://api.qrserver.com/v1/create-qr-code/?size=150x150&data=" alt="QR" id="dynamic-qr" />
                            <div class="qr-text">
                                <strong>Rastrear Pedido</strong>
                                Escanea este código o escribe este ID en la web:
                                <br/><span style="font-family: monospace; font-size: 12px; margin-top: 4px; display:inline-block;">${order.code}</span>
                            </div>
                        </div>

                        <div class="footer">
                            <span style="display:inline-flex; align-items:center; gap:6px; margin-right: 16px;">
                                <i class="fa-brands fa-instagram" style="font-size: 14px;"></i>
                                @auraboutiqueme
                            </span>
                            <span style="display:inline-flex; align-items:center; gap:6px;">
                                <i class="fa-brands fa-tiktok" style="font-size: 14px;"></i>
                                @auraboutiqueme
                            </span>
                        </div>
                        <div class="date">
                            Generado: ${dayjs().format('DD/MM/YYYY HH:mm')}
                        </div>
                    </div>
                    <script>
                        // Dynamically set QR based on print origin
                        document.getElementById('dynamic-qr').src = 'https://api.qrserver.com/v1/create-qr-code/?size=150x150&data=' + encodeURIComponent(window.location.origin + '/track/${order.code}');
                        window.onload = function() { window.print(); window.setTimeout(window.close, 800); }
                    </script>
                </body>
            </html>
        `;
        printWindow.document.write(html);
        printWindow.document.close();
    };

    if (isLoading) {
        return <Card loading={true} />;
    }

    if (!order) {
        return <Card><Alert type="error" title="Pedido no encontrado" /></Card>;
    }

    const salesChannel = salesChannelMap[order.sales_channel || 'SHOP'] || { label: order.sales_channel || 'Shop', color: 'default' };

    const itemsColumns: ColumnsType<OrderItem> = [
        {
            title: 'Producto / Variante',
            key: 'product',
            render: (_value, record) => (
                <Space orientation="vertical" size={2}>
                    <Text strong>{record.product_name}</Text>
                    <Text type="secondary" style={{ fontSize: 12 }}>SKU: {record.sku}</Text>
                    <Text type="secondary" style={{ fontSize: 12 }}>{record.variant_size} - {record.variant_color}</Text>
                </Space>
            ),
        },
        {
            title: 'Precio Unit.',
            dataIndex: 'unit_price',
            key: 'unit_price',
            render: (val: number) => formatPEN(Number(val)),
        },
        {
            title: 'Cant.',
            dataIndex: 'qty',
            key: 'qty',
        },
        {
            title: 'Subtotal',
            dataIndex: 'line_total',
            key: 'line_total',
            render: (val: number) => <Text strong>{formatPEN(Number(val))}</Text>,
        },
    ];

    const editableItemsColumns: ColumnsType<EditableOrderItem> = [
        {
            title: 'Producto / Variante',
            key: 'product',
            render: (_value, record) => (
                <Space orientation="vertical" size={2}>
                    <Text strong>{record.product_name}</Text>
                    <Text type="secondary" style={{ fontSize: 12 }}>SKU: {record.sku}</Text>
                    <Text type="secondary" style={{ fontSize: 12 }}>{record.size} - {record.color}</Text>
                </Space>
            ),
        },
        {
            title: 'Cant.',
            dataIndex: 'qty',
            key: 'qty',
            width: 120,
            render: (_value, record) => (
                <InputNumber
                    min={1}
                    precision={0}
                    value={record.qty}
                    onChange={(value) => updateEditItem(record.variant_id, { qty: Number(value || 1) })}
                    style={{ width: '100%' }}
                />
            ),
        },
        {
            title: 'Precio Unit.',
            dataIndex: 'unit_price',
            key: 'unit_price',
            width: 150,
            render: (_value, record) => (
                <InputNumber
                    min={0}
                    precision={2}
                    value={record.unit_price}
                    prefix="S/"
                    onChange={(value) => updateEditItem(record.variant_id, { unit_price: Number(value || 0) })}
                    style={{ width: '100%' }}
                />
            ),
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
                <Popconfirm
                    title="Quitar producto"
                    description="¿Eliminar este producto del pedido?"
                    okText="Sí"
                    cancelText="No"
                    onConfirm={() => setEditItems(prev => prev.filter(item => item.variant_id !== record.variant_id))}
                >
                    <Button type="text" danger icon={<DeleteOutlined />} />
                </Popconfirm>
            ),
        },
    ];

    return (
        <Space orientation="vertical" size="large" style={{ width: '100%' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <Space>
                    <Link href="/admin/orders">
                        <Button icon={<LeftOutlined />}>Volver</Button>
                    </Link>
                    <Title level={4} style={{ margin: 0 }}>Pedido {order.code}</Title>
                    <Tag color={statusMap[order.status]?.color || 'default'}>
                        {statusMap[order.status]?.label || order.status}
                    </Tag>
                    <Tag color={salesChannel.color}>{salesChannel.label}</Tag>
                </Space>
                <Space>
                    <Button icon={<PrinterOutlined />} onClick={handlePrint}>
                        Imprimir Etiqueta
                    </Button>
                    {isEditing ? (
                        <>
                            <Button icon={<CloseOutlined />} onClick={handleCancelEdit} disabled={isSaving}>
                                Cancelar
                            </Button>
                            <Button type="primary" icon={<SaveOutlined />} onClick={handleSave} loading={isSaving}>
                                Guardar Cambios
                            </Button>
                        </>
                    ) : (
                        <Button type="primary" icon={<EditOutlined />} onClick={handleStartEdit}>
                            Editar Pedido
                        </Button>
                    )}
                </Space>
            </div>

            <Row gutter={[24, 24]}>
                <Col xs={24} md={16}>
                    <Card title="Artículos del Pedido" variant="borderless" style={{ marginBottom: 24 }}>
                        {isEditing && (
                            <Row gutter={[12, 12]} align="bottom" style={{ marginBottom: 24 }}>
                                <Col xs={24} md={12}>
                                    <Text strong>Producto / Variante</Text>
                                    <Select
                                        showSearch
                                        allowClear
                                        value={selectedVariantId}
                                        onChange={handleVariantChange}
                                        options={variantOptions}
                                        loading={productsLoading}
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
                        )}

                        {isEditing ? (
                            <Table<EditableOrderItem>
                                columns={editableItemsColumns}
                                dataSource={editItems}
                                rowKey="variant_id"
                                pagination={false}
                            />
                        ) : (
                            <Table<OrderItem>
                                columns={itemsColumns}
                                dataSource={order.order_item}
                                rowKey="order_item_id"
                                pagination={false}
                            />
                        )}
                        <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 16 }}>
                            <Space orientation="vertical" align="end" size={2}>
                                <Text type="secondary">Subtotal: {formatPEN(isEditing ? editSubtotal : Number(order.subtotal))}</Text>
                                
                                {Number(order.bundle_discount || 0) > 0 && (
                                    <Text type="success">
                                        Descuento Conjunto: -{formatPEN(Number(order.bundle_discount))}
                                    </Text>
                                )}
                                
                                {order.coupon_code && (
                                    <Text type="danger">
                                        Cupón ({order.coupon_code}): -{formatPEN(Number(order.coupon_discount || 0))}
                                    </Text>
                                )}

                                {/* Fallback para pedidos muy antiguos */}
                                {!order.bundle_discount && !order.coupon_discount && Number(order.discount_total || 0) > 0 && !order.coupon_code && (
                                     <Text type="danger">
                                        Descuento General: -{formatPEN(Number(order.discount_total))}
                                    </Text>
                                )}

                                <Title level={4} style={{ margin: 0, marginTop: 8 }}>
                                    Total: {formatPEN(isEditing ? editTotal : Number(order.total))}
                                </Title>
                            </Space>
                        </div>
                    </Card>

                    {!isEditing && order.notes && (
                        <Card title="Notas Internas" variant="borderless">
                            <Text>{order.notes}</Text>
                        </Card>
                    )}
                </Col>
                
                <Col xs={24} md={8}>
                    {isEditing ? (
                        <Card title="Editar Datos del Pedido" variant="borderless" style={{ marginBottom: 24 }}>
                            <Form form={form} layout="vertical">
                                <Form.Item name="status" label="Estado" rules={[{ required: true, message: 'Selecciona un estado' }]}>
                                    <Select options={statusOptions} />
                                </Form.Item>

                                <Form.Item name="sales_channel" label="Canal" rules={[{ required: true, message: 'Selecciona un canal' }]}>
                                    <Select options={salesChannelOptions} />
                                </Form.Item>

                                <Form.Item name="external_reference" label="Referencia del canal">
                                    <Input placeholder="Usuario, link del chat, referencia externa" />
                                </Form.Item>

                                <Row gutter={12}>
                                    <Col xs={24} sm={12} md={24} lg={12}>
                                        <Form.Item name="payment_method" label="Método de pago">
                                            <Select allowClear options={paymentMethodOptions} />
                                        </Form.Item>
                                    </Col>
                                    <Col xs={24} sm={12} md={24} lg={12}>
                                        <Form.Item name="payment_reference" label="Referencia pago">
                                            <Input placeholder="Operación, voucher, etc." />
                                        </Form.Item>
                                    </Col>
                                </Row>

                                <Form.Item name="shipping_name" label="Cliente" rules={[{ required: true, message: 'Ingresa el nombre del cliente' }]}>
                                    <Input placeholder="Nombre completo" />
                                </Form.Item>

                                <Form.Item
                                    name="shipping_dni"
                                    label="DNI"
                                    rules={[
                                        { required: true, message: 'Ingresa el DNI del cliente' },
                                        { pattern: /^\d{8}$/, message: 'El DNI debe tener 8 dígitos' },
                                    ]}
                                >
                                    <Input placeholder="Ej. 12345678" maxLength={8} inputMode="numeric" />
                                </Form.Item>

                                <Form.Item name="shipping_phone" label="Celular / WhatsApp" rules={[{ required: true, message: 'Ingresa el celular' }]}>
                                    <Input placeholder="Ej. 987654321" />
                                </Form.Item>

                                <Form.Item name="shipping_address" label="Dirección de entrega" rules={[{ required: true, message: 'Ingresa la dirección' }]}>
                                    <Input.TextArea rows={3} placeholder="Dirección de entrega o recojo coordinado" />
                                </Form.Item>

                                <Form.Item name="notes" label="Notas internas">
                                    <Input.TextArea rows={4} placeholder="Códigos de seguimiento, coordinación, observaciones, etc." />
                                </Form.Item>
                            </Form>
                        </Card>
                    ) : (
                        <Card title="Detalles del Cliente" variant="borderless" style={{ marginBottom: 24 }}>
                            <Descriptions column={1} size="small">
                                <Descriptions.Item label="Fecha">{dayjs(order.created_at).format('DD MMM YYYY, HH:mm')}</Descriptions.Item>
                                <Descriptions.Item label="Canal">{salesChannel.label}</Descriptions.Item>
                                {order.external_reference && (
                                    <Descriptions.Item label="Referencia canal">{order.external_reference}</Descriptions.Item>
                                )}
                                {order.payment_method && (
                                    <Descriptions.Item label="Método de pago">{order.payment_method}</Descriptions.Item>
                                )}
                                {order.payment_reference && (
                                    <Descriptions.Item label="Referencia pago">{order.payment_reference}</Descriptions.Item>
                                )}
                                <Descriptions.Item label="Nombre">{order.shipping_name}</Descriptions.Item>
                                <Descriptions.Item label="DNI">{order.shipping_dni || '-'}</Descriptions.Item>
                                <Descriptions.Item label="Teléfono / WS">{order.shipping_phone}</Descriptions.Item>
                                <Descriptions.Item label="Dirección">{order.shipping_address || '-'}</Descriptions.Item>
                            </Descriptions>
                            <Button
                                type="primary"
                                icon={<WhatsAppOutlined />}
                                style={{ backgroundColor: '#25D366', borderColor: '#25D366', width: '100%', marginTop: 16 }}
                                onClick={handleContactWhatsApp}
                            >
                                Contactar por WhatsApp
                            </Button>
                        </Card>
                    )}
                </Col>
            </Row>
        </Space>
    );
}
