'use client';

import React, { useState } from 'react';
import { App, Typography, Tabs, Card, Table, Button, Modal, Form, Input, InputNumber, Select, Switch, Space, Tag, Popconfirm, Row, Col, theme } from 'antd';
import { BgColorsOutlined, EditOutlined, EyeOutlined, PlusOutlined, ToolOutlined, ScissorOutlined } from '@ant-design/icons';
import useSWR from 'swr';
import { fetcher } from '@/lib/fetcher';
import { formatPEN } from '@/lib/money';
import UnitCostHelper from '@/components/admin/UnitCostHelper';

const { Title, Text } = Typography;
const { Option } = Select;

function SuppliesTab() {
    const { token } = theme.useToken();
    const { message } = App.useApp();
    const { data: supplies, mutate, isLoading } = useSWR<any[]>('/api/admin/supplies', fetcher);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [form] = Form.useForm();
    const [isSaving, setIsSaving] = useState(false);
    const [search, setSearch] = useState('');
    const [typeFilter, setTypeFilter] = useState<string>();
    const [stockFilter, setStockFilter] = useState<string>();
    const [statusFilter, setStatusFilter] = useState<boolean | undefined>();

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

    const filteredSupplies = React.useMemo(() => {
        const normalizedSearch = search.trim().toLowerCase();

        return (supplies || []).filter((supply) => {
            const stock = Number(supply.stock || 0);
            const minStock = Number(supply.min_stock || 0);
            const isLowStock = minStock > 0 && stock <= minStock;
            const matchesSearch = !normalizedSearch || String(supply.name || '').toLowerCase().includes(normalizedSearch);

            if (!matchesSearch) return false;
            if (typeFilter && supply.type !== typeFilter) return false;
            if (statusFilter !== undefined && Boolean(supply.is_active) !== statusFilter) return false;
            if (stockFilter === 'LOW' && !isLowStock) return false;
            if (stockFilter === 'OK' && isLowStock) return false;

            return true;
        });
    }, [supplies, search, typeFilter, stockFilter, statusFilter]);

    const hasActiveFilters = Boolean(search || typeFilter || stockFilter || statusFilter !== undefined);

    const clearFilters = () => {
        setSearch('');
        setTypeFilter(undefined);
        setStockFilter(undefined);
        setStatusFilter(undefined);
    };

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

    const handleDelete = async (supply: any) => {
        try {
            const res = await fetch(`/api/admin/supplies/${supply.supply_id}`, { method: 'DELETE' });
            const data = await res.json().catch(() => ({}));
            if (!res.ok) throw new Error(data.error || 'Error al eliminar insumo');
            message.success(data.message || 'Insumo eliminado');
            mutate();
        } catch (e: any) {
            message.error(e.message);
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
                    <Popconfirm
                        title="¿Eliminar este insumo?"
                        description="Si tiene historial se desactivará para conservar movimientos y fichas técnicas."
                        okText="Sí, eliminar"
                        cancelText="Cancelar"
                        onConfirm={() => handleDelete(r)}
                    >
                        <Button size="small" danger>Eliminar</Button>
                    </Popconfirm>
                </Space>
            ) 
        }
    ];

    return (
        <div>
            <div style={{ marginBottom: 16, textAlign: 'right' }}>
                <Button type="primary" icon={<PlusOutlined />} onClick={() => setIsModalOpen(true)}>Nuevo Insumo</Button>
            </div>
            <div style={{ marginBottom: 16, padding: 16, border: `1px solid ${token.colorBorderSecondary}`, borderRadius: 12, background: token.colorFillAlter }}>
                <Row gutter={[12, 12]} align="bottom">
                    <Col xs={24} md={7}>
                        <Text type="secondary" style={{ display: 'block', marginBottom: 6 }}>Buscar</Text>
                        <Input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Nombre del insumo" allowClear />
                    </Col>
                    <Col xs={24} md={5}>
                        <Text type="secondary" style={{ display: 'block', marginBottom: 6 }}>Tipo</Text>
                        <Select allowClear value={typeFilter} onChange={setTypeFilter} placeholder="Todos" style={{ width: '100%' }} options={[{ value: 'TELA', label: 'Telas' }, { value: 'AVIO', label: 'Avíos' }, { value: 'HILO', label: 'Hilos' }, { value: 'EMPAQUE', label: 'Empaque' }]} />
                    </Col>
                    <Col xs={24} md={4}>
                        <Text type="secondary" style={{ display: 'block', marginBottom: 6 }}>Stock</Text>
                        <Select allowClear value={stockFilter} onChange={setStockFilter} placeholder="Todos" style={{ width: '100%' }} options={[{ value: 'LOW', label: 'Stock bajo' }, { value: 'OK', label: 'Stock OK' }]} />
                    </Col>
                    <Col xs={24} md={4}>
                        <Text type="secondary" style={{ display: 'block', marginBottom: 6 }}>Estado</Text>
                        <Select allowClear value={statusFilter} onChange={setStatusFilter} placeholder="Todos" style={{ width: '100%' }} options={[{ value: true, label: 'Activo' }, { value: false, label: 'Inactivo' }]} />
                    </Col>
                    <Col xs={24} md={4}>
                        <Button onClick={clearFilters} disabled={!hasActiveFilters} block>Limpiar</Button>
                    </Col>
                </Row>
                <Text type="secondary" style={{ display: 'block', marginTop: 10 }}>
                    Mostrando {filteredSupplies.length} de {supplies?.length || 0} insumos
                </Text>
            </div>
            <Table columns={columns} dataSource={filteredSupplies} loading={isLoading} rowKey="supply_id" size="small" />

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
    const { token } = theme.useToken();
    const { message } = App.useApp();
    const { data: services, mutate, isLoading } = useSWR<any[]>('/api/admin/services', fetcher);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [form] = Form.useForm();
    const [isSaving, setIsSaving] = useState(false);
    const [search, setSearch] = useState('');
    const [minCost, setMinCost] = useState<number | null>(null);
    const [maxCost, setMaxCost] = useState<number | null>(null);
    const [statusFilter, setStatusFilter] = useState<boolean | undefined>();

    const filteredServices = React.useMemo(() => {
        const normalizedSearch = search.trim().toLowerCase();

        return (services || []).filter((service) => {
            const unitCost = Number(service.unit_cost || 0);
            const matchesSearch = !normalizedSearch || String(service.name || '').toLowerCase().includes(normalizedSearch);

            if (!matchesSearch) return false;
            if (minCost !== null && unitCost < minCost) return false;
            if (maxCost !== null && unitCost > maxCost) return false;
            if (statusFilter !== undefined && Boolean(service.is_active) !== statusFilter) return false;

            return true;
        });
    }, [services, search, minCost, maxCost, statusFilter]);

    const hasActiveFilters = Boolean(search || minCost !== null || maxCost !== null || statusFilter !== undefined);

    const clearFilters = () => {
        setSearch('');
        setMinCost(null);
        setMaxCost(null);
        setStatusFilter(undefined);
    };

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
            <div style={{ marginBottom: 16, padding: 16, border: `1px solid ${token.colorBorderSecondary}`, borderRadius: 12, background: token.colorFillAlter }}>
                <Row gutter={[12, 12]} align="bottom">
                    <Col xs={24} md={8}>
                        <Text type="secondary" style={{ display: 'block', marginBottom: 6 }}>Buscar</Text>
                        <Input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Nombre del servicio" allowClear />
                    </Col>
                    <Col xs={12} md={4}>
                        <Text type="secondary" style={{ display: 'block', marginBottom: 6 }}>Costo mínimo</Text>
                        <InputNumber value={minCost} onChange={(value) => setMinCost(value === null ? null : Number(value))} min={0} prefix="S/" style={{ width: '100%' }} />
                    </Col>
                    <Col xs={12} md={4}>
                        <Text type="secondary" style={{ display: 'block', marginBottom: 6 }}>Costo máximo</Text>
                        <InputNumber value={maxCost} onChange={(value) => setMaxCost(value === null ? null : Number(value))} min={0} prefix="S/" style={{ width: '100%' }} />
                    </Col>
                    <Col xs={24} md={4}>
                        <Text type="secondary" style={{ display: 'block', marginBottom: 6 }}>Estado</Text>
                        <Select allowClear value={statusFilter} onChange={setStatusFilter} placeholder="Todos" style={{ width: '100%' }} options={[{ value: true, label: 'Activo' }, { value: false, label: 'Inactivo' }]} />
                    </Col>
                    <Col xs={24} md={4}>
                        <Button onClick={clearFilters} disabled={!hasActiveFilters} block>Limpiar</Button>
                    </Col>
                </Row>
                <Text type="secondary" style={{ display: 'block', marginTop: 10 }}>
                    Mostrando {filteredServices.length} de {services?.length || 0} servicios
                </Text>
            </div>
            <Table columns={columns} dataSource={filteredServices} loading={isLoading} rowKey="service_id" size="small" />

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

function ColorsTab() {
    const { token } = theme.useToken();
    const { message } = App.useApp();
    const { data: colors, mutate, isLoading } = useSWR<any[]>('/api/admin/colors', fetcher);
    const [form] = Form.useForm();
    const [editing, setEditing] = useState<any>(null);
    const [isSaving, setIsSaving] = useState(false);
    const [search, setSearch] = useState('');
    const [availabilityFilter, setAvailabilityFilter] = useState<boolean | undefined>();
    const [statusFilter, setStatusFilter] = useState<boolean | undefined>();

    const filteredColors = React.useMemo(() => {
        const normalizedSearch = search.trim().toLowerCase();

        return (colors || []).filter((color) => {
            const matchesSearch = !normalizedSearch
                || String(color.name || '').toLowerCase().includes(normalizedSearch)
                || String(color.hex || '').toLowerCase().includes(normalizedSearch);

            if (!matchesSearch) return false;
            if (availabilityFilter !== undefined && Boolean(color.is_available) !== availabilityFilter) return false;
            if (statusFilter !== undefined && Boolean(color.is_active) !== statusFilter) return false;

            return true;
        });
    }, [colors, search, availabilityFilter, statusFilter]);

    const hasActiveFilters = Boolean(search || availabilityFilter !== undefined || statusFilter !== undefined);

    const clearFilters = () => {
        setSearch('');
        setAvailabilityFilter(undefined);
        setStatusFilter(undefined);
    };

    const openModal = (record?: any) => {
        setEditing(record || {});
        form.setFieldsValue(record || { name: '', hex: '#000000', sort_order: (colors?.length || 0) + 1, is_available: true, is_active: true });
    };

    const onFinish = async (values: any) => {
        setIsSaving(true);
        try {
            const isUpdate = !!editing?.color_id;
            const res = await fetch(isUpdate ? `/api/admin/colors/${editing.color_id}` : '/api/admin/colors', {
                method: isUpdate ? 'PUT' : 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(values),
            });
            if (!res.ok) throw new Error('Error al guardar color');
            message.success('Color guardado');
            setEditing(null);
            form.resetFields();
            mutate();
        } catch (e: any) {
            message.error(e.message);
        } finally {
            setIsSaving(false);
        }
    };

    return (
        <div>
<div style={{ marginBottom: 16, display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
                <Text type="secondary" style={{ fontSize: 13 }}>
                    La <strong>Vista pública</strong> muestra a tus clientes los colores disponibles por prenda.
                </Text>
                <Space>
                    <Button icon={<EyeOutlined />} onClick={() => window.open('/colores', '_blank')}>Vista pública</Button>
                    <Button type="primary" icon={<PlusOutlined />} onClick={() => openModal()}>Nuevo Color</Button>
                </Space>
            </div>
            <div style={{ marginBottom: 16, padding: 16, border: `1px solid ${token.colorBorderSecondary}`, borderRadius: 12, background: token.colorFillAlter }}>
                <Row gutter={[12, 12]} align="bottom">
                    <Col xs={24} md={8}>
                        <Text type="secondary" style={{ display: 'block', marginBottom: 6 }}>Buscar</Text>
                        <Input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Nombre o HEX" allowClear />
                    </Col>
                    <Col xs={24} md={5}>
                        <Text type="secondary" style={{ display: 'block', marginBottom: 6 }}>Disponibilidad</Text>
                        <Select allowClear value={availabilityFilter} onChange={setAvailabilityFilter} placeholder="Todos" style={{ width: '100%' }} options={[{ value: true, label: 'Disponible' }, { value: false, label: 'Agotado' }]} />
                    </Col>
                    <Col xs={24} md={5}>
                        <Text type="secondary" style={{ display: 'block', marginBottom: 6 }}>Estado</Text>
                        <Select allowClear value={statusFilter} onChange={setStatusFilter} placeholder="Todos" style={{ width: '100%' }} options={[{ value: true, label: 'Activo' }, { value: false, label: 'Inactivo' }]} />
                    </Col>
                    <Col xs={24} md={6}>
                        <Button onClick={clearFilters} disabled={!hasActiveFilters} block>Limpiar</Button>
                    </Col>
                </Row>
                <Text type="secondary" style={{ display: 'block', marginTop: 10 }}>
                    Mostrando {filteredColors.length} de {colors?.length || 0} colores
                </Text>
            </div>
            <Table
                dataSource={filteredColors}
                loading={isLoading}
                rowKey="color_id"
                size="small"
                columns={[
                    { title: 'Color', dataIndex: 'name', render: (name: string, record: any) => <Space><span style={{ width: 18, height: 18, borderRadius: '50%', background: record.hex, border: '1px solid #ccc', display: 'inline-block' }} />{name}</Space> },
                    { title: 'HEX', dataIndex: 'hex' },
                    { title: 'Orden', dataIndex: 'sort_order' },
                    { title: 'Disponibilidad', dataIndex: 'is_available', render: (v: boolean) => <Tag color={v ? 'green' : 'orange'}>{v ? 'Disponible' : 'Agotado'}</Tag> },
                    { title: 'Estado', dataIndex: 'is_active', render: (v: boolean) => <Tag color={v ? 'green' : 'red'}>{v ? 'Activo' : 'Inactivo'}</Tag> },
                    { title: 'Acciones', render: (_: any, record: any) => <Button size="small" icon={<EditOutlined />} onClick={() => openModal(record)}>Editar</Button> },
                ]}
            />
            <Modal title={editing?.color_id ? 'Editar Color' : 'Nuevo Color'} open={!!editing} onCancel={() => setEditing(null)} footer={null}>
                <Form layout="vertical" form={form} onFinish={onFinish}>
                    <Form.Item name="name" label="Nombre" rules={[{ required: true }]}><Input /></Form.Item>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
                        <Form.Item name="hex" label="HEX" rules={[{ required: true }]}><Input type="color" /></Form.Item>
                        <Form.Item name="sort_order" label="Orden"><InputNumber style={{ width: '100%' }} min={0} /></Form.Item>
                        <Form.Item name="is_available" label="Disponible" valuePropName="checked"><Switch /></Form.Item>
                        <Form.Item name="is_active" label="Activo" valuePropName="checked"><Switch /></Form.Item>
                    </div>
                    <div style={{ textAlign: 'right' }}><Space><Button onClick={() => setEditing(null)}>Cancelar</Button><Button type="primary" htmlType="submit" loading={isSaving}>Guardar</Button></Space></div>
                </Form>
            </Modal>
        </div>
    );
}

function SupplyColorStockTab() {
    const { token } = theme.useToken();
    const { message } = App.useApp();
    const { data: fabricSupplies, mutate, isLoading } = useSWR<any[]>('/api/admin/supply-colors', fetcher);
    const { data: colors } = useSWR<any[]>('/api/admin/colors', fetcher);
    const [stockForm] = Form.useForm();
    const [stockSupply, setStockSupply] = useState<any>(null);
    const [isSaving, setIsSaving] = useState(false);
    const [search, setSearch] = useState('');
    const [statusFilter, setStatusFilter] = useState<boolean | undefined>();

    const filteredFabricSupplies = React.useMemo(() => {
        const normalizedSearch = search.trim().toLowerCase();

        return (fabricSupplies || []).filter((supply) => {
            const matchesSearch = !normalizedSearch || String(supply.name || '').toLowerCase().includes(normalizedSearch);

            if (!matchesSearch) return false;
            if (statusFilter !== undefined && Boolean(supply.is_active) !== statusFilter) return false;

            return true;
        });
    }, [fabricSupplies, search, statusFilter]);

    const hasActiveFilters = Boolean(search || statusFilter !== undefined);

    const clearFilters = () => {
        setSearch('');
        setStatusFilter(undefined);
    };

    const openStock = (supply: any, row?: any) => {
        setStockSupply(supply);
        stockForm.setFieldsValue(row ? {
            color_ids: [row.color_id],
            stock: Number(row.stock || 0),
            min_stock: Number(row.min_stock || 0),
            unit_cost_override: row.unit_cost_override ? Number(row.unit_cost_override) : null,
            is_available: row.is_available,
            is_active: row.is_active,
        } : { color_ids: [], stock: 0, min_stock: 0, unit_cost_override: null, is_available: true, is_active: true });
    };

    const saveStock = async (values: any) => {
        setIsSaving(true);
        try {
            const res = await fetch('/api/admin/supply-colors', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ ...values, supply_id: stockSupply.supply_id }),
            });
            if (!res.ok) throw new Error('Error al guardar stock por color');
            message.success('Stock por color guardado');
            setStockSupply(null);
            stockForm.resetFields();
            mutate();
        } catch (e: any) {
            message.error(e.message);
        } finally {
            setIsSaving(false);
        }
    };

    return (
        <div>
            <Text type="secondary" style={{ display: 'block', marginBottom: 16 }}>
                Registra las telas en la pestaña Insumos y Materiales con clasificación TELA. Aquí asignas colores, stock y disponibilidad por cada tela.
            </Text>
            <div style={{ marginBottom: 16, padding: 16, border: `1px solid ${token.colorBorderSecondary}`, borderRadius: 12, background: token.colorFillAlter }}>
                <Row gutter={[12, 12]} align="bottom">
                    <Col xs={24} md={10}>
                        <Text type="secondary" style={{ display: 'block', marginBottom: 6 }}>Buscar</Text>
                        <Input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Nombre de tela" allowClear />
                    </Col>
                    <Col xs={24} md={6}>
                        <Text type="secondary" style={{ display: 'block', marginBottom: 6 }}>Estado</Text>
                        <Select allowClear value={statusFilter} onChange={setStatusFilter} placeholder="Todos" style={{ width: '100%' }} options={[{ value: true, label: 'Activa' }, { value: false, label: 'Inactiva' }]} />
                    </Col>
                    <Col xs={24} md={4}>
                        <Button onClick={clearFilters} disabled={!hasActiveFilters} block>Limpiar</Button>
                    </Col>
                </Row>
                <Text type="secondary" style={{ display: 'block', marginTop: 10 }}>
                    Mostrando {filteredFabricSupplies.length} de {fabricSupplies?.length || 0} telas
                </Text>
            </div>
            <Table
                dataSource={filteredFabricSupplies}
                loading={isLoading}
                rowKey="supply_id"
                size="small"
                expandable={{
                    expandedRowRender: (supply) => (
                        <div>
                            <Button size="small" type="dashed" icon={<PlusOutlined />} onClick={() => openStock(supply)} style={{ marginBottom: 8 }}>Agregar color/stock</Button>
                            <Table
                                dataSource={supply.supply_color_stock || []}
                                rowKey="supply_color_id"
                                size="small"
                                pagination={false}
                                columns={[
                                    { title: 'Color', render: (_: any, row: any) => <Space><span style={{ width: 16, height: 16, borderRadius: '50%', background: row.color?.hex, border: '1px solid #ccc', display: 'inline-block' }} />{row.color?.name}</Space> },
                                    { title: 'Stock', dataIndex: 'stock', render: (v: any) => Number(v) },
                                    { title: 'Mínimo', dataIndex: 'min_stock', render: (v: any) => Number(v) },
                                    { title: 'Disponible', dataIndex: 'is_available', render: (v: boolean) => <Tag color={v ? 'green' : 'orange'}>{v ? 'Sí' : 'Agotado'}</Tag> },
                                    { title: 'Acciones', render: (_: any, row: any) => <Button size="small" icon={<EditOutlined />} onClick={() => openStock(supply, row)}>Editar</Button> },
                                ]}
                            />
                        </div>
                    )
                }}
                columns={[
                    { title: 'Tela', dataIndex: 'name' },
                    { title: 'Unidad', dataIndex: 'unit' },
                    { title: 'Costo base', dataIndex: 'unit_cost', render: (v: any) => formatPEN(Number(v)) },
                    { title: 'Stock total', dataIndex: 'stock', render: (v: any) => Number(v) },
                    { title: 'Estado', dataIndex: 'is_active', render: (v: boolean) => <Tag color={v ? 'green' : 'red'}>{v ? 'Activa' : 'Inactiva'}</Tag> },
                    { title: 'Acciones', render: (_: any, record: any) => <Button size="small" icon={<PlusOutlined />} onClick={() => openStock(record)}>Agregar color</Button> },
                ]}
            />
            <Modal title={`Stock por color: ${stockSupply?.name || ''}`} open={!!stockSupply} onCancel={() => setStockSupply(null)} footer={null}>
                <Form layout="vertical" form={stockForm} onFinish={saveStock}>
                    <Form.Item name="color_ids" label="Colores" rules={[{ required: true, message: 'Selecciona al menos un color' }]}> 
                        <Select mode="multiple" placeholder="Selecciona uno o varios colores" showSearch optionFilterProp="label" options={(colors || []).map((color) => ({ value: color.color_id, label: color.name }))} />
                    </Form.Item>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
                        <Form.Item name="stock" label="Stock"><InputNumber style={{ width: '100%' }} min={0} step={0.01} /></Form.Item>
                        <Form.Item name="min_stock" label="Stock mínimo"><InputNumber style={{ width: '100%' }} min={0} step={0.01} /></Form.Item>
                        <Form.Item name="unit_cost_override" label="Costo opcional"><InputNumber style={{ width: '100%' }} min={0} step={0.0001} /></Form.Item>
                        <Form.Item name="is_available" label="Disponible" valuePropName="checked"><Switch /></Form.Item>
                        <Form.Item name="is_active" label="Activo" valuePropName="checked"><Switch /></Form.Item>
                    </div>
                    <div style={{ textAlign: 'right' }}><Space><Button onClick={() => setStockSupply(null)}>Cancelar</Button><Button type="primary" htmlType="submit" loading={isSaving}>Guardar</Button></Space></div>
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
                        {
                            key: '3',
                            label: <span><BgColorsOutlined /> Colores</span>,
                            children: <ColorsTab />,
                        },
                        {
                            key: '4',
                            label: <span><ToolOutlined /> Stock por Color</span>,
                            children: <SupplyColorStockTab />,
                        },
                    ]}
                />
            </Card>
        </div>
    );
}
