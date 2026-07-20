'use client';
import { toast } from 'sonner';

import React, { useState, useEffect, useMemo } from 'react';
import { Form, Input, InputNumber, Switch, Select, Button, Space, Typography, Card, Divider, Image, AutoComplete } from 'antd';
import { ArrowLeftOutlined, PlusOutlined, DeleteOutlined } from '@ant-design/icons';
import { useRouter } from 'next/navigation';
import useSWR from 'swr';
import { fetcher } from '@/lib/fetcher';
import ImageUploader from '@/components/admin/ImageUploader';
import SizeGuideEditor from '@/components/admin/SizeGuideEditor';


const { Title, Text } = Typography;
const { TextArea } = Input;
const { Option } = Select;

export default function NewProductPage() {
    const router = useRouter();
    const [form] = Form.useForm();
    const [isSaving, setIsSaving] = useState(false);
    const [uploadedImages, setUploadedImages] = useState<any[]>([]);

    const { data: collections } = useSWR<any[]>('/api/admin/collections', fetcher);
    const watchedVariants = Form.useWatch('variants', form) || [];

    const imageColorOptions = useMemo(() => {
        const colors = new Map<string, string>();
        [...watchedVariants, ...uploadedImages].forEach((item: any) => {
            const color = String(item?.color || '').trim();
            if (color) colors.set(color.toLowerCase(), color);
        });
        return Array.from(colors.values()).map((color) => ({ value: color }));
    }, [watchedVariants, uploadedImages]);

    // Default values for a new product
    useEffect(() => {
        form.setFieldsValue({
            is_active: true,
            base_price: 0,
            base_cost: 0,
            size_guide_url: null,
            bulk_stock: 0,
            bulk_is_active: true,
            // Create at least one empty variant by default
            variants: [{ sku: '', size: 'Única', color: 'Unicolor', price: null, cost: null, stock: 0, is_active: true }]
        });
    }, [form]);
    const [manualSkuIndices, setManualSkuIndices] = useState<Set<number>>(new Set());

    const generateSKU = (name: string, color: string, size: string) => {
        const namePart = (name || '').replace(/\s+/g, '').substring(0, 4).toUpperCase();
        const colorPart = (color || '').replace(/\s+/g, '').substring(0, 3).toUpperCase();
        const sizePart = (size || '').replace(/\s+/g, '').toUpperCase();
        
        if (!namePart && !colorPart && !sizePart) return '';
        return `${namePart}-${colorPart}-${sizePart}`.replace(/-+$/, '').replace(/-$/, '');
    };

    const normalizeList = (value: string) => String(value || '')
        .split(/[\n,;]+/)
        .map((item) => item.trim())
        .filter(Boolean);

    const normalizeComparable = (value: string) => String(value || '').trim().normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();

    const variantKey = (size: string, color: string) => `${normalizeComparable(size)}|${normalizeComparable(color)}`;

    const isDefaultPlaceholderVariant = (variant: any) => {
        const normalizedSize = normalizeComparable(variant?.size);
        const normalizedColor = normalizeComparable(variant?.color);
        return !variant?.variant_id
            && normalizedSize === 'unica'
            && normalizedColor === 'unicolor'
            && Number(variant?.stock || 0) === 0
            && !variant?.price
            && !variant?.cost;
    };

    const getUniqueSku = (baseSku: string, usedSkus: Set<string>) => {
        const base = baseSku || `VAR-${usedSkus.size + 1}`;
        let sku = base;
        let counter = 2;

        while (usedSkus.has(sku.toUpperCase())) {
            sku = `${base}-${counter}`;
            counter += 1;
        }

        usedSkus.add(sku.toUpperCase());
        return sku;
    };

    const addGeneratedVariants = () => {
        const values = form.getFieldsValue();
        const sizes = normalizeList(values.bulk_sizes);
        const colors = normalizeList(values.bulk_colors);

        if (sizes.length === 0 || colors.length === 0) {
            toast.warning('Ingresa al menos una talla y un color para generar variantes');
            return;
        }

        const rawVariants = [...(values.variants || [])];
        const currentVariants = rawVariants.length === 1 && isDefaultPlaceholderVariant(rawVariants[0]) ? [] : rawVariants;
        const existingKeys = new Set(currentVariants.map((v: any) => variantKey(v.size, v.color)));
        const usedSkus = new Set(currentVariants.map((v: any) => String(v.sku || '').toUpperCase()).filter(Boolean));
        const generated: any[] = [];

        sizes.forEach((size) => {
            colors.forEach((color) => {
                const key = variantKey(size, color);
                if (existingKeys.has(key)) return;

                existingKeys.add(key);
                generated.push({
                    sku: getUniqueSku(generateSKU(values.name, color, size), usedSkus),
                    size,
                    color,
                    stock: values.bulk_stock ?? 0,
                    price: values.bulk_price ?? null,
                    cost: values.bulk_cost ?? null,
                    is_active: values.bulk_is_active ?? true,
                });
            });
        });

        if (generated.length === 0) {
            toast.info('Todas esas combinaciones ya existen');
            return;
        }

        form.setFieldsValue({ variants: [...currentVariants, ...generated] });
        toast.success(`${generated.length} variantes generadas`);
    };

    const handleValuesChange = (changedValues: any, allValues: any) => {
        // If name changed, update slug
        if (changedValues.name) {
            const slug = changedValues.name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)+/g, '');
            form.setFieldsValue({ slug });
        }

        // Track manual SKU edits
        if (changedValues.variants) {
            changedValues.variants.forEach((v: any, idx: number) => {
                if (v && v.sku !== undefined) {
                    setManualSkuIndices(prev => new Set(prev).add(idx));
                }
            });
        }

        // SKU Generation logic (Reactive)
        if (changedValues.name || changedValues.variants) {
            const { name, variants } = allValues;
            const newVariants = [...(variants || [])];
            let changed = false;

            newVariants.forEach((v, idx) => {
                // If the user hasn't manually edited this SKU, or it is empty, we update it
                if (!manualSkuIndices.has(idx) || !v.sku) {
                    const suggested = generateSKU(name, v.color, v.size);
                    if (suggested && suggested !== v.sku) {
                        newVariants[idx].sku = suggested;
                        changed = true;
                    }
                }
            });

            if (changed) {
                form.setFieldsValue({ variants: newVariants });
            }
        }
    };

    const handleUploadSuccess = (url: string, public_id: string) => {
        setUploadedImages(prev => [...prev, { url, public_id, color: null, sort_order: prev.length }]);
    };

    const removeImage = (indexToRemove: number) => {
        setUploadedImages(prev => prev.filter((_, idx) => idx !== indexToRemove));
    };

    const updateImageColor = (indexToUpdate: number, color: string) => {
        setUploadedImages(prev => prev.map((img, idx) => (
            idx === indexToUpdate ? { ...img, color: color.trim() || null } : img
        )));
    };

    const onFinish = async (values: any) => {


        setIsSaving(true);
        try {
            // Prepare payload
            const payload = {
                ...values,
                images: uploadedImages
            };

            const res = await fetch('/api/admin/products', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload),
            });

            if (!res.ok) {
                const err = await res.json();
                throw new Error(err.error || 'Error creando producto');
            }

            toast.success('Producto creado satisfactoriamente');
            router.push('/admin/products');
        } catch (error: any) {
            toast.error(error.message);
        } finally {
            setIsSaving(false);
        }
    };

    return (
        <div style={{ maxWidth: 1000, margin: '0 auto' }}>
            <div style={{ display: 'flex', alignItems: 'center', marginBottom: 24, gap: 16 }}>
                <Button onClick={() => router.back()} icon={<ArrowLeftOutlined />} shape="circle" />
                <Title level={3} style={{ margin: 0 }}>Crear Nuevo Producto</Title>
            </div>

            <Form 
                layout="vertical" 
                form={form} 
                onFinish={onFinish}
                onValuesChange={handleValuesChange}
            >

                {/* --- SECCIÓN PRINCIPAL --- */}
                <Card title="Información Básica" variant="borderless" style={{ marginBottom: 24 }}>
                    <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1fr) minmax(0, 1fr)', gap: 16 }}>
                        <Form.Item name="name" label="Nombre del Producto" rules={[{ required: true, message: 'Requerido' }]}>
                            <Input placeholder="Ej. Vestido Gala Noche" />
                        </Form.Item>

                        <Form.Item name="slug" label="URL amigable (Slug)" rules={[{ required: true, message: 'Requerido' }]}>
                            <Input placeholder="vestido-gala-noche" />
                        </Form.Item>
                    </div>

                    <Form.Item name="description" label="Descripción">
                        <TextArea rows={4} placeholder="Detalles de la prenda, material, cuidado..." />
                    </Form.Item>

                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 16 }}>
                        <Form.Item name="base_price" label="Precio de Venta Base (S/)" rules={[{ required: true, message: 'Requerido' }]}>
                            <InputNumber style={{ width: '100%' }} min={0} step={0.01} precision={2} />
                        </Form.Item>
                        <Form.Item name="base_cost" label="Costo Base (S/) Opcional">
                            <InputNumber style={{ width: '100%' }} min={0} step={0.01} precision={2} />
                        </Form.Item>
                        <Form.Item name="is_active" label="Visibilidad" valuePropName="checked">
                            <Switch checkedChildren="Público" unCheckedChildren="Oculto" />
                        </Form.Item>
                    </div>

                    <Form.Item name="collections" label="Categorías / Colecciones">
                        <Select mode="multiple" placeholder="Selecciona colecciones" style={{ width: '100%' }}>
                            {collections?.filter((c:any) => c.is_active).map((c: any) => (
                                <Option key={c.collection_id} value={c.collection_id}>{c.name}</Option>
                            ))}
                        </Select>
                    </Form.Item>
                </Card>

                {/* --- SECCIÓN IMÁGENES --- */}
                <Card title="Imágenes del Producto" variant="borderless" style={{ marginBottom: 24 }}>
                    <div style={{ marginBottom: 16 }}>
                        <ImageUploader onUploadSuccess={handleUploadSuccess} buttonText="Añadir Foto" />
                    </div>
                    
                    <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap' }}>
                        {uploadedImages.map((img, idx) => (
                            <div key={idx} style={{ position: 'relative', width: 120 }}>
                                <Image src={img.url} alt={`img-${idx}`} width={120} height={160} style={{ objectFit: 'cover', borderRadius: '8px' }} />
                                <Button 
                                    danger 
                                    type="primary" 
                                    shape="circle" 
                                    icon={<DeleteOutlined />} 
                                    size="small"
                                    style={{ position: 'absolute', top: -8, right: -8, zIndex: 10 }}
                                    onClick={() => removeImage(idx)}
                                />
                                <AutoComplete
                                    allowClear
                                    value={img.color || ''}
                                    options={imageColorOptions}
                                    onChange={(value) => updateImageColor(idx, value)}
                                    placeholder="Color de foto"
                                    style={{ width: 120, marginTop: 8 }}
                                />
                            </div>
                        ))}
                        {uploadedImages.length === 0 && (
                            <Text type="secondary">Sube al menos una imagen para tu prenda.</Text>
                        )}
                    </div>
                </Card>

                {/* --- SECCIÓN GUÍA DE TALLAS --- */}
                <Card title="Guía de Tallas" variant="borderless" style={{ marginBottom: 24 }}>
                    <div style={{ marginBottom: 24 }}>
                        <Text strong>Opción 1: Tabla Estructurada (Recomendado)</Text>
                        <div style={{ marginTop: 8 }}>
                            <Form.Item name="size_guide_json">
                                <SizeGuideEditor />
                            </Form.Item>
                        </div>
                    </div>
                    
                    <Divider />
                    
                    <Text strong>Opción 2: Imagen de la Guía</Text>
                    <div style={{ marginTop: 16, marginBottom: 16 }}>
                        <ImageUploader 
                            onUploadSuccess={(url) => form.setFieldsValue({ size_guide_url: url })} 
                            buttonText={form.getFieldValue('size_guide_url') ? "Cambiar Imagen" : "Subir Imagen"}
                        />
                    </div>
                    <Form.Item name="size_guide_url" hidden><Input /></Form.Item>
                    
                    <Form.Item shouldUpdate={(prevValues, currentValues) => prevValues.size_guide_url !== currentValues.size_guide_url}>
                        {({ getFieldValue }) => {
                            const url = getFieldValue('size_guide_url');
                            return url ? (
                                <div style={{ position: 'relative', width: 200 }}>
                                    <Image src={url} alt="Guía de tallas" width={200} style={{ borderRadius: '8px', border: '1px solid #f0f0f0' }} />
                                    <Button 
                                        danger 
                                        type="primary" 
                                        shape="circle" 
                                        icon={<DeleteOutlined />} 
                                        size="small"
                                        style={{ position: 'absolute', top: -8, right: -8, zIndex: 10 }}
                                        onClick={() => form.setFieldsValue({ size_guide_url: null })}
                                    />
                                </div>
                            ) : null;
                        }}
                    </Form.Item>
                </Card>


                {/* --- SECCIÓN VARIANTES --- */}
                <Card title="Variantes (Tallas y Colores)" variant="borderless" style={{ marginBottom: 24 }}>
                    <Card size="small" title="Generador rápido" style={{ marginBottom: 16 }}>
                        <Text type="secondary" style={{ display: 'block', marginBottom: 12 }}>
                            Escribe tallas y colores separados por coma o salto de línea. Se generará una variante por cada combinación.
                        </Text>
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 16 }}>
                            <Form.Item name="bulk_sizes" label="Tallas">
                                <TextArea rows={2} placeholder="S, M, L" />
                            </Form.Item>
                            <Form.Item name="bulk_colors" label="Colores">
                                <TextArea rows={2} placeholder="Negro, Marrón, Vino, Perla" />
                            </Form.Item>
                            <Form.Item name="bulk_stock" label="Stock inicial">
                                <InputNumber style={{ width: '100%' }} min={0} />
                            </Form.Item>
                            <Form.Item name="bulk_price" label="Precio ref. opcional">
                                <InputNumber style={{ width: '100%' }} min={0} step={0.01} precision={2} placeholder="Usa el base" />
                            </Form.Item>
                            <Form.Item name="bulk_cost" label="Costo opcional">
                                <InputNumber style={{ width: '100%' }} min={0} step={0.01} precision={2} placeholder="Usa el base" />
                            </Form.Item>
                            <Form.Item name="bulk_is_active" label="Activas" valuePropName="checked">
                                <Switch checkedChildren="Sí" unCheckedChildren="No" />
                            </Form.Item>
                        </div>
                        <Button type="primary" ghost onClick={addGeneratedVariants} icon={<PlusOutlined />}>
                            Generar variantes
                        </Button>
                    </Card>

                    <Form.List name="variants">
                        {(fields, { add, remove }) => (
                            <>
                                {fields.map(({ key, name, ...restField }, index) => (
                                    <Card key={key} size="small" style={{ marginBottom: 16 }}>
                                        <div style={{ display: 'flex', gap: 16, alignItems: 'flex-start' }}>
                                            <div style={{ flex: 1, display: 'grid', gridTemplateColumns: 'minmax(0, 1fr) minmax(0, 1fr) minmax(0, 1fr)', gap: 16 }}>
                                                <Form.Item {...restField} name={[name, 'sku']} label="SKU" rules={[{ required: true, message: 'SKU requerido' }]}>
                                                    <Input placeholder="Ej. VNT-R-S" />
                                                </Form.Item>
                                                <Form.Item {...restField} name={[name, 'size']} label="Talla" rules={[{ required: true, message: 'Obligatorio' }]}>
                                                    <Input placeholder="S, M, L..." />
                                                </Form.Item>
                                                <Form.Item {...restField} name={[name, 'color']} label="Color" rules={[{ required: true, message: 'Obligatorio' }]}>
                                                    <Input placeholder="Rojo, Azul..." />
                                                </Form.Item>
                                                <Form.Item {...restField} name={[name, 'stock']} label="Stock Físico" rules={[{ required: true, message: 'Obligatorio' }]}>
                                                    <InputNumber style={{ width: '100%' }} min={0} />
                                                </Form.Item>
                                                <Form.Item {...restField} name={[name, 'price']} label="Precio Ref. (Opcional)">
                                                    <InputNumber style={{ width: '100%' }} min={0} step={0.01} placeholder="Usa el Base si es vacío" />
                                                </Form.Item>
                                                <Form.Item {...restField} name={[name, 'is_active']} label="Activa" valuePropName="checked">
                                                    <Switch checkedChildren="Sí" unCheckedChildren="No" />
                                                </Form.Item>
                                            </div>
                                            {fields.length > 1 && (
                                                <Button type="text" danger onClick={() => remove(name)} icon={<DeleteOutlined />} style={{ marginTop: 32 }} />
                                            )}
                                        </div>
                                    </Card>
                                ))}
                                <Button type="dashed" onClick={() => add({ size: 'Única', color: 'Unicolor', is_active: true, stock: 0 })} block icon={<PlusOutlined />}>
                                    Añadir otra variante
                                </Button>
                            </>
                        )}
                    </Form.List>
                </Card>

                <div style={{ textAlign: 'right', paddingBottom: 64 }}>
                    <Space size="large">
                        <Button onClick={() => router.back()}>Cancelar</Button>
                        <Button type="primary" htmlType="submit" size="large" loading={isSaving}>
                            Guardar Producto y Salir
                        </Button>
                    </Space>
                </div>
            </Form>
        </div>
    );
}
