'use client';

import React, { useState, useEffect } from 'react';
import { Typography, Card, Table, Button, Form, Input, InputNumber, Select, Switch, Space, Tag, App, Row, Col, Divider, Spin, Alert, theme } from 'antd';
import { PlusOutlined, CalculatorOutlined, ClearOutlined, ArrowLeftOutlined, ExperimentOutlined, MoneyCollectOutlined } from '@ant-design/icons';
import useSWR from 'swr';
import { fetcher } from '@/lib/fetcher';
import { formatPEN } from '@/lib/money';
import Link from 'next/link';
import UnitCostHelper from '@/components/admin/UnitCostHelper';

const { Title, Text } = Typography;
const { Option } = Select;

export default function CostSimulatorPage() {
    const { token } = theme.useToken();
    const { message } = App.useApp();
    // Data fetching for existing entities
    const { data: supplies } = useSWR<any[]>('/api/admin/supplies', fetcher);
    const { data: services } = useSWR<any[]>('/api/admin/services', fetcher);
    const { data: products } = useSWR<any[]>('/api/admin/products', fetcher);

    // State for the simulation
    const [selectedProductId, setSelectedProductId] = useState<string | null>(null);
    const [bomSupplies, setBomSupplies] = useState<any[]>([]);
    const [bomServices, setBomServices] = useState<any[]>([]);
    
    // Improved Matrix State for Lot
    const [lotColors, setLotColors] = useState<string[]>(['Color 1']);
    const [lotSizes, setLotSizes] = useState<string[]>(['S', 'M', 'L']);
    const [lotMatrix, setLotMatrix] = useState<Record<string, Record<string, number>>>({}); // colorIndex -> size -> qty

    // Flattened lot items for calculation logic
    const [lotItems, setLotItems] = useState<any[]>([]);
    
    // Sync Matrix to LotItems
    useEffect(() => {
        const flattened: any[] = [];
        lotColors.forEach((color, cIdx) => {
            lotSizes.forEach(sz => {
                const qty = lotMatrix[`${cIdx}`]?.[sz];
                if (qty && qty > 0) {
                    flattened.push({ color, size: sz, qty, id: `${cIdx}_${sz}` });
                }
            });
        });
        setLotItems(flattened);
    }, [lotColors, lotSizes, lotMatrix]);

    const currentLotSizes = lotSizes; // Use the matrix sizes

    const [isCalculating, setIsCalculating] = useState(false);
    const [calcResult, setCalcResult] = useState<any>(null);

    // Load BOM from product
    const loadBOM = async (productId: string) => {
        setSelectedProductId(productId);
        try {
            const res = await fetch(`/api/admin/production/bom/${productId}`);
            const data = await res.json();
            if (data) {
                // Group supplies by supply_id for the UI
                const groupedMap = new Map();
                (data.supplies || []).forEach((s: any) => {
                    const key = `${s.supply_id}_${s.varies_by_color}`;
                    if (!groupedMap.has(key)) {
                        groupedMap.set(key, { ...s, is_size_varied: false, sizeQuantities: {}, id: Date.now().toString() + Math.random() });
                    }
                    const entry = groupedMap.get(key);
                    if (s.size && s.size !== 'ALL') {
                        entry.is_size_varied = true;
                        entry.sizeQuantities[s.size] = Number(s.quantity);
                    } else {
                        entry.size = s.size;
                        entry.quantity = Number(s.quantity);
                    }
                });

                setBomSupplies(Array.from(groupedMap.values()));
                setBomServices((data.services || []).map((s:any) => ({ ...s, id: Date.now().toString() + Math.random() })));
                
                // If product has variants, pre-fill some lot items if empty
                if (data.product?.product_variant?.length > 0) {
                    const sizes = Array.from(new Set(data.product.product_variant.map((v:any) => v.size))) as string[];
                    const colors = Array.from(new Set(data.product.product_variant.map((v:any) => v.color))) as string[];
                    setLotSizes(sizes);
                    if (colors.length > 0 && colors[0] !== null) {
                        setLotColors(colors.filter(c => c !== null));
                    }
                }

                message.success('Ficha técnica importada');
            }
        } catch (e) {
            message.error('Error al cargar ficha técnica');
        }
    };

    // Add/Remove Helpers
    const addSupply = () => {
        setBomSupplies([...bomSupplies, { supply_id: null, size: null, quantity: 1, varies_by_color: false, is_size_varied: false, sizeQuantities: {}, id: Date.now().toString() }]);
    };
    const removeSupply = (id: string) => setBomSupplies(bomSupplies.filter(s => s.id !== id));

    const addService = () => {
        setBomServices([...bomServices, { service_id: null, quantity: 1, unit_cost_override: null, id: Date.now().toString() }]);
    };
    const removeService = (id: string) => setBomServices(bomServices.filter(s => s.id !== id));

    const addLotItem = () => {
        setLotItems([...lotItems, { color: '', size: '', qty: 10, id: Date.now().toString() }]);
    };
    const removeLotItem = (id: string) => setLotItems(lotItems.filter(i => i.id !== id));

    const handleCalculate = async () => {
        if (bomSupplies.length === 0 && bomServices.length === 0) {
            message.warning('Añade al menos un insumo o servicio a la receta.');
            return;
        }

        setIsCalculating(true);
        try {
            // Flatten supplies
            const flattenedSupplies: any[] = [];
            bomSupplies.forEach(s => {
                const fullSupply = supplies?.find(fs => fs.supply_id === s.supply_id);
                if (s.is_size_varied) {
                    Object.entries(s.sizeQuantities).forEach(([sz, qty]) => {
                        if (qty) {
                            flattenedSupplies.push({
                                supply: fullSupply,
                                quantity: qty,
                                size: sz,
                                varies_by_color: s.varies_by_color
                            });
                        }
                    });
                } else if (s.supply_id) {
                    flattenedSupplies.push({
                        supply: fullSupply,
                        quantity: s.quantity,
                        size: s.size,
                        varies_by_color: s.varies_by_color
                    });
                }
            });

            // Prepare data for the simulator API
            const payload = {
                lotItems: lotItems.map(li => ({ size: li.size, color: li.color, qty: li.qty })),
                bomSupplies: flattenedSupplies,
                bomServices: bomServices.filter(s => s.service_id).map(s => {
                    const fullService = services?.find(fs => fs.service_id === s.service_id);
                    return {
                        service: fullService,
                        quantity: s.quantity,
                        unit_cost_override: s.unit_cost_override
                    };
                })
            };

            const res = await fetch('/api/admin/production/calculate/simulate', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });

            const data = await res.json();
            if (!res.ok) throw new Error(data.error || 'Error en el cálculo');
            
            setCalcResult(data);
            message.success('Simulación calculada');
        } catch (e: any) {
            message.error(e.message);
        } finally {
            setIsCalculating(false);
        }
    };

    const reset = () => {
        setBomSupplies([]);
        setBomServices([]);
        setLotItems([{ color: '', size: '', qty: 10, id: Date.now().toString() }]);
        setCalcResult(null);
    };

    return (
        <div style={{ maxWidth: 1400, margin: '0 auto' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
                <Space>
                    <Link href="/admin/production">
                        <Button icon={<ArrowLeftOutlined />} />
                    </Link>
                    <Title level={2} style={{ margin: 0 }}>Simulador de Costos de Producción</Title>
                </Space>
                <Button icon={<ClearOutlined />} onClick={reset}>Limpiar Simulador</Button>
            </div>

            <Row gutter={24}>
                {/* Column 1: Config (BOM & Lot) */}
                <Col span={10}>
                    <Card title="1. Definir Receta (Ficha Técnica)" variant="borderless" style={{ marginBottom: 24 }}>
                        <div style={{ marginBottom: 20, padding: 12, background: token.colorInfoBg, borderRadius: 8, border: `1px solid ${token.colorInfoBorder}` }}>
                            <Text type="secondary" style={{ fontSize: 12, display: 'block', marginBottom: 4 }}>IMPORTAR DESDE PRODUCTO EXISTENTE</Text>
                            <Select 
                                style={{ width: '100%' }} 
                                placeholder="Seleccionar producto para cargar su ficha..."
                                onChange={loadBOM}
                                value={selectedProductId}
                                allowClear
                            >
                                {products?.map(p => <Option key={p.product_id} value={p.product_id}>{p.name}</Option>)}
                            </Select>
                        </div>

                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                            <Title level={5} style={{ margin: 0 }}>Insumos</Title>
                            <Button type="link" size="small" icon={<PlusOutlined />} onClick={addSupply}>Añadir</Button>
                        </div>

                        {bomSupplies.length === 0 && <Text type="secondary">No hay insumos. Añade uno para comenzar.</Text>}
                        {bomSupplies.map((item, index) => (
                            <div key={item.id} style={{ marginBottom: 12, padding:12, border: `1px solid ${token.colorBorderSecondary}`, borderRadius: 8, background: token.colorBgLayout }}>
                                <Row gutter={8} align="top">
                                    <Col span={14}>
                                        <Text type="secondary" style={{ fontSize: 10 }}>INSUMO</Text>
                                        <Select 
                                            style={{ width: '100%' }} 
                                            placeholder="Insumo" 
                                            value={item.supply_id}
                                            onChange={val => { const n = [...bomSupplies]; n[index].supply_id = val; setBomSupplies(n); }}
                                        >
                                            {supplies?.map(s => <Option key={s.supply_id} value={s.supply_id}>{s.name} ({s.unit})</Option>)}
                                        </Select>
                                    </Col>
                                    <Col span={8}>
                                        <Text type="secondary" style={{ fontSize: 10 }}>¿VARÍA POR TALLA?</Text>
                                        <div style={{ marginTop: 4 }}>
                                            <Switch 
                                                size="small" checkedChildren="SÍ" unCheckedChildren="NO" 
                                                checked={item.is_size_varied}
                                                onChange={val => { 
                                                    const n = [...bomSupplies]; 
                                                    n[index].is_size_varied = val;
                                                    if (val && Object.keys(n[index].sizeQuantities || {}).length === 0) {
                                                        const sq: any = {};
                                                        currentLotSizes.forEach(sz => sq[sz] = n[index].quantity || 1);
                                                        n[index].sizeQuantities = sq;
                                                    }
                                                    setBomSupplies(n); 
                                                }}
                                            />
                                        </div>
                                    </Col>
                                    <Col span={2} style={{ textAlign: 'center' }}>
                                        <Button type="text" danger onClick={() => removeSupply(item.id)}>X</Button>
                                    </Col>
                                </Row>

                                {item.is_size_varied ? (
                                    <div style={{ margin: '8px 0', padding: 8, background: token.colorBgContainer, borderRadius: 4 }}>
                                        <Text type="secondary" style={{ fontSize: 10 }}>CONSUMO POR TALLA</Text>
                                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(60px, 1fr))', gap: 8, marginTop: 4 }}>
                                            {currentLotSizes.length === 0 && <Text type="secondary" style={{ fontSize: 10 }}>Define tallas en el paso 2</Text>}
                                            {currentLotSizes.map(sz => (
                                                <div key={sz} style={{ textAlign: 'center' }}>
                                                    <div style={{ fontSize: 9, color: '#999' }}>{sz}</div>
                                                    <InputNumber 
                                                        size="small" 
                                                        style={{ width: '100%' }} 
                                                        min={0} step={0.01}
                                                        value={item.sizeQuantities?.[sz]}
                                                        onChange={(val) => {
                                                            const n = [...bomSupplies];
                                                            if (!n[index].sizeQuantities) n[index].sizeQuantities = {};
                                                            n[index].sizeQuantities[sz] = val;
                                                            setBomSupplies(n);
                                                        }}
                                                    />
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                ) : (
                                    <Row gutter={8} style={{ marginTop: 8 }}>
                                        <Col span={12}>
                                            <Text type="secondary" style={{ fontSize: 10 }}>CANT. UNID.</Text>
                                            <InputNumber 
                                                style={{ width: '100%' }} 
                                                placeholder="Cant." min={0} step={0.1}
                                                value={item.quantity}
                                                onChange={val => { const n = [...bomSupplies]; n[index].quantity = val; setBomSupplies(n); }}
                                            />
                                        </Col>
                                        <Col span={12}>
                                            <Text type="secondary" style={{ fontSize: 10 }}>TALLA DESTINO</Text>
                                            <Select 
                                                style={{ width: '100%' }} 
                                                placeholder="(Default: Todas)" allowClear
                                                value={item.size}
                                                onChange={val => { const n = [...bomSupplies]; n[index].size = val; setBomSupplies(n); }}
                                            >
                                                {currentLotSizes.map(sz => <Option key={sz} value={sz}>{sz}</Option>)}
                                                <Option value="ALL">Todas</Option>
                                            </Select>
                                        </Col>
                                    </Row>
                                )}

                                <Row gutter={8} style={{ marginTop: 8 }}>
                                    <Col span={12}>
                                        <Text type="secondary" style={{ fontSize: 10 }}>VARÍA POR COLOR</Text>
                                        <div style={{ marginTop: 4 }}>
                                            <Switch 
                                                size="small" checkedChildren="SÍ" unCheckedChildren="NO" 
                                                checked={item.varies_by_color}
                                                onChange={val => { const n = [...bomSupplies]; n[index].varies_by_color = val; setBomSupplies(n); }}
                                            />
                                        </div>
                                    </Col>
                                </Row>
                                
                                <div style={{ marginTop: 8 }}>
                                    <UnitCostHelper 
                                        onCalculate={(unitCost, qty) => { 
                                            const n = [...bomSupplies]; 
                                            n[index].quantity = unitCost; 
                                            setBomSupplies(n);
                                        }} 
                                        label="Calcular consumo (Opcional)"
                                    />
                                </div>
                            </div>
                        ))}
                        <Button type="dashed" block icon={<PlusOutlined />} onClick={addSupply} style={{ marginBottom: 24 }}>Añadir Insumo</Button>

                        <Divider />

                        <Title level={5}>Servicios</Title>
                        {bomServices.map((item, index) => (
                            <div key={item.id} style={{ marginBottom: 12, padding: 12, border: `1px solid ${token.colorBorderSecondary}`, borderRadius: 8, background: token.colorBgLayout }}>
                                <Row gutter={[8, 8]} align="top">
                                    <Col xs={24} sm={12}>
                                        <Text type="secondary" style={{ fontSize: 10 }}>SERVICIO</Text>
                                        <Select 
                                            style={{ width: '100%' }} 
                                            placeholder="Servicio"
                                            value={item.service_id}
                                            onChange={val => { const n = [...bomServices]; n[index].service_id = val; setBomServices(n); }}
                                        >
                                            {services?.map(s => <Option key={s.service_id} value={s.service_id}>{s.name} ({formatPEN(Number(s.unit_cost))})</Option>)}
                                        </Select>
                                    </Col>
                                    <Col xs={8} sm={4}>
                                        <Text type="secondary" style={{ fontSize: 10 }}>OP. x PRENDA</Text>
                                        <InputNumber 
                                            style={{ width: '100%' }} 
                                            placeholder="1" min={1}
                                            value={item.quantity}
                                            onChange={val => { const n = [...bomServices]; n[index].quantity = val; setBomServices(n); }}
                                        />
                                    </Col>
                                    <Col xs={12} sm={6}>
                                        <Text type="secondary" style={{ fontSize: 10 }}>COSTO OPC. (S/)</Text>
                                        <InputNumber 
                                            style={{ width: '100%' }} 
                                            placeholder="S/ Opcional" min={0} step={0.0001}
                                            value={item.unit_cost_override}
                                            onChange={val => { const n = [...bomServices]; n[index].unit_cost_override = val; setBomServices(n); }}
                                        />
                                    </Col>
                                    <Col xs={4} sm={2} style={{ textAlign: 'center' }}>
                                        <Button type="text" danger onClick={() => removeService(item.id)} size="small" style={{ marginTop: 20 }}>X</Button>
                                    </Col>
                                </Row>
                                <UnitCostHelper 
                                    onCalculate={(unitCost) => { const n = [...bomServices]; n[index].unit_cost_override = unitCost; setBomServices(n); }} 
                                    label="Calcular p/ lote de prendas"
                                />
                            </div>
                        ))}
                        <Button type="dashed" block icon={<PlusOutlined />} onClick={addService}>Añadir Servicio</Button>
                    </Card>

                    <Card title="2. Cantidades Proyectadas (Matrix)" variant="borderless" style={{ marginBottom: 24 }}>
                        <div style={{ width: '100%', overflowX: 'auto', marginBottom: 16 }}>
                            <table style={{ width: '100%', minWidth: 400, borderCollapse: 'collapse', tableLayout: 'fixed' }}>
                                <thead>
                                    <tr>
                                        <th style={{ textAlign: 'left', padding: '8px 4px', borderBottom: `1px solid ${token.colorBorderSecondary}`, width: '120px' }}>
                                            <Text type="secondary" style={{ fontSize: 10 }}>COLOR</Text>
                                        </th>
                                        {lotSizes.map((sz, sIdx) => (
                                            <th key={sz} style={{ padding: '4px 2px', borderBottom: `1px solid ${token.colorBorderSecondary}`, minWidth: 46, textAlign: 'center' }}>
                                                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                                                    <Input 
                                                        size="small" 
                                                        variant="borderless"
                                                        style={{ textAlign: 'center', width: 36, padding: 0, fontWeight: 'bold', fontSize: 11 }} 
                                                        value={sz}
                                                        onChange={e => {
                                                            const newSizes = [...lotSizes];
                                                            newSizes[sIdx] = e.target.value;
                                                            setLotSizes(newSizes);
                                                        }}
                                                    />
                                                    <Button type="text" size="small" danger onClick={() => setLotSizes(lotSizes.filter((_, i) => i !== sIdx))} style={{ padding: 0, height: 12, fontSize: 8 }}>x</Button>
                                                </div>
                                            </th>
                                        ))}
                                        <th style={{ padding: '8px 4px', borderBottom: `1px solid ${token.colorBorderSecondary}`, width: 30 }}>
                                            <Button type="link" size="small" icon={<PlusOutlined />} onClick={() => setLotSizes([...lotSizes, 'TALLA'])} />
                                        </th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {lotColors.map((color, cIdx) => (
                                        <tr key={cIdx}>
                                            <td style={{ padding: '8px 4px' }}>
                                                <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                                                    <Input 
                                                        size="small" 
                                                        placeholder="Ej. Rojo"
                                                        value={color}
                                                        onChange={e => {
                                                            const newColors = [...lotColors];
                                                            newColors[cIdx] = e.target.value;
                                                            setLotColors(newColors);
                                                        }}
                                                    />
                                                    <Button type="text" size="small" danger onClick={() => setLotColors(lotColors.filter((_, i) => i !== cIdx))} style={{ padding: 0 }}>x</Button>
                                                </div>
                                            </td>
                                            {lotSizes.map(sz => (
                                                <td key={sz} style={{ padding: '2px' }}>
                                                    <InputNumber 
                                                        size="small" 
                                                        min={0} 
                                                        placeholder="0"
                                                        style={{ width: '100%' }}
                                                        value={lotMatrix[`${cIdx}`]?.[sz]}
                                                        onChange={val => {
                                                            const newMatrix = { ...lotMatrix };
                                                            if (!newMatrix[`${cIdx}`]) newMatrix[`${cIdx}`] = {};
                                                            newMatrix[`${cIdx}`][sz] = val as number;
                                                            setLotMatrix(newMatrix);
                                                        }}
                                                    />
                                                </td>
                                            ))}
                                            <td></td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                        <Button type="dashed" block icon={<PlusOutlined />} onClick={() => setLotColors([...lotColors, `Color ${lotColors.length+1}`])}>
                            Añadir Color
                        </Button>
                    </Card>

                    <Button 
                        type="primary" block size="large" 
                        variant="filled" color="primary"
                        icon={<ExperimentOutlined />} 
                        onClick={handleCalculate} 
                        loading={isCalculating}
                        style={{ height: 60, fontSize: 18, margin: '24px 0', borderRadius: 12, boxShadow: `0 4px 12px ${token.colorPrimary}33` }}
                    >
                        SIMULAR PRESUPUESTO
                    </Button>
                </Col>

                {/* Column 2: Result */}
                <Col span={14}>
                    {!calcResult && (
                        <div style={{ height: '100%', display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', background: token.colorBgContainer, borderRadius: 8, padding: 40, border: `2px dashed ${token.colorBorder}` }}>
                            <ExperimentOutlined style={{ fontSize: 64, color: token.colorTextDisabled, marginBottom: 16 }} />
                            <Title level={4} style={{ color: token.colorTextDescription }}>Resultados de Simulación</Title>
                            <Text type="secondary">Configura los insumos y haz clic en "Simular" para ver el presupuesto proyectado.</Text>
                        </div>
                    )}

                    {calcResult && (
                        <Card variant="borderless">
                            <Alert 
                                message="Resumen de Simulación"
                                description={<span>Esta es una estimación basada en <strong>{calcResult.totalQty} prendas</strong> proyectadas.</span>}
                                type="info"
                                showIcon
                                style={{ marginBottom: 24 }}
                            />

                            <Row gutter={24} style={{ marginBottom: 32 }}>
                                <Col span={12}>
                                    <Card variant="borderless" style={{ background: token.colorInfoBg, textAlign: 'center' }}>
                                        <Text type="secondary" style={{ fontSize: 11 }}>COSTO PROMEDIO UNITARIO</Text>
                                        <Title level={1} style={{ margin: 0, color: token.colorInfo }}>{formatPEN(calcResult.avgCostPerGarment)}</Title>
                                    </Card>
                                </Col>
                                <Col span={12}>
                                    <Card variant="borderless" style={{ background: token.colorWarningBg, textAlign: 'center' }}>
                                        <Text type="secondary" style={{ fontSize: 11 }}>P. VENTA SUGERIDO (Mín. 30%)</Text>
                                        <Title level={1} style={{ margin: 0, color: token.colorWarning }}>{formatPEN(calcResult.avgCostPerGarment * 1.30)}</Title>
                                    </Card>
                                </Col>
                            </Row>

                            <Title level={4}>Desglose de Costos</Title>
                            <Divider style={{ margin: '12px 0' }} />
                            <Title level={5}>Materiales e Insumos</Title>
                            <Table 
                                size="small" pagination={false}
                                dataSource={calcResult.supplyNeeds}
                                rowKey={(r:any) => r.supply_id + (r.color || 'none')}
                                columns={[
                                    { title: 'Insumo', dataIndex: 'name' },
                                    { title: 'Color (Destino)', dataIndex: 'color', render: (v: any) => v ? <Tag color="blue">{v}</Tag> : <Text type="secondary">Fijo</Text> },
                                    { 
                                        title: 'Pérdida/Redondeo', 
                                        dataIndex: 'waste', 
                                        render: (w: number) => w > 0 ? <Text type="danger" strong>+{w}</Text> : '-' 
                                    },
                                    { title: 'Cant. Requerida', render: (_: any, r: any) => <strong>{r.quantity} {r.unit}</strong> },
                                    { title: 'Costo Est.', dataIndex: 'cost', render: (v: any) => formatPEN(v) }
                                ]}
                            />
                            <div style={{ textAlign: 'right', marginTop: 8 }}><strong>Subtotal Insumos: {formatPEN(calcResult.totalSupplyCost)}</strong></div>

                            <Divider />
                            <Title level={5}>Servicios y Operaciones</Title>
                            <Table 
                                size="small" pagination={false}
                                dataSource={calcResult.serviceNeeds}
                                rowKey="service_id"
                                columns={[
                                    { title: 'Servicio', dataIndex: 'name' },
                                    { title: 'Cant. Total', render: (_: any, r: any) => <span>{r.quantity} op.</span> },
                                    { title: 'Costo Est.', dataIndex: 'cost', render: v => formatPEN(v) }
                                ]}
                            />
                            <div style={{ textAlign: 'right', marginTop: 8 }}><strong>Subtotal Servicios: {formatPEN(calcResult.totalServiceCost)}</strong></div>

                            <Divider style={{ margin: '24px 0' }} />
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                <Text strong style={{ fontSize: 18 }}>COSTO TOTAL PROYECTADO</Text>
                                <Title level={2} style={{ margin: 0 }}>{formatPEN(calcResult.totalCost)}</Title>
                            </div>

                            <div style={{ marginTop: 40, padding: 20, border: `1px solid ${token.colorBorderSecondary}`, borderRadius: 8 }}>
                                <Title level={5}>Pasos Siguientes</Title>
                                <Text>Si estás satisfecho con estos costos, puedes crear el producto en el módulo de inventario y luego asignarle esta ficha técnica permanentemente.</Text>
                                <div style={{ marginTop: 12 }}>
                                    <Link href="/admin/products?new=true">
                                        <Button type="link" icon={<PlusOutlined />}>Registrar nuevo producto</Button>
                                    </Link>
                                </div>
                            </div>
                        </Card>
                    )}
                </Col>
            </Row>
        </div>
    );
}
