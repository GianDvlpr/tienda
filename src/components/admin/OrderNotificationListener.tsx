'use client';

import React, { useEffect, useRef } from 'react';
import Pusher from 'pusher-js';
import { notification, Button } from 'antd';
import { ShoppingCartOutlined } from '@ant-design/icons';
import { useRouter } from 'next/navigation';
import { formatPEN } from '@/lib/money';

export default function OrderNotificationListener() {
    const router = useRouter();
    const audioRef = useRef<HTMLAudioElement | null>(null);

    useEffect(() => {
        // Initialize Pusher
        const pusher = new Pusher(process.env.NEXT_PUBLIC_PUSHER_KEY!, {
            cluster: process.env.NEXT_PUBLIC_PUSHER_CLUSTER!,
        });

        const channel = pusher.subscribe('admin-orders');

        channel.bind('new-order', (data: { orderCode: string; total: number; customer: string; itemsCount: number; couponCode?: string | null }) => {
            // Play Sound
            if (audioRef.current) {
                audioRef.current.play().catch(e => console.error('Error playing sound:', e));
            }

            // Show AntD Notification
            notification.open({
                message: '¡Nuevo Pedido Recibido!',
                description: (
                    <div>
                        <p><strong>Código:</strong> {data.orderCode}</p>
                        <p><strong>Cliente:</strong> {data.customer}</p>
                        <p><strong>Total:</strong> {formatPEN(data.total)} ({data.itemsCount} ítems)</p>
                        {data.couponCode && (
                            <p><strong>Cupón:</strong> <span style={{ color: '#C89F53' }}>{data.couponCode}</span></p>
                        )}
                        <Button 
                            type="primary" 
                            size="small" 
                            onClick={() => {
                                router.push('/admin/orders');
                                notification.destroy();
                            }}
                        >
                            Ver Pedidos
                        </Button>
                    </div>
                ),
                icon: <ShoppingCartOutlined style={{ color: '#C89F53' }} />,
                duration: 10,
                placement: 'topRight',
                style: {
                    borderLeft: '4px solid #C89F53',
                }
            });
        });

        return () => {
            channel.unbind_all();
            channel.unsubscribe();
            pusher.disconnect();
        };
    }, [router]);

    return (
        <audio 
            ref={audioRef} 
            src="https://assets.mixkit.co/active_storage/sfx/2869/2869-preview.mp3" 
            preload="auto" 
        />
    );
}
