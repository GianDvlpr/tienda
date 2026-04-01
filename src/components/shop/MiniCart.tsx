'use client';
import { toast } from 'sonner';


import React, { useState, useEffect, useRef } from 'react';
import { Button, Drawer, Empty, InputNumber, List, Space, Typography, Form, Input, Card, Result, Spin } from 'antd';
import confetti from 'canvas-confetti';
import { DeleteFilled, WhatsAppOutlined, ArrowLeftOutlined, LoadingOutlined } from '@ant-design/icons';
import Link from 'next/link';
import { useCartStore } from '@/store/cart.store';
import { formatPEN } from '@/lib/money';

const { Text, Title } = Typography;

export default function MiniCart({
    open,
    onClose,
}: {
    open: boolean;
    onClose: () => void;
}) {
    const items = useCartStore((s) => s.items);
    const removeItem = useCartStore((s) => s.removeItem);
    const setQty = useCartStore((s) => s.setQty);
    const clearCart = useCartStore((s) => s.clear);
    const subtotal = useCartStore((s) => s.subtotal());

    const [isCheckoutView, setIsCheckoutView] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [isProcessingPayment, setIsProcessingPayment] = useState(false);
    const [orderSuccess, setOrderSuccess] = useState<string | null>(null);
    const [paymentMethod, setPaymentMethod] = useState<'CULQI' | 'WHATSAPP'>('CULQI');
    const [form] = Form.useForm();
    const shippingDataRef = useRef<any>(null);
    const processingRef = useRef(false);

    // Global callback required by Culqi documentation
    useEffect(() => {
        (window as any).culqi = async () => {
            if (processingRef.current) return; // Prevent double firing
            const Culqi = (window as any).Culqi;
            
            if (Culqi.token) {
                processingRef.current = true;
                const token = Culqi.token.id;
                const email = Culqi.token.email || 'compras@auraboutique.com';
                
                // Immediately close Culqi overlay to prevent double clicks and show our loading state
                if (Culqi.close) Culqi.close();
                setIsProcessingPayment(true);
                
                await processBackendCheckout(token, email);
            } else if (Culqi.order) {
                // For Yape / PagoEfectivo logic if needed
            } else if (Culqi.error) {
                toast.error(Culqi.error.user_message || 'Error en el pago');
                setIsSubmitting(false);
                if (Culqi.close) Culqi.close();
            }
        };
    }, []);

    const handleCheckoutSubmit = (values: any) => {
        const frozenItems = useCartStore.getState().items;
        const frozenSubtotal = useCartStore.getState().subtotal();
        
        shippingDataRef.current = {
            ...values,
            items: frozenItems,
            subtotal: frozenSubtotal
        };
        
        if (paymentMethod === 'WHATSAPP') {
            processWhatsAppCheckout(shippingDataRef.current);
            return;
        }

        const Culqi = (window as any).Culqi;
        if (!Culqi) {
            toast.error('Culqi no está cargado. Revisa tu conexión a internet.');
            return;
        }

        // Reset the processing lock every time we open Culqi natively
        processingRef.current = false;

        Culqi.publicKey = process.env.NEXT_PUBLIC_CULQI_PUBLIC_KEY;
        Culqi.settings({
            title: 'Aura Boutique',
            currency: 'PEN',
            amount: Math.round(useCartStore.getState().subtotal() * 100), // En céntimos
        });
        Culqi.options({
            lang: 'auto',
            installments: false,
            paymentMethods: {
                tarjeta: true,
                yape: true,
                bancaMovil: false,
                agente: false,
                cuotealo: false,
            }
        });
        
        Culqi.open();
    };

    const processWhatsAppCheckout = async (payload: any) => {
        setIsSubmitting(true);
        try {
            const res = await fetch('/api/store/checkout', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    shipping_name: payload.shipping_name,
                    shipping_phone: payload.shipping_phone,
                    shipping_address: payload.shipping_address,
                    items: payload.items,
                    subtotal: payload.subtotal,
                    payment_method: 'WHATSAPP'
                })
            });

            if (!res.ok) {
                const err = await res.json();
                throw new Error(err.error || 'Ocurrió un error al procesar el pedido');
            }

            const data = await res.json();
            const orderCode = data.orderCode;

            // Generate WhatsApp message
            let text = `¡Hola! Quiero hacer el pedido *${orderCode}*:\n\n`;
            payload.items.forEach((item: any) => {
                text += `- ${item.qty}x ${item.name} (${item.size}, ${item.color}) - ${formatPEN(item.unitPrice * item.qty)}\n`;
            });
            text += `\n*Total Referencial: ${formatPEN(payload.subtotal)}*\n\n`;
            text += `*Mis datos:*\n`;
            text += `Nombre: ${payload.shipping_name}\n`;
            if (payload.shipping_address) {
                text += `Dirección: ${payload.shipping_address}\n`;
            }
            
            useCartStore.getState().clear();
            setIsCheckoutView(false);
            form.resetFields();
            onClose();

            toast.success(`Tu pedido ${orderCode} ha sido registrado. Redirigiendo a WhatsApp...`);
            
            const waNumber = process.env.NEXT_PUBLIC_WHATSAPP_NUMBER || '51907360760';
            const waUrl = `https://wa.me/${waNumber}?text=${encodeURIComponent(text)}`;
            window.open(waUrl, '_blank');
        } catch (error: any) {
            toast.error(error.message);
        } finally {
            setIsSubmitting(false);
        }
    };

    const processBackendCheckout = async (tokenId: string, email: string) => {
        setIsSubmitting(true);
        const payload = shippingDataRef.current;

        try {
            const res = await fetch('/api/store/checkout', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    shipping_name: payload.shipping_name,
                    shipping_phone: payload.shipping_phone,
                    shipping_address: payload.shipping_address,
                    items: payload.items,
                    subtotal: payload.subtotal,
                    culqi_token: tokenId,
                    email: email,
                    payment_method: 'CULQI'
                })
            });

            if (!res.ok) {
                const err = await res.json();
                throw new Error(err.error || 'Ocurrió un error al procesar el pedido');
            }

            const data = await res.json();
            const orderCode = data.orderCode;

            useCartStore.getState().clear();
            form.resetFields();
            
            // Show success fireworks instead of closing
            setOrderSuccess(orderCode);
            confetti({
                particleCount: 150,
                spread: 70,
                origin: { y: 0.6 },
                zIndex: 9999
            });
            
        } catch (error: any) {
            toast.error(error.message);
        } finally {
            setIsSubmitting(false);
            setIsProcessingPayment(false);
            processingRef.current = false;
        }
    };

    const handleClose = () => {
        setIsCheckoutView(false);
        setOrderSuccess(null);
        setIsProcessingPayment(false);
        onClose();
    };

    return (
        <Drawer
            title={
                isProcessingPayment ? "Procesando..." :
                orderSuccess ? "Pedido Completado" : 
                isCheckoutView ? (
                    <Space>
                        <Button type="text" icon={<ArrowLeftOutlined />} onClick={() => setIsCheckoutView(false)} />
                        <span>Completar Pedido</span>
                    </Space>
                ) : "Mi Carrito"
            }
            open={open}
            onClose={handleClose}
            size={isCheckoutView || orderSuccess || isProcessingPayment ? 380 : 420}
            footer={
                !isCheckoutView && !orderSuccess && !isProcessingPayment && items.length > 0 && (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <Text strong>Total Ref: {formatPEN(subtotal)}</Text>
                        </div>
                        <Button 
                            type="primary" 
                            onClick={() => setIsCheckoutView(true)}
                            style={{ width: '100%', height: 40, fontSize: 16 }}
                        >
                            Proceder al Checkout
                        </Button>
                    </div>
                )
            }
        >
            {isProcessingPayment ? (
                <Result
                    icon={<LoadingOutlined style={{ color: '#000', fontSize: 72 }} spin />}
                    title="Procesando tu pago..."
                    subTitle="Por favor, no cierres esta ventana. Estamos validando la transacción de forma segura con tu banco, esto puede tomar unos segundos."
                />
            ) : orderSuccess ? (
                <Result
                    status="success"
                    title="¡Pago Exitoso!"
                    subTitle={
                        <>
                            Tu pedido <Text strong>{orderSuccess}</Text> ha sido procesado correctamente.
                            <br />
                            Nos pondremos en contacto contigo en breve para coordinar el envío.
                        </>
                    }
                    extra={[
                        <Button type="primary" key="console" onClick={handleClose} style={{ backgroundColor: '#000', height: 44, width: '100%', fontSize: 16 }}>
                            Seguir Comprando
                        </Button>
                    ]}
                />
            ) : isCheckoutView ? (
                <div>
                    <Typography.Paragraph type="secondary">
                        Ingresa tus datos para registrar el pedido antes de coordinar por WhatsApp.
                    </Typography.Paragraph>
                    <Form layout="vertical" form={form} onFinish={handleCheckoutSubmit}>
                        <Form.Item label="Nombre Completo" name="shipping_name" rules={[{ required: true, message: 'Ingresa tu nombre' }]}>
                            <Input placeholder="Ej. Ana Pérez" size="large" />
                        </Form.Item>
                        <Form.Item label="Celular / WhatsApp" name="shipping_phone" rules={[{ required: true, message: 'Ingresa tu celular' }]}>
                            <Input placeholder="Ej. 999 888 777" size="large" />
                        </Form.Item>
                        <Form.Item label="Dirección de envío (Opcional)" name="shipping_address">
                            <Input.TextArea placeholder="Añade referencias si deseas delivery" rows={3} />
                        </Form.Item>

                        <Card size="small" style={{ marginTop: 24, marginBottom: 24 }}>
                             <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
                                <Text>Productos ({items.length})</Text>
                                <Text>{formatPEN(subtotal)}</Text>
                             </div>
                             <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                                <Text strong>Total Referencial</Text>
                                <Text strong>{formatPEN(subtotal)}</Text>
                             </div>
                        </Card>

                        <Space orientation="vertical" style={{ width: '100%', marginTop: 16 }}>
                            <Button 
                                type="primary" 
                                htmlType="submit"
                                onClick={() => setPaymentMethod('CULQI')}
                                loading={isSubmitting && paymentMethod === 'CULQI'}
                                style={{ width: '100%', height: 44, fontSize: 16, backgroundColor: '#000' }}
                            >
                                Pagar con Tarjeta (Culqi)
                            </Button>
                            <Button 
                                htmlType="submit"
                                onClick={() => setPaymentMethod('WHATSAPP')}
                                loading={isSubmitting && paymentMethod === 'WHATSAPP'}
                                icon={<WhatsAppOutlined />}
                                style={{ width: '100%', height: 44, fontSize: 16, borderColor: '#25D366', color: '#25D366' }}
                            >
                                Pedir por WhatsApp
                            </Button>
                        </Space>
                    </Form>
                </div>
            ) : items.length === 0 ? (
                <Empty description="Tu carrito está vacío" />
            ) : (
                <List
                    itemLayout="horizontal"
                    dataSource={items}
                    renderItem={(item) => (
                        <List.Item
                            actions={[
                                <Button
                                    key="delete"
                                    type="text"
                                    danger
                                    icon={<DeleteFilled />}
                                    onClick={() => removeItem(item.variantId)}
                                />,
                            ]}
                        >
                            <List.Item.Meta
                                avatar={
                                    <div style={{ width: 56, height: 56, overflow: 'hidden', borderRadius: 8 }}>
                                        {item.imageUrl ? (
                                            // eslint-disable-next-line @next/next/no-img-element
                                            <img
                                                src={item.imageUrl}
                                                alt={item.name}
                                                style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                                            />
                                        ) : null}
                                    </div>
                                }
                                title={
                                    <Space orientation="vertical" size={0}>
                                        <Link href={`/product/${item.slug}`} onClick={onClose}>
                                            <Text strong>{item.name}</Text>
                                        </Link>
                                        <Text type="secondary">{`${item.size} · ${item.color}`}</Text>
                                    </Space>
                                }
                                description={
                                    <Space orientation="vertical" size={6}>
                                        <Text>{formatPEN(item.unitPrice)}</Text>
                                        <Space>
                                            <Text type="secondary">Cantidad</Text>
                                            <InputNumber
                                                min={1}
                                                value={item.qty}
                                                onChange={(v) => setQty(item.variantId, Number(v ?? 1))}
                                            />
                                        </Space>
                                        <Text type="secondary">
                                            Total: {formatPEN(item.unitPrice * item.qty)}
                                        </Text>
                                    </Space>
                                }
                            />
                        </List.Item>
                    )}
                />
            )}
        </Drawer>
    );
}