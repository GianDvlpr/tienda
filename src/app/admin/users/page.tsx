'use client';
import { toast } from 'sonner';

import React, { useState } from 'react';
import { Table, Button, Space, Typography, Tag, Modal, Form, Input, Switch, Popconfirm, Select, DatePicker, Row, Col, theme } from 'antd';
import { PlusOutlined, EditOutlined, DeleteOutlined } from '@ant-design/icons';
import useSWR from 'swr';
import { fetcher } from '@/lib/fetcher';
import dayjs from 'dayjs';
import type { Dayjs } from 'dayjs';

const { Title, Text } = Typography;
const { RangePicker } = DatePicker;

export default function AdminUsersPage() {
    const { token } = theme.useToken();
    const { data: users, error, mutate, isLoading } = useSWR<any[]>('/api/admin/users', fetcher);
    
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingUser, setEditingUser] = useState<any>(null);
    const [form] = Form.useForm();
    const [isSaving, setIsSaving] = useState(false);
    const [search, setSearch] = useState('');
    const [roleFilter, setRoleFilter] = useState<string>();
    const [statusFilter, setStatusFilter] = useState<boolean | undefined>();
    const [dateRange, setDateRange] = useState<[Dayjs | null, Dayjs | null] | null>(null);

    const filteredUsers = React.useMemo(() => {
        const normalizedSearch = search.trim().toLowerCase();
        const [startDate, endDate] = dateRange || [];

        return (users || []).filter((user) => {
            const createdAt = dayjs(user.created_at);
            const matchesSearch = !normalizedSearch
                || String(user.full_name || '').toLowerCase().includes(normalizedSearch)
                || String(user.username || '').toLowerCase().includes(normalizedSearch);

            if (!matchesSearch) return false;
            if (roleFilter && user.role !== roleFilter) return false;
            if (statusFilter !== undefined && Boolean(user.is_active) !== statusFilter) return false;
            if (startDate && createdAt.isBefore(startDate.startOf('day'))) return false;
            if (endDate && createdAt.isAfter(endDate.endOf('day'))) return false;

            return true;
        });
    }, [users, search, roleFilter, statusFilter, dateRange]);

    const hasActiveFilters = Boolean(search || roleFilter || statusFilter !== undefined || dateRange);

    const clearFilters = () => {
        setSearch('');
        setRoleFilter(undefined);
        setStatusFilter(undefined);
        setDateRange(null);
    };

    const openCreateModal = () => {
        setEditingUser(null);
        form.resetFields();
        form.setFieldsValue({ is_active: true, role: 'SELLER' });
        setIsModalOpen(true);
    };

    const openEditModal = (record: any) => {
        setEditingUser(record);
        form.resetFields();
        form.setFieldsValue({
            username: record.username,
            full_name: record.full_name,
            is_active: record.is_active,
            role: record.role || 'SELLER'
            // never load password
        });
        setIsModalOpen(true);
    };

    const handleDelete = async (user_id: string) => {
        try {
            const res = await fetch(`/api/admin/users/${user_id}`, { method: 'DELETE' });
            if (!res.ok) throw new Error('Error eliminando usuario');
            toast.success('Usuario eliminado');
            mutate();
        } catch (e: any) {
            toast.error(e.message);
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

            toast.success(`Usuario ${isUpdate ? 'actualizado' : 'creado'} correctamente`);
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
            title: 'Rol',
            dataIndex: 'role',
            key: 'role',
            render: (role: string) => (
                <Tag color={role === 'ADMIN' ? 'gold' : 'blue'}>
                    {role === 'ADMIN' ? 'Administrador' : 'Vendedor'}
                </Tag>
            )
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

            <div style={{ marginBottom: 16, padding: 16, border: `1px solid ${token.colorBorderSecondary}`, borderRadius: 12, background: token.colorFillAlter }}>
                <Row gutter={[12, 12]} align="bottom">
                    <Col xs={24} md={7}>
                        <Text type="secondary" style={{ display: 'block', marginBottom: 6 }}>Buscar</Text>
                        <Input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Nombre o usuario" allowClear />
                    </Col>
                    <Col xs={24} md={5}>
                        <Text type="secondary" style={{ display: 'block', marginBottom: 6 }}>Rol</Text>
                        <Select
                            allowClear
                            value={roleFilter}
                            onChange={setRoleFilter}
                            placeholder="Todos"
                            style={{ width: '100%' }}
                            options={[{ value: 'ADMIN', label: 'Administrador' }, { value: 'SELLER', label: 'Vendedor' }]}
                        />
                    </Col>
                    <Col xs={24} md={5}>
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
                    <Col xs={24} md={5}>
                        <Text type="secondary" style={{ display: 'block', marginBottom: 6 }}>Creación</Text>
                        <RangePicker
                            value={dateRange}
                            onChange={(dates) => setDateRange(dates ? [dates[0], dates[1]] : null)}
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
                    Mostrando {filteredUsers.length} de {users?.length || 0} usuarios
                </Text>
            </div>

            <Table 
                columns={columns} 
                dataSource={filteredUsers} 
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

                    <Form.Item name="role" label="Rol del Usuario" rules={[{ required: true }]}>
                        <Select options={[
                            { value: 'SELLER', label: 'Vendedor (Solo Pedidos y Tablero)' },
                            { value: 'ADMIN', label: 'Administrador (Acceso Total)' }
                        ]} />
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
