'use client';
import { toast } from 'sonner';

import React from 'react';
import { Card, Table, Typography, Tag, Button, Space, Flex } from 'antd';
import { EyeOutlined, ReloadOutlined, PlusOutlined } from '@ant-design/icons';
import useSWR from 'swr';
import Link from 'next/link';
import { fetcher } from '@/lib/fetcher';
import { formatPEN } from '@/lib/money';
import dayjs from 'dayjs';
import type { ColumnsType } from 'antd/es/table';

const { Title, Text } = Typography;

export const statusMap: Record<string, { label: string, color: string }> = {
    'PENDING_WS': { label: 'Pend. WhatsApp', color: 'orange' },
    'PARTIALLY_PAID': { label: 'Pago parcial', color: 'volcano' },
    'PAID': { label: 'Orden generada / Pagada', color: 'gold' },
    'MEASURES_CONFIRMED': { label: 'Medidas confirmadas', color: 'purple' },
    'CONFIRMED': { label: 'Confirmado', color: 'blue' },
    'IN_PRODUCTION': { label: 'En confección', color: 'magenta' },
    'READY': { label: 'Listo para envío', color: 'geekblue' },
    'SHIPPED': { label: 'Enviado', color: 'cyan' },
    'DELIVERED': { label: 'Entregado', color: 'green' },
    'CANCELLED': { label: 'Cancelado', color: 'red' },
};

type AdminOrder = {
    order_id: string;
    code: string;
    created_at: string;
    shipping_name: string;
    shipping_phone: string;
    sales_channel?: string | null;
    external_reference?: string | null;
    discount_total?: number | string | null;
    bundle_discount?: number | string | null;
    coupon_discount?: number | string | null;
    coupon_code?: string | null;
    total: number | string;
    amount_paid?: number | string | null;
    balance_due?: number | string | null;
    status: string;
    order_item?: { is_customized?: boolean | number }[];
};

function hasCustomizedItems(order: AdminOrder) {
    return (order.order_item || []).some((item) => item.is_customized === true || item.is_customized === 1);
}

export default function AdminOrdersPage() {
    const { data: orders, error, isLoading, mutate, isValidating } = useSWR<AdminOrder[]>('/api/admin/orders', fetcher, {
        refreshInterval: 30000, // Cada 30 segundos
        revalidateOnFocus: true
    });

    const columns: ColumnsType<AdminOrder> = [
        {
            title: 'Código',
            dataIndex: 'code',
            key: 'code',
            width: 145,
            render: (code: string, record) => (
                <Space size={4} wrap={false} style={{ whiteSpace: 'nowrap' }}>
                    <Text strong>{code}</Text>
                    {hasCustomizedItems(record) && <Tag color="gold" style={{ marginInlineEnd: 0 }}>Pers.</Tag>}
                </Space>
            ),
        },
        {
            title: 'Fecha',
            dataIndex: 'created_at',
            key: 'created_at',
            width: 130,
            render: (date: string) => dayjs(date).format('DD/MM/YYYY HH:mm'),
        },
        {
            title: 'Cliente',
            dataIndex: 'shipping_name',
            key: 'shipping_name',
            width: 180,
            ellipsis: true,
        },
        {
            title: 'Celular',
            dataIndex: 'shipping_phone',
            key: 'shipping_phone',
            width: 120,
            ellipsis: true,
        },
        {
            title: 'Total',
            dataIndex: 'total',
            key: 'total',
            width: 155,
            render: (val: number | string, record) => (
                <Space size={4} wrap={false} style={{ whiteSpace: 'nowrap' }}>
                    <Text strong>{formatPEN(Number(val))}</Text>
                    {Number(record.balance_due || 0) > 0 && (
                        <Tag color="volcano" style={{ marginInlineEnd: 0 }}>Debe {formatPEN(Number(record.balance_due))}</Tag>
                    )}
                </Space>
            ),
        },
        {
            title: 'Estado',
            dataIndex: 'status',
            key: 'status',
            width: 135,
            render: (status: string) => {
                const conf = statusMap[status] || { label: status, color: 'default' };
                return <Tag color={conf.color} style={{ marginInlineEnd: 0 }}>{conf.label}</Tag>;
            },
        },
        {
            title: 'Acciones',
            key: 'actions',
            width: 90,
            fixed: 'right',
            render: (_value, record) => (
                <Space>
                    <Link href={`/admin/orders/${record.order_id}`}>
                        <Button type="primary" size="small" icon={<EyeOutlined />}>
                            Ver
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
        <Card 
            variant="borderless"
            title={
                <Flex justify="space-between" align="center">
                    <Title level={4} style={{ margin: 0 }}>Gestión de Pedidos</Title>
                    <Space>
                        <Link href="/admin/orders/new">
                            <Button type="primary" icon={<PlusOutlined />}>
                                Nueva venta
                            </Button>
                        </Link>
                        <Button 
                            icon={<ReloadOutlined spin={isValidating} />} 
                            onClick={() => mutate()}
                            type="text"
                        >
                            Actualizar
                        </Button>
                    </Space>
                </Flex>
            }
        >
            <Table
                columns={columns}
                dataSource={orders}
                rowKey="order_id"
                loading={isLoading}
                pagination={{ pageSize: 12 }}
                scroll={{ x: 955 }}
                tableLayout="fixed"
            />
        </Card>
    );
}
