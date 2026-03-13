"use client";

import React from 'react';
import { Carousel, Typography, Button } from 'antd';
import { CaretRightOutlined } from '@ant-design/icons';
import Image from 'next/image';

const { Title, Text } = Typography;

export default function HeroSlider() {
    return (
        <div style={{ position: 'relative', width: '100vw', height: '100vh', overflow: 'hidden' }}>
            <Carousel 
                autoplay 
                effect="fade" 
                dots={false}
                style={{ width: '100vw', height: '100vh' }}
            >
                {/* Slide 1 */}
                <div>
                    <div style={{ position: 'relative', width: '100vw', height: '100vh' }}>
                    <Image 
                        src="https://images.unsplash.com/photo-1490481651871-ab68de25d43d?q=80&w=2070&auto=format&fit=crop" 
                        alt="Fashion Spring Summer 1" 
                        fill 
                        style={{ objectFit: 'cover' }}
                        priority
                    />
                    <div style={{
                        position: 'absolute',
                        top: 0, left: 0, right: 0, bottom: 0,
                        backgroundColor: 'rgba(0,0,0,0.3)', // subtle dark overlay for text readability
                        display: 'flex',
                        flexDirection: 'column',
                        justifyContent: 'flex-end',
                        alignItems: 'center',
                        paddingBottom: '12vh'
                    }}>
                        <Text style={{ color: '#fff', letterSpacing: '0.2em', fontSize: 13, marginBottom: 8, textTransform: 'uppercase' }}>
                            MUJER
                        </Text>
                        <Title level={1} style={{ color: '#fff', fontSize: '3.5rem', margin: '0 0 16px', fontWeight: 400 }}>
                            Primavera-Verano 2026
                        </Title>
                        <a 
                            href="#shop-grid"
                            style={{ 
                                color: '#fff', 
                                borderBottom: '1px solid #fff', 
                                paddingBottom: 2,
                                textDecoration: 'none',
                                fontSize: 16
                            }}
                        >
                            Descubrir la Colección
                        </a>
                    </div>
                </div>
                </div>

                {/* Slide 2 */}
                <div>
                    <div style={{ position: 'relative', width: '100vw', height: '100vh' }}>
                    <Image 
                        src="https://images.unsplash.com/photo-1515886657613-9f3515b0c78f?q=80&w=1920&auto=format&fit=crop" 
                        alt="Fashion Spring Summer 2" 
                        fill 
                        style={{ objectFit: 'cover' }}
                    />
                    <div style={{
                        position: 'absolute',
                        top: 0, left: 0, right: 0, bottom: 0,
                        backgroundColor: 'rgba(0,0,0,0.3)',
                        display: 'flex',
                        flexDirection: 'column',
                        justifyContent: 'flex-end',
                        alignItems: 'center',
                        paddingBottom: '12vh'
                    }}>
                        <Text style={{ color: '#fff', letterSpacing: '0.2em', fontSize: 13, marginBottom: 8, textTransform: 'uppercase' }}>
                            NOVEDADES
                        </Text>
                        <Title level={1} style={{ color: '#fff', fontSize: '3.5rem', margin: '0 0 16px', fontWeight: 400 }}>
                            Elegancia Atemporal
                        </Title>
                        <a 
                            href="#shop-grid"
                            style={{ 
                                color: '#fff', 
                                borderBottom: '1px solid #fff', 
                                paddingBottom: 2,
                                textDecoration: 'none',
                                fontSize: 16
                            }}
                        >
                            Comprar Ahora
                        </a>
                    </div>
                </div>
                </div>
            </Carousel>

            {/* Faux Play/Pause controls aligned bottom left and right matching the LV style */}
            <div style={{ position: 'absolute', bottom: 32, left: 32, zIndex: 10 }}>
                <Button type="text" style={{ color: 'white' }}>
                    <strong>II</strong> {/* Pause symbol placeholder */}
                </Button>
            </div>
            <div style={{ position: 'absolute', bottom: 32, right: 32, zIndex: 10 }}>
                <Button type="text" style={{ color: 'white' }}>
                    <CaretRightOutlined />
                </Button>
            </div>
        </div>
    );
}
