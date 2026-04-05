'use client';
import { toast } from 'sonner';

import React from 'react';
import { Card, Table, Typography, Tag, Button, Space, Flex } from 'antd';
import { EyeOutlined, TagOutlined, ReloadOutlined } from '@ant-design/icons';
import useSWR from 'swr';
import Link from 'next/link';
import { fetcher } from '@/lib/fetcher';
import { formatPEN } from '@/lib/money';
import dayjs from 'dayjs';

const { Title, Text } = Typography;

export const statusMap: Record<string, { label: string, color: string }> = {
    'PENDING_WS': { label: 'Pend. WhatsApp', color: 'orange' },
    'PAID': { label: 'Orden generada / Pagada', color: 'gold' },
    'CONFIRMED': { label: 'Confirmado', color: 'blue' },
    'SHIPPED': { label: 'Enviado', color: 'cyan' },
    'DELIVERED': { label: 'Entregado', color: 'green' },
    'CANCELLED': { label: 'Cancelado', color: 'red' },
};

export default function AdminOrdersPage() {
    const { data: orders, error, isLoading, mutate, isValidating } = useSWR<any[]>('/api/admin/orders', fetcher, {
        refreshInterval: 30000, // Cada 30 segundos
        revalidateOnFocus: true
    });

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
            title: 'Descuento',
            key: 'discount',
            render: (_: any, record: any) => {
                const totalDiscount = Number(record.discount_total || 0);
                const bundleDiscount = Number(record.bundle_discount || 0);
                const couponDiscount = Number(record.coupon_discount || 0);

                if (totalDiscount === 0) return <Text type="secondary">-</Text>;

                return (
                    <Space size={2} direction="vertical" style={{ minWidth: 100 }}>
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
                    <Button 
                        icon={<ReloadOutlined spin={isValidating} />} 
                        onClick={() => mutate()}
                        type="text"
                    >
                        Actualizar
                    </Button>
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
