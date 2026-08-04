'use client';
import { toast } from 'sonner';

import React from 'react';
import { Table, Button, Space, Typography, Tag, Popconfirm, Input, InputNumber, Select, Row, Col, theme } from 'antd';
import { PlusOutlined, EditOutlined, DeleteOutlined, ReloadOutlined } from '@ant-design/icons';
import useSWR from 'swr';
import { fetcher } from '@/lib/fetcher';
import Link from 'next/link';
import Image from 'next/image';
import { useRouter } from 'next/navigation';

const { Title, Text } = Typography;

export default function AdminProductsPage() {
    const { token } = theme.useToken();
    const { data: products, error, mutate, isLoading, isValidating } = useSWR<any[]>('/api/admin/products', fetcher, {
        refreshInterval: 30000,
        revalidateOnFocus: true
    });
    const router = useRouter();
    const [search, setSearch] = React.useState('');
    const [minPrice, setMinPrice] = React.useState<number | null>(null);
    const [maxPrice, setMaxPrice] = React.useState<number | null>(null);
    const [statusFilter, setStatusFilter] = React.useState<boolean | undefined>();

    const filteredProducts = React.useMemo(() => {
        const normalizedSearch = search.trim().toLowerCase();

        return (products || []).filter((product) => {
            const basePrice = Number(product.base_price || 0);
            const matchesSearch = !normalizedSearch
                || String(product.name || '').toLowerCase().includes(normalizedSearch)
                || String(product.slug || '').toLowerCase().includes(normalizedSearch);

            if (!matchesSearch) return false;
            if (minPrice !== null && basePrice < minPrice) return false;
            if (maxPrice !== null && basePrice > maxPrice) return false;
            if (statusFilter !== undefined && Boolean(product.is_active) !== statusFilter) return false;

            return true;
        });
    }, [products, search, minPrice, maxPrice, statusFilter]);

    const hasActiveFilters = Boolean(search || minPrice !== null || maxPrice !== null || statusFilter !== undefined);

    const clearFilters = () => {
        setSearch('');
        setMinPrice(null);
        setMaxPrice(null);
        setStatusFilter(undefined);
    };

    const handleDelete = async (product_id: string) => {
        try {
            const res = await fetch(`/api/admin/products/${product_id}`, { method: 'DELETE' });
            const data = await res.json();
            
            if (!res.ok) throw new Error(data.error || 'Error eliminando producto');
            
            toast.success(data.message || 'Producto eliminado exitosamente');
            mutate();
        } catch (e: any) {
            toast.error(e.message);
        }
    };

    const columns = [
        {
            title: 'Foto Principal',
            key: 'image',
            render: (_: any, record: any) => {
                const img = record.product_image?.[0]?.url;
                return img ? (
                    <Image src={img} alt={record.name} width={50} height={60} style={{ objectFit: 'cover', borderRadius: '4px' }} />
                ) : (
                    <div style={{ width: 50, height: 60, background: '#f0f0f0', borderRadius: '4px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        <Text type="secondary" style={{ fontSize: 10 }}>No Img</Text>
                    </div>
                );
            }
        },
        {
            title: 'Nombre',
            dataIndex: 'name',
            key: 'name',
            render: (text: string, record: any) => (
                <div>
                    <strong>{text}</strong><br />
                    <Text type="secondary" style={{ fontSize: 12 }}>{record.slug}</Text>
                </div>
            )
        },
        {
            title: 'Precio Base',
            dataIndex: 'base_price',
            key: 'base_price',
            render: (price: number) => `S/ ${Number(price).toFixed(2)}`
        },
        {
            title: 'Variantes',
            key: 'variants',
            render: (_: any, record: any) => (
                <Tag color="geekblue">{record.product_variant?.length || 0} Variantes</Tag>
            )
        },
        {
            title: 'Estado',
            key: 'is_active',
            render: (_: any, record: any) => (
                <Tag color={record.is_active ? 'green' : 'red'}>
                    {record.is_active ? 'Activo' : 'Inactivo'}
                </Tag>
            ),
        },
        {
            title: 'Acciones',
            key: 'actions',
            render: (_: any, record: any) => (
                <Space size="middle">
                    <Button type="text" icon={<EditOutlined />} onClick={() => router.push(`/admin/products/${record.product_id}`)} />
                    <Popconfirm
                        title="¿Eliminar producto?"
                        description="Esto ocultará el producto si ya tiene ventas realizadas."
                        onConfirm={() => handleDelete(record.product_id)}
                        okText="Sí, borrar"
                        cancelText="Cancelar"
                    >
                        <Button type="text" danger icon={<DeleteOutlined />} />
                    </Popconfirm>
                </Space>
            ),
        },
    ];

    if (error) return <div>Error cargando productos: {error.message}</div>;

    return (
        <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
                <Title level={3} style={{ margin: 0 }}>Catálogo de Productos</Title>
                <Space>
                    <Button 
                        icon={<ReloadOutlined spin={isValidating} />} 
                        onClick={() => mutate()}
                    >
                        Actualizar
                    </Button>
                    <Link href="/admin/products/new">
                        <Button type="primary" icon={<PlusOutlined />}>
                            Nuevo Producto
                        </Button>
                    </Link>
                </Space>
            </div>

            <div style={{ marginBottom: 16, padding: 16, border: `1px solid ${token.colorBorderSecondary}`, borderRadius: 12, background: token.colorFillAlter }}>
                <Row gutter={[12, 12]} align="bottom">
                    <Col xs={24} md={8}>
                        <Text type="secondary" style={{ display: 'block', marginBottom: 6 }}>Buscar</Text>
                        <Input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Nombre o slug" allowClear />
                    </Col>
                    <Col xs={12} md={4}>
                        <Text type="secondary" style={{ display: 'block', marginBottom: 6 }}>Precio mínimo</Text>
                        <InputNumber value={minPrice} onChange={(value) => setMinPrice(value === null ? null : Number(value))} min={0} prefix="S/" style={{ width: '100%' }} />
                    </Col>
                    <Col xs={12} md={4}>
                        <Text type="secondary" style={{ display: 'block', marginBottom: 6 }}>Precio máximo</Text>
                        <InputNumber value={maxPrice} onChange={(value) => setMaxPrice(value === null ? null : Number(value))} min={0} prefix="S/" style={{ width: '100%' }} />
                    </Col>
                    <Col xs={24} md={4}>
                        <Text type="secondary" style={{ display: 'block', marginBottom: 6 }}>Estado</Text>
                        <Select
                            allowClear
                            value={statusFilter}
                            onChange={setStatusFilter}
                            placeholder="Todos"
                            style={{ width: '100%' }}
                            options={[{ value: true, label: 'Activo' }, { value: false, label: 'Inactivo' }]}
                        />
                    </Col>
                    <Col xs={24} md={4}>
                        <Button onClick={clearFilters} disabled={!hasActiveFilters} block>Limpiar</Button>
                    </Col>
                </Row>
                <Text type="secondary" style={{ display: 'block', marginTop: 10 }}>
                    Mostrando {filteredProducts.length} de {products?.length || 0} productos
                </Text>
            </div>

            <Table 
                columns={columns} 
                dataSource={filteredProducts} 
                loading={isLoading} 
                rowKey="product_id" 
                pagination={{ pageSize: 10 }}
            />
        </div>
    );
}
