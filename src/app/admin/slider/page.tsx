'use client';
import { toast } from 'sonner';

import React, { useState } from 'react';
import { Table, Button, Space, Typography, Tag, Modal, Form, Input, Switch, Popconfirm, Image, InputNumber } from 'antd';
import { PlusOutlined, EditOutlined, DeleteOutlined } from '@ant-design/icons';
import useSWR from 'swr';
import { fetcher } from '@/lib/fetcher';
import ImageUploader from '@/components/admin/ImageUploader';

const { Title, Text } = Typography;

export default function AdminSliderPage() {
    const { data: slides, error, mutate, isLoading } = useSWR<any[]>('/api/admin/slider', fetcher);
    
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingSlide, setEditingSlide] = useState<any>(null);
    const [form] = Form.useForm();
    const [isSaving, setIsSaving] = useState(false);
    const [uploadedImageUrl, setUploadedImageUrl] = useState<string | null>(null);

    const openCreateModal = () => {
        setEditingSlide(null);
        setUploadedImageUrl(null);
        form.resetFields();
        form.setFieldsValue({ 
            is_active: true,
            sort_order: 0
        });
        setIsModalOpen(true);
    };

    const openEditModal = (record: any) => {
        setEditingSlide(record);
        setUploadedImageUrl(record.image_url);
        form.resetFields();
        form.setFieldsValue({
            title: record.title,
            subtitle: record.subtitle,
            button_text: record.button_text,
            link_url: record.link_url,
            sort_order: record.sort_order,
            is_active: record.is_active,
        });
        setIsModalOpen(true);
    };

    const handleDelete = async (slide_id: string) => {
        try {
            const res = await fetch(`/api/admin/slider/${slide_id}`, { method: 'DELETE' });
            if (!res.ok) throw new Error('Error eliminando slide');
            toast.success('Slide eliminado');
            mutate();
        } catch (e: any) {
            toast.error(e.message);
        }
    };

    const onFinish = async (values: any) => {
        if (!uploadedImageUrl) {
            toast.error("Debes subir una imagen para el slider");
            return;
        }

        setIsSaving(true);
        try {
            const isUpdate = !!editingSlide;
            const url = isUpdate ? `/api/admin/slider/${editingSlide.slide_id}` : '/api/admin/slider';
            const method = isUpdate ? 'PUT' : 'POST';

            const payload = {
                ...values,
                image_url: uploadedImageUrl
            };

            const res = await fetch(url, {
                method,
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload),
            });

            if (!res.ok) {
                const data = await res.json();
                throw new Error(data.error || 'Error guardando slide');
            }

            toast.success(`Slide ${isUpdate ? 'actualizado' : 'creado'} correctamente`);
            setIsModalOpen(false);
            mutate();
        } catch (e: any) {
            toast.error(e.message);
        } finally {
            setIsSaving(false);
        }
    };

    const handleUploadSuccess = (url: string) => {
        setUploadedImageUrl(url);
        toast.success("Imagen subida correctamente");
    };

    const columns = [
        {
            title: 'Imagen',
            dataIndex: 'image_url',
            key: 'image_url',
            render: (url: string) => <Image src={url} alt="slide" width={120} height={60} style={{ objectFit: 'cover', borderRadius: '4px' }} />
        },
        {
            title: 'Título',
            dataIndex: 'title',
            key: 'title',
            render: (text: string) => text || <Text type="secondary">N/A</Text>
        },
        {
            title: 'Orden',
            dataIndex: 'sort_order',
            key: 'sort_order',
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
            title: 'Acciones',
            key: 'actions',
            render: (_: any, record: any) => (
                <Space size="middle">
                    <Button type="text" icon={<EditOutlined />} onClick={() => openEditModal(record)} />
                    <Popconfirm
                        title="¿Eliminar este slide?"
                        onConfirm={() => handleDelete(record.slide_id)}
                        okText="Sí, eliminar"
                        cancelText="Cancelar"
                    >
                        <Button type="text" danger icon={<DeleteOutlined />} />
                    </Popconfirm>
                </Space>
            ),
        },
    ];

    if (error) return <div>Error cargando sliders: {error.message}</div>;

    return (
        <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
                <Title level={3} style={{ margin: 0 }}>Gestión de Slider Principal</Title>
                <Button type="primary" icon={<PlusOutlined />} onClick={openCreateModal}>
                    Nuevo Slide
                </Button>
            </div>

            <Table 
                columns={columns} 
                dataSource={slides} 
                loading={isLoading} 
                rowKey="slide_id" 
                pagination={false}
            />

            <Modal
                title={editingSlide ? 'Editar Slide' : 'Nuevo Slide'}
                open={isModalOpen}
                onCancel={() => setIsModalOpen(false)}
                footer={null}
                destroyOnHidden
                forceRender
            >
                <Form layout="vertical" form={form} onFinish={onFinish} style={{ marginTop: 24 }}>
                    
                    <Form.Item label="Imagen del Slider" required>
                        <ImageUploader 
                            onUploadSuccess={handleUploadSuccess} 
                            buttonText={uploadedImageUrl ? "Cambiar Imagen" : "Subir Imagen (1920x1080 recomendado)"} 
                        />
                        {uploadedImageUrl && (
                            <div style={{ marginTop: 12 }}>
                                <Image src={uploadedImageUrl} alt="preview" width="100%" height={160} style={{ objectFit: 'cover', borderRadius: '8px' }} />
                            </div>
                        )}
                    </Form.Item>

                    <Form.Item name="subtitle" label="Subtítulo (Opcional, texto pequeño superior)">
                        <Input placeholder="Ej. MUJER" />
                    </Form.Item>

                    <Form.Item name="title" label="Título Principal (Opcional)">
                        <Input placeholder="Ej. Primavera-Verano 2026" />
                    </Form.Item>

                    <Form.Item name="button_text" label="Texto del Enlace (Opcional)">
                        <Input placeholder="Ej. Descubrir la Colección" />
                    </Form.Item>

                    <Form.Item name="link_url" label="URL del Enlace (Opcional)">
                        <Input placeholder="Ej. /shop?collection=verano" />
                    </Form.Item>

                    <Space size="large">
                        <Form.Item name="sort_order" label="Orden de Aparición">
                            <InputNumber min={0} />
                        </Form.Item>

                        <Form.Item name="is_active" label="Estado" valuePropName="checked">
                            <Switch checkedChildren="Visible" unCheckedChildren="Oculto" />
                        </Form.Item>
                    </Space>

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
