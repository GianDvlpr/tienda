'use client';
import { toast } from 'sonner';

import React, { useState } from 'react';
import { Table, Button, Space, Typography, Tag, Modal, Form, Input, Switch, Popconfirm, Select, Row, Col, theme } from 'antd';
import { PlusOutlined, EditOutlined, DeleteOutlined } from '@ant-design/icons';
import useSWR from 'swr';
import { fetcher } from '@/lib/fetcher';

const { Title, Text } = Typography;
const { TextArea } = Input;

export default function AdminCollectionsPage() {
    const { token } = theme.useToken();
    const { data: collections, error, mutate, isLoading } = useSWR<any[]>('/api/admin/collections', fetcher);
    
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingCollection, setEditingCollection] = useState<any>(null);
    const [form] = Form.useForm();
    const [isSaving, setIsSaving] = useState(false);
    const [search, setSearch] = useState('');
    const [statusFilter, setStatusFilter] = useState<boolean | undefined>();

    const filteredCollections = React.useMemo(() => {
        const normalizedSearch = search.trim().toLowerCase();

        return (collections || []).filter((collection) => {
            const matchesSearch = !normalizedSearch
                || String(collection.name || '').toLowerCase().includes(normalizedSearch)
                || String(collection.slug || '').toLowerCase().includes(normalizedSearch);

            if (!matchesSearch) return false;
            if (statusFilter !== undefined && Boolean(collection.is_active) !== statusFilter) return false;

            return true;
        });
    }, [collections, search, statusFilter]);

    const hasActiveFilters = Boolean(search || statusFilter !== undefined);

    const clearFilters = () => {
        setSearch('');
        setStatusFilter(undefined);
    };

    const openCreateModal = () => {
        setEditingCollection(null);
        form.resetFields();
        form.setFieldsValue({ is_active: true });
        setIsModalOpen(true);
    };

    const openEditModal = (record: any) => {
        setEditingCollection(record);
        form.resetFields();
        form.setFieldsValue({
            name: record.name,
            slug: record.slug,
            description: record.description,
            is_active: record.is_active,
        });
        setIsModalOpen(true);
    };

    const handleDelete = async (collection_id: string) => {
        try {
            const res = await fetch(`/api/admin/collections/${collection_id}`, { method: 'DELETE' });
            if (!res.ok) {
                const err = await res.json();
                throw new Error(err.error || 'Error eliminando colección');
            }
            toast.success('Colección eliminada');
            mutate();
        } catch (e: any) {
            toast.error(e.message);
        }
    };

    const onFinish = async (values: any) => {
        setIsSaving(true);
        try {
            const isUpdate = !!editingCollection;
            const url = isUpdate ? `/api/admin/collections/${editingCollection.collection_id}` : '/api/admin/collections';
            const method = isUpdate ? 'PUT' : 'POST';

            const res = await fetch(url, {
                method,
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(values),
            });

            if (!res.ok) {
                const data = await res.json();
                throw new Error(data.error || 'Error guardando colección');
            }

            toast.success(`Colección ${isUpdate ? 'actualizada' : 'creada'} correctamente`);
            setIsModalOpen(false);
            mutate();
        } catch (e: any) {
            toast.error(e.message);
        } finally {
            setIsSaving(false);
        }
    };

    const handleNameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (!editingCollection) { // Auto-generate slug only when creating
            const val = e.target.value;
            const slug = val.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)+/g, '');
            form.setFieldsValue({ slug });
        }
    };

    const columns = [
        {
            title: 'Nombre',
            dataIndex: 'name',
            key: 'name',
            render: (text: string) => <strong>{text}</strong>
        },
        {
            title: 'URL (Slug)',
            dataIndex: 'slug',
            key: 'slug',
            render: (text: string) => <Text type="secondary">/shop?collection={text}</Text>
        },
        {
            title: 'Estado',
            key: 'is_active',
            render: (_: any, record: any) => (
                <Tag color={record.is_active ? 'green' : 'red'}>
                    {record.is_active ? 'Activa' : 'Oculta'}
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
                        title="¿Eliminar colección?"
                        description="Esto fallará si hay productos usándola."
                        onConfirm={() => handleDelete(record.collection_id)}
                        okText="Sí, eliminar"
                        cancelText="Cancelar"
                    >
                        <Button type="text" danger icon={<DeleteOutlined />} />
                    </Popconfirm>
                </Space>
            ),
        },
    ];

    if (error) return <div>Error cargando colecciones: {error.message}</div>;

    return (
        <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
                <Title level={3} style={{ margin: 0 }}>Colecciones</Title>
                <Button type="primary" icon={<PlusOutlined />} onClick={openCreateModal}>
                    Nueva Colección
                </Button>
            </div>

            <div style={{ marginBottom: 16, padding: 16, border: `1px solid ${token.colorBorderSecondary}`, borderRadius: 12, background: token.colorFillAlter }}>
                <Row gutter={[12, 12]} align="bottom">
                    <Col xs={24} md={12}>
                        <Text type="secondary" style={{ display: 'block', marginBottom: 6 }}>Buscar</Text>
                        <Input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Nombre o slug" allowClear />
                    </Col>
                    <Col xs={24} md={6}>
                        <Text type="secondary" style={{ display: 'block', marginBottom: 6 }}>Estado</Text>
                        <Select allowClear value={statusFilter} onChange={setStatusFilter} placeholder="Todas" style={{ width: '100%' }} options={[{ value: true, label: 'Activa' }, { value: false, label: 'Oculta' }]} />
                    </Col>
                    <Col xs={24} md={6}>
                        <Button onClick={clearFilters} disabled={!hasActiveFilters} block>Limpiar</Button>
                    </Col>
                </Row>
                <Text type="secondary" style={{ display: 'block', marginTop: 10 }}>
                    Mostrando {filteredCollections.length} de {collections?.length || 0} colecciones
                </Text>
            </div>

            <Table 
                columns={columns} 
                dataSource={filteredCollections} 
                loading={isLoading} 
                rowKey="collection_id" 
                pagination={{ pageSize: 15 }}
            />

            <Modal
                title={editingCollection ? 'Editar Colección' : 'Nueva Colección'}
                open={isModalOpen}
                onCancel={() => setIsModalOpen(false)}
                footer={null}
                destroyOnHidden
                forceRender
            >
                <Form layout="vertical" form={form} onFinish={onFinish} style={{ marginTop: 24 }}>
                    
                    <Form.Item 
                        name="name" 
                        label="Nombre de la Colección" 
                        rules={[{ required: true, message: 'Requerido' }]}
                    >
                        <Input placeholder="Ej. Fiesta de Noche" onChange={handleNameChange} />
                    </Form.Item>

                    <Form.Item 
                        name="slug" 
                        label="URL (Slug)" 
                        help="Debe ser único. Ej: fiesta-de-noche"
                        rules={[{ required: true, message: 'Requerido' }]}
                    >
                        <Input placeholder="fiesta-de-noche" />
                    </Form.Item>

                    <Form.Item name="description" label="Descripción (Opcional)">
                        <TextArea rows={3} placeholder="Detalles de la colección..." />
                    </Form.Item>

                    <Form.Item name="is_active" label="Estado" valuePropName="checked">
                        <Switch checkedChildren="Visible" unCheckedChildren="Oculta" />
                    </Form.Item>

                    <Form.Item style={{ marginBottom: 0, textAlign: 'right' }}>
                        <Space>
                            <Button onClick={() => setIsModalOpen(false)}>Cancelar</Button>
                            <Button type="primary" htmlType="submit" loading={isSaving}>
                                Guardar
                            </Button>
                        </Space>
                    </Form.Item>
                </Form>
            </Modal>
        </div>
    );
}
