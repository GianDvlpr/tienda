'use client';

import React from 'react';
import { Typography, Row, Col, Card, Statistic, Table, Tag, List, Alert, Button, Dropdown, Checkbox, Space as AntSpace, Flex } from 'antd';
import { ShoppingOutlined, DollarOutlined, WarningOutlined, ClockCircleOutlined, RightOutlined, SettingOutlined } from '@ant-design/icons';
import useSWR from 'swr';
import Link from 'next/link';
import { fetcher } from '@/lib/fetcher';
import { formatPEN } from '@/lib/money';
import dayjs from 'dayjs';
import { 
    BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, 
    PieChart, Pie, Cell, Legend, AreaChart, Area 
} from 'recharts';

const { Title, Text } = Typography;

const statusMap: Record<string, { label: string, color: string }> = {
    'PENDING_WS': { label: 'Pendiente', color: 'orange' },
    'CONFIRMED': { label: 'Confirmado', color: 'blue' },
    'SHIPPED': { label: 'Enviado', color: 'cyan' },
    'DELIVERED': { label: 'Entregado', color: 'green' },
    'CANCELLED': { label: 'Cancelado', color: 'red' },
};

export default function AdminDashboardPage() {
    const [visibleCharts, setVisibleCharts] = React.useState<string[]>(['revenueTrend', 'topProducts']);
    const { data, isLoading, error } = useSWR<any>('/api/admin/dashboard', fetcher);
    const { data: supplyAlerts, isLoading: loadingAlerts } = useSWR<any[]>('/api/admin/dashboard/alerts', fetcher);

    if (error) {
        return <Alert title="Error al cargar analíticas" type="error" />;
    }

    const { 
        totalRevenue = 0, 
        pendingCount = 0, 
        recentOrders = [], 
        lowStock = [], 
        analytics = { topProducts: [], salesByColor: [], salesBySize: [], revenueTrend: [], pendingPotential: [] } 
    } = data || {};

    const COLORS = ['#C89F53', '#2B2B2B', '#E5D5B7', '#8E794F', '#4A4A4A', '#D4AF37'];

    const columns = [
        {
            title: 'Código',
            dataIndex: 'code',
            key: 'code',
            render: (code: string, record: any) => (
                <Link href={`/admin/orders/${record.order_id}`}>
                    <Text strong style={{ color: '#C89F53' }}>{code}</Text>
                </Link>
            ),
        },
        {
            title: 'Cliente',
            dataIndex: 'shipping_name',
            key: 'shipping_name',
        },
        {
            title: 'Estado',
            dataIndex: 'status',
            key: 'status',
            render: (status: string) => {
                const conf = statusMap[status] || { label: status, color: 'default' };
                return <Tag color={conf.color}>{conf.label}</Tag>;
            },
        },
        {
            title: 'Total',
            dataIndex: 'total',
            key: 'total',
            render: (val: number) => formatPEN(Number(val)),
        },
    ];

    return (
        <div style={{ paddingBottom: 24 }}>
            <Title level={2}>Panel de Administración y Control</Title>
            
            <Row gutter={[16, 16]} style={{ marginTop: 24 }}>
                <Col xs={24} sm={12} md={8}>
                    <Card loading={isLoading} variant="borderless">
                        <Statistic
                            title="Ingresos Estimados"
                            value={Number(totalRevenue)}
                            precision={2}
                            prefix={<DollarOutlined />}
                            formatter={(value) => `S/ ${value}`}
                            styles={{ content: { color: '#3f8600' } }}
                        />
                    </Card>
                </Col>
                <Col xs={24} sm={12} md={8}>
                    <Card loading={isLoading} variant="borderless">
                        <Statistic
                            title="Pedidos Pendientes"
                            value={pendingCount}
                            prefix={<ClockCircleOutlined />}
                            styles={{ content: { color: '#faad14' } }}
                        />
                        <div style={{ marginTop: 12 }}>
                            <Link href="/admin/orders">
                                <Button size="small" type="primary" ghost>Ver pedidos</Button>
                            </Link>
                        </div>
                    </Card>
                </Col>
                <Col xs={24} sm={12} md={8}>
                    <Card variant="borderless" hoverable>
                        <Link href="/admin/products" style={{ display: 'block', textDecoration: 'none' }}>
                            <Statistic
                                title="Catálogo Rápido"
                                value="Ir a Prendas"
                                prefix={<ShoppingOutlined />}
                                styles={{ content: { fontSize: 20, color: '#C89F53' } }}
                            />
                        </Link>
                    </Card>
                </Col>
            </Row>

            <Row justify="space-between" align="middle" style={{ marginTop: 40, marginBottom: 20 }}>
                <Col>
                    <Title level={3} style={{ margin: 0 }}>Análisis de Negocio</Title>
                </Col>
                <Col>
                    <Dropdown
                        trigger={['click']}
                        popupRender={() => (
                            <Card variant="borderless" style={{ boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }}>
                                <AntSpace orientation="vertical">
                                    <Text strong>Mostrar Gráficas:</Text>
                                    <Checkbox 
                                        checked={visibleCharts.includes('revenueTrend')} 
                                        onChange={(e) => setVisibleCharts(prev => e.target.checked ? [...prev, 'revenueTrend'] : prev.filter(x => x !== 'revenueTrend'))}
                                    >
                                        Evolución de Ventas
                                    </Checkbox>
                                    <Checkbox 
                                        checked={visibleCharts.includes('pendingPotential')} 
                                        onChange={(e) => setVisibleCharts(prev => e.target.checked ? [...prev, 'pendingPotential'] : prev.filter(x => x !== 'pendingPotential'))}
                                    >
                                        Venta Potencial
                                    </Checkbox>
                                    <Checkbox 
                                        checked={visibleCharts.includes('topProducts')} 
                                        onChange={(e) => setVisibleCharts(prev => e.target.checked ? [...prev, 'topProducts'] : prev.filter(x => x !== 'topProducts'))}
                                    >
                                        Productos más Vendidos
                                    </Checkbox>
                                    <Checkbox 
                                        checked={visibleCharts.includes('colors')} 
                                        onChange={(e) => setVisibleCharts(prev => e.target.checked ? [...prev, 'colors'] : prev.filter(x => x !== 'colors'))}
                                    >
                                        Ventas por Color
                                    </Checkbox>
                                    <Checkbox 
                                        checked={visibleCharts.includes('sizes')} 
                                        onChange={(e) => setVisibleCharts(prev => e.target.checked ? [...prev, 'sizes'] : prev.filter(x => x !== 'sizes'))}
                                    >
                                        Ventas por Talla
                                    </Checkbox>
                                </AntSpace>
                            </Card>
                        )}
                    >
                        <Button icon={<SettingOutlined />}>Personalizar Vista</Button>
                    </Dropdown>
                </Col>
            </Row>
            
            <Row gutter={[24, 24]}>
                {visibleCharts.includes('revenueTrend') && (
                    <Col xs={24}>
                        <Card title="Evolución de Ventas (Últimos 14 días)" variant="borderless" style={{ height: 400 }}>
                            <ResponsiveContainer width="100%" height={320}>
                                <AreaChart data={analytics.revenueTrend}>
                                    <defs>
                                        <linearGradient id="colorRev" x1="0" y1="0" x2="0" y2="1">
                                            <stop offset="5%" stopColor="#C89F53" stopOpacity={0.1}/>
                                            <stop offset="95%" stopColor="#C89F53" stopOpacity={0}/>
                                        </linearGradient>
                                    </defs>
                                    <CartesianGrid strokeDasharray="3 3" vertical={false} />
                                    <XAxis dataKey="date" tick={{ fontSize: 11 }} />
                                    <YAxis tick={{ fontSize: 11 }} tickFormatter={(val) => `S/ ${val}`} />
                                    <Tooltip 
                                        labelStyle={{ color: '#2B2B2B' }}
                                        formatter={(val: any) => [formatPEN(Number(val)), 'Ingresos']}
                                    />
                                    <Area 
                                        type="monotone" 
                                        dataKey="amount" 
                                        name="Ingresos"
                                        stroke="#C89F53" 
                                        fillOpacity={1} 
                                        fill="url(#colorRev)" 
                                        strokeWidth={3} 
                                    />
                                </AreaChart>
                            </ResponsiveContainer>
                        </Card>
                    </Col>
                )}

                {visibleCharts.includes('pendingPotential') && (
                    <Col xs={24} lg={12}>
                        <Card title="Venta Potencial (WhatsApp)" variant="borderless" style={{ height: 400 }}>
                            <ResponsiveContainer width="100%" height={320}>
                                <BarChart data={analytics.pendingPotential} layout="vertical" margin={{ left: 40 }}>
                                    <CartesianGrid strokeDasharray="3 3" horizontal={false} />
                                    <XAxis type="number" hide />
                                    <YAxis dataKey="name" type="category" width={100} tick={{ fontSize: 11 }} />
                                    <Tooltip 
                                        formatter={(val: any, name: any) => [
                                            name === 'value' ? formatPEN(Number(val)) : val, 
                                            name === 'value' ? 'Valor S/' : 'Unidades'
                                        ]} 
                                    />
                                    <Bar dataKey="value" name="Valor S/" fill="#8E794F" radius={[0, 4, 4, 0]} barSize={20} />
                                    <Bar dataKey="units" name="Unidades" fill="#2B2B2B" radius={[0, 4, 4, 0]} barSize={10} />
                                </BarChart>
                            </ResponsiveContainer>
                        </Card>
                    </Col>
                )}

                {visibleCharts.includes('topProducts') && (
                    <Col xs={24} lg={12}>
                        <Card title="Productos más Vendidos" variant="borderless" style={{ height: 400 }}>
                            <ResponsiveContainer width="100%" height={320}>
                                <BarChart data={analytics.topProducts} layout="vertical" margin={{ left: 40 }}>
                                    <CartesianGrid strokeDasharray="3 3" horizontal={false} />
                                    <XAxis type="number" hide />
                                    <YAxis dataKey="name" type="category" width={100} tick={{ fontSize: 11 }} />
                                    <Tooltip 
                                        formatter={(val: any) => [val, 'Ventas']}
                                    />
                                    <Bar dataKey="value" name="Ventas" fill="#C89F53" radius={[0, 4, 4, 0]} barSize={25} />
                                </BarChart>
                            </ResponsiveContainer>
                        </Card>
                    </Col>
                )}
                
                {visibleCharts.includes('colors') && (
                    <Col xs={24} lg={12}>
                        <Card title="Ventas por Color" variant="borderless" style={{ height: 400 }}>
                            <ResponsiveContainer width="100%" height={300}>
                                <PieChart>
                                    <Pie
                                        data={analytics.salesByColor}
                                        cx="50%"
                                        cy="50%"
                                        innerRadius={60}
                                        outerRadius={80}
                                        paddingAngle={5}
                                        dataKey="value"
                                        nameKey="name"
                                    >
                                        {analytics.salesByColor.map((entry: any, index: number) => (
                                            <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                                        ))}
                                    </Pie>
                                    <Tooltip 
                                        formatter={(val: any) => [val, 'Vendidos']}
                                    />
                                    <Legend verticalAlign="bottom" height={36} />
                                </PieChart>
                            </ResponsiveContainer>
                        </Card>
                    </Col>
                )}

                {visibleCharts.includes('sizes') && (
                    <Col xs={24} lg={12}>
                        <Card title="Ventas por Talla" variant="borderless" style={{ height: 400 }}>
                            <ResponsiveContainer width="100%" height={300}>
                                <BarChart data={analytics.salesBySize}>
                                    <XAxis dataKey="name" tick={{ fontSize: 12 }} />
                                    <Tooltip 
                                        formatter={(val: any) => [val, 'Vendidos']}
                                    />
                                    <Bar dataKey="value" name="Vendidos" fill="#2B2B2B" radius={[4, 4, 0, 0]} />
                                </BarChart>
                            </ResponsiveContainer>
                        </Card>
                    </Col>
                )}
            </Row>

            <Row gutter={[24, 24]} style={{ marginTop: 24 }}>
                <Col xs={24} lg={10}>
                    <Card title="Últimos Pedidos" variant="borderless" loading={isLoading} extra={<Link href="/admin/orders">Ver todos</Link>}>
                        <Table
                            columns={columns}
                            dataSource={recentOrders}
                            rowKey="order_id"
                            pagination={false}
                            size="small"
                        />
                    </Card>
                </Col>
                <Col xs={24} lg={7}>
                    <Card 
                        title="Alertas de Stock" 
                        variant="borderless" 
                        loading={isLoading}
                        extra={<WarningOutlined style={{ color: 'red' }} />}
                    >
                        {lowStock.length === 0 ? (
                            <Text type="secondary">El inventario está saludable.</Text>
                        ) : (
                            <Flex vertical gap={12}>
                                {lowStock.map((item: any) => (
                                    <div key={item.sku} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                        <div>
                                            <Link href={`/admin/products/${item.product_id}`} style={{ display: 'flex', flexDirection: 'column' }}>
                                                <Text strong>{item.product.name}</Text>
                                                <Text type="secondary" style={{ fontSize: 12 }}>{`${item.size} - ${item.color} | SKU: ${item.sku}`}</Text>
                                            </Link>
                                        </div>
                                        <div>
                                            {item.stock === 0 ? (
                                                <Tag color="red">Agotado</Tag>
                                            ) : (
                                                <Tag color="orange">Quedan {item.stock}</Tag>
                                            )}
                                        </div>
                                    </div>
                                ))}
                            </Flex>
                        )}
                    </Card>
                </Col>
                <Col xs={24} lg={7}>
                    <Card 
                        title="Alertas de Taller" 
                        variant="borderless" 
                        loading={loadingAlerts}
                        extra={<WarningOutlined style={{ color: 'red' }} />}
                    >
                        {!supplyAlerts || supplyAlerts.length === 0 ? (
                            <Text type="secondary">Insumos en orden.</Text>
                        ) : (
                            <Flex vertical gap={12}>
                                {supplyAlerts.map((item: any) => (
                                    <div key={item.supply_id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                        <div>
                                            <Link href="/admin/supplies" style={{ display: 'flex', flexDirection: 'column' }}>
                                                <Text strong>{item.name}</Text>
                                                <Text type="secondary" style={{ fontSize: 12 }}>Unidad: {item.unit}</Text>
                                            </Link>
                                        </div>
                                        <div>
                                            <Tag color="red">{Number(item.stock)} / Min: {Number(item.min_stock)}</Tag>
                                        </div>
                                    </div>
                                ))}
                            </Flex>
                        )}
                    </Card>
                </Col>
            </Row>
        </div>
    );
}
