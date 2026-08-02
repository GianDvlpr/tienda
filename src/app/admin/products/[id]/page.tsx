'use client';
import { toast } from 'sonner';

import React, { useState, useEffect, useMemo } from 'react';
import { Alert, Form, Input, InputNumber, Switch, Select, Button, Space, Typography, Card, Image, Spin, Divider, AutoComplete, theme } from 'antd';

import { ArrowDownOutlined, ArrowLeftOutlined, ArrowUpOutlined, PlusOutlined, DeleteOutlined } from '@ant-design/icons';
import { useRouter, useParams } from 'next/navigation';
import useSWR from 'swr';
import { fetcher } from '@/lib/fetcher';
import ImageUploader from '@/components/admin/ImageUploader';
import SizeGuideEditor from '@/components/admin/SizeGuideEditor';


const { Title, Text } = Typography;
const { TextArea } = Input;
const { Option } = Select;

export default function EditProductPage() {
    const router = useRouter();
    const params = useParams();
    const id = params.id as string;
    const { token } = theme.useToken();

    const [form] = Form.useForm();
    const [isSaving, setIsSaving] = useState(false);
    const [uploadedImages, setUploadedImages] = useState<any[]>([]);

    const { data: collections } = useSWR<any[]>('/api/admin/collections', fetcher);
    const { data: supplies } = useSWR<any[]>('/api/admin/supplies', fetcher);
    const { data: product, isLoading, error } = useSWR<any>(id ? `/api/admin/products/${id}` : null, fetcher);
    const watchedVariants = Form.useWatch('variants', form);
    const fabricOptions = (supplies || []).filter((s: any) => s.type === 'TELA' && s.is_active);

    const imageColorOptions = useMemo(() => {
        const colors = new Map<string, string>();
        [...(watchedVariants || []), ...uploadedImages].forEach((item: any) => {
            const color = String(item?.color || '').trim();
            if (color) colors.set(color.toLowerCase(), color);
        });
        return Array.from(colors.values()).map((color) => ({ value: color }));
    }, [watchedVariants, uploadedImages]);

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
                size_guide_json: product.size_guide_json,
                is_customizable: product.is_customizable,
                customization_type: product.customization_type || 'UPPER',
                customization_surcharge: product.customization_surcharge ? Number(product.customization_surcharge) : 5,
                custom_fabric_supply_id: product.custom_fabric_supply_id || null,
                bulk_stock: 0,
                bulk_is_active: true,
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
                    color: img.color || null,
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
                    cost: values.bulk_cost ?? values.base_cost ?? null,
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


    const normalizeImageOrder = (images: any[]) => images.map((img, idx) => ({ ...img, sort_order: idx }));

    const handleUploadSuccess = (url: string, public_id: string) => {
        setUploadedImages(prev => normalizeImageOrder([...prev, { url, public_id, color: null }]));
    };

    const removeImage = (indexToRemove: number) => {
        setUploadedImages(prev => normalizeImageOrder(prev.filter((_, idx) => idx !== indexToRemove)));
    };

    const moveImage = (indexToMove: number, direction: -1 | 1) => {
        setUploadedImages(prev => {
            const targetIndex = indexToMove + direction;
            if (targetIndex < 0 || targetIndex >= prev.length) return prev;

            const next = [...prev];
            [next[indexToMove], next[targetIndex]] = [next[targetIndex], next[indexToMove]];
            return normalizeImageOrder(next);
        });
    };

    const updateImageColor = (indexToUpdate: number, color: string) => {
        setUploadedImages(prev => prev.map((img, idx) => (
            idx === indexToUpdate ? { ...img, color: color.trim() || null } : img
        )));
    };

    const onFinish = async (values: any) => {


        setIsSaving(true);
        try {
            const payload = {
                ...values,
                images: normalizeImageOrder(uploadedImages)
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

                <Card title="Personalización" variant="borderless" style={{ marginBottom: 24 }}>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 16 }}>
                        <Form.Item name="is_customizable" label="Permite personalización" valuePropName="checked">
                            <Switch checkedChildren="Sí" unCheckedChildren="No" />
                        </Form.Item>

                        <Form.Item
                            noStyle
                            shouldUpdate={(prevValues, currentValues) => prevValues.is_customizable !== currentValues.is_customizable || prevValues.customization_type !== currentValues.customization_type || prevValues.customization_surcharge !== currentValues.customization_surcharge}
                        >
                            {({ getFieldValue }) => {
                                const enabled = !!getFieldValue('is_customizable');
                                const type = getFieldValue('customization_type');
                                const surcharge = Number(getFieldValue('customization_surcharge') || 0);
                                const suggestedRange = type === 'PANTS' ? 'S/ 15 a S/ 25' : 'S/ 10 a S/ 15';
                                return (
                                    <>
                                        <Form.Item name="customization_type" label="Tipo de prenda" rules={enabled ? [{ required: true, message: 'Selecciona el tipo' }] : []}>
                                            <Select disabled={!enabled}>
                                                <Option value="PANTS">Pantalón</Option>
                                                <Option value="UPPER">Parte superior</Option>
                                            </Select>
                                        </Form.Item>
                                        <Form.Item name="customization_surcharge" label="Recargo personalizado (S/)" extra="Debe cubrir revisión de medidas, atención por WhatsApp, riesgo de ajuste y confección especial.">
                                            <InputNumber disabled={!enabled} style={{ width: '100%' }} min={0} step={0.01} precision={2} prefix="S/" />
                                        </Form.Item>
                                        <Form.Item name="custom_fabric_supply_id" label="Tela para personalización" extra="Define qué colores estarán disponibles según el stock por color de esta tela.">
                                            <Select disabled={!enabled} allowClear placeholder="Selecciona una tela">
                                                {fabricOptions.map((s: any) => <Option key={s.supply_id} value={s.supply_id}>{s.name}</Option>)}
                                            </Select>
                                        </Form.Item>
                                        {enabled && (
                                            <Alert
                                                showIcon
                                                type={surcharge > 0 && surcharge < 10 ? 'warning' : 'info'}
                                                message={`Sugerencia de recargo: ${suggestedRange}`}
                                                description={surcharge > 0 && surcharge < 10
                                                    ? 'El recargo actual parece bajo para cubrir atención, validación de medidas y riesgo de retrabajo.'
                                                    : 'Usa el recargo para proteger margen y capacidad de confección personalizada.'}
                                                style={{ gridColumn: '1 / -1' }}
                                            />
                                        )}
                                    </>
                                );
                            }}
                        </Form.Item>
                    </div>
                    <Text type="secondary">
                        Si está activo, el producto podrá comprarse normal o con medidas personalizadas.
                    </Text>
                </Card>

                <Card title="Imágenes del Producto" variant="borderless" style={{ marginBottom: 24 }}>
                    <div style={{ marginBottom: 16 }}>
                        <ImageUploader onUploadSuccess={handleUploadSuccess} buttonText="Añadir Fotos" multiple />
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
                                <Space.Compact style={{ width: 120, marginTop: 8 }}>
                                    <Button
                                        icon={<ArrowUpOutlined />}
                                        disabled={idx === 0}
                                        onClick={() => moveImage(idx, -1)}
                                        style={{ width: 40 }}
                                    />
                                    <Button disabled style={{ width: 40, color: 'rgba(0,0,0,0.65)' }}>
                                        {idx + 1}
                                    </Button>
                                    <Button
                                        icon={<ArrowDownOutlined />}
                                        disabled={idx === uploadedImages.length - 1}
                                        onClick={() => moveImage(idx, 1)}
                                        style={{ width: 40 }}
                                    />
                                </Space.Compact>
                            </div>
                        ))}
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


                <Card title="Variantes (Tallas y Colores)" variant="borderless" style={{ marginBottom: 24 }}>
                    <Card size="small" title="Generador rápido" style={{ marginBottom: 16 }}>
                        <Text type="secondary" style={{ display: 'block', marginBottom: 12 }}>
                            Escribe tallas y colores separados por coma o salto de línea. Se generará una variante por cada combinación faltante. El costo usará el costo base salvo que indiques un costo común distinto.
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
                            <Form.Item name="bulk_cost" label="Costo común opcional">
                                <InputNumber style={{ width: '100%' }} min={0} step={0.01} precision={2} placeholder="Usa el costo base" />
                            </Form.Item>
                            <Form.Item name="bulk_is_active" label="Activas" valuePropName="checked">
                                <Switch checkedChildren="Sí" unCheckedChildren="No" />
                            </Form.Item>
                        </div>
                        <Button type="primary" ghost onClick={addGeneratedVariants} icon={<PlusOutlined />}>
                            Generar variantes faltantes
                        </Button>
                    </Card>

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
                                                <Form.Item {...restField} name={[name, 'cost']} label="Costo Ref. (Opcional)">
                                                    <InputNumber style={{ width: '100%' }} min={0} step={0.01} placeholder="Usa el Costo Base" />
                                                </Form.Item>
                                                <Form.Item {...restField} name={[name, 'is_active']} label="Activa" valuePropName="checked">
                                                    <Switch checkedChildren="Sí" unCheckedChildren="No" />
                                                </Form.Item>
                                            </div>
                                            <Button type="text" danger onClick={() => remove(name)} icon={<DeleteOutlined />} style={{ marginTop: 32 }} />
                                        </div>
                                    </Card>
                                ))}
                                <Button type="dashed" onClick={() => add({ size: 'Única', color: 'Unicolor', is_active: true, stock: 0, cost: form.getFieldValue('base_cost') ?? null })} block icon={<PlusOutlined />}>
                                    Añadir otra variante
                                </Button>
                            </>
                        )}
                    </Form.List>
                </Card>

                <div style={{ height: 88 }} />

                <div style={{
                    position: 'fixed',
                    left: 0,
                    right: 0,
                    bottom: 0,
                    zIndex: 1000,
                    padding: '12px 24px',
                    background: token.colorBgContainer,
                    borderTop: `1px solid ${token.colorBorderSecondary}`,
                    boxShadow: token.boxShadowSecondary,
                }}>
                    <div style={{ maxWidth: 1000, margin: '0 auto', display: 'flex', justifyContent: 'flex-end' }}>
                        <Space size="large">
                            <Button onClick={() => router.back()}>Cancelar</Button>
                            <Button type="primary" htmlType="submit" size="large" loading={isSaving}>
                                Guardar Cambios
                            </Button>
                        </Space>
                    </div>
                </div>
            </Form>
        </div>
    );
}
