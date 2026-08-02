'use client';

import React, { useState, useEffect } from 'react';
import { Card, Typography, Steps, Row, Col, Tag, Space, Switch, Image } from 'antd';
import { CheckCircleOutlined, LoadingOutlined, InboxOutlined, HomeOutlined, ClockCircleOutlined, BulbOutlined, BulbFilled } from '@ant-design/icons';
import dayjs from 'dayjs';
import 'dayjs/locale/es';
import { useThemeStore } from "@/store/theme.store";
import Link from 'next/link';
import AuraLogo from "@/components/AuraLogo";
import PusherClient from 'pusher-js';

dayjs.locale('es');
const { Title, Text } = Typography;

const defaultStatusTimeline = [
    { key: ['PENDING_WS', 'PAID'], title: 'Recibido', description: 'Orden generada / Pagada' },
    { key: ['MEASURES_CONFIRMED', 'CONFIRMED', 'IN_PRODUCTION'], title: 'Preparando', description: 'Preparando tu orden' },
    { key: ['READY'], title: 'Listo', description: 'Listo para despacho' },
    { key: ['SHIPPED'], title: 'En Curso', description: 'El motorizado está en camino' },
    { key: ['DELIVERED'], title: 'Entregado', description: 'Pedido finalizado' }
];

const customStatusTimeline = [
    { key: ['PENDING_WS', 'PAID'], title: 'Recibido', description: 'Pedido personalizado registrado' },
    { key: ['MEASURES_CONFIRMED'], title: 'Medidas confirmadas', description: 'Validamos tus medidas y color' },
    { key: ['CONFIRMED', 'IN_PRODUCTION'], title: 'En confección', description: 'Tu prenda está en producción' },
    { key: ['READY'], title: 'Listo', description: 'Listo para despacho' },
    { key: ['SHIPPED'], title: 'En Curso', description: 'El motorizado está en camino' },
    { key: ['DELIVERED'], title: 'Entregado', description: 'Pedido finalizado' }
];

