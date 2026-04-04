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
    App
} from 'antd';
import { PlusOutlined, TagOutlined } from '@ant-design/icons';
import useSWR from 'swr';
import { fetcher } from '@/lib/fetcher';
import dayjs from 'dayjs';

const { Title, Text } = Typography;
const { Option } = Select;

export default function CouponsPage() {
    const { data, mutate, isLoading } = useSWR<any[]>('/api/admin/coupons', fetcher);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const { message } = App.useApp();
    const [form] = Form.useForm();
    const [isSaving, setIsSaving] = useState(false);

    const onFinish = async (values: any) => {
        setIsSaving(true);
        try {
            const res = await fetch('/api/admin/coupons', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(values),
            });

            if (!res.ok) {
                const err = await res.json();
                throw new Error(err.error || 'Error al guardar cupón');
            }

            message.success('Cupón creado satisfactoriamente');
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
            title: 'Min. Compra',
            dataIndex: 'min_purchase',
            key: 'min_purchase',
            render: (val: any) => val ? `S/ ${val}` : '-'
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
            render: (date: any) => date ? dayjs(date).format('DD/MM/YYYY') : 'Nunca'
        },
        {
            title: 'Estado',
            dataIndex: 'is_active',
            key: 'is_active',
            render: (active: boolean) => <Tag color={active ? 'green' : 'red'}>{active ? 'Activo' : 'Inactivo'}</Tag>
        },
    ];

    return (
        <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
                <Title level={2} style={{ margin: 0 }}>Gestión de Cupones</Title>
                <Button type="primary" icon={<PlusOutlined />} onClick={() => setIsModalOpen(true)}>
                    Crear Cupón
                </Button>
            </div>

            <Card variant="borderless">
                <Table 
                    columns={columns} 
                    dataSource={data} 
                    loading={isLoading} 
                    rowKey="coupon_id"
                    pagination={{ pageSize: 10 }}
                />
            </Card>

            <Modal
                title="Nuevo Cupón de Descuento"
                open={isModalOpen}
                onCancel={() => setIsModalOpen(false)}
                footer={null}
                width={600}
            >
                <Form
                    form={form}
                    layout="vertical"
                    onFinish={onFinish}
                    initialValues={{ discount_type: 'PERCENTAGE', is_active: true }}
                >
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
                        <Form.Item name="code" label="Código del Cupón" rules={[{ required: true, message: 'Ej. VERANO2026' }]}>
                            <Input placeholder="VERANO10" style={{ textTransform: 'uppercase' }} />
                        </Form.Item>
                        <Form.Item name="discount_type" label="Tipo de Descuento">
                            <Select>
                                <Option value="PERCENTAGE">Porcentaje (%)</Option>
                                <Option value="FIXED">Monto Fijo (S/)</Option>
                            </Select>
                        </Form.Item>
                        <Form.Item name="discount_value" label="Valor del Descuento" rules={[{ required: true }]}>
                            <InputNumber style={{ width: '100%' }} min={0} precision={2} />
                        </Form.Item>
                        <Form.Item name="min_purchase" label="Compra Mínima (Opcional)">
                            <InputNumber style={{ width: '100%' }} min={0} precision={2} placeholder="S/ 0.00" />
                        </Form.Item>
                        <Form.Item name="expires_at" label="Fecha de Expiración">
                            <DatePicker style={{ width: '100%' }} disabledDate={(current) => current && current < dayjs().endOf('day')} />
                        </Form.Item>
                        <Form.Item name="usage_limit" label="Límite de Usos Totales">
                            <InputNumber style={{ width: '100%' }} min={1} placeholder="Ilimitado si es vacío" />
                        </Form.Item>
                    </div>

                    <Form.Item name="is_active" label="Cupón Activo" valuePropName="checked">
                        <Switch />
                    </Form.Item>

                    <div style={{ textAlign: 'right', marginTop: 24 }}>
                        <Space>
                            <Button onClick={() => setIsModalOpen(false)}>Cancelar</Button>
                            <Button type="primary" htmlType="submit" loading={isSaving}>Crear Cupón</Button>
                        </Space>
                    </div>
                </Form>
            </Modal>
        </div>
    );
}
