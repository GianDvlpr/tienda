'use client';
import { toast } from 'sonner';

import React, { useState } from 'react';
import { Table, Button, Space, Typography, Tag, Modal, Form, Input, InputNumber, Switch, Select, Popconfirm, Card, Row, Col, theme } from 'antd';
import { PlusOutlined, EditOutlined, DeleteOutlined, GiftOutlined, ReloadOutlined } from '@ant-design/icons';
import useSWR from 'swr';
import { fetcher } from '@/lib/fetcher';

const { Title, Text } = Typography;
const { TextArea } = Input;
const { Option } = Select;

export default function AdminBundlesPage() {
    const { token } = theme.useToken();
    const { data: bundles, error, mutate, isLoading, isValidating } = useSWR<any[]>('/api/admin/bundles', fetcher, {
        refreshInterval: 30000,
        revalidateOnFocus: true
    });
    const { data: products } = useSWR<any[]>('/api/admin/products', fetcher);
    
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingBundle, setEditingBundle] = useState<any>(null);
    const [form] = Form.useForm();
    const [isSaving, setIsSaving] = useState(false);
    const [search, setSearch] = useState('');
    const [productFilter, setProductFilter] = useState<string>();
    const [promotionFilter, setPromotionFilter] = useState<string>();
    const [statusFilter, setStatusFilter] = useState<boolean | undefined>();

    const filteredBundles = React.useMemo(() => {
        const normalizedSearch = search.trim().toLowerCase();

        return (bundles || []).filter((bundle) => {
            const items = bundle.items || [];
            const hasBundlePrice = Number(bundle.bundle_price || 0) > 0;
            const hasDiscount = Number(bundle.discount_amount || 0) > 0;
            const hasTier = Number(bundle.tier_2_price || 0) > 0 || Number(bundle.tier_3_price || 0) > 0;
            const matchesSearch = !normalizedSearch
                || String(bundle.name || '').toLowerCase().includes(normalizedSearch)
                || String(bundle.description || '').toLowerCase().includes(normalizedSearch);

            if (!matchesSearch) return false;
            if (productFilter && !items.some((item: any) => item.product_id === productFilter)) return false;
            if (promotionFilter === 'BUNDLE_PRICE' && !hasBundlePrice) return false;
            if (promotionFilter === 'DISCOUNT' && !hasDiscount) return false;
            if (promotionFilter === 'TIER' && !hasTier) return false;
            if (statusFilter !== undefined && Boolean(bundle.is_active) !== statusFilter) return false;

            return true;
        });
    }, [bundles, search, productFilter, promotionFilter, statusFilter]);

    const hasActiveFilters = Boolean(search || productFilter || promotionFilter || statusFilter !== undefined);

    const clearFilters = () => {
        setSearch('');
        setProductFilter(undefined);
        setPromotionFilter(undefined);
        setStatusFilter(undefined);
    };

    const openCreateModal = () => {
        setEditingBundle(null);
        form.resetFields();
        form.setFieldsValue({ is_active: true, discount_amount: 0, bundle_price: null, tier_2_price: null, tier_3_price: null, customization_surcharge: 8, product_ids: [] });
        setIsModalOpen(true);
    };

    const openEditModal = (record: any) => {
        setEditingBundle(record);
        form.resetFields();
        form.setFieldsValue({
            name: record.name,
            description: record.description,
            discount_amount: Number(record.discount_amount),
            bundle_price: record.bundle_price ? Number(record.bundle_price) : null,
            tier_2_price: record.tier_2_price ? Number(record.tier_2_price) : null,
            tier_3_price: record.tier_3_price ? Number(record.tier_3_price) : null,
            customization_surcharge: record.customization_surcharge ? Number(record.customization_surcharge) : 8,
            is_active: record.is_active,
            product_ids: record.items?.map((i: any) => i.product_id) || []
        });
        setIsModalOpen(true);
    };

    const handleDelete = async (bundle_id: string) => {
        try {
            const res = await fetch(`/api/admin/bundles/${bundle_id}`, { method: 'DELETE' });
            if (!res.ok) throw new Error('Error eliminando promoción');
            toast.success('Promoción eliminada');
            mutate();
        } catch (e: any) {
            toast.error(e.message);
        }
    };

    const onFinish = async (values: any) => {
        setIsSaving(true);
        try {
            values.discount_amount = Number(values.discount_amount || 0);
            const hasDiscount = Number(values.discount_amount || 0) > 0;
            const hasBundlePrice = Number(values.bundle_price || 0) > 0;
            const hasTier2 = Number(values.tier_2_price || 0) > 0;
            const hasTier3 = Number(values.tier_3_price || 0) > 0;

            if (!hasDiscount && !hasBundlePrice && !hasTier2 && !hasTier3) {
                throw new Error('Define al menos un precio especial');
            }

            const isUpdate = !!editingBundle;
            const url = isUpdate ? `/api/admin/bundles/${editingBundle.bundle_id}` : '/api/admin/bundles';
            const method = isUpdate ? 'PUT' : 'POST';

            const res = await fetch(url, {
                method,
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(values),
            });

            if (!res.ok) {
                const data = await res.json();
                throw new Error(data.error || 'Error guardando promoción');
            }

            toast.success(`Promoción ${isUpdate ? 'actualizada' : 'creada'} correctamente`);
            setIsModalOpen(false);
            mutate();
        } catch (e: any) {
            toast.error(e.message);
        } finally {
            setIsSaving(false);
        }
    };

    const columns = [
        {
            title: 'Nombre de la Oferta',
            dataIndex: 'name',
            key: 'name',
            render: (text: string) => <strong>{text}</strong>
        },
        {
            title: 'Productos del Conjunto',
            dataIndex: 'items',
            key: 'items',
            render: (items: any[]) => (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                    {items?.map(i => (
                        <Tag key={i.product_id} color="cyan">{i.product?.name}</Tag>
                    ))}
                </div>
            )
        },
        {
            title: 'Promociones',
            dataIndex: 'discount_amount',
            key: 'promotions',
            render: (_: number, record: any) => (
                <Space direction="vertical" size={2}>
                    {Number(record.bundle_price || 0) > 0 && (
                        <Text type="success" strong>Conjunto: S/ {Number(record.bundle_price).toFixed(2)}</Text>
                    )}
                    {!Number(record.bundle_price || 0) && Number(record.discount_amount || 0) > 0 && (
                        <Text type="success" strong>Conjunto: - S/ {Number(record.discount_amount).toFixed(2)}</Text>
                    )}
                    {Number(record.tier_2_price || 0) > 0 && (
                        <Text type="success">2 conjuntos por S/ {Number(record.tier_2_price).toFixed(2)}</Text>
                    )}
                    {Number(record.tier_3_price || 0) > 0 && (
                        <Text type="success">3 conjuntos por S/ {Number(record.tier_3_price).toFixed(2)}</Text>
                    )}
                    <Text type="secondary">Personalizado: + S/ {Number(record.customization_surcharge ??20).toFixed(2)}</Text>
                </Space>
            )
        },
        {
            title: 'Estado',
            key: 'is_active',
            render: (_: any, record: any) => (
                <Tag color={record.is_active ? 'green' : 'red'}>
                    {record.is_active ? 'Activa' : 'Inactiva'}
                </Tag>
            ),
        },
        {
            title: 'Acciones',
            key: 'actions',
            render: (_: any, record: any) => (
                <Space size="middle">
                    <Button type="text" icon={<EditOutlined />} onClick={() => openEditModal(record)} />
                    <Popconfirm
                        title="¿Eliminar esta promoción?"
                        onConfirm={() => handleDelete(record.bundle_id)}
                        okText="Sí, eliminar"
                        cancelText="Cancelar"
                    >
                        <Button type="text" danger icon={<DeleteOutlined />} />
                    </Popconfirm>
                </Space>
            ),
        },
    ];

    if (error) return <div>Error cargando promociones: {error.message}</div>;

    return (
        <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                    <PlusOutlined style={{ fontSize: 24, color: '#1890ff' }} />
                    <Title level={3} style={{ margin: 0 }}>Gestión de Conjuntos / Bundles</Title>
                </div>
                <Space>
                    <Button 
                        icon={<ReloadOutlined spin={isValidating} />} 
                        onClick={() => mutate()}
                    >
                        Actualizar
                    </Button>
                    <Button type="primary" icon={<GiftOutlined />} onClick={openCreateModal}>
                        Nueva Promoción de Conjunto
                    </Button>
                </Space>
            </div>

            <Card variant="borderless">
                <div style={{ marginBottom: 16, padding: 16, border: `1px solid ${token.colorBorderSecondary}`, borderRadius: 12, background: token.colorFillAlter }}>
                    <Row gutter={[12, 12]} align="bottom">
                        <Col xs={24} md={7}>
                            <Text type="secondary" style={{ display: 'block', marginBottom: 6 }}>Buscar</Text>
                            <Input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Nombre o descripción" allowClear />
                        </Col>
                        <Col xs={24} md={6}>
                            <Text type="secondary" style={{ display: 'block', marginBottom: 6 }}>Producto</Text>
                            <Select allowClear showSearch optionFilterProp="label" value={productFilter} onChange={setProductFilter} placeholder="Todos" style={{ width: '100%' }} options={(products || []).map((product) => ({ value: product.product_id, label: product.name }))} />
                        </Col>
                        <Col xs={24} md={4}>
                            <Text type="secondary" style={{ display: 'block', marginBottom: 6 }}>Promoción</Text>
                            <Select allowClear value={promotionFilter} onChange={setPromotionFilter} placeholder="Todas" style={{ width: '100%' }} options={[{ value: 'BUNDLE_PRICE', label: 'Precio conjunto' }, { value: 'DISCOUNT', label: 'Descuento' }, { value: 'TIER', label: '2/3 conjuntos' }]} />
                        </Col>
                        <Col xs={24} md={4}>
                            <Text type="secondary" style={{ display: 'block', marginBottom: 6 }}>Estado</Text>
                            <Select allowClear value={statusFilter} onChange={setStatusFilter} placeholder="Todos" style={{ width: '100%' }} options={[{ value: true, label: 'Activa' }, { value: false, label: 'Inactiva' }]} />
                        </Col>
                        <Col xs={24} md={3}>
                            <Button onClick={clearFilters} disabled={!hasActiveFilters} block>Limpiar</Button>
                        </Col>
                    </Row>
                    <Text type="secondary" style={{ display: 'block', marginTop: 10 }}>
                        Mostrando {filteredBundles.length} de {bundles?.length || 0} promociones
                    </Text>
                </div>
                <Table 
                    columns={columns} 
                    dataSource={filteredBundles} 
                    loading={isLoading} 
                    rowKey="bundle_id" 
                    pagination={{ pageSize: 15 }}
                />
            </Card>

            <Modal
                title={editingBundle ? 'Editar Promoción' : 'Nueva Promoción de Conjunto'}
                open={isModalOpen}
                onCancel={() => setIsModalOpen(false)}
                footer={null}
                width={720}
            >
                <Form layout="vertical" form={form} onFinish={onFinish} style={{ marginTop: 24 }}>
                    <Form.Item 
                        name="name" 
                        label="Nombre (Ej: Conjunto Camille)" 
                        rules={[{ required: true, message: 'Requerido' }]}
                    >
                        <Input placeholder="Nombre comercial de la oferta" />
                    </Form.Item>

                    <Form.Item name="description" label="Descripción (Opcional)">
                        <TextArea rows={2} placeholder="Explica la oferta al cliente..." />
                    </Form.Item>

                    <Form.Item 
                        name="product_ids" 
                        label="Productos del Conjunto (Mínimo 2)" 
                        rules={[{ required: true, message: 'Selecciona al menos 2 productos' }, { type: 'array', min: 2, message: 'Mínimo 2 productos' }]}
                    >
                        <Select mode="multiple" placeholder="Selecciona los productos" style={{ width: '100%' }} filterOption={(input, option) =>
                            (option?.children as any).toLowerCase().indexOf(input.toLowerCase()) >= 0
                        }>
                            {products?.map((p: any) => (
                                <Option key={p.product_id} value={p.product_id}>{p.name}</Option>
                            ))}
                        </Select>
                    </Form.Item>

                    <Form.Item name="discount_amount" hidden>
                        <InputNumber />
                    </Form.Item>

                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 16 }}>
                        <Form.Item 
                            name="bundle_price" 
                            label="Precio conjunto (S/)" 
                            extra="Opcional. Si lleva todos los productos del conjunto, paga este total."
                        >
                            <InputNumber style={{ width: '100%' }} min={0} step={0.01} precision={2} prefix="S/" />
                        </Form.Item>

                        <Form.Item
                            name="tier_2_price"
                            label="Precio 2 conjuntos (S/)"
                            extra="Opcional. Si lleva 2 conjuntos completos, paga este total. Aplica sin importar color o talla."
                        >
                            <InputNumber style={{ width: '100%' }} min={0} step={0.01} precision={2} prefix="S/" />
                        </Form.Item>

                        <Form.Item
                            name="tier_3_price"
                            label="Precio 3 conjuntos (S/)"
                            extra="Opcional. Si lleva 3 conjuntos completos, paga este total. Aplica sin importar color o talla."
                        >
                            <InputNumber style={{ width: '100%' }} min={0} step={0.01} precision={2} prefix="S/" />
                        </Form.Item>

                        <Form.Item
                            name="customization_surcharge"
                            label="Recargo conjunto personalizado (S/)"
                            extra="Por defecto S/ 8.00 si el conjunto completo se personaliza."
                        >
                            <InputNumber style={{ width: '100%' }} min={0} step={0.01} precision={2} prefix="S/" />
                        </Form.Item>

                        <Form.Item name="is_active" label="Estado" valuePropName="checked">
                            <Switch checkedChildren="Activo" unCheckedChildren="Inactivo" />
                        </Form.Item>
                    </div>

                    <Form.Item style={{ marginBottom: 0, textAlign: 'right', marginTop: 24 }}>
                        <Space>
                            <Button onClick={() => setIsModalOpen(false)}>Cancelar</Button>
                            <Button type="primary" htmlType="submit" loading={isSaving} size="large">
                                Guardar Promoción
                            </Button>
                        </Space>
                    </Form.Item>
                </Form>
            </Modal>
        </div>
    );
}
