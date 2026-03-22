'use client';

import React, { useState } from 'react';
import { Table, Button, Space, Typography, Tag, Modal, Form, Input, Switch, message, Popconfirm } from 'antd';
import { PlusOutlined, EditOutlined, DeleteOutlined } from '@ant-design/icons';
import useSWR from 'swr';
import { fetcher } from '@/lib/fetcher';

const { Title } = Typography;

export default function AdminUsersPage() {
    const { data: users, error, mutate, isLoading } = useSWR<any[]>('/api/admin/users', fetcher);
    
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingUser, setEditingUser] = useState<any>(null);
    const [form] = Form.useForm();
    const [isSaving, setIsSaving] = useState(false);

    const openCreateModal = () => {
        setEditingUser(null);
        form.resetFields();
        form.setFieldsValue({ is_active: true });
        setIsModalOpen(true);
    };

    const openEditModal = (record: any) => {
        setEditingUser(record);
        form.resetFields();
        form.setFieldsValue({
            username: record.username,
            full_name: record.full_name,
            is_active: record.is_active,
            // never load password
        });
        setIsModalOpen(true);
    };

    const handleDelete = async (user_id: string) => {
        try {
            const res = await fetch(`/api/admin/users/${user_id}`, { method: 'DELETE' });
            if (!res.ok) throw new Error('Error eliminando usuario');
            message.success('Usuario eliminado');
            mutate();
        } catch (e: any) {
            message.error(e.message);
        }
    };

    const onFinish = async (values: any) => {
        setIsSaving(true);
        try {
            const isUpdate = !!editingUser;
            const url = isUpdate ? `/api/admin/users/${editingUser.user_id}` : '/api/admin/users';
            const method = isUpdate ? 'PUT' : 'POST';

            const res = await fetch(url, {
                method,
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(values),
            });

            if (!res.ok) {
                const data = await res.json();
                throw new Error(data.error || 'Error guardando usuario');
            }

            message.success(`Usuario ${isUpdate ? 'actualizado' : 'creado'} correctamente`);
            setIsModalOpen(false);
            mutate();
        } catch (e: any) {
            message.error(e.message);
        } finally {
            setIsSaving(false);
        }
    };

    const columns = [
        {
            title: 'Nombre Completo',
            dataIndex: 'full_name',
            key: 'full_name',
        },
        {
            title: 'Usuario',
            dataIndex: 'username',
            key: 'username',
        },
        {
            title: 'Estado',
            key: 'is_active',
            render: (_: any, record: any) => (
                <Tag color={record.is_active ? 'green' : 'red'}>
                    {record.is_active ? 'Activo' : 'Inactivo'}
                </Tag>
            ),
        },
        {
            title: 'Fecha de Creación',
            dataIndex: 'created_at',
            key: 'created_at',
            render: (date: string) => new Date(date).toLocaleDateString(),
        },
        {
            title: 'Acciones',
            key: 'actions',
            render: (_: any, record: any) => (
                <Space size="middle">
                    <Button type="text" icon={<EditOutlined />} onClick={() => openEditModal(record)} />
                    <Popconfirm
                        title="¿Eliminar este usuario?"
                        description="Esta acción no se puede deshacer."
                        onConfirm={() => handleDelete(record.user_id)}
                        okText="Sí, eliminar"
                        cancelText="Cancelar"
                    >
                        <Button type="text" danger icon={<DeleteOutlined />} />
                    </Popconfirm>
                </Space>
            ),
        },
    ];

    if (error) return <div>Error cargando usuarios: {error.message}</div>;

    return (
        <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
                <Title level={3} style={{ margin: 0 }}>Usuarios Administradores</Title>
                <Button type="primary" icon={<PlusOutlined />} onClick={openCreateModal}>
                    Nuevo Usuario
                </Button>
            </div>

            <Table 
                columns={columns} 
                dataSource={users} 
                loading={isLoading} 
                rowKey="user_id" 
                pagination={{ pageSize: 10 }}
            />

            <Modal
                title={editingUser ? 'Editar Usuario' : 'Nuevo Usuario'}
                open={isModalOpen}
                onCancel={() => setIsModalOpen(false)}
                footer={null}
                destroyOnHidden
                forceRender
            >
                <Form layout="vertical" form={form} onFinish={onFinish} style={{ marginTop: 24 }}>
                    <Form.Item 
                        name="full_name" 
                        label="Nombre Completo" 
                        rules={[{ required: true, message: 'Requerido' }]}
                    >
                        <Input />
                    </Form.Item>

                    <Form.Item 
                        name="username" 
                        label="Nombre de Usuario (Login)" 
                        rules={[{ required: true, message: 'Requerido' }]}
                    >
                        <Input disabled={!!editingUser} />
                    </Form.Item>

                    <Form.Item 
                        name="password" 
                        label={editingUser ? 'Nueva Contraseña (dejar en blanco para no cambiar)' : 'Contraseña'} 
                        rules={[{ required: !editingUser, message: 'Requerido' }]}
                    >
                        <Input.Password />
                    </Form.Item>

                    <Form.Item name="is_active" label="Estado" valuePropName="checked">
                        <Switch checkedChildren="Activo" unCheckedChildren="Inactivo" />
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