export default function ClientTracker({ order, code }: { order: any, code: string }) {
    const isDarkMode = useThemeStore((s) => s.isDarkMode);
    const toggleDarkMode = useThemeStore((s) => s.toggleDarkMode);
    const [liveStatus, setLiveStatus] = useState(order?.status || 'PENDING_WS');

    useEffect(() => {
        if (!order) return;
        
        // Pusher Tracker configuration
        const pusher = new PusherClient(process.env.NEXT_PUBLIC_TRACKER_PUSHER_KEY!, {
            cluster: process.env.NEXT_PUBLIC_TRACKER_PUSHER_CLUSTER!,
            forceTLS: true,
        });

        const channel = pusher.subscribe(`order-${code}`);
        channel.bind('status-updated', (data: { status: string, code: string }) => {
            console.log("Real-time Tracker Update:", data);
            setLiveStatus(data.status);
        });

        return () => {
            pusher.unsubscribe(`order-${code}`);
            pusher.disconnect();
        };
    }, [order, code]);

    if (!order) {
        return (
            <div style={{ maxWidth: 500, margin: '80px auto', padding: 20, textAlign: 'center' }}>
                <Link href="/shop" style={{ display: 'inline-block', marginBottom: 24, textDecoration: 'none' }}>
                    <AuraLogo size="large" />
                </Link>
                <Card style={{ borderColor: '#f5222d' }}>
                    <Title level={4} style={{ color: '#f5222d' }}>Pedido No Encontrado</Title>
                    <Text>No pudimos localizar el envío. Verifica que el código '{code}' sea correcto o contacta a soporte.</Text>
                </Card>
            </div>
        );
    }

    const maskPhone = (phone: string) => {
        if (!phone) return 'No registrado';
        const cleaned = phone.replace(/\D/g, '');
        if (cleaned.length < 5) return '***';
        return cleaned.substring(0, cleaned.length - 4) + ' ••••';
    };

    const hasCustomizedItems = (order.order_item || []).some((item: any) => item.is_customized === true || item.is_customized === 1);
    const statusTimeline = hasCustomizedItems ? customStatusTimeline : defaultStatusTimeline;
    const isCancelled = liveStatus === 'CANCELLED';
    let currentStep = statusTimeline.findIndex(s => s.key.includes(liveStatus));
    if (currentStep === -1) currentStep = 0;
    const publicPhotos = order.order_photo || [];

    return (
        <div style={{ minHeight: '100vh', background: isDarkMode ? '#141414' : '#fafafa', padding: '0 10px 20px', fontFamily: 'sans-serif' }}>
            
            {/* Minimal Header */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '16px 24px', maxWidth: 640, margin: '0 auto 20px' }}>
                <Link href="/shop" style={{ textDecoration: 'none', display: 'flex', alignItems: 'center' }}>
                    <AuraLogo size="small" />
                </Link>
                <Switch
                    checked={isDarkMode}
                    onChange={toggleDarkMode}
                    checkedChildren={<BulbFilled />}
                    unCheckedChildren={<BulbOutlined />}
                    style={{ background: isDarkMode ? '#444' : '#ccc' }}
                />
            </div>

            <div style={{ maxWidth: 600, margin: '0 auto' }}>
                <div style={{ textAlign: 'center', marginBottom: 30 }}>
                    <Title level={4} type="secondary" style={{ margin: 0, fontWeight: 300 }}>SEGUIMIENTO DE PEDIDO</Title>
                </div>

                {isCancelled && (
                    <Card style={{ marginBottom: 20, borderColor: 'red', background: '#fff1f0' }}>
                        <Title level={4} style={{ color: 'red', margin: 0 }}>Pedido Cancelado</Title>
                        <Text>Este pedido ha sido cancelado y ya no está en tránsito.</Text>
                    </Card>
                )}

                <Card title={<Space><ClockCircleOutlined /> <span>Estado Actual</span></Space>} style={{ marginBottom: 20, boxShadow: '0 4px 12px rgba(0,0,0,0.05)' }}>
                    <div style={{ padding: '10px 0' }}>
                        <Steps
                            orientation="vertical"
                            current={isCancelled ? 0 : currentStep}
                            status={isCancelled ? 'error' : (liveStatus === 'DELIVERED' ? 'finish' : 'process')}
                            items={statusTimeline.map((step, index) => {
                                let icon = undefined;
                                if (liveStatus !== 'CANCELLED') {
                                    if (index === currentStep && liveStatus !== 'DELIVERED') icon = <LoadingOutlined />;
                                    if (step.key.includes('DELIVERED') && liveStatus === 'DELIVERED') icon = <CheckCircleOutlined />;
                                    if (step.key.includes('CONFIRMED') && index > currentStep) icon = <InboxOutlined />;
                                    if (step.key.includes('SHIPPED') && index > currentStep) icon = <HomeOutlined />;
                                }
                                return {
                                    title: <span style={{ fontWeight: index <= currentStep && !isCancelled ? 'bold' : 'normal' }}>{step.title}</span>,
                                    subTitle: step.description,
                                    icon
                                };
                            })}
                        />
                    </div>
                </Card>

                <Card title="Detalles del Envío" style={{ marginBottom: 20, boxShadow: '0 4px 12px rgba(0,0,0,0.05)' }}>
                    <div style={{ marginBottom: 16 }}>
                        <Text type="secondary" style={{ display: 'block', fontSize: 12 }}>CÓDIGO DE RASTREO</Text>
                        <Text strong style={{ fontSize: 18 }}>#{order.code}</Text>
                    </div>
                    
                    <Row gutter={[16, 16]}>
                        <Col span={12}>
                            <Text type="secondary" style={{ display: 'block', fontSize: 12 }}>DESTINATARIO</Text>
                            <Text strong>{order.shipping_name}</Text>
                        </Col>
                        <Col span={12}>
                            <Text type="secondary" style={{ display: 'block', fontSize: 12 }}>CREADO EL</Text>
                            <Text strong>{dayjs(order.created_at).format('D MMM YYYY')}</Text>
                        </Col>
                        <Col span={12}>
                            <Text type="secondary" style={{ display: 'block', fontSize: 12 }}>TELÉFONO</Text>
                            <Text strong>{maskPhone(order.shipping_phone || '')}</Text>
                        </Col>
                        <Col span={12}>
                            <Text type="secondary" style={{ display: 'block', fontSize: 12 }}>DIRECCIÓN DE ENTREGA</Text>
                            <Text strong>{order.shipping_address || 'Coordinar Recojo'}</Text>
                        </Col>
                    </Row>
                </Card>

                <Card title={<Space><InboxOutlined /> <span>Contenido del Paquete</span></Space>} style={{ boxShadow: '0 4px 12px rgba(0,0,0,0.05)' }}>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                        {order.order_item.map((item: any) => (
                            <div key={item.order_item_id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingBottom: 12, borderBottom: '1px solid #f0f0f0' }}>
                                <div>
                                    <Text strong style={{ display: 'block' }}>{item.product_name}</Text>
                                    <Tag color="default" style={{ marginTop: 4 }}>
                                        {item.variant_size} {item.variant_color ? `| ${item.variant_color}` : ''}
                                    </Tag>
                                </div>
                                <div style={{ fontSize: 16, fontWeight: 'bold' }}>
                                    x{item.qty}
                                </div>
                            </div>
                        ))}
                    </div>
                    <div style={{ textAlign: 'center', marginTop: 20 }}>
                        <Text type="secondary" style={{ fontSize: 12 }}>Nota: Los importes económicos se ocultan por motivos de privacidad.</Text>
                    </div>
                </Card>

                {publicPhotos.length > 0 && (
                    <Card title="Fotos de tu pedido" style={{ marginTop: 20, boxShadow: '0 4px 12px rgba(0,0,0,0.05)' }}>
                        <Row gutter={[12, 12]}>
                            {publicPhotos.map((photo: any) => (
                                <Col xs={12} sm={8} key={photo.photo_id}>
                                    <Image
                                        src={photo.url}
                                        alt="Foto del pedido"
                                        style={{ width: '100%', aspectRatio: '1 / 1', objectFit: 'cover', borderRadius: 8 }}
                                    />
                                    {photo.caption && (
                                        <Text type="secondary" style={{ display: 'block', marginTop: 6, fontSize: 12 }}>
                                            {photo.caption}
                                        </Text>
                                    )}
                                </Col>
                            ))}
                        </Row>
                    </Card>
                )}

                <div style={{ textAlign: 'center', marginTop: 40, paddingBottom: 40 }}>
                    <Text type="secondary" style={{ fontSize: 12 }}>© {new Date().getFullYear()} Aura Boutique. Todos los derechos reservados.</Text>
                </div>
            </div>
        </div>
    );
}
