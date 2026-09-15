'use client';

import React, { useState } from 'react';
import { App, Alert, Popconfirm, Typography, Card, Table, Tag, Button, Space, Modal, Descriptions, Divider, Row, Col } from 'antd';
import { PrinterOutlined, FileTextOutlined } from '@ant-design/icons';
import useSWR from 'swr';
import { fetcher } from '@/lib/fetcher';
import { formatPEN } from '@/lib/money';
import dayjs from 'dayjs';

const { Title, Text } = Typography;

export default function LotsHistoryPage() {
    const { data: lots, isLoading, error, mutate } = useSWR<any[]>('/api/admin/production/lots', fetcher);
    const { message } = App.useApp();
    const [finishingId, setFinishingId] = useState<string | null>(null);
    const finishLot = async (id: string) => {
        setFinishingId(id);
        try {
            const res = await fetch('/api/admin/production/lots/' + id + '/finish', { method: 'POST' });
            const data = await res.json();
            if (!res.ok) throw new Error(data.error || 'No se pudo finalizar');
            message.success('Producción finalizada: materiales descontados y prendas ingresadas');
            await mutate();
        } catch (error) { message.error(error instanceof Error ? error.message : 'Error al finalizar'); }
        finally { setFinishingId(null); }
    };
    const [selectedLot, setSelectedLot] = useState<any>(null);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [printMode, setPrintMode] = useState<'ODT' | 'COST'>('ODT');

    const viewLot = (lot: any) => {
        setSelectedLot(lot);
        setPrintMode('ODT');
        setIsModalOpen(true);
    };

    const handlePrint = (mode: 'ODT' | 'COST') => {
        setPrintMode(mode);
        setTimeout(() => {
            window.print();
        }, 100);
    };

    const columns = [
        { title: 'Lote', dataIndex: 'code', key: 'code', render: (c: string) => <strong>{c}</strong> },
        { title: 'Fecha', dataIndex: 'created_at', render: (d: string) => dayjs(d).format('DD/MM/YYYY HH:mm') },
        { title: 'Producto Destino', render: (_: any, r: any) => r.product?.name },
        { 
            title: 'Prendas', 
            render: (_: any, r: any) => r.items?.reduce((acc: number, cur: any) => acc + cur.qty, 0) || 0
        },
        { title: 'Costo Total', dataIndex: 'total_cost', render: (v: any) => formatPEN(Number(v)) },
        { 
            title: 'Estado', 
            dataIndex: 'status', 
            render: (s: string) => <Tag color={s === 'PRODUCIDO' ? 'green' : 'orange'}>{s}</Tag>
        },
        { 
            title: 'Acciones', 
            render: (_: any, r: any) => (
                <Space wrap>
                    <Button size="small" icon={<FileTextOutlined />} onClick={() => viewLot(r)}>Ver Detalle</Button>
                    {r.status === 'PENDIENTE' && <Popconfirm title="¿Finalizar este lote?" description="Se consumirán materiales y se ingresarán las prendas al almacén." onConfirm={() => finishLot(r.lot_id)}>
                        <Button size="small" type="primary" loading={finishingId === r.lot_id} disabled={finishingId !== null}>Finalizar</Button>
                    </Popconfirm>}
                </Space>
            )
        }
    ];

    const generatePrintStyle = () => (
        <style dangerouslySetInnerHTML={{__html: `
            @media print {
                body > * { display: none !important; }
                .ant-modal-root { display: block !important; }
                .ant-modal-wrap { position: static !important; overflow: visible !important; }
                .ant-modal { box-shadow: none !important; width: 100% !important; max-width: 100% !important; padding: 0 !important; top: 0 !important; }
                .ant-modal-content { padding: 0 !important; box-shadow: none !important; }
                .hide-on-print { display: none !important; }
                .print-only { display: block !important; }
            }
        `}} />
    );

    return (
        <div>
            {generatePrintStyle()}
            <Title level={2} style={{ marginBottom: 24 }}>Historial de Lotes / Órdenes</Title>
            {error && <Alert type="error" showIcon title="No se pudo cargar el historial" description={error.message} style={{ marginBottom: 16 }} />}
            <Card variant="borderless">
                <Table 
                    columns={columns} 
                    dataSource={lots} 
                    loading={isLoading} 
                    rowKey="lot_id"
                />
            </Card>

            <Modal 
                title={null} 
                open={isModalOpen} 
                onCancel={() => setIsModalOpen(false)} 
                footer={null}
                width={800}
                destroyOnHidden
            >

                {selectedLot && (
                    <div id="print-area" style={{ padding: '20px' }}>
                        {/* Header */}
                        <div style={{ textAlign: 'center', marginBottom: 24 }}>
                            <Title level={3} style={{ margin: 0 }}>ORDEN DE TRABAJO (ODT) - {selectedLot.code}</Title>
                            <Text type="secondary">Fecha: {dayjs(selectedLot.created_at).format('DD/MM/YYYY')} | Estado: {selectedLot.status}</Text>
                        </div>

                        <Descriptions bordered size="small" column={2}>
                            <Descriptions.Item label="Producto A Confeccionar" span={2}><strong>{selectedLot.product?.name}</strong></Descriptions.Item>
                            <Descriptions.Item label="Notas">{selectedLot.notes || 'Ninguna'}</Descriptions.Item>
                            
                            {printMode === 'COST' && (() => {
                                const totalQty = selectedLot.items?.reduce((acc: number, cur: any) => acc + cur.qty, 0) || 1;
                                const avgCost = Number(selectedLot.total_cost) / totalQty;
                                const suggestedPrice = avgCost * 1.30;
                                return (
                                    <>
                                        <Descriptions.Item label="Presupuesto Total" className="hide-on-print">
                                            <strong style={{ fontSize: 18 }}>{formatPEN(Number(selectedLot.total_cost))}</strong>
                                        </Descriptions.Item>
                                        <Descriptions.Item label="Costo Prom. Unitario" className="hide-on-print">
                                            {formatPEN(avgCost)}
                                        </Descriptions.Item>
                                        <Descriptions.Item label="Precio Venta Sugerido (Min. +30%)" className="hide-on-print">
                                            <strong style={{ color: '#1677ff' }}>{formatPEN(suggestedPrice)}</strong>
                                        </Descriptions.Item>
                                    </>
                                );
                            })()}
                        </Descriptions>

                        {selectedLot.cost_snapshot && (() => {
                            const snapshot = JSON.parse(selectedLot.cost_snapshot);
                            return <Descriptions bordered size="small" column={1} title="Costos guardados al crear el lote">
                                {(snapshot.serviceNeeds || []).map((service: { service_id: string; name: string; quantity: number; unit_cost: number; cost: number }, index: number) =>
                                    <Descriptions.Item key={service.service_id + index} label={service.name}>{service.quantity} × {formatPEN(service.unit_cost)} = {formatPEN(service.cost)}</Descriptions.Item>)}
                            </Descriptions>;
                        })()}
                        <Divider style={{ margin: '16px 0' }}>CANTIDADES A CORTAR</Divider>
                        
                        <Table 
                            size="small" 
                            pagination={false}
                            dataSource={selectedLot.items}
                            rowKey="item_id"
                            columns={[
                                { title: 'Talla', dataIndex: 'size' },
                                { title: 'Color', dataIndex: 'color' },
                                { title: 'Unidades a Cortar', dataIndex: 'qty', render: v => <strong>{v} und</strong> },
                            ]}
                        />

                        <Divider style={{ margin: '16px 0' }}>REQUISICIÓN DE ALMACÉN (Insumos)</Divider>

                        <Table 
                            size="small" 
                            pagination={false}
                            dataSource={selectedLot.consumptions}
                            rowKey="consump_id"
                            columns={[
                                { title: 'Material / Insumo', render: (_, r: any) => r.supply?.name },
                                { title: 'Color Relacionado', dataIndex: 'color', render: v => v || 'N/A' },
                                { title: 'Cantidad a Entregar', render: (_, r: any) => <strong>{Number(r.quantity)} {r.supply?.unit}</strong> },
                                ...(printMode === 'COST' ? [
                                    { title: 'Costo Unit.', className: 'hide-on-print', render: (_: any, r: any) => formatPEN(Number(r.unit_cost)) },
                                    { title: 'Subtotal.', className: 'hide-on-print', render: (_: any, r: any) => formatPEN(Number(r.quantity) * Number(r.unit_cost)) }
                                ] : [])
                            ]}
                        />

                        <div className="hide-on-print" style={{ marginTop: 24, textAlign: 'right', display: 'flex', justifyContent: 'flex-end', gap: 16 }}>
                            <Button onClick={() => setIsModalOpen(false)}>Cerrar</Button>
                            <Button icon={<PrinterOutlined />} onClick={() => handlePrint('ODT')}>
                                Imprimir ODT (Para Taller)
                            </Button>
                            <Button type="primary" icon={<PrinterOutlined />} onClick={() => handlePrint('COST')}>
                                Imprimir Presupuesto (Con Costos)
                            </Button>
                        </div>
                    </div>
                )}
            </Modal>
        </div>
    );
}
