'use client';

import React, { useEffect, useState } from 'react';
import { toast } from 'sonner';
import useSWR from 'swr';
import { Button, Card, Form, Image, Input, InputNumber, Modal, Popconfirm, Select, Space, Switch, Table, Tag, Typography } from 'antd';
import type { TableColumnsType } from 'antd';
import { DeleteOutlined, EditOutlined, PlusOutlined } from '@ant-design/icons';
import { fetcher } from '@/lib/fetcher';
import ImageUploader from '@/components/admin/ImageUploader';

const { Title, Text } = Typography;
const { TextArea } = Input;

const linkTypeOptions = [
    { label: 'Catalogo', value: 'CATALOG' },
    { label: 'WhatsApp', value: 'WHATSAPP' },
    { label: 'Instagram', value: 'INSTAGRAM' },
    { label: 'Facebook', value: 'FACEBOOK' },
    { label: 'TikTok', value: 'TIKTOK' },
    { label: 'Correo', value: 'EMAIL' },
    { label: 'Anuncio', value: 'ANNOUNCEMENT' },
    { label: 'Personalizado', value: 'CUSTOM' },
];

type LinkPageSettings = {
    settings_key: string;
    title: string;
    logo_text: string;
    eyebrow_text: string;
    subtitle: string | null;
    avatar_url: string | null;
    announcement: string | null;
    announcement_url: string | null;
    announcement_logo_url: string | null;
    is_announcement_active: boolean;
    is_active: boolean;
    footer_text: string;
};

type LinkItem = {
    link_id: string;
    title: string;
    description: string | null;
    url: string;
    icon_url: string | null;
    link_type: string;
    sort_order: number;
    is_featured: boolean;
    is_active: boolean;
};

type LinkPageSettingsForm = Omit<LinkPageSettings, 'settings_key'>;
type LinkItemForm = Omit<LinkItem, 'link_id'>;

function getErrorMessage(error: unknown) {
    return error instanceof Error ? error.message : 'Error inesperado';
}

async function readApiError(res: Response, fallback: string) {
    const data = await res.json().catch(() => null) as { error?: string } | null;
    return data?.error || fallback;
}

