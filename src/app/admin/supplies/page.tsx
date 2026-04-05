'use client';

import React, { useState } from 'react';
import { Typography, Tabs, Card, Table, Button, Modal, Form, Input, InputNumber, Select, Switch, Space, Tag, message } from 'antd';
import { PlusOutlined, ToolOutlined, ScissorOutlined } from '@ant-design/icons';
import useSWR from 'swr';
import { fetcher } from '@/lib/fetcher';
import { formatPEN } from '@/lib/money';
import UnitCostHelper from '@/components/admin/UnitCostHelper';

const { Title } = Typography;
const { Option } = Select;

function SuppliesTab() {
    const { data: supplies, mutate, isLoading } = useSWR<any[]>('/api/admin/supplies', fetcher);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [form] = Form.useForm();
    const [isSaving, setIsSaving] = useState(false);

    // ---- Restock State ----
    const [restockSupply, setRestockSupply] = useState<any>(null);
    const [restockForm] = Form.useForm();
    const [isRestocking, setIsRestocking] = useState(false);

    // ---- History State ----
    const [historySupply, setHistorySupply] = useState<any>(null);
    const { data: movements, isLoading: loadingMovements } = useSWR<any[]>(
        historySupply ? `/api/admin/supplies/movements/${historySupply.supply_id}` : null,
        fetcher
    );

    const onFinish = async (values: any) => {
        setIsSaving(true);
        try {
            const res = await fetch('/api/admin/supplies', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(values),
            });
            if (!res.ok) throw new Error('Error al guardar insumo');
            message.success('Insumo guardado');
            setIsModalOpen(false);
            form.resetFields();
            mutate();
        } catch (e: any) {
            message.error(e.message);
        } finally {
            setIsSaving(false);
        }
    };

    const handleRestock = async (values: any) => {
        setIsRestocking(true);
        try {
            const res = await fetch('/api/admin/supplies/restock', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    supply_id: restockSupply.supply_id,
                    qty: values.qty,
                    reason: values.reason,
                    new_unit_cost: values.new_unit_cost || undefined
                }),
            });
            if (!res.ok) throw new Error(await res.text());
            message.success('Stock actualizado');
            setRestockSupply(null);
            restockForm.resetFields();
            mutate();
        } catch (e: any) {
            message.error(e.message);
        } finally {
            setIsRestocking(false);
        }
    };

    const columns = [
        { title: 'Insumo', dataIndex: 'name', key: 'name' },
        { title: 'Tipo', dataIndex: 'type', render: (type: string) => <Tag color="blue">{type}</Tag> },
        { title: 'U.M.', dataIndex: 'unit', key: 'unit' },
        { title: 'Costo Un.', dataIndex: 'unit_cost', render: (v: any) => formatPEN(Number(v)) },
        { 
            title: 'Stock (Almacén)', 
            dataIndex: 'stock', 
            render: (v: any, r: any) => (
                <Space>
                    <strong>{Number(v)}</strong>
                    {Number(v) <= Number(r.min_stock) && Number(r.min_stock) > 0 && <Tag color="red">¡Bajo!</Tag>}
                </Space>
            )
        },
        { title: 'Estado', dataIndex: 'is_active', render: (v: boolean) => <Tag color={v ? 'green' : 'red'}>{v ? 'Activo' : 'Inactivo'}</Tag> },
        { 
            title: 'Acciones', 
            render: (_: any, r: any) => (
                <Space>
                    <Button size="small" type="primary" ghost onClick={() => setRestockSupply(r)}>+ Abastecer</Button>
                    <Button size="small" onClick={() => setHistorySupply(r)}>Kardex</Button>
                </Space>
            ) 
        }
    ];

    return (
        <div>
            <div style={{ marginBottom: 16, textAlign: 'right' }}>
                <Button type="primary" icon={<PlusOutlined />} onClick={() => setIsModalOpen(true)}>Nuevo Insumo</Button>
            </div>
            <Table columns={columns} dataSource={supplies} loading={isLoading} rowKey="supply_id" size="small" />

            {/* Nuevo Insumo Modal */}
            <Modal title="Nuevo Insumo / Material" open={isModalOpen} onCancel={() => setIsModalOpen(false)} footer={null}>
                <Form layout="vertical" form={form} onFinish={onFinish} initialValues={{ type: 'TELA', unit: 'MT', is_active: true, stock: 0, min_stock: 0 }}>
                    <Form.Item name="name" label="Nombre" rules={[{ required: true }]}><Input placeholder="Ej. Tela Raso" /></Form.Item>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
                        <Form.Item name="type" label="Clasificación">
                            <Select><Option value="TELA">Telas</Option><Option value="AVIO">Avíos</Option><Option value="HILO">Hilos</Option><Option value="EMPAQUE">Empaque</Option></Select>
                        </Form.Item>
                        <Form.Item name="unit" label="Unidad de Medida">
                            <Select><Option value="MT">Metros</Option><Option value="UND">Unidades</Option><Option value="KG">Kilogramos</Option><Option value="CONO">Conos</Option></Select>
                        </Form.Item>
                        <Form.Item name="unit_cost" label="Costo por Unidad (S/)" rules={[{ required: true }]}><InputNumber style={{ width: '100%' }} min={0} step={0.01} /></Form.Item>
                        <Form.Item name="stock" label="Stock Inicial"><InputNumber style={{ width: '100%' }} min={0} /></Form.Item>
                        <Form.Item name="min_stock" label="Alerta Stock Mínimo"><InputNumber style={{ width: '100%' }} min={0} /></Form.Item>
                    </div>

                    <UnitCostHelper 
                        onCalculate={(unitCost, qty) => form.setFieldsValue({ unit_cost: unitCost, stock: qty })} 
                        label="¿Compraste por lote/rollo? Calcular unitario"
                    />

                    <Form.Item name="is_active" label="Activo" valuePropName="checked"><Switch /></Form.Item>
                    <div style={{ textAlign: 'right', marginTop: 16 }}>
                        <Space><Button onClick={() => setIsModalOpen(false)}>Cancelar</Button><Button type="primary" htmlType="submit" loading={isSaving}>Guardar</Button></Space>
                    </div>
                </Form>
            </Modal>

            {/* Abastecer Modal */}
            <Modal title={`Ingreso de ${restockSupply?.name || ''}`} open={!!restockSupply} onCancel={() => setRestockSupply(null)} footer={null}>
                <Form layout="vertical" form={restockForm} onFinish={handleRestock}>
                    <Form.Item name="qty" label={`Cantidad Entrante en ${restockSupply?.unit || 'U'}`} rules={[{ required: true }]}>
                        <InputNumber min={0.1} style={{ width: '100%' }} />
                    </Form.Item>
                    <Form.Item name="new_unit_cost" label={`Factura: Nuevo costo unitario (Dejar vacío si no cambió)`}>
                        <InputNumber min={0} step={0.0001} style={{ width: '100%' }} placeholder={`Cual fue el costo por ${restockSupply?.unit}?`} />
                    </Form.Item>

                    <UnitCostHelper 
                        onCalculate={(unitCost, qty) => restockForm.setFieldsValue({ new_unit_cost: unitCost, qty: qty })} 
                        label="Calcular costo unitario desde factura global"
                    />

                    <Form.Item name="reason" label="Motivo o Referencia (Opcional)">
                        <Input placeholder="Ej. Compra Factura 001-200" />
                    </Form.Item>
                    <div style={{ textAlign: 'right', marginTop: 16 }}>
                        <Space>
                            <Button onClick={() => setRestockSupply(null)}>Cancelar</Button>
                            <Button type="primary" htmlType="submit" loading={isRestocking}>Registrar Entrada</Button>
                        </Space>
                    </div>
                </Form>
            </Modal>

            {/* Kardex Modal */}
            <Modal title={`Kardex: ${historySupply?.name || ''}`} open={!!historySupply} onCancel={() => setHistorySupply(null)} footer={null} width={800}>
                <Table 
                    dataSource={movements} 
                    loading={loadingMovements} 
                    rowKey="movement_id" 
                    size="small"
                    columns={[
                        { title: 'Fecha', dataIndex: 'created_at', render: (d) => new Date(d).toLocaleString() },
                        { title: 'Motivo', dataIndex: 'reason' },
                        { title: 'Tipo', dataIndex: 'movement_type', render: (t) => <Tag color={t === 'IN' ? 'green' : 'red'}>{t}</Tag> },
                        { title: 'Qty', dataIndex: 'qty', render: (v, r: any) => <strong>{r.movement_type === 'OUT' ? '-' : '+'}{Number(v)}</strong> },
                        { title: 'Saldo Post-Mov', dataIndex: 'stock_after', render: (v) => Number(v) },
                    ]}
                />
            </Modal>
        </div>
    );
}

