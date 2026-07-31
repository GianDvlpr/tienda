'use client';

import React, { useEffect, useState } from 'react';
import { Layout, Menu, Button, theme, Switch, Space, Grid, App } from 'antd';

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
  const screens = Grid.useBreakpoint();
  const isMobile = !screens.md;
  const [collapsed, setCollapsed] = useState(false);
  const { token: { colorBgContainer, borderRadiusLG } } = theme.useToken();

  const router = useRouter();
  const pathname = usePathname();
  const isDarkMode = useThemeStore((s) => s.isDarkMode);
  const toggleDarkMode = useThemeStore((s) => s.toggleDarkMode);

  const { data: user } = useSWR<any>('/api/admin/me', fetcher);

  useEffect(() => {
    document.body.classList.add('admin-shell');
    return () => document.body.classList.remove('admin-shell');
  }, []);

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
      key: '/admin/bundles',
      icon: <GiftOutlined />,
      label: <Link href="/admin/bundles">Conjuntos</Link>,
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
      key: '/admin/coupons',
      icon: <TagOutlined />,
      label: <Link href="/admin/coupons">Cupones</Link>,
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
  ];



  const filteredMenuItems = user?.role === 'SELLER'
    ? menuItems.filter(m => m.key === '/admin' || m.key === '/admin/orders')
    : menuItems;

  return (
    <App>
      <Layout style={{ minHeight: '100vh' }}>
        <Sider
          trigger={null}
          collapsible
          collapsed={collapsed}
          theme="light"
          breakpoint="md"
          collapsedWidth={0}
          onCollapse={(c) => setCollapsed(c)}
          style={{
            borderRight: '1px solid #f0f0f0',
            overflow: 'auto',
            height: '100vh',
            position: 'fixed',
            left: 0,
            top: 0,
            bottom: 0,
            zIndex: 1100,
          }}
        >
          <div style={{ height: 64, display: 'flex', alignItems: 'center', justifyContent: 'center', borderBottom: '1px solid #f0f0f0' }}>
            <strong style={{ fontSize: collapsed ? 14 : 18, color: '#C89F53', fontFamily: 'var(--font-montserrat)' }}>
              {collapsed ? 'AURA' : 'AURA ADMIN'}
            </strong>
          </div>
          <Menu
            mode="inline"
            selectedKeys={[pathname === '/admin' ? '/admin' : pathname]}
            items={filteredMenuItems}
            onClick={() => isMobile && setCollapsed(true)}
            style={{ borderRight: 0, marginTop: 16 }}
          />
        </Sider>

        <Layout style={{
          marginLeft: isMobile ? 0 : (collapsed ? 80 : 200),
          transition: 'all 0.2s',
          minHeight: '100vh'
        }}>
          <Header className="admin-header" style={{
            padding: isMobile ? '0 8px' : '0 24px',
            background: colorBgContainer,
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            height: isMobile ? 52 : 64,
            lineHeight: isMobile ? '52px' : '64px',
            position: 'sticky',
            top: 0,
            zIndex: 1000,
            boxShadow: '0 2px 8px rgba(0,0,0,0.05)'
          }}>
            <Button
              type="text"
              icon={collapsed ? <MenuUnfoldOutlined /> : <MenuFoldOutlined />}
              onClick={() => setCollapsed(!collapsed)}
              style={{ fontSize: '16px', width: isMobile ? 44 : 64, height: isMobile ? 44 : 64 }}
            />
            <Space size={isMobile ? 'small' : 'large'}>
              {!isMobile && (
                <Switch
                  checkedChildren={<BulbFilled />}
                  unCheckedChildren={<BulbOutlined />}
                  checked={isDarkMode}
                  onChange={toggleDarkMode}
                />
              )}
              <Button type="text" icon={<LogoutOutlined />} onClick={handleLogout} danger size={isMobile ? 'small' : 'middle'}>
                {isMobile ? '' : 'Cerrar Sesión'}
              </Button>
            </Space>
          </Header>
          <Content className="admin-content" style={{
            margin: isMobile ? '12px 8px' : '24px 16px',
            padding: isMobile ? 12 : 24,
            minHeight: 280,
            background: colorBgContainer,
            borderRadius: borderRadiusLG,
            overflowX: 'auto'
          }}>
            <OrderNotificationListener />
            {children}
          </Content>
        </Layout>

      </Layout>
    </App>
  );
}
