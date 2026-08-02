'use client';

import React, { useEffect, useState } from 'react';
import { Alert, Card, Space, Spin, Typography } from 'antd';
import { useParams } from 'next/navigation';

const { Title, Text } = Typography;

type OrderInfo = {
    code: string;
    status: string;
    total: number;
    createdAt: string;
};

const statusLabels: Record<string, string> = {
    PENDING_WS: 'Pendiente por WhatsApp',
    PAID: 'Orden generada / pagada',
    MEASURES_CONFIRMED: 'Medidas confirmadas',
    CONFIRMED: 'Confirmado',
    IN_PRODUCTION: 'En confección',
    READY: 'Listo para envío',
    SHIPPED: 'Enviado',
    DELIVERED: 'Entregado',
    CANCELLED: 'Cancelado',
};

export default function OrderPage() {
    const params = useParams<{ code: string }>();
    const code = params.code;

    const [loading, setLoading] = useState(true);
    const [data, setData] = useState<OrderInfo | null>(null);

    useEffect(() => {
        const controller = new AbortController();
        const run = async () => {
            try {
                setLoading(true);
                const res = await fetch(`/api/store/orders/${code}`, { signal: controller.signal });
                if (!res.ok) throw new Error(`HTTP ${res.status}`);
                const json = await res.json();
                setData(json);
            } catch {
                setData(null);
            } finally {
                setLoading(false);
            }
        };
        run();
        return () => controller.abort();
    }, [code]);

    if (loading) {
        return (
            <Card>
                <div style={{ padding: 40, textAlign: 'center' }}>
                    <Spin />
                </div>
            </Card>
        );
    }

    if (!data) {
        return (
            <Card>
                <Alert type="error" title="No se encontró el pedido" />
            </Card>
        );
    }

    return (
        <Card>
            <Space orientation="vertical" size={10} style={{ width: '100%' }}>
                <Title level={3} style={{ marginTop: 0 }}>Pedido creado ✅</Title>
                <Text>Tu código: <Text strong>{data.code}</Text></Text>
                <Text>Estado: <Text strong>{statusLabels[data.status] || data.status}</Text></Text>
                <Text>Total: <Text strong>{data.total}</Text></Text>
                <Text type="secondary">
                    Importante: si pagas por Yape/Plin, envía el comprobante por WhatsApp indicando tu código.
                </Text>
            </Space>
        </Card>
    );
}
