'use client';

import React from 'react';
import { Typography, Card, Table, Tag, Button, Space, Avatar, Input, Select, Row, Col, theme } from 'antd';
import { ExperimentOutlined, RightOutlined } from '@ant-design/icons';
import useSWR from 'swr';
import { fetcher } from '@/lib/fetcher';
import Link from 'next/link';

const { Title, Text } = Typography;

export default function ProductionListPage() {
    const { token } = theme.useToken();
    const { data: products, isLoading } = useSWR<any[]>('/api/admin/products', fetcher);
    const [search, setSearch] = React.useState('');
    const [sizeFilter, setSizeFilter] = React.useState<string>();
    const [statusFilter, setStatusFilter] = React.useState<boolean | undefined>();

    const sizeOptions = React.useMemo(() => {
        const sizes = new Set<string>();
        (products || []).forEach((product) => {
            (product.product_variant || []).forEach((variant: any) => {
                if (variant.size) sizes.add(String(variant.size));
            });
        });

        return Array.from(sizes).sort().map((size) => ({ value: size, label: size }));
    }, [products]);

    const filteredProducts = React.useMemo(() => {
        const normalizedSearch = search.trim().toLowerCase();

        return (products || []).filter((product) => {
            const matchesSearch = !normalizedSearch
                || String(product.name || '').toLowerCase().includes(normalizedSearch)
                || String(product.slug || '').toLowerCase().includes(normalizedSearch);
            const hasSize = !sizeFilter || (product.product_variant || []).some((variant: any) => String(variant.size) === sizeFilter);

            if (!matchesSearch) return false;
            if (!hasSize) return false;
            if (statusFilter !== undefined && Boolean(product.is_active) !== statusFilter) return false;

            return true;
        });
    }, [products, search, sizeFilter, statusFilter]);

    const hasActiveFilters = Boolean(search || sizeFilter || statusFilter !== undefined);

    const clearFilters = () => {
        setSearch('');
        setSizeFilter(undefined);
        setStatusFilter(undefined);
    };

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
                <div style={{ marginBottom: 16, padding: 16, border: `1px solid ${token.colorBorderSecondary}`, borderRadius: 12, background: token.colorFillAlter }}>
                    <Row gutter={[12, 12]} align="bottom">
                        <Col xs={24} md={10}>
                            <Text type="secondary" style={{ display: 'block', marginBottom: 6 }}>Buscar</Text>
                            <Input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Producto o slug" allowClear />
                        </Col>
                        <Col xs={24} md={5}>
                            <Text type="secondary" style={{ display: 'block', marginBottom: 6 }}>Talla</Text>
                            <Select allowClear showSearch value={sizeFilter} onChange={setSizeFilter} placeholder="Todas" style={{ width: '100%' }} options={sizeOptions} />
                        </Col>
                        <Col xs={24} md={5}>
                            <Text type="secondary" style={{ display: 'block', marginBottom: 6 }}>Estado</Text>
                            <Select allowClear value={statusFilter} onChange={setStatusFilter} placeholder="Todos" style={{ width: '100%' }} options={[{ value: true, label: 'Activo' }, { value: false, label: 'Inactivo' }]} />
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
            </Card>
        </div>
    );
}
