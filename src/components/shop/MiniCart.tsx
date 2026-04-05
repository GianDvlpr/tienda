'use client';
import { toast } from 'sonner';

import React, { useState, useEffect, useRef, useMemo } from 'react';

import { 
    Button, Drawer, Empty, InputNumber, Space, Typography, 
    Form, Input, Card, Result, Divider, theme, Flex 
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

    // Coupon and Bundle states
    const [couponCode, setCouponCode] = useState('');
    const [appliedCoupon, setAppliedCoupon] = useState<any>(null);
    const [isValidatingCoupon, setIsValidatingCoupon] = useState(false);
    const [activeBundles, setActiveBundles] = useState<any[]>([]);
    const appliedCouponRef = useRef<any>(null);

    useEffect(() => {
        appliedCouponRef.current = appliedCoupon;
    }, [appliedCoupon]);

    useEffect(() => {
        if (open) {
            fetch('/api/store/bundles')
                .then(res => res.json())
                .then(data => setActiveBundles(Array.isArray(data) ? data : []))
                .catch(err => console.error("Error loading bundles", err));
        }
    }, [open]);

    const bundleDiscount = useMemo(() => {
        if (activeBundles.length === 0 || items.length === 0) return 0;
        const cartProductStats: Record<string, number> = {};
        items.forEach(item => {
            cartProductStats[item.productId] = (cartProductStats[item.productId] || 0) + item.qty;
        });

        let totalSavings = 0;
        activeBundles.forEach(bundle => {
            const hasAll = bundle.requiredProductIds.every((id: string) => (cartProductStats[id] || 0) > 0);
            if (hasAll) {
                const possibleSets = Math.min(...bundle.requiredProductIds.map((id: string) => cartProductStats[id]));
                totalSavings += possibleSets * bundle.discount_amount;
            }
        });
        return totalSavings;
    }, [items, activeBundles]);

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
                body: JSON.stringify({ 
                    code: couponCode, 
                    subtotal: subtotal - bundleDiscount 
                })
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

    const finalTotal = Math.max(0, subtotal - bundleDiscount - (appliedCoupon?.discountAmount || 0));

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
            amount: Math.round(finalTotal * 100),
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
        const currentCoupon = appliedCouponRef.current;

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
                    coupon_code: currentCoupon?.code || null,
                    discount_total: currentCoupon?.discountAmount || 0,
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


    const isMobile = typeof window !== 'undefined' && window.innerWidth <= 768;

    return (
        <Drawer
            title={
                <div style={{ fontFamily: 'Playfair Display, serif', fontSize: 22, fontWeight: 600 }}>
                    {isProcessingPayment ? "Procesando..." :
                     orderSuccess ? "Pedido Completado" : 
                     isCheckoutView ? "Completar Pedido" : "Mi Carrito"}
                </div>
            }
            extra={isCheckoutView && !orderSuccess && !isProcessingPayment && (
                <Button type="text" icon={<ArrowLeftOutlined />} onClick={() => setIsCheckoutView(false)}>Volver</Button>
            )}
            open={open}
            onClose={handleClose}
            width={isMobile ? '100%' : 420}
            styles={{ 
                body: { padding: '24px 20px' },
                footer: { padding: '24px 20px' }
            }}
            footer={
                (orderSuccess || isProcessingPayment || items.length === 0 || isCheckoutView) ? null : (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <Text style={{ color: '#666' }}>Subtotal</Text>
                            <Text strong>{formatPEN(subtotal)}</Text>
                        </div>
                        {bundleDiscount > 0 && (
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                <Text type="success">Descuento Conjunto</Text>
                                <Text type="success">-{formatPEN(bundleDiscount)}</Text>
                            </div>
                        )}
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 8 }}>
                            <Title level={4} style={{ margin: 0, fontFamily: 'Playfair Display, serif' }}>Total: {formatPEN(finalTotal)}</Title>
                        </div>
                        <Button 
                            type="primary" 
                            size="large"
                            onClick={() => setIsCheckoutView(true)}
                            style={{ 
                                width: '100%', 
                                height: 50, 
                                fontSize: 15, 
                                fontWeight: 600, 
                                letterSpacing: '0.05em',
                                marginTop: 8,
                                borderRadius: 4
                            }}
                        >
                            PROCEDER AL PAGO
                        </Button>
                    </div>
                )
            }

        >
            {isProcessingPayment ? (
                <Result
                    icon={<LoadingOutlined style={{ color: '#C89F53', fontSize: 72 }} spin />}
                    title={<div style={{ fontFamily: 'Playfair Display, serif' }}>Procesando tu pago...</div>}
                    subTitle="Por favor, no cierres esta ventana. Estamos validando la transacción de forma segura."
                />
            ) : orderSuccess ? (
                <Result
                    status="success"
                    title={<div style={{ fontFamily: 'Playfair Display, serif', fontSize: 24 }}>¡Pedido Confirmado!</div>}
                    subTitle={
                        <Text type="secondary">
                            Tu pedido <Text strong>{orderSuccess}</Text> ha sido procesado correctamente.
                            <br />
                            Pronto coordinaremos el envío contigo.
                        </Text>
                    }
                    extra={[
                        <Button type="primary" key="shop" onClick={handleClose} style={{ height: 48, width: '100%', borderRadius: 4 }}>
                            SEGUIR COMPRANDO
                        </Button>
                    ]}
                />
            ) : (
                <>
                    <div style={{ display: isCheckoutView ? 'none' : 'block' }}>
                        {items.length === 0 ? (
                            <div style={{ textAlign: 'center', padding: '40px 0' }}>
                                <Empty description={<Text type="secondary">Tu carrito está vacío</Text>} />
                            </div>
                        ) : (
                            <Flex vertical gap={16}>
                                {items.map((item) => (
                                    <div key={item.variantId} style={{ paddingBottom: 16, borderBottom: `1px solid ${token.colorFillSecondary}` }}>
                                        <Flex align="start" gap={16}>
                                            <div style={{ width: 80, height: 100, overflow: 'hidden', borderRadius: 0, flexShrink: 0, backgroundColor: '#f9f9f9' }}>
                                                {item.imageUrl ? (
                                                    <img
                                                        src={item.imageUrl}
                                                        alt={item.name}
                                                        style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                                                    />
                                                ) : null}
                                            </div>
                                            <div style={{ flex: 1 }}>
                                                <Flex justify="space-between" align="start">
                                                    <div style={{ flex: 1, paddingRight: 8 }}>
                                                        <Link href={`/product/${item.slug}`} onClick={onClose} style={{ display: 'block' }}>
                                                            <Text strong style={{ fontSize: 14, color: '#1a1a1a' }}>{item.name}</Text>
                                                        </Link>
                                                        <Text type="secondary" style={{ display: 'block', fontSize: 12, marginTop: 2, textTransform: 'uppercase', letterSpacing: '0.02em' }}>
                                                            {`${item.size} / ${item.color}`}
                                                        </Text>
                                                    </div>
                                                    <Button
                                                        type="text"
                                                        size="small"
                                                        icon={<DeleteFilled style={{ fontSize: 14, color: '#ccc' }} />}
                                                        onClick={() => removeItem(item.variantId)}
                                                    />
                                                </Flex>
                                                
                                                <Flex align="center" justify="space-between" style={{ marginTop: 12 }}>
                                                    <InputNumber
                                                        min={1}
                                                        variant="borderless"
                                                        size="small"
                                                        value={item.qty}
                                                        onChange={(v) => setQty(item.variantId, Number(v ?? 1))}
                                                        style={{ width: 50, borderBottom: '1px solid #eee', borderRadius: 0 }}
                                                    />
                                                    <Text style={{ fontWeight: 500 }}>{formatPEN(item.unitPrice * item.qty)}</Text>
                                                </Flex>
                                            </div>
                                        </Flex>
                                    </div>
                                ))}
                            </Flex>
                        )}
                    </div>

                    <div style={{ display: isCheckoutView ? 'block' : 'none' }}>
                        <div style={{ marginBottom: 24, textAlign: 'center' }}>
                            <Text type="secondary" style={{ fontSize: 13 }}>Finaliza tu compra de forma segura</Text>
                        </div>
                        
                        <Form layout="vertical" form={form} onFinish={handleCheckoutSubmit} requiredMark={false}>
                            <Form.Item label={<Text strong style={{ fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Nombre Completo</Text>} name="shipping_name" rules={[{ required: true, message: 'Requerido' }]}>
                                <Input variant="filled" placeholder="Tu nombre" size="large" style={{ borderRadius: 4 }} />
                            </Form.Item>
                            
                            <Form.Item label={<Text strong style={{ fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.05em' }}>WhatsApp</Text>} name="shipping_phone" rules={[{ required: true, message: 'Requerido' }]}>
                                <Input variant="filled" placeholder="999 999 999" size="large" style={{ borderRadius: 4 }} />
                            </Form.Item>
                            
                            <Form.Item label={<Text strong style={{ fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Dirección de Envío</Text>} name="shipping_address">
                                <Input.TextArea variant="filled" placeholder="Dirección y referencias" rows={2} style={{ borderRadius: 4 }} />
                            </Form.Item>

                            <Card size="small" style={{ marginTop: 24, background: token.colorFillAlter, border: `1px solid ${token.colorBorderSecondary}`, borderRadius: 8 }}>
                                <div style={{ padding: '12px 8px' }}>
                                    <div style={{ display: 'flex', gap: 8, marginBottom: 16 }}>
                                        <Input 
                                            placeholder="Cupón" 
                                            variant="outlined"
                                            value={couponCode} 
                                            onChange={e => setCouponCode(e.target.value)} 
                                            disabled={!!appliedCoupon}
                                            style={{ textTransform: 'uppercase', borderRadius: 4 }}
                                        />
                                        {appliedCoupon ? (
                                            <Button danger onClick={() => { setAppliedCoupon(null); setCouponCode(''); }}>Quitar</Button>
                                        ) : (
                                            <Button onClick={handleApplyCoupon} loading={isValidatingCoupon}>Ok</Button>
                                        )}
                                    </div>
                                    
                                    <Divider style={{ margin: '12px 0' }} />

                                    <Flex vertical gap={6} style={{ marginBottom: 4 }}>
                                        <Flex justify="space-between">
                                            <Text type="secondary">Subtotal</Text>
                                            <Text>{formatPEN(subtotal)}</Text>
                                        </Flex>
                                        {bundleDiscount > 0 && (
                                            <Flex justify="space-between">
                                                <Text type="success">Descuento Conjunto</Text>
                                                <Text type="success">-{formatPEN(bundleDiscount)}</Text>
                                            </Flex>
                                        )}
                                        {appliedCoupon && (
                                            <Flex justify="space-between">
                                                <Text type="success">Cupón ({appliedCoupon.code})</Text>
                                                <Text type="success">-{formatPEN(appliedCoupon.discountAmount)}</Text>
                                            </Flex>
                                        )}
                                    </Flex>
                                    <Divider style={{ margin: '12px 0' }} />
                                    <Flex justify="space-between" align="center">
                                        <Title level={4} style={{ margin: 0, fontFamily: 'Playfair Display, serif' }}>Total Final</Title>
                                        <Title level={4} style={{ margin: 0, fontFamily: 'Playfair Display, serif' }}>{formatPEN(finalTotal)}</Title>
                                    </Flex>
                                </div>
                            </Card>


                            <Space orientation="vertical" size="large" style={{ width: '100%', marginTop: 24 }}>
                                <Button 
                                    type="primary" 
                                    htmlType="submit"
                                    onClick={() => setPaymentMethod('CULQI')}
                                    loading={isSubmitting && paymentMethod === 'CULQI'}
                                    style={{ width: '100%', height: 50, fontSize: 14, fontWeight: 600, letterSpacing: '0.05em', borderRadius: 4 }}
                                >
                                    PAGAR CON TARJETA
                                </Button>
                                <Button 
                                    htmlType="submit"
                                    onClick={() => setPaymentMethod('WHATSAPP')}
                                    loading={isSubmitting && paymentMethod === 'WHATSAPP'}
                                    icon={<WhatsAppOutlined />}
                                    style={{ 
                                        width: '100%', 
                                        height: 50, 
                                        fontSize: 14, 
                                        fontWeight: 600, 
                                        borderRadius: 4,
                                        borderColor: '#25D366', 
                                        color: '#25D366'
                                    }}
                                >
                                    PEDIR POR WHATSAPP
                                </Button>
                            </Space>
                            
                            <div style={{ textAlign: 'center', marginTop: 16 }}>
                                <Text type="secondary" style={{ fontSize: 10 }}>🔒 Tus datos están seguros con nosotros</Text>
                            </div>
                        </Form>
                    </div>

                </>
            )}
        </Drawer>
    );
}