export default function AdminLinksPage() {
    const { data: settings, error: settingsError, mutate: mutateSettings, isLoading: loadingSettings } = useSWR<LinkPageSettings>('/api/admin/links/settings', fetcher);
    const { data: items, error: itemsError, mutate: mutateItems, isLoading: loadingItems } = useSWR<LinkItem[]>('/api/admin/links/items', fetcher);

    const [settingsForm] = Form.useForm<LinkPageSettingsForm>();
    const [itemForm] = Form.useForm<LinkItemForm>();
    const [savingSettings, setSavingSettings] = useState(false);
    const [savingItem, setSavingItem] = useState(false);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingItem, setEditingItem] = useState<LinkItem | null>(null);

    useEffect(() => {
        if (!settings) return;
        settingsForm.setFieldsValue(settings);
    }, [settings, settingsForm]);

    const handleSaveSettings = async (values: LinkPageSettingsForm) => {
        setSavingSettings(true);
        try {
            const res = await fetch('/api/admin/links/settings', {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(values),
            });

            if (!res.ok) {
                throw new Error(await readApiError(res, 'Error guardando configuracion'));
            }

            toast.success('Configuracion de links actualizada');
            mutateSettings();
        } catch (e: unknown) {
            toast.error(getErrorMessage(e));
        } finally {
            setSavingSettings(false);
        }
    };

    const openCreateModal = () => {
        setEditingItem(null);
        itemForm.resetFields();
        itemForm.setFieldsValue({
            link_type: 'CUSTOM',
            sort_order: (items?.length ?? 0) * 10 + 10,
            is_featured: false,
            is_active: true,
        });
        setIsModalOpen(true);
    };

    const openEditModal = (record: LinkItem) => {
        setEditingItem(record);
        itemForm.resetFields();
        itemForm.setFieldsValue(record);
        setIsModalOpen(true);
    };

    const handleDelete = async (linkId: string) => {
        try {
            const res = await fetch(`/api/admin/links/items/${linkId}`, { method: 'DELETE' });
            if (!res.ok) {
                throw new Error(await readApiError(res, 'Error eliminando enlace'));
            }

            toast.success('Enlace eliminado');
            mutateItems();
        } catch (e: unknown) {
            toast.error(getErrorMessage(e));
        }
    };

    const handleSaveItem = async (values: LinkItemForm) => {
        setSavingItem(true);
        try {
            const isUpdate = !!editingItem;
            const url = isUpdate ? `/api/admin/links/items/${editingItem.link_id}` : '/api/admin/links/items';
            const method = isUpdate ? 'PUT' : 'POST';

            const res = await fetch(url, {
                method,
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(values),
            });

            if (!res.ok) {
                throw new Error(await readApiError(res, 'Error guardando enlace'));
            }

            toast.success(`Enlace ${isUpdate ? 'actualizado' : 'creado'} correctamente`);
            setIsModalOpen(false);
            mutateItems();
        } catch (e: unknown) {
            toast.error(getErrorMessage(e));
        } finally {
            setSavingItem(false);
        }
    };

    const handleAvatarUpload = (url: string) => {
        settingsForm.setFieldValue('avatar_url', url);
        toast.success('Logo principal subido correctamente');
    };

    const handleAnnouncementLogoUpload = (url: string) => {
        settingsForm.setFieldValue('announcement_logo_url', url);
        toast.success('Logo del anuncio subido correctamente');
    };

    const handleItemLogoUpload = (url: string) => {
        itemForm.setFieldValue('icon_url', url);
        toast.success('Logo del enlace subido correctamente');
    };

    const columns: TableColumnsType<LinkItem> = [
        {
            title: 'Logo',
            dataIndex: 'icon_url',
            key: 'icon_url',
            width: 80,
            render: (url: string | null, record: LinkItem) => url ? (
                <Image src={url} alt={record.title} width={44} height={44} style={{ objectFit: 'cover', borderRadius: 12 }} />
            ) : <Text type="secondary">-</Text>,
        },
        {
            title: 'Enlace',
            key: 'title',
            render: (_value: unknown, record: LinkItem) => (
                <Space direction="vertical" size={0}>
                    <strong>{record.title}</strong>
                    {record.description && <Text type="secondary">{record.description}</Text>}
                </Space>
            ),
        },
        {
            title: 'Tipo',
            dataIndex: 'link_type',
            key: 'link_type',
            render: (type: string) => <Tag>{type}</Tag>,
        },
        {
            title: 'URL',
            dataIndex: 'url',
            key: 'url',
            ellipsis: true,
            render: (url: string) => <Text copyable={{ text: url }} type="secondary">{url}</Text>,
        },
        {
            title: 'Orden',
            dataIndex: 'sort_order',
            key: 'sort_order',
            width: 90,
        },
        {
            title: 'Estado',
            key: 'state',
            render: (_value: unknown, record: LinkItem) => (
                <Space wrap>
                    <Tag color={record.is_active ? 'green' : 'red'}>{record.is_active ? 'Visible' : 'Oculto'}</Tag>
                    {record.is_featured && <Tag color="gold">Destacado</Tag>}
                </Space>
            ),
        },
        {
            title: 'Acciones',
            key: 'actions',
            render: (_value: unknown, record: LinkItem) => (
                <Space>
                    <Button type="text" icon={<EditOutlined />} onClick={() => openEditModal(record)} />
                    <Popconfirm
                        title="¿Eliminar enlace?"
                        onConfirm={() => handleDelete(record.link_id)}
                        okText="Si, eliminar"
                        cancelText="Cancelar"
                    >
                        <Button type="text" danger icon={<DeleteOutlined />} />
                    </Popconfirm>
                </Space>
            ),
        },
    ];

    if (settingsError) return <div>Error cargando configuracion: {settingsError.message}</div>;
    if (itemsError) return <div>Error cargando enlaces: {itemsError.message}</div>;

    return (
        <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
                <Title level={3} style={{ margin: 0 }}>Pagina de Links</Title>
                <Space>
                    <Button href="/links" target="_blank">Ver /links</Button>
                    <Button type="primary" icon={<PlusOutlined />} onClick={openCreateModal}>Nuevo Enlace</Button>
                </Space>
            </div>

            <Card title="Perfil y anuncio" loading={loadingSettings} style={{ marginBottom: 24 }}>
                <Form layout="vertical" form={settingsForm} onFinish={handleSaveSettings}>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0, 1fr))', gap: 16 }}>
                        <Form.Item name="title" label="Titulo" rules={[{ required: true, message: 'Requerido' }]}>
                            <Input placeholder="Aura Boutique" />
                        </Form.Item>

                        <Form.Item name="logo_text" label="Texto del logo si no hay imagen">
                            <Input placeholder="Aura" />
                        </Form.Item>

                        <Form.Item name="eyebrow_text" label="Texto superior pequeno">
                            <Input placeholder="Links oficiales" />
                        </Form.Item>

                        <Form.Item name="subtitle" label="Subtitulo">
                            <Input placeholder="Moda femenina exclusiva..." />
                        </Form.Item>

                        <Form.Item name="avatar_url" label="URL del logo principal">
                            <Input placeholder="https://..." />
                        </Form.Item>

                        <Form.Item label="Subir logo principal">
                            <ImageUploader onUploadSuccess={handleAvatarUpload} buttonText="Subir Logo" />
                        </Form.Item>
                    </div>

                    <Form.Item name="footer_text" label="Texto del pie de la pagina">
                        <Input placeholder="Aura Boutique" />
                    </Form.Item>

                    <Form.Item name="announcement" label="Anuncio superior">
                        <TextArea rows={2} placeholder="Ej. Nueva coleccion disponible" />
                    </Form.Item>

                    <Form.Item name="announcement_url" label="URL del anuncio">
                        <Input placeholder="/shop o https://..." />
                    </Form.Item>

                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0, 1fr))', gap: 16 }}>
                        <Form.Item name="announcement_logo_url" label="URL del logo del anuncio">
                            <Input placeholder="https://..." />
                        </Form.Item>

                        <Form.Item label="Subir logo del anuncio">
                            <ImageUploader onUploadSuccess={handleAnnouncementLogoUpload} buttonText="Subir Logo" />
                        </Form.Item>
                    </div>

                    <Space size="large" wrap>
                        <Form.Item name="is_active" label="Pagina publica" valuePropName="checked">
                            <Switch checkedChildren="Activa" unCheckedChildren="Oculta" />
                        </Form.Item>

                        <Form.Item name="is_announcement_active" label="Mostrar anuncio" valuePropName="checked">
                            <Switch checkedChildren="Visible" unCheckedChildren="Oculto" />
                        </Form.Item>
                    </Space>

                    <Form.Item style={{ marginBottom: 0, textAlign: 'right' }}>
                        <Button type="primary" htmlType="submit" loading={savingSettings}>Guardar Configuracion</Button>
                    </Form.Item>
                </Form>
            </Card>

            <Table
                columns={columns}
                dataSource={items}
                loading={loadingItems}
                rowKey="link_id"
                pagination={false}
            />

            <Modal
                title={editingItem ? 'Editar Enlace' : 'Nuevo Enlace'}
                open={isModalOpen}
                onCancel={() => setIsModalOpen(false)}
                footer={null}
                destroyOnHidden
                forceRender
            >
                <Form layout="vertical" form={itemForm} onFinish={handleSaveItem} style={{ marginTop: 24 }}>
                    <Form.Item name="title" label="Titulo" rules={[{ required: true, message: 'Requerido' }]}>
                        <Input placeholder="Ver catalogo" />
                    </Form.Item>

                    <Form.Item name="description" label="Descripcion">
                        <TextArea rows={2} placeholder="Texto corto opcional" />
                    </Form.Item>

                    <Form.Item name="url" label="URL" rules={[{ required: true, message: 'Requerido' }]}>
                        <Input placeholder="/shop, https://instagram.com/... o mailto:hola@..." />
                    </Form.Item>

                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0, 1fr))', gap: 16 }}>
                        <Form.Item name="icon_url" label="URL del logo del enlace">
                            <Input placeholder="https://..." />
                        </Form.Item>

                        <Form.Item label="Subir logo del enlace">
                            <ImageUploader onUploadSuccess={handleItemLogoUpload} buttonText="Subir Logo" />
                        </Form.Item>
                    </div>

                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0, 1fr))', gap: 16 }}>
                        <Form.Item name="link_type" label="Tipo">
                            <Select options={linkTypeOptions} />
                        </Form.Item>

                        <Form.Item name="sort_order" label="Orden">
                            <InputNumber min={0} style={{ width: '100%' }} />
                        </Form.Item>
                    </div>

                    <Space size="large" wrap>
                        <Form.Item name="is_active" label="Estado" valuePropName="checked">
                            <Switch checkedChildren="Visible" unCheckedChildren="Oculto" />
                        </Form.Item>

                        <Form.Item name="is_featured" label="Destacado" valuePropName="checked">
                            <Switch checkedChildren="Si" unCheckedChildren="No" />
                        </Form.Item>
                    </Space>

                    <Form.Item style={{ marginBottom: 0, textAlign: 'right' }}>
                        <Space>
                            <Button onClick={() => setIsModalOpen(false)}>Cancelar</Button>
                            <Button type="primary" htmlType="submit" loading={savingItem}>Guardar</Button>
                        </Space>
                    </Form.Item>
                </Form>
            </Modal>
        </div>
    );
}
