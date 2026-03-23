'use client';
import { toast } from 'sonner';

import React from 'react';
import { Card, Table, Typography, Tag, Button, Space } from 'antd';
import { EyeOutlined } from '@ant-design/icons';
import useSWR from 'swr';
import Link from 'next/link';
import { fetcher } from '@/lib/fetcher';
import { formatPEN } from '@/lib/money';
import dayjs from 'dayjs';

const { Title, Text } = Typography;

export const statusMap: Record<string, { label: string, color: string }> = {
    'PENDING_WS': { label: 'Pend. WhatsApp', color: 'orange' },
    'CONFIRMED': { label: 'Confirmado', color: 'blue' },
    'SHIPPED': { label: 'Enviado', color: 'cyan' },
    'DELIVERED': { label: 'Entregado', color: 'green' },
    'CANCELLED': { label: 'Cancelado', color: 'red' },
};

export default function AdminOrdersPage() {
    const { data: orders, error, isLoading } = useSWR<any[]>('/api/admin/orders', fetcher);

    const columns = [
        {
            title: 'Código',
            dataIndex: 'code',
            key: 'code',
            render: (code: string) => <Text strong>{code}</Text>,
        },
        {
            title: 'Fecha',
            dataIndex: 'created_at',
            key: 'created_at',
            render: (date: string) => dayjs(date).format('DD/MM/YYYY HH:mm'),
        },
        {
            title: 'Cliente',
            dataIndex: 'shipping_name',
            key: 'shipping_name',
        },
        {
            title: 'Celular',
            dataIndex: 'shipping_phone',
            key: 'shipping_phone',
        },
        {
            title: 'Total',
            dataIndex: 'total',
            key: 'total',
            render: (val: number) => formatPEN(Number(val)),
        },
        {
            title: 'Estado',
            dataIndex: 'status',
            key: 'status',
            render: (status: string) => {
                const conf = statusMap[status] || { label: status, color: 'default' };
                return <Tag color={conf.color}>{conf.label}</Tag>;
            },
        },
        {
            title: 'Acciones',
            key: 'actions',
            render: (_: any, record: any) => (
                <Space>
                    <Link href={`/admin/orders/${record.order_id}`}>
                        <Button type="primary" size="small" icon={<EyeOutlined />}>
                            Ver Detalle
                        </Button>
                    </Link>
                </Space>
            ),
        },
    ];

    if (error) {
        toast.error('Error al cargar pedidos');
    }

    return (
        <Card title="Gestión de Pedidos" bordered={false}>
            <Table
                columns={columns}
                dataSource={orders}
                rowKey="order_id"
                loading={isLoading}
                pagination={{ pageSize: 10 }}
            />
        </Card>
    );
}
