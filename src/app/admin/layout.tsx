'use client';

import React, { useState } from 'react';
import { Layout, Menu, Button, theme, Switch, Space } from 'antd';
import {
  DashboardOutlined,
  ShoppingOutlined,
  AppstoreOutlined,
  PictureOutlined,
  LogoutOutlined,
  MenuUnfoldOutlined,
  MenuFoldOutlined,
  BulbFilled,
  BulbOutlined,
  UserOutlined,
  ShoppingCartOutlined,
  TagOutlined,
  ToolOutlined,
  ExperimentOutlined,
  GiftOutlined,
} from '@ant-design/icons';

import { useRouter, usePathname } from 'next/navigation';
import Link from 'next/link';
import { useThemeStore } from '@/store/theme.store';
import useSWR from 'swr';
import { fetcher } from '@/lib/fetcher';
import OrderNotificationListener from '@/components/admin/OrderNotificationListener';

const { Header, Sider, Content } = Layout;

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const [collapsed, setCollapsed] = useState(false);
  const { token: { colorBgContainer, borderRadiusLG } } = theme.useToken();
  const router = useRouter();
  const pathname = usePathname();
  const isDarkMode = useThemeStore((s) => s.isDarkMode);
  const toggleDarkMode = useThemeStore((s) => s.toggleDarkMode);
  
  const { data: user } = useSWR<any>('/api/admin/me', fetcher);

  if (pathname === '/admin/login') {
    return <Layout style={{ minHeight: '100vh', background: colorBgContainer }}>{children}</Layout>;
  }

  const handleLogout = () => {
    // Para desloguear solo borramos la cookie (idealmente con una ruta de API pero basta con borrarla)
    document.cookie = 'admin_token=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;';
    router.push('/admin/login');
  };

  const menuItems = [
    {
      key: '/admin',
      icon: <DashboardOutlined />,
      label: <Link href="/admin">Dashboard</Link>,
    },
    {
      key: '/admin/orders',
      icon: <ShoppingCartOutlined />,
      label: <Link href="/admin/orders">Pedidos</Link>,
    },
    {
      key: '/admin/products',
      icon: <ShoppingOutlined />,
      label: <Link href="/admin/products">Productos</Link>,
    },
    {
      key: '/admin/coupons',
      icon: <TagOutlined />,
      label: <Link href="/admin/coupons">Cupones</Link>,
    },
    {
      key: '/admin/collections',
      icon: <AppstoreOutlined />,
      label: <Link href="/admin/collections">Colecciones</Link>,
    },
    {
      key: '/admin/supplies',
      icon: <ToolOutlined />,
      label: <Link href="/admin/supplies">Insumos y Taller</Link>,
    },
    {
      key: '/admin/production',
      icon: <ExperimentOutlined />,
      label: <Link href="/admin/production">Fichas de Producción</Link>,
    },
    {
      key: '/admin/slider',
      icon: <PictureOutlined />,
      label: <Link href="/admin/slider">Slider Principal</Link>,
    },
    {
      key: '/admin/users',
      icon: <UserOutlined />,
      label: <Link href="/admin/users">Usuarios</Link>,
    },
    {
      key: '/admin/bundles',
      icon: <GiftOutlined />,
      label: <Link href="/admin/bundles">Conjuntos / Packs</Link>,
    },
  ];


  const filteredMenuItems = user?.role === 'SELLER' 
    ? menuItems.filter(m => m.key === '/admin' || m.key === '/admin/orders')
    : menuItems;

  return (
    <Layout style={{ minHeight: '100vh' }}>
      <Sider trigger={null} collapsible collapsed={collapsed} theme="light" style={{ borderRight: '1px solid #f0f0f0' }}>
        <div style={{ height: 64, display: 'flex', alignItems: 'center', justifyContent: 'center', borderBottom: '1px solid #f0f0f0' }}>
          <strong style={{ fontSize: collapsed ? 14 : 18, color: '#C89F53', fontFamily: 'var(--font-montserrat)' }}>
            {collapsed ? 'AURA' : 'AURA ADMIN'}
          </strong>
        </div>
        <Menu
          mode="inline"
          selectedKeys={[pathname === '/admin' ? '/admin' : pathname]}
          items={filteredMenuItems}
          style={{ borderRight: 0, marginTop: 16 }}
        />
      </Sider>
      <Layout>
        <Header style={{ padding: 0, background: colorBgContainer, display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingRight: 24 }}>
          <Button
            type="text"
            icon={collapsed ? <MenuUnfoldOutlined /> : <MenuFoldOutlined />}
            onClick={() => setCollapsed(!collapsed)}
            style={{ fontSize: '16px', width: 64, height: 64 }}
          />
          <Space size="large">
            <Switch
              checkedChildren={<BulbFilled />}
              unCheckedChildren={<BulbOutlined />}
              checked={isDarkMode}
              onChange={toggleDarkMode}
            />
            <Button type="text" icon={<LogoutOutlined />} onClick={handleLogout} danger>
              Cerrar Sesión
            </Button>
          </Space>
        </Header>
        <Content style={{ margin: '24px 16px', padding: 24, minHeight: 280, background: colorBgContainer, borderRadius: borderRadiusLG }}>
          <OrderNotificationListener />
          {children}
        </Content>
      </Layout>
    </Layout>
  );
}
