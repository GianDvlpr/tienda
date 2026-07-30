'use client';

import React, { useState, useEffect } from 'react';
import { Table, Input, Button, Space, Card, Typography, Popconfirm, Divider, theme } from 'antd';
import { PlusOutlined, DeleteOutlined, ColumnHeightOutlined, ColumnWidthOutlined } from '@ant-design/icons';

const { Text } = Typography;

interface SizeGuideData {
    columns: string[]; // ['S', 'M', 'L']
    rows: {
        label: string;
        values: string[];
    }[];
}

interface SizeGuideEditorProps {
    value?: string | null;
    onChange?: (value: string | null) => void;
}

export default function SizeGuideEditor({ value, onChange }: SizeGuideEditorProps) {
    const { token } = theme.useToken();
    const [draggedColumnIndex, setDraggedColumnIndex] = useState<number | null>(null);
    const [data, setData] = useState<SizeGuideData>({
        columns: ['S', 'M', 'L'],
        rows: [
            { label: 'Busto (cm)', values: ['', '', ''] },
            { label: 'Cintura (cm)', values: ['', '', ''] }
        ]
    });

    useEffect(() => {
        if (value) {
            try {
                const parsed = JSON.parse(value);
                if (parsed.columns && parsed.rows) {
                    setData(parsed);
                }
            } catch (e) {
                console.error("Error parsing size guide JSON", e);
            }
        }
    }, [value]);

    const triggerChange = (newData: SizeGuideData) => {
        setData(newData);
        if (onChange) {
            onChange(JSON.stringify(newData));
        }
    };

    const addColumn = () => {
        const nextCol = `Talla ${data.columns.length + 1}`;
        const newData = {
            columns: [...data.columns, nextCol],
            rows: data.rows.map(row => ({
                ...row,
                values: [...row.values, '']
            }))
        };
        triggerChange(newData);
    };

    const removeColumn = (index: number) => {
        if (data.columns.length <= 1) return;
        const newData = {
            columns: data.columns.filter((_, i) => i !== index),
            rows: data.rows.map(row => ({
                ...row,
                values: row.values.filter((_, i) => i !== index)
            }))
        };
        triggerChange(newData);
    };

    const moveColumn = (fromIndex: number, toIndex: number) => {
        if (fromIndex === toIndex || fromIndex < 0 || toIndex < 0 || fromIndex >= data.columns.length || toIndex >= data.columns.length) return;
        const nextColumns = [...data.columns];
        const [movedColumn] = nextColumns.splice(fromIndex, 1);
        nextColumns.splice(toIndex, 0, movedColumn);

        const nextRows = data.rows.map((row) => {
            const values = [...row.values];
            const [movedValue] = values.splice(fromIndex, 1);
            values.splice(toIndex, 0, movedValue ?? '');
            return { ...row, values };
        });

        triggerChange({ columns: nextColumns, rows: nextRows });
    };

    const addRow = () => {
        const newData = {
            ...data,
            rows: [
                ...data.rows,
                { label: 'Nueva Medida', values: new Array(data.columns.length).fill('') }
            ]
        };
        triggerChange(newData);
    };

    const removeRow = (index: number) => {
        const newData = {
            ...data,
            rows: data.rows.filter((_, i) => i !== index)
        };
        triggerChange(newData);
    };

    const updateHeader = (index: number, val: string) => {
        const newCols = [...data.columns];
        newCols[index] = val;
        triggerChange({ ...data, columns: newCols });
    };

    const updateRowLabel = (index: number, val: string) => {
        const newRows = [...data.rows];
        newRows[index].label = val;
        triggerChange({ ...data, rows: newRows });
    };

    const updateCellValue = (rowIndex: number, colIndex: number, val: string) => {
        const newRows = [...data.rows];
        newRows[rowIndex].values[colIndex] = val;
        triggerChange({ ...data, rows: newRows });
    };

    const applyTemplate = (labels: string[]) => {
        const newData = {
            ...data,
            rows: labels.map(label => ({
                label: `${label} (cm)`,
                values: new Array(data.columns.length).fill('')
            }))
        };
        triggerChange(newData);
    };

    const templates = {
        'Blusa/Top': ['Busto', 'Largo', 'Manga', 'Hombros'],
        'Pantalón': ['Cintura', 'Cadera', 'Largo', 'Tiro', 'Muslo'],
        'Falda': ['Cintura', 'Cadera', 'Largo'],
        'Vestido': ['Busto', 'Cintura', 'Cadera', 'Largo'],
        'Chaleco': ['Busto', 'Espalda', 'Largo'],
        'Saco/Casaca': ['Busto', 'Hombros', 'Manga', 'Largo']
    };


    return (
        <Card size="small" variant="borderless" style={{ background: token.colorBgLayout, border: `1px solid ${token.colorBorderSecondary}` }}>
            <div style={{ marginBottom: 16 }}>
                <Text strong style={{ fontSize: 13, display: 'block', marginBottom: 8 }}>Plantillas Rápidas:</Text>
                <Space wrap>
                    {Object.entries(templates).map(([name, labels]) => (
                        <Button 
                            key={name} 
                            size="small" 
                            onClick={() => applyTemplate(labels)}
                        >
                            {name}
                        </Button>
                    ))}
                </Space>
            </div>

            <Divider style={{ margin: '12px 0' }} />

            <div style={{ overflowX: 'auto' }}>

                <table style={{ width: '100%', borderCollapse: 'collapse', marginBottom: 16 }}>
                    <thead>
                        <tr>
                            <th style={{ padding: 8, textAlign: 'left', border: `1px solid ${token.colorBorderSecondary}`, background: token.colorBgContainer, minWidth: 120 }}>
                                Medida / Talla
                            </th>
                            {data.columns.map((col, i) => (
                                <th
                                    key={i}
                                    draggable
                                    onDragStart={() => setDraggedColumnIndex(i)}
                                    onDragOver={(event) => event.preventDefault()}
                                    onDrop={() => {
                                        if (draggedColumnIndex !== null) moveColumn(draggedColumnIndex, i);
                                        setDraggedColumnIndex(null);
                                    }}
                                    onDragEnd={() => setDraggedColumnIndex(null)}
                                    title="Arrastra para reordenar la talla"
                                    style={{
                                        padding: 8,
                                        border: `1px solid ${token.colorBorderSecondary}`,
                                        background: draggedColumnIndex === i ? token.colorFillSecondary : token.colorBgContainer,
                                        minWidth: 100,
                                        cursor: 'grab',
                                    }}
                                >
                                    <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                                        <Input 
                                            size="small" 
                                            value={col} 
                                            onChange={e => updateHeader(i, e.target.value)} 
                                            style={{ textAlign: 'center', fontWeight: 'bold' }}
                                        />
                                        <Space.Compact style={{ width: '100%' }}>
                                            <Button size="small" disabled={i === 0} onClick={() => moveColumn(i, i - 1)} style={{ width: '50%' }}>←</Button>
                                            <Button size="small" disabled={i === data.columns.length - 1} onClick={() => moveColumn(i, i + 1)} style={{ width: '50%' }}>→</Button>
                                        </Space.Compact>
                                        <Button 
                                            type="text" 
                                            danger 
                                            icon={<DeleteOutlined />} 
                                            size="small" 
                                            onClick={() => removeColumn(i)} 
                                            disabled={data.columns.length <= 1}
                                        />
                                    </div>
                                </th>
                            ))}
                            <th style={{ padding: 8, border: `1px solid ${token.colorBorderSecondary}`, width: 40, background: token.colorBgContainer }}>
                                <Button type="dashed" icon={<PlusOutlined />} onClick={addColumn} size="small" />
                            </th>
                        </tr>
                    </thead>
                    <tbody>
                        {data.rows.map((row, rowIndex) => (
                            <tr key={rowIndex}>
                                <td style={{ padding: 8, border: `1px solid ${token.colorBorderSecondary}` }}>
                                    <div style={{ display: 'flex', gap: 4, alignItems: 'center' }}>
                                        <Button 
                                            type="text" 
                                            danger 
                                            icon={<DeleteOutlined />} 
                                            size="small" 
                                            onClick={() => removeRow(rowIndex)} 
                                        />
                                        <Input 
                                            size="small" 
                                            value={row.label} 
                                            onChange={e => updateRowLabel(rowIndex, e.target.value)} 
                                        />
                                    </div>
                                </td>
                                {row.values.map((val, colIndex) => (
                                    <td key={colIndex} style={{ padding: 8, border: `1px solid ${token.colorBorderSecondary}` }}>
                                        <Input 
                                            size="small" 
                                            value={val} 
                                            onChange={e => updateCellValue(rowIndex, colIndex, e.target.value)} 
                                            style={{ textAlign: 'center' }}
                                        />
                                    </td>
                                ))}
                                <td style={{ border: `1px solid ${token.colorBorderSecondary}` }}></td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
            <Button type="dashed" icon={<PlusOutlined />} onClick={addRow} block>
                Añadir Medida (Fila)
            </Button>
            
            <div style={{ marginTop: 12 }}>
                <Text type="secondary" style={{ fontSize: 12 }}>
                    * Las guías de tallas en formato de tabla son más accesibles y profesionales que las imágenes.
                </Text>
            </div>
        </Card>
    );
}
