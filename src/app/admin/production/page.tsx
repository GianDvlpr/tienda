'use client';

import React from 'react';
import { Typography, Card, Table, Tag, Button, Space, Avatar } from 'antd';
import { ExperimentOutlined, RightOutlined } from '@ant-design/icons';
import useSWR from 'swr';
import { fetcher } from '@/lib/fetcher';
import Link from 'next/link';

const { Title } = Typography;

export default function ProductionListPage() {
    const { data: products, isLoading } = useSWR<any[]>('/api/admin/products', fetcher);

    const columns = [
        {
            title: 'Producto',
            key: 'product',
            render: (_: any, record: any) => (
                <Space>
                    <Avatar 
                        src={record.product_image?.[0]?.url} 
                        shape="square" 
                        size={48}
                        icon={<ExperimentOutlined />}
                    />
                    <div>
                        <strong style={{ display: 'block' }}>{record.name}</strong>
                        <span style={{ fontSize: 12, color: '#888' }}>{record.slug}</span>
                    </div>
                </Space>
            )
        },
        {
            title: 'Tallas Totales',
            key: 'sizes',
            render: (_: any, record: any) => {
                const sizes = Array.from(new Set(record.product_variant?.map((v:any) => v.size)));
                return <Space size={[0, 4]} wrap>{sizes.map((s:any) => <Tag key={s}>{s}</Tag>)}</Space>;
            }
        },
        {
            title: 'Acción',
            key: 'action',
            render: (_: any, record: any) => (
                <Link href={`/admin/production/${record.product_id}`}>
                    <Button type="primary" size="small" icon={<RightOutlined />}>
                        Ficha Técnica y Lotes
                    </Button>
                </Link>
            )
        }
    ];

    return (
        <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
                <Title level={2} style={{ margin: 0 }}>Producción y Fichas Técnicas</Title>
                <Space>
                    <Link href="/admin/production/simulator">
                        <Button type="primary" size="large" icon={<ExperimentOutlined />} style={{ background: '#C89F53', borderColor: '#C89F53' }}>
                            Simulador de Costos
                        </Button>
                    </Link>
                    <Link href="/admin/production/lots">
                        <Button type="default" size="large">
                            Ver Historial de Lotes
                        </Button>
                    </Link>
                </Space>
            </div>
            <Card variant="borderless">
                <Table 
                    columns={columns} 
                    dataSource={products} 
                    loading={isLoading} 
                    rowKey="product_id"
                    pagination={{ pageSize: 10 }}
                />
            </Card>
        </div>
    );
}
