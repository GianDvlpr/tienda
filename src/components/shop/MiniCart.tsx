'use client';
import { toast } from 'sonner';

import React, { useState, useEffect, useRef } from 'react';
import { 
    Button, Drawer, Empty, InputNumber, List, Space, Typography, 
    Form, Input, Card, Result, Spin, Divider, Tag, theme, Flex 
} from 'antd';
import confetti from 'canvas-confetti';
import { 
    DeleteFilled, WhatsAppOutlined, ArrowLeftOutlined, 
    LoadingOutlined, TagOutlined 
} from '@ant-design/icons';
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
    const { token } = theme.useToken();
    const items = useCartStore((s) => s.items);
    const removeItem = useCartStore((s) => s.removeItem);
    const setQty = useCartStore((s) => s.setQty);
    const subtotal = useCartStore((s) => s.subtotal());

    const [isCheckoutView, setIsCheckoutView] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [isProcessingPayment, setIsProcessingPayment] = useState(false);
    const [orderSuccess, setOrderSuccess] = useState<string | null>(null);
    const [paymentMethod, setPaymentMethod] = useState<'CULQI' | 'WHATSAPP'>('CULQI');
    const [form] = Form.useForm();
    const shippingDataRef = useRef<any>(null);
    const processingRef = useRef(false);

    // Coupon states
    const [couponCode, setCouponCode] = useState('');
    const [appliedCoupon, setAppliedCoupon] = useState<any>(null);
    const [isValidatingCoupon, setIsValidatingCoupon] = useState(false);

    // Re-validate or clear coupon if subtotal changes (e.g. removed items)
    useEffect(() => {
        if (appliedCoupon && subtotal < Number(appliedCoupon.min_purchase || 0)) {
            setAppliedCoupon(null);
            setCouponCode('');
            toast.info('Cupón removido porque no se cumple el monto mínimo');
        }
    }, [subtotal, appliedCoupon]);

    // Global callback required by Culqi documentation
    useEffect(() => {
        (window as any).culqi = async () => {
            if (processingRef.current) return; // Prevent double firing
            const Culqi = (window as any).Culqi;
            
            if (Culqi.token) {
                processingRef.current = true;
                const token = Culqi.token.id;
                const email = Culqi.token.email || 'compras@auraboutique.com';
                
                if (Culqi.close) Culqi.close();
                setIsProcessingPayment(true);
                
                await processBackendCheckout(token, email);
            } else if (Culqi.error) {
                toast.error(Culqi.error.user_message || 'Error en el pago');
                setIsSubmitting(false);
                if (Culqi.close) Culqi.close();
            }
        };
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    const handleApplyCoupon = async () => {
        if (!couponCode) return;
        setIsValidatingCoupon(true);
        try {
            const res = await fetch('/api/store/coupons/validate', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ code: couponCode, subtotal })
            });
            const data = await res.json();
            if (data.success) {
                setAppliedCoupon(data);
                toast.success(`Cupón aplicado: -${formatPEN(data.discountAmount)}`);
            } else {
                toast.error(data.error || 'Cupón no válido');
            }
        } catch (error) {
            toast.error('Error al validar cupón');
        } finally {
            setIsValidatingCoupon(false);
        }
    };

    const finalTotal = subtotal - (appliedCoupon?.discountAmount || 0);

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

        processingRef.current = false;
        Culqi.publicKey = process.env.NEXT_PUBLIC_CULQI_PUBLIC_KEY;
        Culqi.settings({
            title: 'Aura Boutique',
            currency: 'PEN',
            amount: Math.round(finalTotal * 100), // Usar total FINAL con descuento
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
                    coupon_code: appliedCoupon?.code || null,
                    discount_total: appliedCoupon?.discountAmount || 0,
                    total: finalTotal,
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

            if (appliedCoupon) {
                text += `\nSubtotal: ${formatPEN(subtotal)}\n`;
                text += `Cupón: ${appliedCoupon.code} (-${formatPEN(appliedCoupon.discountAmount)})\n`;
                text += `*Total a pagar: ${formatPEN(finalTotal)}*\n\n`;
            } else {
                text += `\n*Total: ${formatPEN(subtotal)}*\n\n`;
            }

            text += `*Mis datos:*\n`;
            text += `Nombre: ${payload.shipping_name}\n`;
            if (payload.shipping_address) {
                text += `Dirección: ${payload.shipping_address}\n`;
            }
            
            useCartStore.getState().clear();
            setIsCheckoutView(false);
            setAppliedCoupon(null);
            setCouponCode('');
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
                    coupon_code: appliedCoupon?.code || null,
                    discount_total: appliedCoupon?.discountAmount || 0,
                    total: finalTotal,
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
            setAppliedCoupon(null);
            setCouponCode('');
            form.resetFields();
            
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
        setAppliedCoupon(null);
        setCouponCode('');
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
                            <Text strong>Subtotal: {formatPEN(subtotal)}</Text>
                        </div>
                        {appliedCoupon && (
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                <Text type="success">Descuento ({appliedCoupon.code}): -{formatPEN(appliedCoupon.discountAmount)}</Text>
                            </div>
                        )}
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <Text strong style={{ fontSize: 18 }}>Total: {formatPEN(finalTotal)}</Text>
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
                    icon={<LoadingOutlined style={{ color: token.colorPrimary, fontSize: 72 }} spin />}
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
                        <Button type="primary" key="console" onClick={handleClose} style={{ height: 44, width: '100%', fontSize: 16 }}>
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

                        <Card size="small" style={{ marginTop: 24, marginBottom: 24, backgroundColor: token.colorFillAlter }}>
                             {/* Sección de Cupón */}
                             <div style={{ marginBottom: 12 }}>
                                <Text strong style={{ display: 'block', marginBottom: 8 }}>¿Tienes un cupón?</Text>
                                <div style={{ display: 'flex', gap: 8 }}>
                                    <Input 
                                        placeholder="Código" 
                                        value={couponCode} 
                                        onChange={e => setCouponCode(e.target.value)} 
                                        disabled={!!appliedCoupon}
                                        style={{ textTransform: 'uppercase' }}
                                    />
                                    {appliedCoupon ? (
                                        <Button danger onClick={() => { setAppliedCoupon(null); setCouponCode(''); }}>Quitar</Button>
                                    ) : (
                                        <Button type="primary" onClick={handleApplyCoupon} loading={isValidatingCoupon}>Aplicar</Button>
                                    )}
                                </div>
                             </div>
                             
                             <Divider style={{ margin: '12px 0' }} />

                             <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
                                <Text>Productos ({items.length})</Text>
                                <Text>{formatPEN(subtotal)}</Text>
                             </div>
                             {appliedCoupon && (
                                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
                                    <Text type="success"><TagOutlined /> Descuento ({appliedCoupon.code})</Text>
                                    <Text type="success">-{formatPEN(appliedCoupon.discountAmount)}</Text>
                                </div>
                             )}
                             <Divider style={{ margin: '8px 0' }} />
                             <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                                <Text strong style={{ fontSize: 16 }}>Total Final</Text>
                                <Text strong style={{ fontSize: 16 }}>{formatPEN(finalTotal)}</Text>
                             </div>
                        </Card>

                        <Space orientation="vertical" style={{ width: '100%', marginTop: 16 }}>
                            <Button 
                                type="primary" 
                                htmlType="submit"
                                onClick={() => setPaymentMethod('CULQI')}
                                loading={isSubmitting && paymentMethod === 'CULQI'}
                                style={{ width: '100%', height: 44, fontSize: 16 }}
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
                <Flex vertical gap={12}>
                    {items.map((item, index) => (
                        <Card key={item.variantId} size="small" variant="borderless" style={{ background: token.colorFillAlter }}>
                            <Flex align="start" gap={12}>
                                <div style={{ width: 56, height: 56, overflow: 'hidden', borderRadius: 8, flexShrink: 0 }}>
                                    {item.imageUrl ? (
                                        // eslint-disable-next-line @next/next/no-img-element
                                        <img
                                            src={item.imageUrl}
                                            alt={item.name}
                                            style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                                        />
                                    ) : null}
                                </div>
                                <div style={{ flex: 1 }}>
                                    <Link href={`/product/${item.slug}`} onClick={onClose} style={{ display: 'block', marginBottom: 4 }}>
                                        <Text strong>{item.name}</Text>
                                    </Link>
                                    <Text type="secondary" style={{ display: 'block', fontSize: 12 }}>{`${item.size} · ${item.color}`}</Text>
                                    
                                    <Flex align="center" justify="space-between" style={{ marginTop: 8 }}>
                                        <Space vertical size={0}>
                                            <Text>{formatPEN(item.unitPrice)}</Text>
                                            <Text type="secondary" style={{ fontSize: 11 }}>
                                                Total: {formatPEN(item.unitPrice * item.qty)}
                                            </Text>
                                        </Space>
                                        <Space>
                                            <InputNumber
                                                min={1}
                                                size="small"
                                                value={item.qty}
                                                onChange={(v) => setQty(item.variantId, Number(v ?? 1))}
                                                style={{ width: 60 }}
                                            />
                                            <Button
                                                type="text"
                                                danger
                                                size="small"
                                                icon={<DeleteFilled />}
                                                onClick={() => removeItem(item.variantId)}
                                            />
                                        </Space>
                                    </Flex>
                                </div>
                            </Flex>
                        </Card>
                    ))}
                </Flex>
            )}
        </Drawer>
    );
}