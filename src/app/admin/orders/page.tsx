'use client';
import { toast } from 'sonner';

import React from 'react';
import { Card, Table, Typography, Tag, Button, Space, Flex } from 'antd';
import { EyeOutlined, TagOutlined, ReloadOutlined, PlusOutlined } from '@ant-design/icons';
import useSWR from 'swr';
import Link from 'next/link';
import { fetcher } from '@/lib/fetcher';
import { formatPEN } from '@/lib/money';
import dayjs from 'dayjs';
import type { ColumnsType } from 'antd/es/table';

const { Title, Text } = Typography;

export const statusMap: Record<string, { label: string, color: string }> = {
    'PENDING_WS': { label: 'Pend. WhatsApp', color: 'orange' },
    'PAID': { label: 'Orden generada / Pagada', color: 'gold' },
    'MEASURES_CONFIRMED': { label: 'Medidas confirmadas', color: 'purple' },
    'CONFIRMED': { label: 'Confirmado', color: 'blue' },
    'IN_PRODUCTION': { label: 'En confección', color: 'magenta' },
    'READY': { label: 'Listo para envío', color: 'geekblue' },
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
            render: (code: string, record) => (
                <Space orientation="vertical" size={2}>
                    <Text strong>{code}</Text>
                    {hasCustomizedItems(record) && <Tag color="gold" style={{ width: 'fit-content' }}>Personalizado</Tag>}
                </Space>
            ),
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
            title: 'Canal',
            dataIndex: 'sales_channel',
            key: 'sales_channel',
            render: (channel: string | null | undefined, record) => {
                const conf = salesChannelMap[channel || 'SHOP'] || { label: channel || 'Shop', color: 'default' };
                return (
                    <Space orientation="vertical" size={2}>
                        <Tag color={conf.color}>{conf.label}</Tag>
                        {record.external_reference && (
                            <Text type="secondary" style={{ fontSize: 11 }}>{record.external_reference}</Text>
                        )}
                    </Space>
                );
            },
        },
        {
            title: 'Descuento',
            key: 'discount',
            render: (_value, record) => {
                const totalDiscount = Number(record.discount_total || 0);
                const bundleDiscount = Number(record.bundle_discount || 0);
                const couponDiscount = Number(record.coupon_discount || 0);

                if (totalDiscount === 0) return <Text type="secondary">-</Text>;

                return (
                    <Space size={2} orientation="vertical" style={{ minWidth: 100 }}>
                        {bundleDiscount > 0 && (
                            <Text type="success" style={{ fontSize: 11 }}>
                                Conjunto: -{formatPEN(bundleDiscount)}
                            </Text>
                        )}
                        {couponDiscount > 0 && (
                            <Text type="danger" style={{ fontSize: 11 }}>
                                Cupón: -{formatPEN(couponDiscount)}
                            </Text>
                        )}
                        {record.coupon_code && (
                            <Tag color="cyan" style={{ fontSize: 9, margin: 0, width: 'fit-content' }}>
                                <TagOutlined style={{ marginRight: 2 }} />
                                {record.coupon_code}
                            </Tag>
                        )}
                        {/* Fallback for old orders or if sum is different */}
                        {bundleDiscount === 0 && couponDiscount === 0 && totalDiscount > 0 && (
                            <Text type="danger">-{formatPEN(totalDiscount)}</Text>
                        )}
                    </Space>
                );
            },
        },
        {
            title: 'Total',
            dataIndex: 'total',
            key: 'total',
            render: (val: number | string) => formatPEN(Number(val)),
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
            />
        </Card>
    );
}
