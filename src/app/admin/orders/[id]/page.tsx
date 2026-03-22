'use client';

import React, { useState } from 'react';
import { Card, Select, Button, Typography, Space, Descriptions, Table, message, Row, Col, Input, Tag, Alert } from 'antd';
import { LeftOutlined, SaveOutlined, PrinterOutlined } from '@ant-design/icons';
import useSWR from 'swr';
import { useParams, useRouter } from 'next/navigation';
import { fetcher } from '@/lib/fetcher';
import { formatPEN } from '@/lib/money';
import Link from 'next/link';
import dayjs from 'dayjs';

export const statusMap: Record<string, { label: string, color: string }> = {
    'PENDING_WS': { label: 'Pend. WhatsApp', color: 'orange' },
    'CONFIRMED': { label: 'Confirmado', color: 'blue' },
    'SHIPPED': { label: 'Enviado', color: 'cyan' },
    'DELIVERED': { label: 'Entregado', color: 'green' },
    'CANCELLED': { label: 'Cancelado', color: 'red' },
};

const { Title, Text } = Typography;

export default function OrderDetailPage() {
    const params = useParams();
    const router = useRouter();
    const id = params.id as string;

    const { data: order, isLoading, mutate } = useSWR<any>(id ? `/api/admin/orders/${id}` : null, fetcher);

    const [status, setStatus] = useState<string | null>(null);
    const [notes, setNotes] = useState<string>('');
    const [isSaving, setIsSaving] = useState(false);

    // Initialize state when data loads
    React.useEffect(() => {
        if (order && status === null) {
            setStatus(order.status);
            setNotes(order.notes || '');
        }
    }, [order, status]);

    const handleSave = async () => {
        setIsSaving(true);
        try {
            const res = await fetch(`/api/admin/orders/${id}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ status, notes }),
            });

            if (!res.ok) {
                const err = await res.json();
                throw new Error(err.error || 'Error al actualizar pedido');
            }

            message.success('Pedido actualizado con éxito');
            mutate();
        } catch (error: any) {
            message.error(error.message);
        } finally {
            setIsSaving(false);
        }
    };

    const handlePrint = () => {
        if (!order) return;
        const printWindow = window.open('', '_blank');
        if (!printWindow) return;

        const html = `
            <html>
                <head>
                    <title>Etiqueta - ${order.code}</title>
                    <style>
                        body { font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif; padding: 40px; color: #000; }
                        .label { max-width: 400px; margin: 0 auto; border: 2px solid #000; padding: 30px; border-radius: 8px; }
                        .header { text-align: center; margin-bottom: 20px; }
                        .header h2 { margin: 0; font-size: 24px; text-transform: uppercase; letter-spacing: 2px; }
                        .header p { margin: 5px 0 0 0; color: #666; }
                        .divider { border-top: 2px dashed #000; margin: 20px 0; }
                        .field { margin-bottom: 15px; }
                        .field-label { font-size: 12px; color: #666; text-transform: uppercase; font-weight: bold; margin-bottom: 4px; }
                        .field-value { font-size: 18px; font-weight: bold; }
                        .field-value.large { font-size: 24px; }
                        .footer { margin-top: 30px; font-size: 12px; color: #666; text-align: center; }
                        @media print {
                            body { padding: 0; }
                            .label { border: none; padding: 0; max-width: 100%; }
                        }
                    </style>
                </head>
                <body>
                    <div class="label">
                        <div class="header">
                            <h2>AURA BOUTIQUE</h2>
                            <p>DOC DE ENVÍO</p>
                        </div>
                        <div class="divider"></div>
                        <div class="field">
                            <div class="field-label">Pedido</div>
                            <div class="field-value">${order.code}</div>
                        </div>
                        <div class="field">
                            <div class="field-label">Destinatario</div>
                            <div class="field-value large">${order.shipping_name}</div>
                        </div>
                        <div class="field">
                            <div class="field-label">Teléfono / Celular</div>
                            <div class="field-value">${order.shipping_phone}</div>
                        </div>
                        <div class="field">
                            <div class="field-label">Dirección de Entrega</div>
                            <div class="field-value">${order.shipping_address || 'Consultar al cliente'}</div>
                        </div>
                        <div class="divider"></div>
                        <div class="footer">
                            Generado el ${dayjs().format('DD/MM/YYYY HH:mm')}
                        </div>
                    </div>
                    <script>
                        window.onload = function() { window.print(); window.close(); }
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
        return <Card><Alert type="error" message="Pedido no encontrado" /></Card>;
    }

    const itemsColumns = [
        {
            title: 'Producto / Variante',
            key: 'product',
            render: (_: any, record: any) => (
                <Space direction="vertical" size={2}>
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

    return (
        <Space direction="vertical" size="large" style={{ width: '100%' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <Space>
                    <Link href="/admin/orders">
                        <Button icon={<LeftOutlined />}>Volver</Button>
                    </Link>
                    <Title level={4} style={{ margin: 0 }}>Pedido {order.code}</Title>
                    <Tag color={statusMap[order.status]?.color || 'default'}>
                        {statusMap[order.status]?.label || order.status}
                    </Tag>
                </Space>
                <Space>
                    <Button icon={<PrinterOutlined />} onClick={handlePrint}>
                        Imprimir Etiqueta
                    </Button>
                    <Button type="primary" icon={<SaveOutlined />} onClick={handleSave} loading={isSaving}>
                        Guardar Cambios
                    </Button>
                </Space>
            </div>

            <Row gutter={[24, 24]}>
                <Col xs={24} md={16}>
                    <Card title="Artículos del Pedido" bordered={false} style={{ marginBottom: 24 }}>
                        <Table
                            columns={itemsColumns}
                            dataSource={order.order_item}
                            rowKey="order_item_id"
                            pagination={false}
                        />
                        <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 16 }}>
                            <Space direction="vertical" align="end">
                                <Text type="secondary">Subtotal: {formatPEN(Number(order.subtotal))}</Text>
                                <Title level={4} style={{ margin: 0 }}>Total: {formatPEN(Number(order.total))}</Title>
                            </Space>
                        </div>
                    </Card>

                    <Card title="Actualizar Estado del Pedido" bordered={false}>
                        <Space direction="vertical" style={{ width: '100%' }}>
                            <Text strong>Progreso del Pedido</Text>
                            <Select
                                value={status || order.status}
                                onChange={setStatus}
                                style={{ width: '100%' }}
                                options={[
                                    { value: 'PENDING_WS', label: 'Pendiente WhatsApp' },
                                    { value: 'CONFIRMED', label: 'Confirmado / En Preparación' },
                                    { value: 'SHIPPED', label: 'Enviado / En Tránsito' },
                                    { value: 'DELIVERED', label: 'Entregado' },
                                    { value: 'CANCELLED', label: 'Cancelado' },
                                ]}
                            />
                            
                            <Text strong style={{ marginTop: 16, display: 'block' }}>Notas Internas</Text>
                            <Input.TextArea
                                value={notes}
                                onChange={(e) => setNotes(e.target.value)}
                                rows={4}
                                placeholder="Escribe aquí notas internas, códigos de seguimiento de courier, etc..."
                            />
                        </Space>
                    </Card>
                </Col>
                
                <Col xs={24} md={8}>
                    <Card title="Detalles del Cliente" bordered={false} style={{ marginBottom: 24 }}>
                        <Descriptions column={1} size="small">
                            <Descriptions.Item label="Fecha">{dayjs(order.created_at).format('DD MMM YYYY, HH:mm')}</Descriptions.Item>
                            <Descriptions.Item label="Nombre">{order.shipping_name}</Descriptions.Item>
                            <Descriptions.Item label="Teléfono / WS">{order.shipping_phone}</Descriptions.Item>
                            <Descriptions.Item label="Dirección">{order.shipping_address || '-'}</Descriptions.Item>
                        </Descriptions>
                    </Card>
                </Col>
            </Row>
        </Space>
    );
}
