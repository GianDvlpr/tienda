'use client';

import React, { useState, useEffect, use } from 'react';
import { Typography, Tabs, Card, Table, Button, Modal, Form, Input, InputNumber, Select, Switch, Space, Tag, Row, Col, Divider, Spin, theme, App } from 'antd';
import { PlusOutlined, SaveOutlined, CalculatorOutlined, CheckCircleOutlined, PrinterOutlined } from '@ant-design/icons';
import useSWR from 'swr';
import { fetcher } from '@/lib/fetcher';
import { formatPEN } from '@/lib/money';
import dayjs from 'dayjs';
import UnitCostHelper from '@/components/admin/UnitCostHelper';

const { Title, Text } = Typography;
const { Option } = Select;

function BomTab({ productId, bomData, mutateBom, product }: any) {
    const { token } = theme.useToken();
    const { message } = App.useApp();
    const productSizes = Array.from(new Set(product?.product_variant?.map((v: any) => v.size) || [])) as string[];
    const { data: supplies } = useSWR<any[]>('/api/admin/supplies', fetcher);
    const { data: services } = useSWR<any[]>('/api/admin/services', fetcher);
    
    const [localSupplies, setLocalSupplies] = useState<any[]>([]);
    const [localServices, setLocalServices] = useState<any[]>([]);
    const [isSaving, setIsSaving] = useState(false);

    useEffect(() => {
        if (bomData) {
            // Group supplies by supply_id if they have different sizes
            const rawSupplies = bomData.supplies || [];
            const groupedMap = new Map();

            rawSupplies.forEach((s: any) => {
                const key = `${s.supply_id}_${s.varies_by_color}`;
                if (!groupedMap.has(key)) {
                    groupedMap.set(key, { ...s, is_size_varied: false, sizeQuantities: {} });
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

            setLocalSupplies(Array.from(groupedMap.values()));
            setLocalServices(bomData.services || []);
        }
    }, [bomData]);

    const handleSave = async () => {
        setIsSaving(true);
        const flattenedSupplies: any[] = [];
        localSupplies.forEach(s => {
            if (s.is_size_varied) {
                Object.entries(s.sizeQuantities).forEach(([sz, qty]) => {
                    if (qty !== null && qty !== undefined) {
                        flattenedSupplies.push({ ...s, size: sz, quantity: qty });
                    }
                });
            } else {
                flattenedSupplies.push(s);
            }
        });

        try {
            const res = await fetch(`/api/admin/production/bom/${productId}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ supplies: flattenedSupplies, services: localServices })
            });
            if (!res.ok) throw new Error('Error al guardar ficha técnica');
            message.success('Ficha Técnica guardada exitosamente');
            mutateBom();
        } catch (e: any) {
            message.error(e.message);
        } finally {
            setIsSaving(false);
        }
    };

    const addSupply = () => {
        setLocalSupplies([...localSupplies, { supply_id: null, size: null, quantity: 1, varies_by_color: false, is_size_varied: false, sizeQuantities: {}, id: Date.now().toString() }]);
    };
    
    const removeSupply = (index: number) => {
        const newArr = [...localSupplies];
        newArr.splice(index, 1);
        setLocalSupplies(newArr);
    };

    const addService = () => {
        setLocalServices([...localServices, { service_id: null, quantity: 1, unit_cost_override: null, id: Date.now().toString() }]);
    };

    const removeService = (index: number) => {
        const newArr = [...localServices];
        newArr.splice(index, 1);
        setLocalServices(newArr);
    };

    return (
        <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 16 }}>
                <Title level={4}>Receta de Insumos</Title>
                <Button type="dashed" icon={<PlusOutlined />} onClick={addSupply}>Añadir Insumo</Button>
            </div>
            
            {localSupplies.map((item, index) => (
                <Card size="small" key={item.id} style={{ marginBottom: 12, background: token.colorBgLayout, border: `1px solid ${token.colorBorderSecondary}` }}>
                    <Row gutter={16} align="top">
                        <Col span={7}>
                            <Text type="secondary" style={{ fontSize: 10 }}>INSUMO</Text>
                            <Select 
                                style={{ width: '100%' }} 
                                placeholder="Seleccionar"
                                value={item.supply_id}
                                onChange={(val) => {
                                    const n = [...localSupplies]; n[index].supply_id = val; setLocalSupplies(n);
                                }}
                            >
                                {supplies?.map(s => <Option key={s.supply_id} value={s.supply_id}>{s.name} ({s.unit})</Option>)}
                            </Select>
                        </Col>
                        <Col span={4}>
                            <Text type="secondary" style={{ fontSize: 10 }}>¿VARÍA POR TALLA?</Text>
                            <div style={{ marginTop: 4 }}>
                                <Switch 
                                    checkedChildren="SÍ" 
                                    unCheckedChildren="NO" 
                                    checked={item.is_size_varied}
                                    onChange={(val) => {
                                        const n = [...localSupplies]; 
                                        n[index].is_size_varied = val;
                                        if (val && Object.keys(n[index].sizeQuantities || {}).length === 0) {
                                            // Initialize with current quantity for all sizes
                                            const sq: any = {};
                                            productSizes.forEach(sz => sq[sz] = n[index].quantity || 1);
                                            n[index].sizeQuantities = sq;
                                        }
                                        setLocalSupplies(n);
                                    }}
                                />
                            </div>
                        </Col>
                        {item.is_size_varied ? (
                            <Col span={9}>
                                <Text type="secondary" style={{ fontSize: 10 }}>CONSUMO POR TALLA</Text>
                                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(60px, 1fr))', gap: 8, marginTop: 4 }}>
                                    {productSizes.map(sz => (
                                        <div key={sz} style={{ textAlign: 'center' }}>
                                            <div style={{ fontSize: 9, color: '#999' }}>{sz}</div>
                                            <InputNumber 
                                                size="small" 
                                                style={{ width: '100%' }} 
                                                min={0} step={0.01}
                                                value={item.sizeQuantities?.[sz]}
                                                onChange={(val) => {
                                                    const n = [...localSupplies];
                                                    if (!n[index].sizeQuantities) n[index].sizeQuantities = {};
                                                    n[index].sizeQuantities[sz] = val;
                                                    setLocalSupplies(n);
                                                }}
                                            />
                                        </div>
                                    ))}
                                </div>
                            </Col>
                        ) : (
                            <>
                                <Col span={4}>
                                    <Text type="secondary" style={{ fontSize: 10 }}>CANT. UNIDAD</Text>
                                    <InputNumber 
                                        style={{ width: '100%' }} 
                                        placeholder="0.00" 
                                        min={0} step={0.01} 
                                        value={item.quantity}
                                        onChange={(val) => {
                                            const n = [...localSupplies]; n[index].quantity = val; setLocalSupplies(n);
                                        }}
                                    />
                                </Col>
                                <Col span={5}>
                                    <Text type="secondary" style={{ fontSize: 10 }}>TALLA DESTINO</Text>
                                    <Select 
                                        style={{ width: '100%' }} 
                                        placeholder="Toda Talla"
                                        allowClear
                                        value={item.size}
                                        onChange={(val) => {
                                            const n = [...localSupplies]; n[index].size = val; setLocalSupplies(n);
                                        }}
                                    >
                                        {productSizes.map(sz => <Option key={sz} value={sz}>{sz}</Option>)}
                                        <Option value="ALL">Todo</Option>
                                    </Select>
                                </Col>
                            </>
                        )}
                        <Col span={4}>
                            <Text type="secondary" style={{ fontSize: 10 }}>¿VARÍA POR COLOR?</Text>
                            <div style={{ marginTop: 4 }}>
                                <Switch 
                                    checkedChildren="SÍ" 
                                    unCheckedChildren="NO" 
                                    checked={item.varies_by_color}
                                    onChange={(val) => {
                                        const n = [...localSupplies]; n[index].varies_by_color = val; setLocalSupplies(n);
                                    }}
                                />
                            </div>
                        </Col>
                        <Col span={item.is_size_varied ? 24 : 4} style={{ textAlign: 'right', paddingTop: 10 }}>
                            <Button danger type="text" onClick={() => removeSupply(index)}>Eliminar</Button>
                        </Col>
                    </Row>
                </Card>
            ))}

            <Divider />

            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 16 }}>
                <Title level={4}>Servicios y Mano de Obra</Title>
                <Button type="dashed" icon={<PlusOutlined />} onClick={addService}>Añadir Servicio</Button>
            </div>

            {localServices.map((item, index) => (
                <Card size="small" key={item.id} style={{ marginBottom: 12, background: token.colorBgLayout, border: `1px solid ${token.colorBorderSecondary}` }}>
                    <Row gutter={[16, 8]} align="top">
                        <Col xs={24} sm={12}>
                            <Text type="secondary" style={{ fontSize: 10 }}>SERVICIO</Text>
                            <Select 
                                style={{ width: '100%' }} 
                                placeholder="Seleccionar"
                                value={item.service_id}
                                onChange={(val) => {
                                    const n = [...localServices]; n[index].service_id = val; setLocalServices(n);
                                }}
                            >
                                {services?.map(s => <Option key={s.service_id} value={s.service_id}>{s.name} ({formatPEN(Number(s.unit_cost))})</Option>)}
                            </Select>
                        </Col>
                        <Col xs={8} sm={4}>
                            <Text type="secondary" style={{ fontSize: 10 }}>OP. x PRENDA</Text>
                            <InputNumber 
                                style={{ width: '100%' }} 
                                placeholder="1" 
                                min={1} 
                                value={item.quantity}
                                onChange={(val) => {
                                    const n = [...localServices]; n[index].quantity = val; setLocalServices(n);
                                }}
                            />
                        </Col>
                        <Col xs={14} sm={7}>
                            <Text type="secondary" style={{ fontSize: 10 }}>COSTO SOBRESCRITO (Opc.)</Text>
                            <InputNumber 
                                style={{ width: '100%' }} 
                                placeholder="S/ Opcional" 
                                min={0} step={0.01} 
                                value={item.unit_cost_override}
                                onChange={(val) => {
                                    const n = [...localServices]; n[index].unit_cost_override = val; setLocalServices(n);
                                }}
                            />
                            <UnitCostHelper 
                                onCalculate={(unitCost, calculatedQty) => {
                                    const n = [...localServices]; 
                                    n[index].unit_cost_override = unitCost; 
                                    // Also update quantity (multiplier) if it helps
                                    n[index].quantity = calculatedQty;
                                    setLocalServices(n);
                                }}
                                label="Calcular costo por lote"
                            />
                        </Col>
                        <Col xs={4} sm={3} style={{ textAlign: 'right', paddingTop: 10 }}>
                            <Button danger type="text" onClick={() => removeService(index)} size="small">Eliminar</Button>
                        </Col>
                    </Row>
                </Card>
            ))}

            <div style={{ marginTop: 24, textAlign: 'right' }}>
                <Button type="primary" size="large" icon={<SaveOutlined />} onClick={handleSave} loading={isSaving}>
                    Guardar Ficha Técnica
                </Button>
            </div>
        </div>
    );
}

function CalculateTab({ productId, product }: any) {
    const { token } = theme.useToken();
    const { message } = App.useApp();
    
    // Improved Matrix State for Lot
    const [lotColors, setLotColors] = useState<string[]>(['Color 1']);
    const [lotSizes, setLotSizes] = useState<string[]>([]);
    const [lotMatrix, setLotMatrix] = useState<Record<string, Record<string, number>>>({}); // colorIndex -> size -> qty

    // Flattened lot items for calculation logic
    const [lotItems, setLotItems] = useState<any[]>([]);

    // Initialize sizes from product
    useEffect(() => {
        if (product?.product_variant?.length > 0) {
            const sizes = Array.from(new Set(product.product_variant.map((v:any) => v.size))) as string[];
            setLotSizes(sizes);
        } else {
            setLotSizes(['S', 'M', 'L']);
        }
    }, [product]);

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

    const [calcResult, setCalcResult] = useState<any>(null);
    const [isCalculating, setIsCalculating] = useState(false);
    const [isSavingLot, setIsSavingLot] = useState(false);

    const addItem = () => {
        setLotItems([...lotItems, { color: '', size: '', qty: 1, id: Date.now().toString() }]);
    };

    const removeItem = (index: number) => {
        const newArr = [...lotItems];
        newArr.splice(index, 1);
        setLotItems(newArr);
    };

    const handleCalculate = async () => {
        setIsCalculating(true);
        try {
            const res = await fetch(`/api/admin/production/calculate/${productId}`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ lotItems })
            });
            const data = await res.json();
            if (!res.ok) throw new Error(data.error || 'Error de cálculo');
            setCalcResult(data);
            message.success('Cálculo completado');
        } catch(e:any) {
            message.error(e.message);
        } finally {
            setIsCalculating(false);
        }
    };

    const handleSaveLot = async (status: string) => {
        setIsSavingLot(true);
        try {
            const res = await fetch(`/api/admin/production/lots`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ product_id: productId, lotItems, status })
            });
            const data = await res.json();
            if (!res.ok) throw new Error(data.error || 'Error al guardar');
            message.success(data.message);
            // Optionally clear or redirect
        } catch(e:any) {
            message.error(e.message);
        } finally {
            setIsSavingLot(false);
        }
    };

    return (
        <Row gutter={32}>
            <Col span={10}>
                <Title level={4}>Ingresar Cantidades de Corte (Matrix)</Title>
                
                <div style={{ width: '100%', overflowX: 'auto', marginBottom: 16 }}>
                    <table style={{ width: '100%', minWidth: 400, borderCollapse: 'collapse', background: token.colorBgContainer, borderRadius: 8, border: `1px solid ${token.colorBorderSecondary}`, tableLayout: 'fixed' }}>
                        <thead>
                            <tr>
                                <th style={{ textAlign: 'left', padding: '12px 8px', borderBottom: `1px solid ${token.colorBorderSecondary}`, width: '120px' }}>
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
                                <th style={{ padding: '12px 8px', borderBottom: `1px solid ${token.colorBorderSecondary}`, width: 30 }}>
                                    <Button type="link" size="small" icon={<PlusOutlined />} onClick={() => setLotSizes([...lotSizes, 'NEW'])} />
                                </th>
                            </tr>
                        </thead>
                        <tbody>
                            {lotColors.map((color, cIdx) => (
                                <tr key={cIdx}>
                                    <td style={{ padding: '8px' }}>
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

                <Button type="dashed" block icon={<PlusOutlined />} onClick={() => setLotColors([...lotColors, `Color ${lotColors.length+1}`])} style={{ marginBottom: 16 }}>
                    Añadir Color
                </Button>

                <Button type="primary" block style={{ marginTop: 16 }} size="large" icon={<CalculatorOutlined />} onClick={handleCalculate} loading={isCalculating}>
                    Calcular Materiales del Lote
                </Button>
            </Col>

            <Col span={14}>
                {calcResult && (
                    <Card style={{ background: '#fdfdfd', border: '2px solid #e0e0e0' }}>
                        <Title level={4}>Reporte de Producción: {calcResult.totalQty} prendas</Title>
                        
                        <Divider style={{ margin: '12px 0' }} />
                        <Title level={5}>Insumos a Utilizar</Title>
                        <Table 
                            size="small" pagination={false}
                            dataSource={calcResult.supplyNeeds}
                            rowKey={(r:any) => r.supply_id + (r.color || 'none')}
                            columns={[
                                { title: 'Insumo', dataIndex: 'name' },
                                { title: 'Color (Destino)', dataIndex: 'color', render: (v: any) => v ? <Tag color="blue">{v}</Tag> : <Text type="secondary">N/A</Text> },
                                { 
                                    title: 'Merma', 
                                    dataIndex: 'waste', 
                                    render: (w: number) => w > 0 ? <Text type="danger" strong>+{w}</Text> : '-' 
                                },
                                { title: 'Cant. Req.', render: (_: any, r: any) => <strong>{r.quantity} {r.unit}</strong> },
                                { title: 'Costo Est.', dataIndex: 'cost', render: (v: any) => formatPEN(v) }
                            ]}
                        />
                        <div style={{ textAlign: 'right', marginTop: 8 }}><strong>Subtotal Insumos: {formatPEN(calcResult.totalSupplyCost)}</strong></div>

                        <Divider style={{ margin: '12px 0' }} />
                        <Title level={5}>Servicios (Mano de Obra)</Title>
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

                        <Divider style={{ margin: '12px 0' }} />
                        
                        <Row>
                            <Col span={12}>
                                <Text type="secondary">Costo Promedio por Prenda</Text>
                                <Title level={2} style={{ marginTop: 0, color: '#C89F53', marginBottom: 0 }}>{formatPEN(calcResult.avgCostPerGarment)}</Title>
                                <div style={{ marginTop: 8, padding: '8px', backgroundColor: '#f0f5ff', borderLeft: '4px solid #1677ff', borderRadius: '4px', display: 'inline-block' }}>
                                    <Text type="secondary" style={{ display: 'block', fontSize: 12 }}>Precio Venta Sugerido (Min. 30% Margen)</Text>
                                    <Text strong style={{ fontSize: 16, color: '#1677ff' }}>{formatPEN(calcResult.avgCostPerGarment * 1.30)}</Text>
                                </div>
                            </Col>
                            <Col span={12} style={{ textAlign: 'right' }}>
                                <Text type="secondary">Costo Total del Lote</Text>
                                <Title level={2} style={{ marginTop: 0 }}>{formatPEN(calcResult.totalCost)}</Title>
                            </Col>
                        </Row>

                        <div style={{ marginTop: 24, display: 'flex', gap: 16 }}>
                            <Button size="large" onClick={() => handleSaveLot('PENDIENTE')} loading={isSavingLot}>
                                Guardar Presupuesto (Lote Pendiente)
                            </Button>
                            <Button type="primary" size="large" icon={<CheckCircleOutlined />} onClick={() => handleSaveLot('PRODUCIDO')} loading={isSavingLot}>
                                Marcar como PRODUCIDO (Descuenta Stock)
                            </Button>
                        </div>
                    </Card>
                )}
            </Col>
        </Row>
    );
}

const TechPackModal = ({ open, onClose, product, bomData }: any) => {
    // Generate the CSS for A4 print
    const generatePrintStyle = () => (
        <style dangerouslySetInnerHTML={{__html: `
            @media print {
                body > * { display: none !important; }
                .ant-modal-root { display: block !important; }
                .ant-modal-wrap { position: static !important; overflow: visible !important; }
                .ant-modal { box-shadow: none !important; width: 100% !important; max-width: 100% !important; padding: 0 !important; top: 0 !important; }
                .ant-modal-content { padding: 0 !important; box-shadow: none !important; border: none !important; }
                .hide-on-print { display: none !important; }
                .tech-pack-container { width: 100% !important; margin: 0 !important; padding: 0 !important; border: none !important; }
                
                /* Layout */
                @page { size: A4 portrait; margin: 10mm; }
            }

            .tech-pack-container {
                font-family: Arial, sans-serif;
                font-size: 11px;
                color: #000;
                border: 1px solid #000;
                padding: 10px;
                box-sizing: border-box;
            }
            .tp-table { width: 100%; border-collapse: collapse; margin-bottom: 12px; }
            .tp-table th, .tp-table td { border: 1px solid #000; padding: 4px; text-align: left; }
            .tp-table th { background-color: #f7f7f7; font-weight: normal; }
            .tp-input { border: none; outline: none; width: 100%; background: transparent; font-family: Arial, sans-serif; font-size: 11px; }
            .tp-input:focus { background-color: #e6f7ff; }
            .tp-section-title { font-weight: bold; margin: 8px 0 4px; }
        `}} />
    );

    const handlePrint = () => {
        setTimeout(() => window.print(), 200);
    };

    if (!product || !bomData) return null;

    const telas = bomData.supplies?.filter((s:any) => s.supply?.type === 'TELA') || [];
    const avios = bomData.supplies?.filter((s:any) => s.supply?.type !== 'TELA') || [];
    const sizes = [...new Set(telas.map((t:any) => t.size).filter(Boolean).concat(product.product_variant?.map((v:any) => v.size) || []))];
    if (sizes.length === 0) sizes.push('S', 'M', 'L');

    const mainImage = product.product_image?.[0]?.url;

    return (
        <Modal 
            open={open} 
            onCancel={onClose} 
            footer={null} 
            width={750} 
            centered 
            destroyOnHidden
            closable={false}
            styles={{ body: { padding: 0 } }}
        >

            {generatePrintStyle()}
            
            <div className="hide-on-print" style={{ padding: '16px', backgroundColor: '#f0f2f5', display: 'flex', justifyContent: 'flex-end', gap: 12, borderBottom: '1px solid #d9d9d9' }}>
                <Button onClick={onClose}>Cerrar</Button>
                <Button type="primary" onClick={handlePrint} icon={<PrinterOutlined />}>Imprimir A4</Button>
                <div style={{ marginLeft: 'auto', fontSize: 12, color: 'gray' }}>*Haz clic en las celdas vacías para editarlas antes de imprimir.</div>
            </div>

            <div className="tech-pack-container" style={{ minHeight: '297mm', background: '#fff' }}>
                {/* Header 1: Cod / Version / Fecha */}
                <table className="tp-table" style={{ width: '40%', marginLeft: 'auto' }}>
                    <tbody>
                        <tr><th>Cod</th><th>Versión</th><th>Fecha</th></tr>
                        <tr>
                            <td><input className="tp-input" defaultValue={product.slug || ''} /></td>
                            <td><input className="tp-input" defaultValue="1.0" /></td>
                            <td><input className="tp-input" defaultValue={dayjs().format('DD/MM/YYYY')} /></td>
                        </tr>
                    </tbody>
                </table>

                {/* Header 2: Atributos Generales */}
                <table className="tp-table">
                    <tbody>
                        <tr><th>Estilo</th><th>Colección</th><th>Categoría</th><th>Tipo de fit</th></tr>
                        <tr>
                            <td><input className="tp-input" defaultValue={product.name} style={{ fontWeight: 'bold' }} /></td>
                            <td><input className="tp-input" defaultValue="" placeholder="Escribir..." /></td>
                            <td><input className="tp-input" defaultValue="Prenda" /></td>
                            <td><input className="tp-input" defaultValue="" placeholder="Escribir..." /></td>
                        </tr>
                    </tbody>
                </table>

                {/* Área de Imágenes */}
                <div style={{ border: '1px solid #000', height: '400px', marginBottom: '12px', display: 'flex', justifyContent: 'center', alignItems: 'center', backgroundColor: '#fafafa', position: 'relative' }}>
                    {mainImage ? (
                        <img src={mainImage} alt="Referencia" style={{ maxHeight: '100%', maxWidth: '100%', objectFit: 'contain' }} />
                    ) : (
                        <div style={{ color: '#ccc' }}>Área de Imagen: {product.name}</div>
                    )}
                    <div style={{ position: 'absolute', top: 5, left: 5, fontSize: 24 }} className="hide-on-print">↕↔</div>
                </div>

                {/* Tela Principal */}
                <table className="tp-table">
                    <tbody>
                        <tr><th>Tela principal</th><th>Ancho de tela</th><th>Gramaje</th></tr>
                        <tr>
                            <td>
                                <input className="tp-input" defaultValue={
                                    telas.length > 0 ? [...new Set(telas.map((t:any) => t.supply?.name))].join(', ') : 'Ninguna'
                                } />
                            </td>
                            <td><input className="tp-input" defaultValue="" placeholder="Escribir... m" /></td>
                            <td><input className="tp-input" defaultValue="" placeholder="Escribir... g/m2" /></td>
                        </tr>
                        <tr>
                            <th>Colores</th>
                            <td colSpan={2}>
                                <input className="tp-input" defaultValue={
                                    [...new Set(product.product_variant?.map((v:any) => v.color))].join(', ')
                                } />
                            </td>
                        </tr>
                    </tbody>
                </table>

                {/* Consumo de Tela */}
                <div className="tp-section-title">1. Consumo de Tela</div>
                <table className="tp-table">
                    <tbody>
                        <tr>
                            <th>Material</th>
                            {sizes.map((sz: any) => <th key={sz}>Talla {sz}</th>)}
                        </tr>
                        {telas.length === 0 ? (
                            <tr><td colSpan={sizes.length + 1} style={{ textAlign: 'center' }}>- No se definieron telas -</td></tr>
                        ) : (
                            telas.map((t: any) => (
                                <tr key={t.id}>
                                    <td>{t.supply?.name} {t.varies_by_color ? '(Por Color)' : ''}</td>
                                    {sizes.map((sz: any) => {
                                        // Si es global (null) o coincide con la talla, mostramos la cantidad
                                        const qty = (!t.size || t.size === sz) ? Number(t.quantity) : '-';
                                        return <td key={sz}><input className="tp-input" defaultValue={qty !== '-' ? `${qty} ${t.supply?.unit}` : '-'} /></td>
                                    })}
                                </tr>
                            ))
                        )}
                    </tbody>
                </table>

                {/* Avíos */}
                <div className="tp-section-title">2. Avíos</div>
                <table className="tp-table">
                    <tbody>
                        <tr><th>Insumo</th><th>Cantidad</th><th>Medida</th><th>Color</th></tr>
                        {avios.length === 0 ? (
                            <tr><td colSpan={4} style={{ textAlign: 'center' }}>- No se definieron avíos -</td></tr>
                        ) : (
                            avios.map((a: any) => (
                                <tr key={a.id}>
                                    <td><input className="tp-input" defaultValue={a.supply?.name} /></td>
                                    <td><input className="tp-input" defaultValue={Number(a.quantity)} /></td>
                                    <td><input className="tp-input" defaultValue={a.supply?.unit} /></td>
                                    <td><input className="tp-input" defaultValue={a.varies_by_color ? '(Varía por color)' : '-'} /></td>
                                </tr>
                            ))
                        )}
                    </tbody>
                </table>

                {/* Servicios / Operaciones */}
                <div className="tp-section-title">3. Servicios / Operaciones</div>
                <table className="tp-table">
                    <tbody>
                        <tr><th>Operación</th><th>Notas</th></tr>
                        {bomData.services?.length === 0 ? (
                            <tr><td colSpan={2} style={{ textAlign: 'center' }}>- No se definieron servicios -</td></tr>
                        ) : (
                            bomData.services?.map((s: any) => (
                                <tr key={s.id}>
                                    <td><input className="tp-input" defaultValue={s.service?.name} /></td>
                                    <td><input className="tp-input" placeholder="Detalle de operación..." /></td>
                                </tr>
                            ))
                        )}
                    </tbody>
                </table>
            </div>
        </Modal>
    );
};

export default function ProductionDetailPage({ params }: { params: Promise<{ id: string }> }) {
    const { message, modal } = App.useApp();
    const { id } = use(params);
    const { data: product, isLoading: loadingProduct } = useSWR<any>(`/api/admin/products/${id}`, fetcher);
    const { data: bomData, mutate: mutateBom, isLoading: loadingBom } = useSWR<any>(`/api/admin/production/bom/${id}`, fetcher);
    const [isPrintModalOpen, setIsPrintModalOpen] = useState(false);

    if (loadingProduct || loadingBom) return <Spin style={{ display: 'block', margin: '40px auto' }} />;

    return (
        <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
                <Title level={2} style={{ margin: 0 }}>Ficha Técnica: {product?.name}</Title>
                <Button type="default" icon={<PrinterOutlined />} onClick={() => setIsPrintModalOpen(true)}>
                    Imprimir Ficha (Tech Pack)
                </Button>
            </div>
            
            <TechPackModal 
                open={isPrintModalOpen} 
                onClose={() => setIsPrintModalOpen(false)} 
                product={product} 
                bomData={bomData} 
            />

            <Card variant="borderless">
                <Tabs
                    defaultActiveKey="1"
                    items={[
                        {
                            key: '1',
                            label: 'Ficha Técnica (BOM)',
                            children: <BomTab productId={id} bomData={bomData} mutateBom={mutateBom} product={product} />,
                        },
                        {
                            key: '2',
                            label: 'Cálculo de Lote',
                            children: <CalculateTab productId={id} product={product} />,
                        },
                    ]}
                />
            </Card>
        </div>
    );
}
