"use client";

import React from 'react';
import { Carousel, Typography, Button } from 'antd';
import { CaretRightOutlined } from '@ant-design/icons';
import Image from 'next/image';
import useSWR from 'swr';
import { fetcher } from '@/lib/fetcher';

const { Title, Text } = Typography;

export default function HeroSlider() {
    const { data: slides } = useSWR<any[]>('/api/store/slider', fetcher);

    const defaultSlides = [
        {
            slide_id: 'default-1',
            image_url: 'https://images.unsplash.com/photo-1490481651871-ab68de25d43d?q=80&w=2070&auto=format&fit=crop',
            subtitle: 'MUJER',
            title: 'Primavera-Verano 2026',
            button_text: 'Descubrir la Colección',
            link_url: '#shop-grid',
        },
        {
            slide_id: 'default-2',
            image_url: 'https://images.unsplash.com/photo-1515886657613-9f3515b0c78f?q=80&w=1920&auto=format&fit=crop',
            subtitle: 'NOVEDADES',
            title: 'Elegancia Atemporal',
            button_text: 'Comprar Ahora',
            link_url: '#shop-grid',
        }
    ];

    const displaySlides = slides && slides.length > 0 ? slides : defaultSlides;

    return (
        <div className="hero-slider" style={{ position: 'relative', width: '100vw', height: 'var(--hero-height)', overflow: 'hidden' }}>
            <Carousel 
                autoplay 
                effect="fade" 
                dots={false}
                style={{ width: '100vw', height: 'var(--hero-height)' }}
            >
                {displaySlides.map((slide) => (
                    <div key={slide.slide_id}>
                        <div style={{ position: 'relative', width: '100vw', height: 'var(--hero-height)' }}>
                            <Image 
                                src={slide.image_url} 
                                alt={slide.title || "Slide"} 
                                fill 
                                style={{ objectFit: 'cover' }}
                                priority={slide === displaySlides[0]}
                            />
                            <div style={{
                                position: 'absolute',
                                top: 0, left: 0, right: 0, bottom: 0,
                                backgroundColor: 'rgba(0,0,0,0.3)',
                                 display: 'flex',
                                 flexDirection: 'column',
                                 justifyContent: 'flex-end',
                                 alignItems: 'center',
                                 padding: '0 20px clamp(72px, 12vh, 140px)'
                             }}>
                                {slide.subtitle && (
                                    <Text style={{ color: '#fff', letterSpacing: '0.2em', fontSize: 13, marginBottom: 8, textTransform: 'uppercase' }}>
                                        {slide.subtitle}
                                    </Text>
                                )}
                                 {slide.title && (
                                    <Title level={1} style={{ color: '#fff', fontSize: 'clamp(2.15rem, 7vw, 3.5rem)', margin: '0 0 16px', fontWeight: 400, textAlign: 'center', lineHeight: 1.05 }}>
                                        {slide.title}
                                    </Title>
                                )}
                                {slide.button_text && (
                                    <a 
                                        href={slide.link_url || "#"}
                                        style={{ 
                                            color: '#fff', 
                                            borderBottom: '1px solid #fff', 
                                            paddingBottom: 2,
                                            textDecoration: 'none',
                                            fontSize: 16
                                        }}
                                    >
                                        {slide.button_text}
                                    </a>
                                )}
                            </div>
                        </div>
                    </div>
                ))}
            </Carousel>

             {/* Faux Play/Pause controls aligned bottom left and right matching the LV style */}
            <div className="hero-control hero-control-left" style={{ position: 'absolute', bottom: 32, left: 32, zIndex: 10 }}>
                <Button type="text" style={{ color: 'white' }}>
                    <strong>II</strong> {/* Pause symbol placeholder */}
                </Button>
            </div>
            <div className="hero-control hero-control-right" style={{ position: 'absolute', bottom: 32, right: 32, zIndex: 10 }}>
                <Button type="text" style={{ color: 'white' }}>
                    <CaretRightOutlined />
                </Button>
            </div>

            <style jsx>{`
                .hero-slider {
                    --hero-height: max(520px, 90svh);
                }

                @media (max-width: 768px) {
                    .hero-slider {
                        --hero-height: max(480px, 74svh);
                    }

                    .hero-control-left {
                        left: 12px !important;
                        bottom: 18px !important;
                    }

                    .hero-control-right {
                        right: 12px !important;
                        bottom: 18px !important;
                    }
                }
            `}</style>
        </div>
    );
}
