'use client';

import React from 'react';
import { Layout, Row, Col, Typography, Space, Divider, Grid } from 'antd';
import {
    WhatsAppOutlined,
    InstagramOutlined,
    FacebookOutlined,
    ThunderboltFilled,
    SafetyCertificateFilled,
    CustomerServiceOutlined,
    PhoneOutlined,
    FacebookFilled,
    InstagramFilled,
    FileTextFilled,
    RollbackOutlined,
    BookFilled,
    RightOutlined,
    MailFilled
} from '@ant-design/icons';
import Link from 'next/link';
import AuraLogo from '@/components/AuraLogo';
import { useThemeStore } from '@/store/theme.store';

const { Footer } = Layout;
const { Text, Title, Paragraph } = Typography;

export default function ShopFooter() {
    const screens = Grid.useBreakpoint();
    const isMobile = !screens.md;
    const isDarkMode = useThemeStore((s) => s.isDarkMode);

    const currentYear = new Date().getFullYear();

    const textColor = isDarkMode ? 'rgba(255, 255, 255, 0.85)' : 'rgba(0, 0, 0, 0.85)';
    const secondaryColor = isDarkMode ? 'rgba(255, 255, 255, 0.45)' : 'rgba(0, 0, 0, 0.45)';
    const borderColor = isDarkMode ? 'rgba(255, 255, 255, 0.1)' : '#f0f0f0';
    const bgFooter = isDarkMode ? '#000' : '#fff';
    const iconColor = isDarkMode ? '#fff' : '#000';

    const rawWaNumber = process.env.NEXT_PUBLIC_WHATSAPP_NUMBER || '51907360760';
    const displayWaNumber = rawWaNumber.startsWith('51')
        ? `+51 ${rawWaNumber.slice(2, 5)} ${rawWaNumber.slice(5, 8)} ${rawWaNumber.slice(8)}`
        : rawWaNumber;

    return (
        <Footer style={{ background: bgFooter, padding: isMobile ? '40px 20px' : '60px 80px', borderTop: `1px solid ${borderColor}` }}>
            {/* Top Row: Service Highlights */}
            <Row gutter={[24, 24]} justify="space-around" style={{ marginBottom: 60 }}>
                <Col xs={24} sm={8} style={{ textAlign: 'center' }}>
                    <Space size="large" align="center" orientation={isMobile ? 'vertical' : 'horizontal'}>
                        <ThunderboltFilled style={{ fontSize: 32, color: iconColor }} />
                        <div style={{ textAlign: isMobile ? 'center' : 'left' }}>
                            <Text strong style={{ display: 'block', fontSize: 16, color: textColor }}>Envíos Rápidos</Text>
                            <Text style={{ color: secondaryColor }}>A todo el Perú</Text>
                        </div>
                    </Space>
                </Col>
                <Col xs={24} sm={8} style={{ textAlign: 'center' }}>
                    <Space size="large" align="center" orientation={isMobile ? 'vertical' : 'horizontal'}>
                        <SafetyCertificateFilled style={{ fontSize: 32, color: iconColor }} />
                        <div style={{ textAlign: isMobile ? 'center' : 'left' }}>
                            <Text strong style={{ display: 'block', fontSize: 16, color: textColor }}>Pagos en Línea</Text>
                            <Text style={{ color: secondaryColor }}>100% Seguros (Culqi)</Text>
                        </div>
                    </Space>
                </Col>
                <Col xs={24} sm={8} style={{ textAlign: 'center' }}>
                    <Space size="large" align="center" orientation={isMobile ? 'vertical' : 'horizontal'}>
                        <WhatsAppOutlined style={{ fontSize: 32, color: iconColor }} />
                        <div style={{ textAlign: isMobile ? 'center' : 'left' }}>
                            <Text strong style={{ display: 'block', fontSize: 16, color: textColor }}>{displayWaNumber}</Text>
                            <Text style={{ color: secondaryColor }}>Ventas e Informes</Text>
                        </div>
                    </Space>
                </Col>
            </Row>

            <Divider style={{ borderColor }} />

            {/* Main Footer Row */}
            <Row gutter={[40, 40]} style={{ marginTop: 40 }}>
                {/* Brand Column */}
                <Col xs={24} lg={6}>
                    <div style={{ marginBottom: 20 }}>
                        <AuraLogo size="small" />
                    </div>
                    <Text strong style={{ display: 'block', marginBottom: 8, color: textColor }}>RUC: 20613343769</Text>
                    <Paragraph style={{ fontSize: 14, color: secondaryColor }}>
                        Somos AURA, una marca comprometida con la elegancia y la calidad en cada prenda. Diseñamos para quienes buscan destacar.
                    </Paragraph>
                </Col>

                {/* Categories Column */}
                <Col xs={12} lg={6}>
                    <Title level={5} style={{ marginBottom: 24, fontWeight: 600, textTransform: 'uppercase', letterSpacing: 1, color: textColor }}>Categorías</Title>
                    <Space orientation="vertical" size="middle">
                        <Link href="/shop" style={{ color: secondaryColor }}>Todos los productos</Link>
                        <Link href="/shop?collection=Nuevos" style={{ color: secondaryColor }}>Novedades</Link>
                        <Link href="/shop?collection=Básicos" style={{ color: secondaryColor }}>Básicos</Link>
                    </Space>
                </Col>

                {/* Policies Column */}
                <Col xs={12} lg={6}>
                    <Title level={5} style={{ marginBottom: 24, fontWeight: 600, textTransform: 'uppercase', letterSpacing: 1, color: textColor }}>Políticas</Title>
                    <Space orientation="vertical" size="middle">
                        <Link href="/terms" style={{ color: secondaryColor, display: 'flex', alignItems: 'center', gap: 8 }}>
                            <FileTextFilled /> Términos y condiciones
                        </Link>
                        <Link href="/returns" style={{ color: secondaryColor, display: 'flex', alignItems: 'center', gap: 8 }}>
                            <RollbackOutlined /> Política de devoluciones
                        </Link>
                        <Link href="/reclamaciones" style={{ color: secondaryColor, display: 'flex', alignItems: 'center', gap: 8 }}>
                            <BookFilled /> Libro de Reclamaciones
                        </Link>
                    </Space>
                </Col>

                {/* Contact Column */}
                <Col xs={24} lg={6}>
                    <Title level={5} style={{ marginBottom: 24, fontWeight: 600, textTransform: 'uppercase', letterSpacing: 1, color: textColor }}>Contáctenos</Title>
                    <Space orientation="vertical" size="middle" style={{ width: '100%' }}>
                        <Space align="start">
                            <PhoneOutlined style={{ marginTop: 4, color: secondaryColor }} />
                            <Text style={{ color: secondaryColor }}>{displayWaNumber}</Text>
                        </Space>
                        <Space align="start">
                            <MailFilled style={{ marginTop: 4, color: secondaryColor }} />
                            <Text style={{ color: secondaryColor }}>hello@auraboutique.me</Text>
                        </Space>
                        <Space size="middle" style={{ marginTop: 16 }}>
                            {/* Facebook */}
                            <Link href="https://www.facebook.com/profile.php?id=61582709336724" target="_blank">
                                <div style={{
                                    width: 36,
                                    height: 36,
                                    borderRadius: '50%',
                                    backgroundColor: iconColor,
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    transition: 'opacity 0.2s'
                                }}>
                                    <FacebookFilled style={{ fontSize: 18, color: bgFooter }} />
                                </div>
                            </Link>

                            {/* Instagram */}
                            <Link href="https://www.instagram.com/auraboutiqueme/" target="_blank">
                                <div style={{
                                    width: 36,
                                    height: 36,
                                    borderRadius: '50%',
                                    backgroundColor: iconColor,
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    transition: 'opacity 0.2s'
                                }}>
                                    <InstagramFilled style={{ fontSize: 18, color: bgFooter }} />
                                </div>
                            </Link>

                            {/* TikTok (Custom SVG) */}
                            <Link href="https://www.tiktok.com/@auraboutiqueme" target="_blank">
                                <div style={{
                                    width: 36,
                                    height: 36,
                                    borderRadius: '50%',
                                    backgroundColor: iconColor,
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    transition: 'opacity 0.2s'
                                }}>
                                    <svg
                                        viewBox="0 0 448 512"
                                        style={{ width: 14, fill: bgFooter }}
                                    >
                                        <path d="M448 209.91a210.06 210.06 0 0 1 -122.77-39.25V349.38A162.55 162.55 0 1 1 185 188.31V278.2a74.62 74.62 0 1 0 52.23 71.18V0l88 0a121.18 121.18 0 0 0 1.86 22.32c7.87 33.32 31.74 60.39 63.06 73.56 24.12 10.19 50.85 13.91 77.85 13.91l0 100.12z" />
                                    </svg>
                                </div>
                            </Link>
                        </Space>
                    </Space>
                </Col>
            </Row>

            <Divider style={{ margin: '40px 0 20px', borderColor }} />

            <Row justify="center">
                <Col>
                    <Text style={{ fontSize: 12, color: secondaryColor }}>
                        © {currentYear} AURA Boutique. Todos los derechos reservados.
                    </Text>
                </Col>
            </Row>
        </Footer>
    );
}
