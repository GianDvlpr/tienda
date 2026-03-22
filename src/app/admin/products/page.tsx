'use client';

import React from 'react';
import { Table, Button, Space, Typography, Tag, message, Popconfirm } from 'antd';
import { PlusOutlined, EditOutlined, DeleteOutlined } from '@ant-design/icons';
import useSWR from 'swr';
import { fetcher } from '@/lib/fetcher';
import Link from 'next/link';
import Image from 'next/image';
import { useRouter } from 'next/navigation';

const { Title, Text } = Typography;

export default function AdminProductsPage() {
    const { data: products, error, mutate, isLoading } = useSWR('/api/admin/products', fetcher);
    const router = useRouter();

    const handleDelete = async (product_id: string) => {
        try {
            const res = await fetch(`/api/admin/products/${product_id}`, { method: 'DELETE' });
            const data = await res.json();
            
            if (!res.ok) throw new Error(data.error || 'Error eliminando producto');
            
            message.success(data.message || 'Producto eliminado exitosamente');
            mutate();
        } catch (e: any) {
            message.error(e.message);
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
                <Link href="/admin/products/new">
                    <Button type="primary" icon={<PlusOutlined />}>
                        Nuevo Producto
                    </Button>
                </Link>
            </div>

            <Table 
                columns={columns} 
                dataSource={products} 
                loading={isLoading} 
                rowKey="product_id" 
                pagination={{ pageSize: 10 }}
            />
        </div>
    );
}
