'use client';
import { toast } from 'sonner';

import React from 'react';
import { Card, Table, Typography, Tag, Button, Space, Flex, DatePicker, InputNumber, Select, Row, Col, theme, Checkbox, Tooltip } from 'antd';
import { EyeOutlined, GlobalOutlined, ReloadOutlined, PlusOutlined } from '@ant-design/icons';
import useSWR from 'swr';
import Link from 'next/link';
import { fetcher } from '@/lib/fetcher';
import { formatPEN } from '@/lib/money';
import dayjs from 'dayjs';
import type { Dayjs } from 'dayjs';
import type { ColumnsType } from 'antd/es/table';

const { Title, Text } = Typography;
const { RangePicker } = DatePicker;

export const statusMap: Record<string, { label: string, color: string }> = {
    'PENDING_WS': { label: 'Pend. WhatsApp', color: 'orange' },
'PARTIALLY_PAID': { label: 'Pago parcial', color: 'volcano' },
    'SEPARATED': { label: 'Separado', color: 'lime' },
    'PAID': { label: 'Orden generada / Pagada', color: 'gold' },
    'MEASURES_CONFIRMED': { label: 'Medidas confirmadas', color: 'purple' },
    'CONFIRMED': { label: 'Confirmado', color: 'blue' },
    'IN_PRODUCTION': { label: 'En confección', color: 'magenta' },
    'READY': { label: 'Listo para envío', color: 'geekblue' },
    'SHIPPED': { label: 'Enviado', color: 'cyan' },
    'DELIVERED': { label: 'Entregado', color: 'green' },
    'CANCELLED': { label: 'Cancelado', color: 'red' },
};

const salesChannelOptions = [
    { value: 'SHOP', label: 'Shop' },
    { value: 'WHATSAPP', label: 'WhatsApp' },
    { value: 'TIKTOK', label: 'TikTok' },
    { value: 'INSTAGRAM', label: 'Instagram' },
    { value: 'FACEBOOK', label: 'Facebook' },
    { value: 'OTHER', label: 'Otro' },
];

