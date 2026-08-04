'use client';

import React, { useState } from 'react';
import { 
    Table, 
    Button, 
    Card, 
    Typography, 
    Space, 
    Tag, 
    Modal, 
    Form, 
    Input, 
    InputNumber, 
    Select, 
    DatePicker, 
    Switch,
    App,
    Popconfirm,
    Row,
    Col,
    theme
} from 'antd';
import { PlusOutlined, TagOutlined, ReloadOutlined, EditOutlined, DeleteOutlined } from '@ant-design/icons';
import useSWR from 'swr';
import { fetcher } from '@/lib/fetcher';
import dayjs from 'dayjs';
import type { Dayjs } from 'dayjs';

const { Title, Text } = Typography;
const { Option } = Select;
const { RangePicker } = DatePicker;

export default function CouponsPage() {
    const { token } = theme.useToken();
    const { data, mutate, isLoading, isValidating } = useSWR<any[]>('/api/admin/coupons', fetcher, {
        refreshInterval: 30000,
        revalidateOnFocus: true
    });
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingCoupon, setEditingCoupon] = useState<any>(null);
    const [isSaving, setIsSaving] = useState(false);
    const [togglingId, setTogglingId] = useState<string | null>(null);
    const [search, setSearch] = useState('');
    const [discountTypeFilter, setDiscountTypeFilter] = useState<string>();
    const [statusFilter, setStatusFilter] = useState<boolean | undefined>();
    const [expirationFilter, setExpirationFilter] = useState<string>();
    const [expirationRange, setExpirationRange] = useState<[Dayjs | null, Dayjs | null] | null>(null);
    
    const { message } = App.useApp();
    const [form] = Form.useForm();

    const filteredCoupons = React.useMemo(() => {
        const normalizedSearch = search.trim().toLowerCase();
        const [startDate, endDate] = expirationRange || [];

        return (data || []).filter((coupon) => {
            const expiresAt = coupon.expires_at ? dayjs(coupon.expires_at) : null;
            const isExpired = Boolean(expiresAt && dayjs().isAfter(expiresAt.endOf('day')));
            const matchesSearch = !normalizedSearch || String(coupon.code || '').toLowerCase().includes(normalizedSearch);

            if (!matchesSearch) return false;
            if (discountTypeFilter && coupon.discount_type !== discountTypeFilter) return false;
            if (statusFilter !== undefined && Boolean(coupon.is_active) !== statusFilter) return false;
            if (expirationFilter === 'EXPIRED' && !isExpired) return false;
            if (expirationFilter === 'VALID' && isExpired) return false;
            if (expirationFilter === 'NO_EXPIRATION' && expiresAt) return false;
            if (startDate && (!expiresAt || expiresAt.isBefore(startDate.startOf('day')))) return false;
            if (endDate && (!expiresAt || expiresAt.isAfter(endDate.endOf('day')))) return false;

            return true;
        });
    }, [data, search, discountTypeFilter, statusFilter, expirationFilter, expirationRange]);

    const hasActiveFilters = Boolean(search || discountTypeFilter || statusFilter !== undefined || expirationFilter || expirationRange);

    const clearFilters = () => {
        setSearch('');
        setDiscountTypeFilter(undefined);
        setStatusFilter(undefined);
        setExpirationFilter(undefined);
        setExpirationRange(null);
    };

    const openCreateModal = () => {
        setEditingCoupon(null);
        form.resetFields();
        setIsModalOpen(true);
    };

    const openEditModal = (record: any) => {
        setEditingCoupon(record);
        form.setFieldsValue({
            code: record.code,
            discount_type: record.discount_type,
            discount_value: Number(record.discount_value),
            min_purchase: record.min_purchase ? Number(record.min_purchase) : null,
            usage_limit: record.usage_limit,
            expires_at: record.expires_at ? dayjs(record.expires_at) : null,
            is_active: record.is_active
        });
        setIsModalOpen(true);
    };

    const handleToggleActive = async (id: string, currentStatus: boolean) => {
        setTogglingId(id);
        try {
            const res = await fetch(`/api/admin/coupons/${id}`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ is_active: !currentStatus })
            });
            if (!res.ok) throw new Error('Error al cambiar estado');
            mutate();
            message.success('Estado actualizado');
        } catch (e: any) {
            message.error(e.message);
        } finally {
            setTogglingId(null);
        }
    };

    const handleDelete = async (id: string) => {
        try {
            const res = await fetch(`/api/admin/coupons/${id}`, { method: 'DELETE' });
            if (!res.ok) throw new Error('Error al eliminar');
            mutate();
            message.success('Cupón eliminado');
        } catch (e: any) {
            message.error(e.message);
        }
    };

    const onFinish = async (values: any) => {
        setIsSaving(true);
        const isEdit = !!editingCoupon;
        
        try {
            const payload = {
                ...values,
                expires_at: values.expires_at ? values.expires_at.toISOString() : null
            };

            const url = isEdit ? `/api/admin/coupons/${editingCoupon.coupon_id}` : '/api/admin/coupons';
            const method = isEdit ? 'PUT' : 'POST';

            const res = await fetch(url, {
                method,
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload),
            });

            if (!res.ok) {
                const err = await res.json();
                throw new Error(err.error || 'Error al guardar cupón');
            }

            message.success(isEdit ? 'Cupón actualizado' : 'Cupón creado');
            setIsModalOpen(false);
            form.resetFields();
            mutate();
        } catch (error: any) {
            message.error(error.message);
        } finally {
            setIsSaving(false);
        }
    };

    const columns = [
        {
            title: 'Código',
            dataIndex: 'code',
            key: 'code',
            render: (text: string) => <Tag color="gold" icon={<TagOutlined />}>{text}</Tag>
        },
        {
            title: 'Descuento',
            key: 'discount',
            render: (_: any, record: any) => (
                <Text strong>
                    {record.discount_type === 'PERCENTAGE' ? `${record.discount_value}%` : `S/ ${record.discount_value}`}
                </Text>
            )
        },
        {
            title: 'Uso',
            key: 'usage',
            render: (_: any, record: any) => (
                <Text type="secondary">
                    {record.usage_count} / {record.usage_limit || '∞'}
                </Text>
            )
        },
        {
            title: 'Expiración',
            dataIndex: 'expires_at',
            key: 'expires_at',
            render: (date: any) => {
                if (!date) return 'Nunca';
                const expired = dayjs().isAfter(dayjs(date));
                return <Text delete={expired} type={expired ? 'danger' : undefined}>{dayjs(date).format('DD/MM/YYYY')}</Text>;
            }
        },
        {
            title: 'Estado',
            dataIndex: 'is_active',
            key: 'is_active',
            render: (active: boolean, record: any) => (
                <Switch 
                    checked={active} 
                    loading={togglingId === record.coupon_id}
                    onChange={() => handleToggleActive(record.coupon_id, active)} 
                    size="small"
                />
            )
        },
        {
            title: 'Acciones',
            key: 'actions',
            render: (_: any, record: any) => (
                <Space size="small">
                    <Button type="text" icon={<EditOutlined />} onClick={() => openEditModal(record)} />
                    <Popconfirm 
                        title="¿Borrar cupón?" 
                        onConfirm={() => handleDelete(record.coupon_id)}
                        okText="Sí"
                        cancelText="No"
                    >
                        <Button type="text" danger icon={<DeleteOutlined />} />
                    </Popconfirm>
                </Space>
            )
        }
    ];

    return (
        <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
                <Title level={2} style={{ margin: 0 }}>Gestión de Cupones</Title>
                <Space>
                    <Button 
                        icon={<ReloadOutlined spin={isValidating} />} 
                        onClick={() => mutate()}
                    >
                        Actualizar
                    </Button>
                    <Button type="primary" icon={<PlusOutlined />} onClick={openCreateModal}>
                        Crear Cupón
                    </Button>
                </Space>
            </div>

            <Card variant="borderless">
                <div style={{ marginBottom: 16, padding: 16, border: `1px solid ${token.colorBorderSecondary}`, borderRadius: 12, background: token.colorFillAlter }}>
                    <Row gutter={[12, 12]} align="bottom">
                        <Col xs={24} md={6}>
                            <Text type="secondary" style={{ display: 'block', marginBottom: 6 }}>Buscar</Text>
                            <Input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Código" allowClear />
                        </Col>
                        <Col xs={24} md={4}>
                            <Text type="secondary" style={{ display: 'block', marginBottom: 6 }}>Tipo</Text>
                            <Select
                                allowClear
                                value={discountTypeFilter}
                                onChange={setDiscountTypeFilter}
                                placeholder="Todos"
                                style={{ width: '100%' }}
                                options={[{ value: 'PERCENTAGE', label: 'Porcentaje' }, { value: 'FIXED', label: 'Monto fijo' }]}
                            />
                        </Col>
                        <Col xs={24} md={4}>
                            <Text type="secondary" style={{ display: 'block', marginBottom: 6 }}>Estado</Text>
                            <Select
                                allowClear
                                value={statusFilter}
                                onChange={setStatusFilter}
                                placeholder="Todos"
                                style={{ width: '100%' }}
                                options={[{ value: true, label: 'Activo' }, { value: false, label: 'Inactivo' }]}
                            />
                        </Col>
                        <Col xs={24} md={4}>
                            <Text type="secondary" style={{ display: 'block', marginBottom: 6 }}>Expiración</Text>
                            <Select
                                allowClear
                                value={expirationFilter}
                                onChange={setExpirationFilter}
                                placeholder="Todas"
                                style={{ width: '100%' }}
                                options={[{ value: 'VALID', label: 'Vigentes' }, { value: 'EXPIRED', label: 'Expirados' }, { value: 'NO_EXPIRATION', label: 'Sin expiración' }]}
                            />
                        </Col>
                        <Col xs={24} md={4}>
                            <Text type="secondary" style={{ display: 'block', marginBottom: 6 }}>Rango fecha</Text>
                            <RangePicker
                                value={expirationRange}
                                onChange={(dates) => setExpirationRange(dates ? [dates[0], dates[1]] : null)}
                                format="DD/MM/YYYY"
                                style={{ width: '100%' }}
                                placeholder={['Desde', 'Hasta']}
                            />
                        </Col>
                        <Col xs={24} md={2}>
                            <Button onClick={clearFilters} disabled={!hasActiveFilters} block>Limpiar</Button>
                        </Col>
                    </Row>
                    <Text type="secondary" style={{ display: 'block', marginTop: 10 }}>
                        Mostrando {filteredCoupons.length} de {data?.length || 0} cupones
                    </Text>
                </div>
                <Table 
                    columns={columns} 
                    dataSource={filteredCoupons} 
                    loading={isLoading} 
                    rowKey="coupon_id"
                    pagination={{ pageSize: 12 }}
                />
            </Card>

            <Modal
                title={editingCoupon ? 'Editar Cupón' : 'Nuevo Cupón de Descuento'}
                open={isModalOpen}
                onCancel={() => setIsModalOpen(false)}
                footer={null}
                width={500}
                destroyOnClose
            >
                <Form
                    form={form}
                    layout="vertical"
                    onFinish={onFinish}
                    initialValues={{ discount_type: 'PERCENTAGE', is_active: true }}
                    style={{ marginTop: 24 }}
                >
                    <Form.Item name="code" label="Código del Cupón" rules={[{ required: true, message: 'Ej. VERANO2026' }]}>
                        <Input placeholder="VERANO10" style={{ textTransform: 'uppercase' }} />
                    </Form.Item>
                    
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
                        <Form.Item name="discount_type" label="Tipo">
                            <Select>
                                <Option value="PERCENTAGE">Porcentaje (%)</Option>
                                <Option value="FIXED">Monto Fijo (S/)</Option>
                            </Select>
                        </Form.Item>
                        <Form.Item name="discount_value" label="Valor" rules={[{ required: true }]}>
                            <InputNumber style={{ width: '100%' }} min={0} precision={2} />
                        </Form.Item>
                        <Form.Item name="min_purchase" label="Compra Mínima (S/)">
                            <InputNumber style={{ width: '100%' }} min={0} precision={2} placeholder="S/ 0.00" />
                        </Form.Item>
                        <Form.Item name="usage_limit" label="Límite de Usos">
                            <InputNumber style={{ width: '100%' }} min={1} placeholder="Ilimitado si es vacío" />
                        </Form.Item>
                        <Form.Item name="expires_at" label="Fecha de Expiración">
                            <DatePicker style={{ width: '100%' }} format="DD/MM/YYYY" placeholder="Opcional" />
                        </Form.Item>
                        <Form.Item name="is_active" label="Estado Inicial" valuePropName="checked">
                            <Switch checkedChildren="Activo" unCheckedChildren="Inactivo" />
                        </Form.Item>
                    </div>

                    <div style={{ textAlign: 'right', marginTop: 24 }}>
                        <Space>
                            <Button onClick={() => setIsModalOpen(false)}>Cancelar</Button>
                            <Button type="primary" htmlType="submit" loading={isSaving}>
                                {editingCoupon ? 'Guardar Cambios' : 'Crear Cupón'}
                            </Button>
                        </Space>
                    </div>
                </Form>
            </Modal>
        </div>
    );
}
