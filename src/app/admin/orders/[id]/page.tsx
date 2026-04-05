'use client';
import { toast } from 'sonner';

import React, { useState } from 'react';
import { Card, Select, Button, Typography, Space, Descriptions, Table, Row, Col, Input, Tag, Alert } from 'antd';
import { LeftOutlined, SaveOutlined, PrinterOutlined, WhatsAppOutlined } from '@ant-design/icons';
import useSWR from 'swr';
import { useParams, useRouter } from 'next/navigation';
import { fetcher } from '@/lib/fetcher';
import { formatPEN } from '@/lib/money';
import Link from 'next/link';
import dayjs from 'dayjs';

export const statusMap: Record<string, { label: string, color: string }> = {
    'PENDING_WS': { label: 'Pend. WhatsApp', color: 'orange' },
    'PAID': { label: 'Orden generada / Pagada', color: 'gold' },
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

            toast.success('Pedido actualizado con éxito');
            mutate();
        } catch (error: any) {
            toast.error(error.message);
        } finally {
            setIsSaving(false);
        }
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
        const itemsList = order.order_item?.map((item: any) => `<li>${item.qty}x ${item.product_name} (${item.variant_size})</li>`).join('') || '';

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
                                @auraboutique
                            </span>
                            <span style="display:inline-flex; align-items:center; gap:6px;">
                                <i class="fa-brands fa-tiktok" style="font-size: 14px;"></i>
                                @auraboutique
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

    const itemsColumns = [
        {
            title: 'Producto / Variante',
            key: 'product',
            render: (_: any, record: any) => (
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
                    <Card title="Artículos del Pedido" variant="borderless" style={{ marginBottom: 24 }}>
                        <Table
                            columns={itemsColumns}
                            dataSource={order.order_item}
                            rowKey="order_item_id"
                            pagination={false}
                        />
                        <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 16 }}>
                            <Space orientation="vertical" align="end">
                                <Text type="secondary">Subtotal: {formatPEN(Number(order.subtotal))}</Text>
                                <Title level={4} style={{ margin: 0 }}>Total: {formatPEN(Number(order.total))}</Title>
                            </Space>
                        </div>
                    </Card>

                    <Card title="Actualizar Estado del Pedido" variant="borderless">
                        <Space orientation="vertical" style={{ width: '100%' }}>
                            <Text strong>Progreso del Pedido</Text>
                            <Select
                                value={status || order.status}
                                onChange={setStatus}
                                style={{ width: '100%' }}
                                options={[
                                    { value: 'PENDING_WS', label: 'Pendiente WhatsApp' },
                                    { value: 'PAID', label: 'Orden generada / Pagada' },
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
                    <Card title="Detalles del Cliente" variant="borderless" style={{ marginBottom: 24 }}>
                        <Descriptions column={1} size="small">
                            <Descriptions.Item label="Fecha">{dayjs(order.created_at).format('DD MMM YYYY, HH:mm')}</Descriptions.Item>
                            <Descriptions.Item label="Nombre">{order.shipping_name}</Descriptions.Item>
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
                </Col>
            </Row>
        </Space>
    );
}
