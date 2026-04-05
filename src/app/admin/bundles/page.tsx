'use client';
import { toast } from 'sonner';

import React, { useState } from 'react';
import { Table, Button, Space, Typography, Tag, Modal, Form, Input, InputNumber, Switch, Select, Popconfirm, Card, Flex } from 'antd';
import { PlusOutlined, EditOutlined, DeleteOutlined, GiftOutlined, ReloadOutlined } from '@ant-design/icons';
import useSWR from 'swr';
import { fetcher } from '@/lib/fetcher';

const { Title, Text } = Typography;
const { TextArea } = Input;
const { Option } = Select;

export default function AdminBundlesPage() {
    const { data: bundles, error, mutate, isLoading, isValidating } = useSWR<any[]>('/api/admin/bundles', fetcher, {
        refreshInterval: 30000,
        revalidateOnFocus: true
    });
    const { data: products } = useSWR<any[]>('/api/admin/products', fetcher);
    
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingBundle, setEditingBundle] = useState<any>(null);
    const [form] = Form.useForm();
    const [isSaving, setIsSaving] = useState(false);

    const openCreateModal = () => {
        setEditingBundle(null);
        form.resetFields();
        form.setFieldsValue({ is_active: true, discount_amount: 0, product_ids: [] });
        setIsModalOpen(true);
    };

    const openEditModal = (record: any) => {
        setEditingBundle(record);
        form.resetFields();
        form.setFieldsValue({
            name: record.name,
            description: record.description,
            discount_amount: Number(record.discount_amount),
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
            title: 'Ahorro / Descuento (S/)',
            dataIndex: 'discount_amount',
            key: 'discount_amount',
            render: (amount: number) => <Text type="success" strong>- S/ {Number(amount).toFixed(2)}</Text>
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
                <Table 
                    columns={columns} 
                    dataSource={bundles} 
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
                width={600}
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

                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
                        <Form.Item 
                            name="discount_amount" 
                            label="Descuento Total (S/)" 
                            extra="Monto que se restará del total cuando los productos estén juntos."
                            rules={[{ required: true, message: 'Requerido' }]}
                        >
                            <InputNumber style={{ width: '100%' }} min={0.01} step={0.01} precision={2} prefix="S/" />
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
