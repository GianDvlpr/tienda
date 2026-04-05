'use client';
import { toast } from 'sonner';

import React, { useState, useEffect } from 'react';
import { Form, Input, InputNumber, Switch, Select, Button, Space, Typography, Card, Image, Spin } from 'antd';
import { ArrowLeftOutlined, PlusOutlined, DeleteOutlined } from '@ant-design/icons';
import { useRouter, useParams } from 'next/navigation';
import useSWR from 'swr';
import { fetcher } from '@/lib/fetcher';
import ImageUploader from '@/components/admin/ImageUploader';

const { Title, Text } = Typography;
const { TextArea } = Input;
const { Option } = Select;

export default function EditProductPage() {
    const router = useRouter();
    const params = useParams();
    const id = params.id as string;

    const [form] = Form.useForm();
    const [isSaving, setIsSaving] = useState(false);
    const [uploadedImages, setUploadedImages] = useState<any[]>([]);

    const { data: collections } = useSWR<any[]>('/api/admin/collections', fetcher);
    const { data: product, isLoading, error } = useSWR<any>(id ? `/api/admin/products/${id}` : null, fetcher);

    const [manualSkuIndices, setManualSkuIndices] = useState<Set<number>>(new Set());

    useEffect(() => {
        if (product) {
            form.setFieldsValue({
                name: product.name,
                slug: product.slug,
                description: product.description,
                base_price: Number(product.base_price),
                base_cost: product.base_cost ? Number(product.base_cost) : null,
                is_active: product.is_active,
                size_guide_url: product.size_guide_url,
                collections: product.product_collection?.map((pc: any) => pc.collection_id) || [],
                variants: product.product_variant?.map((v: any) => ({
                    ...v,
                    price: v.price ? Number(v.price) : null,
                    cost: v.cost ? Number(v.cost) : null,
                })) || []
            });
            // Mark existing variants with SKU as "manual" to avoid accidental overwrite on load
            const initialManual = new Set<number>();
            product.product_variant?.forEach((v: any, idx: number) => {
                if (v.sku) initialManual.add(idx);
            });
            setManualSkuIndices(initialManual);

            // Load existing images
            if (product.product_image) {
                setUploadedImages(product.product_image.map((img: any) => ({
                    url: img.url,
                    public_id: img.public_id,
                    sort_order: img.sort_order
                })));
            }
        }
    }, [product, form]);

    const generateSKU = (name: string, color: string, size: string) => {
        const namePart = (name || '').replace(/\s+/g, '').substring(0, 4).toUpperCase();
        const colorPart = (color || '').replace(/\s+/g, '').substring(0, 3).toUpperCase();
        const sizePart = (size || '').replace(/\s+/g, '').toUpperCase();
        
        if (!namePart && !colorPart && !sizePart) return '';
        return `${namePart}-${colorPart}-${sizePart}`.replace(/-+$/, '').replace(/-$/, '');
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
        setUploadedImages(prev => [...prev, { url, public_id, sort_order: prev.length }]);
    };

    const removeImage = (indexToRemove: number) => {
        setUploadedImages(prev => prev.filter((_, idx) => idx !== indexToRemove));
    };

    const onFinish = async (values: any) => {


        setIsSaving(true);
        try {
            const payload = {
                ...values,
                images: uploadedImages
            };

            const res = await fetch(`/api/admin/products/${id}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload),
            });

            if (!res.ok) {
                const err = await res.json();
                throw new Error(err.error || 'Error actualizando producto');
            }

            toast.success('Producto actualizado satisfactoriamente');
            router.push('/admin/products');
        } catch (error: any) {
            toast.error(error.message);
        } finally {
            setIsSaving(false);
        }
    };

    if (isLoading) return <div style={{ padding: 48, textAlign: 'center' }}><Spin size="large" /></div>;
    if (error) return <div>Error cargando producto: {error.message}</div>;
    if (!product) return <div>Producto no encontrado</div>;

    return (
        <div style={{ maxWidth: 1000, margin: '0 auto' }}>
            <div style={{ display: 'flex', alignItems: 'center', marginBottom: 24, gap: 16 }}>
                <Button onClick={() => router.back()} icon={<ArrowLeftOutlined />} shape="circle" />
                <Title level={3} style={{ margin: 0 }}>Editar Producto</Title>
            </div>

            <Form 
                layout="vertical" 
                form={form} 
                onFinish={onFinish}
                onValuesChange={handleValuesChange}
            >

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

                <Card title="Imágenes del Producto" variant="borderless" style={{ marginBottom: 24 }}>
                    <div style={{ marginBottom: 16 }}>
                        <ImageUploader onUploadSuccess={handleUploadSuccess} buttonText="Añadir Foto" />
                    </div>
                    
                    <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap' }}>
                        {uploadedImages.map((img, idx) => (
                            <div key={idx} style={{ position: 'relative', width: 120, height: 160 }}>
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
                            </div>
                        ))}
                    </div>
                </Card>
                
                {/* --- SECCIÓN GUÍA DE TALLAS --- */}
                <Card title="Guía de Tallas (Imagen)" variant="borderless" style={{ marginBottom: 24 }}>
                    <div style={{ marginBottom: 16 }}>
                        <ImageUploader 
                            onUploadSuccess={(url) => form.setFieldsValue({ size_guide_url: url })} 
                            buttonText={form.getFieldValue('size_guide_url') ? "Cambiar Guía de Tallas" : "Subir Guía de Tallas"} 
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
                            ) : <Text type="secondary">No se ha asignado una guía de tallas a este producto.</Text>;
                        }}
                    </Form.Item>
                </Card>

                <Card title="Variantes (Tallas y Colores)" variant="borderless" style={{ marginBottom: 24 }}>
                    <Form.List name="variants">
                        {(fields, { add, remove }) => (
                            <>
                                {fields.map(({ key, name, ...restField }) => (
                                    <Card key={key} size="small" style={{ marginBottom: 16 }}>
                                        <div style={{ display: 'flex', gap: 16, alignItems: 'flex-start' }}>
                                            <div style={{ flex: 1, display: 'grid', gridTemplateColumns: 'minmax(0, 1fr) minmax(0, 1fr) minmax(0, 1fr)', gap: 16 }}>
                                                {/* Hidden field for variant_id so we can update instead of create */}
                                                <Form.Item {...restField} name={[name, 'variant_id']} hidden><Input /></Form.Item>
                                                
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
                                                    <InputNumber style={{ width: '100%' }} min={0} step={0.01} placeholder="Usa el Base" />
                                                </Form.Item>
                                                <Form.Item {...restField} name={[name, 'is_active']} label="Activa" valuePropName="checked">
                                                    <Switch checkedChildren="Sí" unCheckedChildren="No" />
                                                </Form.Item>
                                            </div>
                                            <Button type="text" danger onClick={() => remove(name)} icon={<DeleteOutlined />} style={{ marginTop: 32 }} />
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
                            Guardar Cambios
                        </Button>
                    </Space>
                </div>
            </Form>
        </div>
    );
}
