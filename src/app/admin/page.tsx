'use client';

import React from 'react';
import { Typography, Row, Col, Card, Statistic, Table, Tag, List, Alert, Button } from 'antd';
import { ShoppingOutlined, DollarOutlined, WarningOutlined, ClockCircleOutlined, RightOutlined } from '@ant-design/icons';
import useSWR from 'swr';
import Link from 'next/link';
import { fetcher } from '@/lib/fetcher';
import { formatPEN } from '@/lib/money';
import dayjs from 'dayjs';

const { Title, Text } = Typography;

const statusMap: Record<string, { label: string, color: string }> = {
    'PENDING_WS': { label: 'Pendiente', color: 'orange' },
    'CONFIRMED': { label: 'Confirmado', color: 'blue' },
    'SHIPPED': { label: 'Enviado', color: 'cyan' },
    'DELIVERED': { label: 'Entregado', color: 'green' },
    'CANCELLED': { label: 'Cancelado', color: 'red' },
};

export default function AdminDashboardPage() {
    const { data, isLoading, error } = useSWR<any>('/api/admin/dashboard', fetcher);

    if (error) {
        return <Alert message="Error al cargar analíticas" type="error" />;
    }

    const { totalRevenue = 0, pendingCount = 0, recentOrders = [], lowStock = [] } = data || {};

    const columns = [
        {
            title: 'Código',
            dataIndex: 'code',
            key: 'code',
            render: (code: string, record: any) => (
                <Link href={`/admin/orders/${record.order_id}`}>
                    <Text strong style={{ color: '#C89F53' }}>{code}</Text>
                </Link>
            ),
        },
        {
            title: 'Cliente',
            dataIndex: 'shipping_name',
            key: 'shipping_name',
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
            title: 'Total',
            dataIndex: 'total',
            key: 'total',
            render: (val: number) => formatPEN(Number(val)),
        },
    ];

    return (
        <div style={{ paddingBottom: 24 }}>
            <Title level={2}>Panel de Administración y Control</Title>
            
            <Row gutter={[16, 16]} style={{ marginTop: 24 }}>
                <Col xs={24} sm={12} md={8}>
                    <Card loading={isLoading} bordered={false}>
                        <Statistic
                            title="Ingresos Estimados"
                            value={Number(totalRevenue)}
                            precision={2}
                            prefix={<DollarOutlined />}
                            formatter={(value) => `S/ ${value}`}
                            valueStyle={{ color: '#3f8600' }}
                        />
                    </Card>
                </Col>
                <Col xs={24} sm={12} md={8}>
                    <Card loading={isLoading} bordered={false}>
                        <Statistic
                            title="Pedidos Pendientes"
                            value={pendingCount}
                            prefix={<ClockCircleOutlined />}
                            valueStyle={{ color: '#faad14' }}
                        />
                        <div style={{ marginTop: 12 }}>
                            <Link href="/admin/orders">
                                <Button size="small" type="primary" ghost>Ver pedidos</Button>
                            </Link>
                        </div>
                    </Card>
                </Col>
                <Col xs={24} sm={12} md={8}>
                    <Card bordered={false} hoverable>
                        <Link href="/admin/products" style={{ display: 'block', textDecoration: 'none' }}>
                            <Statistic
                                title="Catálogo Rápido"
                                value="Ir a Prendas"
                                prefix={<ShoppingOutlined />}
                                valueStyle={{ fontSize: 20, color: '#C89F53' }}
                            />
                        </Link>
                    </Card>
                </Col>
            </Row>

            <Row gutter={[24, 24]} style={{ marginTop: 24 }}>
                <Col xs={24} lg={16}>
                    <Card title="Últimos Pedidos" bordered={false} loading={isLoading} extra={<Link href="/admin/orders">Ver todos</Link>}>
                        <Table
                            columns={columns}
                            dataSource={recentOrders}
                            rowKey="order_id"
                            pagination={false}
                            size="small"
                        />
                    </Card>
                </Col>
                <Col xs={24} lg={8}>
                    <Card 
                        title="Alertas de Stock" 
                        bordered={false} 
                        loading={isLoading}
                        extra={<WarningOutlined style={{ color: 'red' }} />}
                    >
                        {lowStock.length === 0 ? (
                            <Text type="secondary">El inventario está saludable.</Text>
                        ) : (
                            <List
                                size="small"
                                dataSource={lowStock}
                                renderItem={(item: any) => (
                                    <List.Item>
                                        <List.Item.Meta
                                            title={<Link href={`/admin/products/${item.product_id}`}>{item.product.name}</Link>}
                                            description={`${item.size} - ${item.color} | SKU: ${item.sku}`}
                                        />
                                        <div>
                                            {item.stock === 0 ? (
                                                <Tag color="red">Agotado</Tag>
                                            ) : (
                                                <Tag color="orange">Quedan {item.stock}</Tag>
                                            )}
                                        </div>
                                    </List.Item>
                                )}
                            />
                        )}
                    </Card>
                </Col>
            </Row>
        </div>
    );
}