function ServicesTab() {
    const { data: services, mutate, isLoading } = useSWR<any[]>('/api/admin/services', fetcher);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [form] = Form.useForm();
    const [isSaving, setIsSaving] = useState(false);

    const onFinish = async (values: any) => {
        setIsSaving(true);
        try {
            const res = await fetch('/api/admin/services', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(values),
            });
            if (!res.ok) throw new Error('Error al guardar servicio');
            message.success('Servicio guardado');
            setIsModalOpen(false);
            form.resetFields();
            mutate();
        } catch (e: any) {
            message.error(e.message);
        } finally {
            setIsSaving(false);
        }
    };

    const columns = [
        { title: 'Servicio', dataIndex: 'name', key: 'name' },
        { 
            title: 'Costo por Prenda/Uso', 
            dataIndex: 'unit_cost', 
            key: 'unit_cost',
            render: (v: any) => formatPEN(Number(v))
        },
        { 
            title: 'Estado', 
            dataIndex: 'is_active', 
            key: 'is_active',
            render: (v: boolean) => <Tag color={v ? 'green' : 'red'}>{v ? 'Activo' : 'Inactivo'}</Tag>
        },
    ];

    return (
        <div>
            <div style={{ marginBottom: 16, textAlign: 'right' }}>
                <Button type="primary" icon={<PlusOutlined />} onClick={() => setIsModalOpen(true)}>Nuevo Servicio</Button>
            </div>
            <Table columns={columns} dataSource={services} loading={isLoading} rowKey="service_id" size="small" />

            <Modal title="Tarifario de Servicio de Taller" open={isModalOpen} onCancel={() => setIsModalOpen(false)} footer={null}>
                <Form layout="vertical" form={form} onFinish={onFinish} initialValues={{ is_active: true }}>
                    <Form.Item name="name" label="Nombre del Servicio" rules={[{ required: true }]}>
                        <Input placeholder="Ej. Confección, Corte, Planchado, Pegado de Ojal" />
                    </Form.Item>
                    <Form.Item name="unit_cost" label="Costo Unitario (S/)" rules={[{ required: true }]}>
                        <InputNumber style={{ width: '100%' }} min={0} step={0.01} />
                    </Form.Item>

                    <UnitCostHelper 
                        onCalculate={(unitCost) => form.setFieldsValue({ unit_cost: unitCost })} 
                        label="¿Te dieron un precio por lote de prendas? Calcular unitario"
                    />

                    <Form.Item name="is_active" label="Activo" valuePropName="checked">
                        <Switch />
                    </Form.Item>
                    <div style={{ textAlign: 'right', marginTop: 16 }}>
                        <Space>
                            <Button onClick={() => setIsModalOpen(false)}>Cancelar</Button>
                            <Button type="primary" htmlType="submit" loading={isSaving}>Guardar</Button>
                        </Space>
                    </div>
                </Form>
            </Modal>
        </div>
    );
}

export default function SuppliesWorkbenchPage() {
    return (
        <div>
            <Title level={2} style={{ marginBottom: 24 }}>Inventario y Taller</Title>
            <Card variant="borderless">
                <Tabs
                    defaultActiveKey="1"
                    items={[
                        {
                            key: '1',
                            label: <span><ToolOutlined /> Insumos y Materiales</span>,
                            children: <SuppliesTab />,
                        },
                        {
                            key: '2',
                            label: <span><ScissorOutlined /> Servicios (Mano de Obra)</span>,
                            children: <ServicesTab />,
                        },
                    ]}
                />
            </Card>
        </div>
    );
}
