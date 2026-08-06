'use client';
import { toast } from 'sonner';

import React from 'react';
import { Card, Table, Typography, Tag, Button, Space, Flex, DatePicker, Select, Row, Col, theme } from 'antd';
import { EyeOutlined, ReloadOutlined, PlusOutlined } from '@ant-design/icons';
import useSWR from 'swr';
import Link from 'next/link';
import { fetcher } from '@/lib/fetcher';
import { formatPEN } from '@/lib/money';
import dayjs from 'dayjs';
import type { Dayjs } from 'dayjs';
import type { ColumnsType } from 'antd/es/table';

const { Title, Text } = Typography;
const { RangePicker } = DatePicker;

export const proformaStatusMap: Record<string, { label: string, color: string }> = {
    'DRAFT': { label: 'Borrador', color: 'default' },
    'SENT': { label: 'Enviada', color: 'blue' },
    'ACCEPTED': { label: 'Aceptada', color: 'gold' },
    'CONVERTED': { label: 'Convertida a pedido', color: 'green' },
    'CANCELLED': { label: 'Cancelada', color: 'red' },
};

const salesChannelOptions = [
    { value: 'SHOP', label: 'Shop' },
    { value: 'WHATSAPP', label: 'WhatsApp' },
    { value: 'TIKTOK', label: 'TikTok' },
    { value: 'INSTAGRAM', label: 'Instagram' },
    { value: 'FACEBOOK', label: 'Facebook' },
    { value: 'OTHER', label: 'Otro' },
];

const statusOptions = Object.entries(proformaStatusMap).map(([value, conf]) => ({
    value,
    label: conf.label,
}));

type AdminProforma = {
    proforma_id: string;
    code: string;
    status: string;
    customer_name: string;
    customer_phone: string;
    sales_channel?: string | null;
    subtotal?: number | string | null;
    shipping_cost?: number | string | null;
    discount_total?: number | string | null;
    total: number | string;
    created_at: string;
    converted_to_order_id?: string | null;
    proforma_item?: { is_customized?: boolean | number; surcharge_type?: string | null }[];
};

function hasCustomizedItems(proforma: AdminProforma) {
    return (proforma.proforma_item || []).some((item) => item.is_customized === true || item.is_customized === 1);
}

export default function AdminProformasPage() {
    const { token } = theme.useToken();
    const { data: proformas, error, isLoading, mutate, isValidating } = useSWR<AdminProforma[]>('/api/admin/proformas', fetcher, {
        revalidateOnFocus: true
    });
    const [dateRange, setDateRange] = React.useState<[Dayjs | null, Dayjs | null] | null>(null);
    const [statusFilter, setStatusFilter] = React.useState<string>();
    const [channelFilter, setChannelFilter] = React.useState<string>();

    const filteredProformas = React.useMemo(() => {
        const [startDate, endDate] = dateRange || [];

        return (proformas || []).filter((proforma) => {
            const createdAt = dayjs(proforma.created_at);

            if (startDate && createdAt.isBefore(startDate.startOf('day'))) return false;
            if (endDate && createdAt.isAfter(endDate.endOf('day'))) return false;
            if (statusFilter && proforma.status !== statusFilter) return false;
            if (channelFilter && (proforma.sales_channel || 'SHOP') !== channelFilter) return false;

            return true;
        });
    }, [proformas, dateRange, statusFilter, channelFilter]);

    const hasActiveFilters = Boolean(dateRange || statusFilter || channelFilter);

    const clearFilters = () => {
        setDateRange(null);
        setStatusFilter(undefined);
        setChannelFilter(undefined);
    };

    const columns: ColumnsType<AdminProforma> = [
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
            dataIndex: 'customer_name',
            key: 'customer_name',
            width: 180,
            ellipsis: true,
        },
        {
            title: 'Celular',
            dataIndex: 'customer_phone',
            key: 'customer_phone',
            width: 125,
            ellipsis: true,
        },
        {
            title: 'Total',
            dataIndex: 'total',
            key: 'total',
            width: 130,
            render: (val: number | string) => (
                <Text strong>{formatPEN(Number(val))}</Text>
            ),
        },
        {
            title: 'Recargos',
            key: 'surcharges',
            width: 110,
            render: (_val, record) => {
                const types = Array.from(new Set(
                    (record.proforma_item || [])
                        .map((item) => item.surcharge_type)
                        .filter((type): type is string => Boolean(type))
                ));
                if (types.length === 0) return <Text type="secondary">—</Text>;
                return (
                    <Space size={4} wrap>
                        {types.map((type) => (
                            <Tag key={type} color={type === 'CONFECCION' ? 'magenta' : 'cyan'} style={{ marginInlineEnd: 0 }}>
                                {type === 'CONFECCION' ? 'Confección' : 'Delivery'}
                            </Tag>
                        ))}
                    </Space>
                );
            },
        },
        {
            title: 'Estado',
            dataIndex: 'status',
            key: 'status',
            width: 160,
            render: (status: string) => {
                const conf = proformaStatusMap[status] || { label: status, color: 'default' };
                return <Tag color={conf.color} style={{ marginInlineEnd: 0 }}>{conf.label}</Tag>;
            },
        },
        {
            title: 'Acciones',
            key: 'actions',
            width: 90,
            fixed: 'right',
            render: (_value, record) => (
                <Link href={`/admin/proformas/${record.proforma_id}`}>
                    <Button type="primary" size="small" icon={<EyeOutlined />}>
                        Ver
                    </Button>
                </Link>
            ),
        },
    ];

    if (error) {
        toast.error('Error al cargar proformas');
    }

    return (
        <Card
            variant="borderless"
            title={
                <Flex justify="space-between" align="center">
                    <Title level={4} style={{ margin: 0 }}>Gestión de Proformas</Title>
                    <Space>
                        <Link href="/admin/proformas/new">
                            <Button type="primary" icon={<PlusOutlined />}>
                                Nueva proforma
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
                    <Col xs={24} md={12} lg={10}>
                        <Text type="secondary" style={{ display: 'block', marginBottom: 6 }}>Fecha</Text>
                        <RangePicker
                            value={dateRange}
                            onChange={(dates) => setDateRange(dates ? [dates[0], dates[1]] : null)}
                            format="DD/MM/YYYY"
                            style={{ width: '100%' }}
                            placeholder={['Desde', 'Hasta']}
                        />
                    </Col>
                    <Col xs={12} md={6} lg={5}>
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
                    <Col xs={12} md={12} lg={5}>
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
                    <Col xs={24} lg={4}>
                        <Button onClick={clearFilters} disabled={!hasActiveFilters} block>
                            Limpiar
                        </Button>
                    </Col>
                </Row>
                <Text type="secondary" style={{ display: 'block', marginTop: 10 }}>
                    Mostrando {filteredProformas.length} de {proformas?.length || 0} proformas
                </Text>
            </div>
            <Table
                columns={columns}
                dataSource={filteredProformas}
                rowKey="proforma_id"
                loading={isLoading}
                pagination={{ pageSize: 12 }}
                scroll={{ x: 1035 }}
                tableLayout="fixed"
            />
        </Card>
    );
}