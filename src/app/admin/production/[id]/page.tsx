'use client';

import React, { useState, useEffect, use } from 'react';
import { Typography, Tabs, Card, Table, Button, Modal, Form, Input, InputNumber, Select, Switch, Space, Tag, message, Row, Col, Divider, Spin } from 'antd';
import { PlusOutlined, SaveOutlined, CalculatorOutlined, CheckCircleOutlined, PrinterOutlined } from '@ant-design/icons';
import useSWR from 'swr';
import { fetcher } from '@/lib/fetcher';
import { formatPEN } from '@/lib/money';
import dayjs from 'dayjs';

const { Title, Text } = Typography;
const { Option } = Select;

function BomTab({ productId, bomData, mutateBom }: any) {
    const { data: supplies } = useSWR<any[]>('/api/admin/supplies', fetcher);
    const { data: services } = useSWR<any[]>('/api/admin/services', fetcher);
    
    const [localSupplies, setLocalSupplies] = useState<any[]>([]);
    const [localServices, setLocalServices] = useState<any[]>([]);
    const [isSaving, setIsSaving] = useState(false);

    useEffect(() => {
        if (bomData) {
            setLocalSupplies(bomData.supplies || []);
            setLocalServices(bomData.services || []);
        }
    }, [bomData]);

    const handleSave = async () => {
        setIsSaving(true);
        try {
            const res = await fetch(`/api/admin/production/bom/${productId}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ supplies: localSupplies, services: localServices })
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
        setLocalSupplies([...localSupplies, { supply_id: null, size: null, quantity: 1, varies_by_color: false, id: Date.now().toString() }]);
    };
    
    const removeSupply = (index: number) => {
        const newArr = [...localSupplies];
        newArr.splice(index, 1);
        setLocalSupplies(newArr);
    };

    const addService = () => {
        setLocalServices([...localServices, { service_id: null, quantity: 1, id: Date.now().toString() }]);
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
                <Card size="small" key={item.id} style={{ marginBottom: 8, background: '#fafafa' }}>
                    <Row gutter={16} align="middle">
                        <Col span={6}>
                            <Select 
                                style={{ width: '100%' }} 
                                placeholder="Seleccionar Insumo"
                                value={item.supply_id}
                                onChange={(val) => {
                                    const n = [...localSupplies]; n[index].supply_id = val; setLocalSupplies(n);
                                }}
                            >
                                {supplies?.map(s => <Option key={s.supply_id} value={s.supply_id}>{s.name} ({s.unit})</Option>)}
                            </Select>
                        </Col>
                        <Col span={6}>
                            <InputNumber 
                                style={{ width: '100%' }} 
                                placeholder="Cantidad" 
                                min={0} step={0.01} 
                                value={item.quantity}
                                onChange={(val) => {
                                    const n = [...localSupplies]; n[index].quantity = val; setLocalSupplies(n);
                                }}
                            />
                        </Col>
                        <Col span={5}>
                            <Select 
                                style={{ width: '100%' }} 
                                placeholder="Toda Talla"
                                allowClear
                                value={item.size}
                                onChange={(val) => {
                                    const n = [...localSupplies]; n[index].size = val; setLocalSupplies(n);
                                }}
                            >
                                <Option value="S">Talla S</Option>
                                <Option value="M">Talla M</Option>
                                <Option value="L">Talla L</Option>
                                <Option value="ALL">Todo</Option>
                            </Select>
                        </Col>
                        <Col span={4}>
                            <Switch 
                                checkedChildren="Color Indep." 
                                unCheckedChildren="Fijo" 
                                checked={item.varies_by_color}
                                onChange={(val) => {
                                    const n = [...localSupplies]; n[index].varies_by_color = val; setLocalSupplies(n);
                                }}
                            />
                        </Col>
                        <Col span={3} style={{ textAlign: 'right' }}>
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
                <Card size="small" key={item.id} style={{ marginBottom: 8, background: '#fafafa' }}>
                    <Row gutter={16} align="middle">
                        <Col span={10}>
                            <Select 
                                style={{ width: '100%' }} 
                                placeholder="Seleccionar Servicio"
                                value={item.service_id}
                                onChange={(val) => {
                                    const n = [...localServices]; n[index].service_id = val; setLocalServices(n);
                                }}
                            >
                                {services?.map(s => <Option key={s.service_id} value={s.service_id}>{s.name} ({formatPEN(Number(s.unit_cost))})</Option>)}
                            </Select>
                        </Col>
                        <Col span={8}>
                            <InputNumber 
                                style={{ width: '100%' }} 
                                placeholder="Cantidad por prenda" 
                                min={1} 
                                value={item.quantity}
                                onChange={(val) => {
                                    const n = [...localServices]; n[index].quantity = val; setLocalServices(n);
                                }}
                            />
                        </Col>
                        <Col span={6} style={{ textAlign: 'right' }}>
                            <Button danger type="text" onClick={() => removeService(index)}>Eliminar</Button>
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

function CalculateTab({ productId }: any) {
    const [lotItems, setLotItems] = useState([{ color: '', size: '', qty: 1, id: Date.now().toString() }]);
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
                <Title level={4}>Ingresar Cantidades de Corte</Title>
                <div style={{ marginBottom: 16 }}>
                    <Button type="dashed" onClick={addItem} style={{ width: '100%' }}>Añadir Fila</Button>
                </div>
                
                {lotItems.map((item, index) => (
                    <Row gutter={8} key={item.id} style={{ marginBottom: 8 }}>
                        <Col span={10}>
                            <Input 
                                placeholder="Color (Ej. Rojo)" 
                                value={item.color}
                                onChange={(e: any) => { const n = [...lotItems]; n[index].color = e.target.value; setLotItems(n); }}
                            />
                        </Col>
                        <Col span={6}>
                            <Input 
                                placeholder="Talla S, M..." 
                                value={item.size}
                                onChange={(e: any) => { const n = [...lotItems]; n[index].size = e.target.value; setLotItems(n); }}
                            />
                        </Col>
                        <Col span={6}>
                            <InputNumber 
                                placeholder="Cant." 
                                min={1} style={{ width: '100%' }}
                                value={item.qty}
                                onChange={(val:any) => { const n = [...lotItems]; n[index].qty = val; setLotItems(n); }}
                            />
                        </Col>
                        <Col span={2}>
                            <Button danger type="text" onClick={() => removeItem(index)}>X</Button>
                        </Col>
                    </Row>
                ))}

                <Button type="primary" block style={{ marginTop: 16 }} size="large" icon={<CalculatorOutlined />} onClick={handleCalculate} loading={isCalculating}>
                    Calcular Materiales
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
                                { title: 'Multiplicador', render: (_: any, r: any) => <span>x{r.quantity}</span> },
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
                            children: <BomTab productId={id} bomData={bomData} mutateBom={mutateBom} />,
                        },
                        {
                            key: '2',
                            label: 'Cálculo de Lote',
                            children: <CalculateTab productId={id} />,
                        },
                    ]}
                />
            </Card>
        </div>
    );
}