const statusOptions = Object.entries(statusMap).map(([value, conf]) => ({
    value,
    label: conf.label,
}));

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
    const { token } = theme.useToken();
    const { data: orders, error, isLoading, mutate, isValidating } = useSWR<AdminOrder[]>('/api/admin/orders', fetcher, {
        refreshInterval: 30000, // Cada 30 segundos
        revalidateOnFocus: true
    });
    const [dateRange, setDateRange] = React.useState<[Dayjs | null, Dayjs | null] | null>(null);
    const [minTotal, setMinTotal] = React.useState<number | null>(null);
    const [maxTotal, setMaxTotal] = React.useState<number | null>(null);
    const [statusFilter, setStatusFilter] = React.useState<string>();
    const [channelFilter, setChannelFilter] = React.useState<string>();
    const [hideCancelled, setHideCancelled] = React.useState(true);

    const filteredOrders = React.useMemo(() => {
        const [startDate, endDate] = dateRange || [];

        return (orders || []).filter((order) => {
            const createdAt = dayjs(order.created_at);
            const total = Number(order.total || 0);

            if (startDate && createdAt.isBefore(startDate.startOf('day'))) return false;
            if (endDate && createdAt.isAfter(endDate.endOf('day'))) return false;
            if (minTotal !== null && total < minTotal) return false;
            if (maxTotal !== null && total > maxTotal) return false;
            if (statusFilter && order.status !== statusFilter) return false;
            if (channelFilter && (order.sales_channel || 'SHOP') !== channelFilter) return false;
            if (hideCancelled && order.status === 'CANCELLED') return false;

            return true;
        });
    }, [orders, dateRange, minTotal, maxTotal, statusFilter, channelFilter, hideCancelled]);

    const hasActiveFilters = Boolean(dateRange || minTotal !== null || maxTotal !== null || statusFilter || channelFilter || !hideCancelled);

    const clearFilters = () => {
        setDateRange(null);
        setMinTotal(null);
        setMaxTotal(null);
        setStatusFilter(undefined);
        setChannelFilter(undefined);
        setHideCancelled(true);
    };

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
                    <Tooltip title="Ver detalle">
                        <Link href={`/admin/orders/${record.order_id}`}>
                            <Button type="primary" size="small" icon={<EyeOutlined />} />
                        </Link>
                    </Tooltip>
                    <Tooltip title="Ver tracker">
                        <a href={`/track/${record.code}`} target="_blank" rel="noopener noreferrer">
                            <Button size="small" icon={<GlobalOutlined />} />
                        </a>
                    </Tooltip>
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
            <div style={{ marginBottom: 16, padding: 16, border: `1px solid ${token.colorBorderSecondary}`, borderRadius: 12, background: token.colorFillAlter }}>
                <Row gutter={[12, 12]} align="bottom">
                    <Col xs={24} md={12} lg={6}>
                        <Text type="secondary" style={{ display: 'block', marginBottom: 6 }}>Fecha</Text>
                        <RangePicker
                            value={dateRange}
                            onChange={(dates) => setDateRange(dates ? [dates[0], dates[1]] : null)}
                            format="DD/MM/YYYY"
                            style={{ width: '100%' }}
                            placeholder={['Desde', 'Hasta']}
                        />
                    </Col>
                    <Col xs={12} md={6} lg={3}>
                        <Text type="secondary" style={{ display: 'block', marginBottom: 6 }}>Total mínimo</Text>
                        <InputNumber
                            value={minTotal}
                            onChange={(value) => setMinTotal(value === null ? null : Number(value))}
                            min={0}
                            prefix="S/"
                            style={{ width: '100%' }}
                            placeholder="0"
                        />
                    </Col>
                    <Col xs={12} md={6} lg={3}>
                        <Text type="secondary" style={{ display: 'block', marginBottom: 6 }}>Total máximo</Text>
                        <InputNumber
                            value={maxTotal}
                            onChange={(value) => setMaxTotal(value === null ? null : Number(value))}
                            min={0}
                            prefix="S/"
                            style={{ width: '100%' }}
                            placeholder="999"
                        />
                    </Col>
                    <Col xs={24} md={12} lg={3}>
                        <Text type="secondary" style={{ display: 'block', marginBottom: 6 }}>Estado</Text>
                        <Select
                            allowClear
                            value={statusFilter}
                            onChange={setStatusFilter}
                            options={statusOptions}
                            placeholder="Todos"
                            style={{ width: '100%' }}
                        />
                    </Col>
                    <Col xs={24} md={12} lg={3}>
                        <Text type="secondary" style={{ display: 'block', marginBottom: 6 }}>Canal</Text>
                        <Select
                            allowClear
                            value={channelFilter}
                            onChange={setChannelFilter}
                            options={salesChannelOptions}
                            placeholder="Todos"
                            style={{ width: '100%' }}
                        />
                    </Col>
                    <Col xs={24} lg={3} style={{ display: 'flex', alignItems: 'flex-end' }}>
                        <Checkbox
                            checked={hideCancelled}
                            onChange={(e) => setHideCancelled(e.target.checked)}
                        >
                            Ocultar cancelados
                        </Checkbox>
                    </Col>
                    <Col xs={24} lg={2}>
                        <Button onClick={clearFilters} disabled={!hasActiveFilters} block>
                            Limpiar
                        </Button>
                    </Col>
                </Row>
                <Text type="secondary" style={{ display: 'block', marginTop: 10 }}>
                    Mostrando {filteredOrders.length} de {orders?.length || 0} pedidos
                </Text>
            </div>
            <Table
                columns={columns}
                dataSource={filteredOrders}
                rowKey="order_id"
                loading={isLoading}
                pagination={{ pageSize: 12 }}
                scroll={{ x: 955 }}
                tableLayout="fixed"
            />
        </Card>
    );
}
