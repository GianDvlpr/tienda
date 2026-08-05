'use client';
import { toast } from 'sonner';

import React, { useState } from 'react';
import { Card, Select, Button, Typography, Space, Descriptions, Table, Row, Col, Input, Tag, Alert, Form, InputNumber, Popconfirm, Image, Switch, Dropdown, Modal } from 'antd';
import { CloseOutlined, DeleteOutlined, EditOutlined, FileImageOutlined, FilePdfOutlined, LeftOutlined, PlusOutlined, SaveOutlined, PrinterOutlined, WhatsAppOutlined } from '@ant-design/icons';
import useSWR from 'swr';
import { useParams } from 'next/navigation';
import { fetcher } from '@/lib/fetcher';
import { formatPEN } from '@/lib/money';
import { calculateBundleDiscount, type BundleDiscountPromotion } from '@/lib/bundle-discount';
import Link from 'next/link';
import dayjs from 'dayjs';
import { toPng } from 'html-to-image';
import jsPDF from 'jspdf';
import QRCode from 'qrcode';
import type { ColumnsType } from 'antd/es/table';
import ImageUploader from '@/components/admin/ImageUploader';

export const statusMap: Record<string, { label: string, color: string }> = {
    'PENDING_WS': { label: 'Pend. WhatsApp', color: 'orange' },
'PARTIALLY_PAID': { label: 'Adelanto / Saldo pendiente', color: 'volcano' },
    'SEPARATED': { label: 'Separado', color: 'lime' },
    'PAID': { label: 'Orden generada / Pagada', color: 'gold' },
    'MEASURES_CONFIRMED': { label: 'Medidas confirmadas', color: 'purple' },
    'CONFIRMED': { label: 'Confirmado', color: 'blue' },
    'IN_PRODUCTION': { label: 'En confección', color: 'magenta' },
    'READY': { label: 'Listo para envío', color: 'geekblue' },
    'SHIPPED': { label: 'Enviado', color: 'cyan' },
    'DELIVERED': { label: 'Entregado', color: 'green' },
    'CANCELLED': { label: 'Cancelado', color: 'red' },
};

const salesChannelMap: Record<string, { label: string, color: string }> = {
    SHOP: { label: 'Shop', color: 'blue' },
    WHATSAPP: { label: 'WhatsApp', color: 'green' },
    TIKTOK: { label: 'TikTok', color: 'purple' },
    INSTAGRAM: { label: 'Instagram', color: 'magenta' },
    FACEBOOK: { label: 'Facebook', color: 'geekblue' },
    OTHER: { label: 'Otro', color: 'default' },
};

const { Title, Text } = Typography;

const salesChannelOptions = [
    { value: 'SHOP', label: 'Shop' },
    { value: 'WHATSAPP', label: 'WhatsApp' },
    { value: 'TIKTOK', label: 'TikTok' },
    { value: 'INSTAGRAM', label: 'Instagram' },
    { value: 'FACEBOOK', label: 'Facebook' },
    { value: 'OTHER', label: 'Otro canal' },
];

const statusOptions = [
    { value: 'PENDING_WS', label: 'Pendiente WhatsApp' },
{ value: 'PARTIALLY_PAID', label: 'Adelanto pagado / saldo pendiente' },
    { value: 'SEPARATED', label: 'Prenda separada' },
    { value: 'PAID', label: 'Orden generada / Pagada' },
    { value: 'MEASURES_CONFIRMED', label: 'Medidas confirmadas' },
    { value: 'CONFIRMED', label: 'Confirmado / En Preparación' },
    { value: 'IN_PRODUCTION', label: 'En confección' },
    { value: 'READY', label: 'Listo para envío' },
    { value: 'SHIPPED', label: 'Enviado / En Tránsito' },
    { value: 'DELIVERED', label: 'Entregado' },
    { value: 'CANCELLED', label: 'Cancelado' },
];

const paymentMethodOptions = [
    { value: 'CULQI', label: 'Culqi' },
    { value: 'YAPE', label: 'Yape' },
    { value: 'PLIN', label: 'Plin' },
    { value: 'TRANSFER', label: 'Transferencia' },
    { value: 'CARD', label: 'Tarjeta' },
    { value: 'CASH', label: 'Efectivo' },
    { value: 'OTHER', label: 'Otro' },
];

const DOCUMENT_LOGO_PATH = '/logo-aura.png';
const PRINT_W = '14.85cm';
const PRINT_H = '21cm';
const STICKER_W = '21cm';
const STICKER_H = '14.85cm';

function openPrintWindow(html: string) {
    const w = window.open('', '_blank');
    if (!w) return;
    w.document.write(html);
    w.document.close();
}

type OrderItem = {
    order_item_id: string;
    variant_id: string;
    qty: number;
    unit_price: number | string;
    line_total: number | string;
    product_name: string;
    variant_size: string;
    variant_color: string;
    sku: string;
    is_customized?: boolean | number;
    custom_measurements_json?: string | null;
    customization_surcharge?: number | string | null;
    customization_group_id?: string | null;
    customization_group_label?: string | null;
};

type EditableOrderItem = {
    variant_id: string;
    product_id?: string;
    product_name: string;
    sku: string;
    size: string;
    color: string;
    qty: number;
    unit_price: number;
};

type ProductVariant = {
    variant_id: string;
    sku: string;
    size: string;
    color: string;
    price?: number | string | null;
    stock: number;
    is_active: boolean;
};

type Product = {
    product_id: string;
    name: string;
    base_price?: number | string | null;
    is_active: boolean;
    product_variant?: ProductVariant[];
};

type OrderPhoto = {
    photo_id: string;
    url: string;
    public_id?: string | null;
    caption?: string | null;
    is_public_tracking: boolean | number;
    created_at: string;
};

type AdminOrderDetail = {
    order_id: string;
    code: string;
    status: string;
    shipping_name: string;
    shipping_dni?: string | null;
    shipping_phone: string;
    shipping_address?: string | null;
    subtotal: number | string;
    shipping_cost?: number | string | null;
    discount_total?: number | string | null;
    bundle_discount?: number | string | null;
    coupon_discount?: number | string | null;
    coupon_code?: string | null;
    total: number | string;
    amount_paid?: number | string | null;
    balance_due?: number | string | null;
    notes?: string | null;
    created_at: string;
    sales_channel?: string | null;
    external_reference?: string | null;
    payment_method?: string | null;
    payment_reference?: string | null;
    order_item?: OrderItem[];
    order_photo?: OrderPhoto[];
};

function getErrorMessage(error: unknown) {
    return error instanceof Error ? error.message : 'Error al actualizar pedido';
}

function isOrderPhotoPublic(photo: OrderPhoto) {
    return photo.is_public_tracking === true || photo.is_public_tracking === 1;
}

function escapeHtml(value: unknown) {
    return String(value ?? '')
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;');
}

function getPaymentMethodLabel(value?: string | null) {
    return paymentMethodOptions.find(option => option.value === value)?.label || value || 'No registrado';
}

function getReceiptFilename(orderCode: string, extension: 'pdf' | 'png') {
    const safeCode = orderCode.replace(/[^a-z0-9-_]/gi, '-').toLowerCase();
    return `comprobante-${safeCode}.${extension}`;
}

async function getDocumentLogoSrc() {
    const absoluteLogoUrl = `${window.location.origin}${DOCUMENT_LOGO_PATH}`;

    try {
        const response = await fetch(DOCUMENT_LOGO_PATH);
        if (!response.ok) return absoluteLogoUrl;

        const blob = await response.blob();

        return await new Promise<string>((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = () => resolve(String(reader.result));
            reader.onerror = () => reject(reader.error);
            reader.readAsDataURL(blob);
        });
    } catch {
        return absoluteLogoUrl;
    }
}

function buildReceiptHtml(order: AdminOrderDetail, trackingUrl: string, qrDataUrl: string, logoSrc: string) {
    const rows = (order.order_item || []).map(item => {
        const customLabel = item.is_customized === true || item.is_customized === 1 ? '<span class="receipt-badge">Personalizado</span>' : '';

        return `
            <tr>
                <td class="qty">${item.qty}</td>
                <td>
                    <div class="item-name">${escapeHtml(item.product_name)} ${customLabel}</div>
                    <div class="muted">${escapeHtml(item.variant_size)} / ${escapeHtml(item.variant_color)} · SKU ${escapeHtml(item.sku)}</div>
                </td>
                <td class="money">${escapeHtml(formatPEN(Number(item.unit_price)))}</td>
                <td class="money strong">${escapeHtml(formatPEN(Number(item.line_total)))}</td>
            </tr>
        `;
    }).join('');

    const subtotal = Number(order.subtotal || 0);
    const bundleDiscount = Number(order.bundle_discount || 0);
    const couponDiscount = Number(order.coupon_discount || 0);
    const discountTotal = Number(order.discount_total || 0);
    const otherDiscount = Math.max(0, discountTotal - bundleDiscount - couponDiscount);
    const shippingCost = Number(order.shipping_cost || 0);
    const total = Number(order.total || 0);
    const amountPaid = Number(order.amount_paid || 0);
    const balanceDue = Number(order.balance_due || 0);
    const salesChannel = salesChannelMap[order.sales_channel || 'SHOP']?.label || order.sales_channel || 'Shop';
    const statusLabel = statusMap[order.status]?.label || order.status;

    return `
        <div class="receipt-document">
            <style>
                .receipt-document {
                    width: 794px;
                    min-height: 1123px;
                    box-sizing: border-box;
                    padding: 42px;
                    background: #fffaf3;
                    color: #211915;
                    font-family: Arial, Helvetica, sans-serif;
                    border: 1px solid #eadfce;
                }
                .receipt-shell { background: #fff; border: 1px solid #eadfce; border-radius: 24px; overflow: hidden; box-shadow: 0 14px 40px rgba(52, 38, 24, 0.08); }
                .receipt-hero { background: linear-gradient(135deg, #241711, #6c452d); color: #fff; padding: 30px 38px; display: flex; justify-content: space-between; gap: 24px; align-items: center; }
                .brand-wrap { display: flex; align-items: center; gap: 16px; }
                .brand-logo { width: 92px; height: 92px; border-radius: 999px; object-fit: cover; background: #fff7ee; border: 2px solid rgba(244,216,182,0.85); box-shadow: 0 10px 24px rgba(0,0,0,0.22); }
                .brand { font-size: 30px; font-weight: 900; letter-spacing: 1.8px; margin-bottom: 8px; }
                .doc-label { font-size: 12px; letter-spacing: 2.4px; text-transform: uppercase; color: #f4d8b6; }
                .code-box { border: 1px solid rgba(255,255,255,0.34); border-radius: 18px; padding: 16px 18px; text-align: right; min-width: 220px; }
                .code-label { font-size: 11px; color: #f4d8b6; text-transform: uppercase; letter-spacing: 1.4px; margin-bottom: 7px; }
                .code-value { font-size: 22px; font-weight: 900; }
                .receipt-body { padding: 34px 38px 38px; }
                .info-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 18px; margin-bottom: 30px; }
                .info-card { border: 1px solid #efe4d3; border-radius: 18px; padding: 18px; background: #fffdf9; }
                .section-title { font-size: 11px; text-transform: uppercase; color: #9b6f44; font-weight: 800; letter-spacing: 1.6px; margin-bottom: 12px; }
                .line { display: flex; justify-content: space-between; gap: 12px; margin: 8px 0; font-size: 14px; }
                .line span:first-child { color: #7c7169; }
                .line span:last-child { font-weight: 700; text-align: right; }
                .items-table { width: 100%; border-collapse: collapse; margin-top: 8px; overflow: hidden; border-radius: 16px; }
                .items-table th { background: #f3eadf; color: #6f4c2c; font-size: 11px; text-transform: uppercase; letter-spacing: 1px; padding: 12px 10px; text-align: left; }
                .items-table td { border-bottom: 1px solid #f0e7db; padding: 14px 10px; vertical-align: top; font-size: 13px; }
                .items-table tr:last-child td { border-bottom: none; }
                .qty { width: 52px; text-align: center; font-weight: 900; color: #6f4c2c; }
                .money { width: 112px; text-align: right; white-space: nowrap; }
                .strong { font-weight: 900; }
                .item-name { font-weight: 800; color: #2b211d; margin-bottom: 4px; }
                .muted { color: #81746b; font-size: 12px; }
                .receipt-badge { display: inline-block; margin-left: 8px; padding: 3px 7px; border-radius: 999px; background: #fbefd2; color: #8a5c16; font-size: 10px; text-transform: uppercase; letter-spacing: .7px; }
                .bottom-grid { display: grid; grid-template-columns: 1fr 300px; gap: 24px; align-items: start; margin-top: 30px; }
                .qr-card { border: 1px dashed #d8b98e; border-radius: 18px; padding: 18px; display: flex; gap: 16px; align-items: center; background: #fffaf2; }
                .qr-card img { width: 100px; height: 100px; border-radius: 12px; background: #fff; padding: 6px; border: 1px solid #eadfce; }
                .qr-title { font-weight: 900; margin-bottom: 5px; }
                .qr-link { color: #7c5b3a; font-size: 11px; word-break: break-all; }
                .totals { border: 1px solid #efe4d3; border-radius: 18px; padding: 18px; background: #fffdf9; }
                .total-line { display: flex; justify-content: space-between; gap: 16px; margin: 10px 0; font-size: 14px; }
                .discount { color: #0f7a46; }
                .grand-total { border-top: 2px solid #2b211d; padding-top: 14px; margin-top: 14px; font-size: 24px; font-weight: 900; }
                .note { margin-top: 30px; color: #7a6c62; font-size: 12px; line-height: 1.55; border-top: 1px solid #efe4d3; padding-top: 18px; }
            </style>
            <div class="receipt-shell">
                <div class="receipt-hero">
                    <div class="brand-wrap">
                        <img class="brand-logo" src="${escapeHtml(logoSrc)}" alt="Aura Boutique" />
                        <div>
                            <div class="brand">AURA BOUTIQUE</div>
                            <div class="doc-label">Comprobante de pedido</div>
                        </div>
                    </div>
                    <div class="code-box">
                        <div class="code-label">Pedido</div>
                        <div class="code-value">${escapeHtml(order.code)}</div>
                        <div style="margin-top:8px;font-size:12px;color:#f7e5cf;">${escapeHtml(dayjs(order.created_at).format('DD/MM/YYYY HH:mm'))}</div>
                    </div>
                </div>
                <div class="receipt-body">
                    <div class="info-grid">
                        <div class="info-card">
                            <div class="section-title">Cliente</div>
                            <div class="line"><span>Nombre</span><span>${escapeHtml(order.shipping_name)}</span></div>
                            <div class="line"><span>DNI</span><span>${escapeHtml(order.shipping_dni || 'No registrado')}</span></div>
                            <div class="line"><span>Celular</span><span>${escapeHtml(order.shipping_phone)}</span></div>
                            <div class="line"><span>Entrega</span><span>${escapeHtml(order.shipping_address || 'Por confirmar')}</span></div>
                        </div>
                        <div class="info-card">
                            <div class="section-title">Pedido</div>
                            <div class="line"><span>Estado</span><span>${escapeHtml(statusLabel)}</span></div>
                            <div class="line"><span>Canal</span><span>${escapeHtml(salesChannel)}</span></div>
                            <div class="line"><span>Pago</span><span>${escapeHtml(getPaymentMethodLabel(order.payment_method))}</span></div>
                        </div>
                    </div>

                    <div class="section-title">Detalle de productos</div>
                    <table class="items-table">
                        <thead>
                            <tr>
                                <th>Cant.</th>
                                <th>Producto</th>
                                <th class="money">P. Unit.</th>
                                <th class="money">Subtotal</th>
                            </tr>
                        </thead>
                        <tbody>${rows}</tbody>
                    </table>

                    <div class="bottom-grid">
                        <div class="qr-card">
                            <img src="${escapeHtml(qrDataUrl)}" alt="QR seguimiento" />
                            <div>
                                <div class="qr-title">Seguimiento del pedido</div>
                                <div class="muted">El cliente puede escanear este QR para ver el estado de su pedido.</div>
                                <div class="qr-link">${escapeHtml(trackingUrl)}</div>
                            </div>
                        </div>
                        <div class="totals">
                            <div class="total-line"><span>Subtotal</span><strong>${escapeHtml(formatPEN(subtotal))}</strong></div>
                            ${shippingCost > 0 ? `<div class="total-line"><span>Envío</span><strong>${escapeHtml(formatPEN(shippingCost))}</strong></div>` : ''}
                            ${bundleDiscount > 0 ? `<div class="total-line discount"><span>Descuento conjunto</span><strong>-${escapeHtml(formatPEN(bundleDiscount))}</strong></div>` : ''}
                            ${couponDiscount > 0 ? `<div class="total-line discount"><span>Cupón ${escapeHtml(order.coupon_code || '')}</span><strong>-${escapeHtml(formatPEN(couponDiscount))}</strong></div>` : ''}
                            ${otherDiscount > 0 ? `<div class="total-line discount"><span>Descuento general</span><strong>-${escapeHtml(formatPEN(otherDiscount))}</strong></div>` : ''}
                            <div class="total-line grand-total"><span>Total</span><span>${escapeHtml(formatPEN(total))}</span></div>
                            ${amountPaid > 0 ? `<div class="total-line"><span>Pagado</span><strong>${escapeHtml(formatPEN(amountPaid))}</strong></div>` : ''}
                            ${balanceDue > 0 ? `<div class="total-line" style="color:#d46b08;"><span>Saldo pendiente</span><strong>${escapeHtml(formatPEN(balanceDue))}</strong></div>` : ''}
                        </div>
                    </div>

                    <div class="note">
                        Este documento es una constancia de pedido/venta emitida por AURA BOUTIQUE. No reemplaza una boleta o factura electrónica SUNAT. Para consultas, conserva el código de pedido ${escapeHtml(order.code)}.
                    </div>
                </div>
            </div>
        </div>
    `;
}

function downloadDataUrl(dataUrl: string, filename: string) {
    const link = document.createElement('a');
    link.href = dataUrl;
    link.download = filename;
    link.click();
}

function getImageDimensions(dataUrl: string) {
    return new Promise<{ width: number; height: number }>((resolve, reject) => {
        const image = new window.Image();
        image.onload = () => resolve({
            width: image.naturalWidth || image.width,
            height: image.naturalHeight || image.height,
        });
        image.onerror = () => reject(new Error('No se pudo preparar la imagen del comprobante'));
        image.src = dataUrl;
    });
}

export default function OrderDetailPage() {
    const params = useParams();
    const id = params.id as string;
    const [form] = Form.useForm();

    const { data: order, isLoading, mutate } = useSWR<AdminOrderDetail>(id ? `/api/admin/orders/${id}` : null, fetcher);
    const [isEditing, setIsEditing] = useState(false);
    const { data: products, isLoading: productsLoading } = useSWR<Product[]>(isEditing ? '/api/admin/products' : null, fetcher);
    const { data: activeBundles } = useSWR<BundleDiscountPromotion[]>(isEditing ? '/api/store/bundles' : null, fetcher);

    const [editItems, setEditItems] = useState<EditableOrderItem[]>([]);
    const [selectedVariantId, setSelectedVariantId] = useState<string>();
    const [selectedQty, setSelectedQty] = useState(1);
    const [selectedPrice, setSelectedPrice] = useState<number | null>(null);
    const [isSaving, setIsSaving] = useState(false);
    const [isAddingPhoto, setIsAddingPhoto] = useState(false);
    const [photoBusyId, setPhotoBusyId] = useState<string | null>(null);
    const [generatingReceipt, setGeneratingReceipt] = useState<'pdf' | 'png' | null>(null);

    type OrderPayment = {
        payment_id: string;
        order_id: string;
        amount: number | string;
        method: string;
        reference: string | null;
        notes: string | null;
        created_at: string;
    };

    const { data: payments, mutate: mutatePayments } = useSWR<OrderPayment[]>(id ? `/api/admin/orders/${id}/payments` : null, fetcher);
    const [paymentModalOpen, setPaymentModalOpen] = useState(false);
    const [paymentSaving, setPaymentSaving] = useState(false);
    const [paymentForm] = Form.useForm();

    const originalQtyByVariant = new Map((order?.order_item || []).map(item => [item.variant_id, item.qty]));
    const variantOptions = (products || []).flatMap(product =>
        (product.product_variant || []).map(variant => {
            const variantPrice = Number(variant.price ?? 0);
            const price = variantPrice > 0 ? variantPrice : Number(product.base_price ?? 0);
            const availableStock = variant.stock + (originalQtyByVariant.get(variant.variant_id) || 0);
            const inactiveLabel = !product.is_active || !variant.is_active ? ' | Inactivo' : '';
            return {
                value: variant.variant_id,
                label: `${product.name} - ${variant.size} / ${variant.color} | ${variant.sku} | Disponible: ${availableStock}${inactiveLabel}`,
                disabled: availableStock <= 0,
                product,
                variant,
                price,
                availableStock,
            };
        })
    );
    const productIdByVariant = new Map(variantOptions.map(option => [option.value, option.product.product_id]));

    const editSubtotal = editItems.reduce((sum, item) => sum + item.qty * item.unit_price, 0);
    const editBundleDiscount = calculateBundleDiscount(
        editItems.map(item => ({
            productId: item.product_id || productIdByVariant.get(item.variant_id) || '',
            qty: item.qty,
            unitPrice: item.unit_price,
        })),
        activeBundles || []
    );
    const editCouponDiscount = Number(order?.coupon_discount || 0);
    const editOtherDiscount = Math.max(0, Number(order?.discount_total || 0) - Number(order?.bundle_discount || 0) - editCouponDiscount);
    const editDiscountTotal = editBundleDiscount + editCouponDiscount + editOtherDiscount;
    const editShippingCost = Number(Form.useWatch('shipping_cost', form) ?? (order ? order.shipping_cost : 0) ?? 0);
    const editTotal = order ? Math.max(0, editSubtotal + editShippingCost - editDiscountTotal) : editSubtotal;
    const selectedEditStatus = Form.useWatch('status', form);
    const editAmountPaid = Number(Form.useWatch('amount_paid', form) || 0);
    const editBalanceDue = Math.max(0, editTotal - editAmountPaid);
    const orderPhotos = order?.order_photo || [];

    const handleStartEdit = () => {
        if (!order) return;

form.setFieldsValue({
            status: order.status,
            sales_channel: order.sales_channel || 'SHOP',
            external_reference: order.external_reference || undefined,
            payment_method: order.payment_method || undefined,
            payment_reference: order.payment_reference || undefined,
            amount_paid: Number(order.amount_paid || 0),
            shipping_cost: Number(order.shipping_cost || 0),
            shipping_name: order.shipping_name,
            shipping_dni: order.shipping_dni || '',
            shipping_phone: order.shipping_phone,
            shipping_address: order.shipping_address || '',
            notes: order.notes || '',
        });
        setEditItems((order.order_item || []).map(item => ({
            variant_id: item.variant_id,
            product_name: item.product_name,
            sku: item.sku,
            size: item.variant_size,
            color: item.variant_color,
            qty: item.qty,
            unit_price: Number(item.unit_price),
        })));
        setSelectedVariantId(undefined);
        setSelectedQty(1);
        setSelectedPrice(null);
        setIsEditing(true);
    };

    const handleCancelEdit = () => {
        setIsEditing(false);
        setEditItems([]);
        setSelectedVariantId(undefined);
        setSelectedQty(1);
        setSelectedPrice(null);
    };

    const handleSave = async () => {
        if (editItems.length === 0) {
            toast.error('El pedido debe tener al menos un producto');
            return;
        }

        setIsSaving(true);
        try {
            const values = await form.validateFields();
            const res = await fetch(`/api/admin/orders/${id}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    ...values,
                    items: editItems.map(item => ({
                        variant_id: item.variant_id,
                        qty: item.qty,
                        unit_price: item.unit_price,
                    })),
                }),
            });

            if (!res.ok) {
                const err = await res.json();
                throw new Error(err.error || 'Error al actualizar pedido');
            }

            toast.success('Pedido actualizado con éxito');
            setIsEditing(false);
            setEditItems([]);
            mutate();
        } catch (error: unknown) {
            toast.error(getErrorMessage(error));
        } finally {
            setIsSaving(false);
        }
    };

    const handleRegisterPayment = async () => {
        try {
            const values = await paymentForm.validateFields();
            setPaymentSaving(true);
            const res = await fetch(`/api/admin/orders/${id}/payments`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(values),
            });
            const data = await res.json();
            if (!res.ok) throw new Error(data.error || 'Error al registrar pago');
            toast.success('Pago registrado');
            paymentForm.resetFields();
            setPaymentModalOpen(false);
            mutatePayments();
            mutate();
        } catch (error: unknown) {
            if (error instanceof Error && error.message) {
                toast.error(getErrorMessage(error));
            }
        } finally {
            setPaymentSaving(false);
        }
    };

    const handleDeletePayment = async (paymentId: string) => {
        try {
            const res = await fetch(`/api/admin/orders/${id}/payments/${paymentId}`, { method: 'DELETE' });
            const data = await res.json();
            if (!res.ok) throw new Error(data.error || 'Error al eliminar pago');
            toast.success('Pago eliminado');
            mutatePayments();
            mutate();
        } catch (error: unknown) {
            toast.error(getErrorMessage(error));
        }
    };

    const handleVariantChange = (variantId: string) => {
        setSelectedVariantId(variantId);
        const option = variantOptions.find(opt => opt.value === variantId);
        setSelectedPrice(option?.price ?? 0);
    };

    const handleAddItem = () => {
        if (!selectedVariantId) {
            toast.error('Selecciona un producto');
            return;
        }

        const option = variantOptions.find(opt => opt.value === selectedVariantId);
        if (!option) {
            toast.error('Producto no encontrado');
            return;
        }

        const qty = Number(selectedQty || 0);
        const unitPrice = Number(selectedPrice ?? option.price ?? 0);
        const currentQty = editItems.find(item => item.variant_id === selectedVariantId)?.qty || 0;

        if (!Number.isInteger(qty) || qty <= 0) {
            toast.error('Ingresa una cantidad válida');
            return;
        }

        if (currentQty + qty > option.availableStock) {
            toast.error(`Stock insuficiente. Disponibles: ${option.availableStock}`);
            return;
        }

        if (!Number.isFinite(unitPrice) || unitPrice < 0) {
            toast.error('Ingresa un precio válido');
            return;
        }

        setEditItems(prev => {
            const existing = prev.find(item => item.variant_id === selectedVariantId);
            if (existing) {
                return prev.map(item => item.variant_id === selectedVariantId
                    ? { ...item, qty: item.qty + qty, unit_price: unitPrice }
                    : item
                );
            }

            return [
                ...prev,
                {
                    variant_id: option.variant.variant_id,
                    product_id: option.product.product_id,
                    product_name: option.product.name,
                    sku: option.variant.sku,
                    size: option.variant.size,
                    color: option.variant.color,
                    qty,
                    unit_price: unitPrice,
                }
            ];
        });

        setSelectedVariantId(undefined);
        setSelectedQty(1);
        setSelectedPrice(null);
    };

    const updateEditItem = (variantId: string, patch: Partial<Pick<EditableOrderItem, 'qty' | 'unit_price'>>) => {
        setEditItems(prev => prev.map(item => item.variant_id === variantId ? { ...item, ...patch } : item));
    };

    const handleContactWhatsApp = () => {
        if (!order || !order.shipping_phone) return;
        
        let text = `Hola ${order.shipping_name}, hemos recibido tu pedido *${order.code}*.\n\n`;
        text += `El monto total de tu pedido es de *${formatPEN(Number(order.total))}*.\n`;
        if (Number(order.balance_due || 0) > 0) {
            text += `Registramos un adelanto de *${formatPEN(Number(order.amount_paid || 0))}* y queda un saldo pendiente de *${formatPEN(Number(order.balance_due || 0))}*.\n`;
        }
        text += `Por favor, envíanos la constancia de pago por este medio para proceder con el envío a la dirección: ${order.shipping_address || 'Tu dirección acordada'}.\n\n`;
        text += `¡Gracias por tu compra en Aura Boutique!`;
        
        const encodedText = encodeURIComponent(text);
        const phone = order.shipping_phone.replace(/\D/g, ''); // limpia espacios y símbolos 
        window.open(`https://wa.me/${phone}?text=${encodedText}`, '_blank');
    };

    const handleOrderPhotoUpload = async (url: string, publicId: string) => {
        setIsAddingPhoto(true);
        try {
            const res = await fetch(`/api/admin/orders/${id}/photos`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    url,
                    public_id: publicId,
                    is_public_tracking: false,
                }),
            });

            if (!res.ok) {
                const err = await res.json();
                throw new Error(err.error || 'Error al registrar foto');
            }

            toast.success('Foto agregada como privada');
            mutate();
        } catch (error: unknown) {
            toast.error(getErrorMessage(error));
        } finally {
            setIsAddingPhoto(false);
        }
    };

    const handleTogglePhotoVisibility = async (photo: OrderPhoto, checked: boolean) => {
        const busyKey = `${photo.photo_id}:visibility`;
        setPhotoBusyId(busyKey);
        try {
            const res = await fetch(`/api/admin/orders/${id}/photos/${photo.photo_id}`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    caption: photo.caption || null,
                    is_public_tracking: checked,
                }),
            });

            if (!res.ok) {
                const err = await res.json();
                throw new Error(err.error || 'Error al actualizar foto');
            }

            toast.success(checked ? 'Foto visible en seguimiento' : 'Foto marcada como privada');
            mutate();
        } catch (error: unknown) {
            toast.error(getErrorMessage(error));
        } finally {
            setPhotoBusyId(null);
        }
    };

    const handleDeleteOrderPhoto = async (photoId: string) => {
        const busyKey = `${photoId}:delete`;
        setPhotoBusyId(busyKey);
        try {
            const res = await fetch(`/api/admin/orders/${id}/photos/${photoId}`, { method: 'DELETE' });

            if (!res.ok) {
                const err = await res.json();
                throw new Error(err.error || 'Error al eliminar foto');
            }

            toast.success('Foto eliminada del pedido');
            mutate();
        } catch (error: unknown) {
            toast.error(getErrorMessage(error));
        } finally {
            setPhotoBusyId(null);
        }
    };

const printShippingLabel = async () => {
        if (!order) return;

        const logoSrc = await getDocumentLogoSrc();

        // Extraer resumen de items para impresión
        const itemsList = order.order_item?.map((item) => `<li>${item.qty}x ${item.product_name} (${item.variant_size})</li>`).join('') || '';

        const html = `
            <html>
                <head>
                    <title>Etiqueta de Envio - ${order.code}</title>
                    <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css">
                    <link href="https://fonts.googleapis.com/css2?family=Playfair+Display:wght@500;700;900&family=Cinzel:wght@500;700&display=swap" rel="stylesheet">
<style>
                        @page { size: ${PRINT_W} ${PRINT_H}; margin: 0; }
                        * { box-sizing: border-box; }
                        html, body { margin: 0; padding: 0; background: #f0f0f0; color: #000; font-family: 'Inter', 'Helvetica Neue', Helvetica, Arial, sans-serif; }
                        .label {
                            width: ${PRINT_W};
                            max-width: ${PRINT_W};
                            height: ${PRINT_H};
                            margin: 0 auto;
                            background: #fff;
                            border: 2px solid #000;
                            padding: 16px 18px;
                            box-sizing: border-box;
                            display: flex;
                            flex-direction: column;
                        }

                        .header { display: flex; justify-content: space-between; align-items: center; gap: 12px; border-bottom: 2px solid #000; padding-bottom: 10px; margin-bottom: 14px; }
                        .brand-header { display: flex; align-items: center; gap: 10px; min-width: 0; }
                        .label-logo { width: 64px; height: 64px; border-radius: 999px; object-fit: cover; border: 1px solid #000; flex: 0 0 auto; }
                        .header h2 { margin: 0; font-family: 'Cinzel', serif; font-size: 22px; font-weight: 900; letter-spacing: 2px; line-height: 1; white-space: nowrap; }
                        .order-code { font-size: 16px; font-weight: bold; padding: 6px 12px; border: 2px solid #000; white-space: nowrap; flex: 0 0 auto; }

                        .section-title { font-family: 'Playfair Display', serif; font-size: 10px; color: #666; text-transform: uppercase; font-weight: bold; margin: 0 0 4px 0; letter-spacing: 0.5px; }

                        .receiver-box { font-size: 13px; margin-bottom: 14px; }
                        .receiver-box .name { font-size: 22px; font-weight: 900; margin-bottom: 4px; text-transform: uppercase; line-height: 1.1; }
                        .receiver-box .details { margin: 2px 0; }
                        .receiver-box .address { font-size: 15px; font-weight: bold; margin-top: 8px; padding: 10px; background: #fff; border: 2px dashed #000; line-height: 1.3; }

                        .sender-box { border: 1px solid #ddd; padding: 8px 10px; font-size: 11px; margin-bottom: 14px; background: #fafafa; }
                        .sender-box strong { display: block; font-size: 12px; margin-bottom: 2px; color: #000; }

                        .contents { border-top: 2px solid #000; padding-top: 10px; margin-top: 12px; font-size: 12px; }
                        .contents ul { margin: 4px 0 0; padding-left: 18px; }
                        .contents li { line-height: 1.35; }

                        .qr-section { display: flex; align-items: center; justify-content: space-between; gap: 12px; margin-top: 12px; }
                        .qr-code { width: 72px; height: 72px; }
                        .qr-text { font-size: 10px; color: #333; text-align: right; max-width: 60%; }
                        .qr-text strong { font-size: 12px; color: #000; display: block; margin-bottom: 2px; }

                        .footer { margin-top: 16px; font-size: 11px; font-weight: bold; text-align: center; border: 2px solid #000; padding: 8px; background: #000; color: #fff; text-transform: uppercase; letter-spacing: 1px; }
                        .date { text-align: center; font-size: 9px; color: #666; margin-top: 4px; }

                        @media print {
                            html, body { background: #fff; }
                            .label { border: none; }
                        }
                    </style>
                </head>
                <body>
                    <div class="label">
                        <div class="header">
                            <div class="brand-header">
                                <img class="label-logo" src="${escapeHtml(logoSrc)}" alt="Aura Boutique" />
                                <h2>AURA BOUTIQUE</h2>
                            </div>
                            <div class="order-code">#${order.code}</div>
                        </div>

                        <div class="section-title">Remitente</div>
                        <div class="sender-box">
                            <strong>AURA BOUTIQUE (ALMACÉN PRINCIPAL)</strong>
                            Taller y Despachos<br/>
                            Lima, Perú
                        </div>

                        <div class="section-title">Destinatario / Entregar A:</div>
                        <div class="receiver-box">
                            <div class="name">${order.shipping_name}</div>
                            <div class="details">DNI: ${order.shipping_dni || 'No registrado'}</div>
                            <div class="details">📞 ${order.shipping_phone}</div>
                            <div class="address" style="${!order.shipping_address ? 'color: #999;' : ''}">
                                📍 ${order.shipping_address || 'Dirección de Recojo / Tienda Física'}
                            </div>
                        </div>

                        <div class="contents">
                            <strong>CONTENIDO DEL PAQUETE (${order.order_item?.length || 0} items)</strong>
                            <ul>${itemsList}</ul>
                        </div>

                        <div class="qr-section">
                            <img class="qr-code" src="https://api.qrserver.com/v1/create-qr-code/?size=150x150&data=" alt="QR" id="dynamic-qr" />
                            <div class="qr-text">
                                <strong>Rastrear Pedido</strong>
                                Escanea o escribe este ID en la web:
                                <br/><span style="font-family: monospace; font-size: 11px; margin-top: 2px; display:inline-block;">${order.code}</span>
                            </div>
                        </div>

                        <div class="footer">
                            <span style="display:inline-flex; align-items:center; gap:6px; margin-right: 16px;">
                                <i class="fa-brands fa-instagram" style="font-size: 13px;"></i>
                                @auraboutiqueme
                            </span>
                            <span style="display:inline-flex; align-items:center; gap:6px;">
                                <i class="fa-brands fa-tiktok" style="font-size: 13px;"></i>
                                @auraboutiqueme
                            </span>
                        </div>
                        <div class="date">
                            Generado: ${dayjs().format('DD/MM/YYYY HH:mm')}
                        </div>
                    </div>
                    <script>
                        document.getElementById('dynamic-qr').src = 'https://api.qrserver.com/v1/create-qr-code/?size=150x150&data=' + encodeURIComponent(window.location.origin + '/track/${order.code}');
                        window.onload = function() { window.print(); window.setTimeout(window.close, 800); }
                    </script>
                </body>
            </html>
        `;
        openPrintWindow(html);
    };

    const printStickerFullLabel = async () => {
        if (!order) return;
        const logoSrc = await getDocumentLogoSrc();
        const itemsList = order.order_item?.map((item) => `<li>${item.qty}x ${item.product_name} (${item.variant_size})</li>`).join('') || '';

        const html = `
            <html>
                <head>
                    <title>Sticker etiqueta - ${order.code}</title>
                    <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css">
                    <link href="https://fonts.googleapis.com/css2?family=Playfair+Display:wght@500;700;900&family=Cinzel:wght@500;700&display=swap" rel="stylesheet">
<style>
                        @page { size: ${STICKER_W} ${STICKER_H}; margin: 0; }
                        * { box-sizing: border-box; }
                        html, body { margin: 0; padding: 0; background: #f0f0f0; color: #000; font-family: 'Inter', 'Helvetica Neue', Helvetica, Arial, sans-serif; }
                        .sticker {
                            width: ${STICKER_W};
                            max-width: ${STICKER_W};
                            height: ${STICKER_H};
                            margin: 0 auto;
                            background: #fff;
                            padding: 16px 20px;
                            box-sizing: border-box;
                            display: flex;
                            flex-direction: column;
                            border-radius: 12px;
                        }
                        .header { display: flex; justify-content: space-between; align-items: center; gap: 16px; padding-bottom: 10px; margin-bottom: 8px; border-bottom: 1px solid #eee; }
                        .brand { display: flex; align-items: center; gap: 14px; min-width: 0; }
                        .logo { width: 80px; height: 80px; border-radius: 999px; object-fit: cover; flex: 0 0 auto; }
                        .brand h2 { margin: 0; font-family: 'Cinzel', serif; font-size: 26px; font-weight: 700; letter-spacing: 2px; line-height: 1; white-space: nowrap; }
                        .order-code { font-size: 20px; font-weight: bold; padding: 6px 14px; border: 1.5px solid #c89f53; border-radius: 6px; white-space: nowrap; flex: 0 0 auto; }
                        .section-title { font-family: 'Playfair Display', serif; font-size: 10px; color: #888; text-transform: uppercase; font-weight: bold; margin: 0 0 4px 0; letter-spacing: 0.5px; }
                        .sender-box { border: 1px solid #eee; padding: 8px 10px; font-size: 11px; margin-bottom: 12px; background: #fafafa; }
                        .sender-box strong { display: block; font-size: 12px; margin-bottom: 2px; color: #000; }
                        .receiver-box { font-size: 13px; margin-bottom: 12px; }
                        .receiver-box .name { font-size: 22px; font-weight: 900; margin-bottom: 4px; text-transform: uppercase; line-height: 1.05; }
                        .receiver-box .details { margin: 2px 0; font-size: 12px; color: #444; }
                        .receiver-box .address { font-size: 15px; font-weight: bold; margin-top: 6px; padding: 8px 10px; background: #f7f7f7; border: 2px dashed #c89f53; border-radius: 8px; line-height: 1.25; }
                        .contents { margin-top: 12px; padding-top: 10px; border-top: 1px solid #eee; font-size: 12px; }
                        .contents ul { margin: 4px 0 0; padding-left: 18px; }
                        .contents li { line-height: 1.35; }
                        .qr-section { display: flex; align-items: center; justify-content: space-between; gap: 12px; margin-top: 12px; }
                        .qr-code { width: 72px; height: 72px; }
                        .qr-text { font-size: 10px; color: #333; text-align: right; max-width: 60%; }
                        .qr-text strong { font-size: 12px; color: #000; display: block; margin-bottom: 2px; }
                        .footer { margin-top: 16px; font-size: 11px; font-weight: bold; text-align: center; border: 2px solid #000; padding: 8px; background: #000; color: #fff; text-transform: uppercase; letter-spacing: 1px; }
                        .date { text-align: center; font-size: 9px; color: #666; margin-top: 4px; }
                        @media print {
                            html, body { background: #fff; }
                            .sticker { border: none; }
                        }
                    </style>
                </head>
                <body>
                    <div class="sticker">
                        <div class="header">
                            <div class="brand">
                                <img class="logo" src="${escapeHtml(logoSrc)}" alt="Aura Boutique" />
                                <h2>AURA BOUTIQUE</h2>
                            </div>
                            <div class="order-code">#${order.code}</div>
                        </div>

                        <div class="section-title">Remitente</div>
                        <div class="sender-box">
                            <strong>AURA BOUTIQUE (ALMACÉN PRINCIPAL)</strong>
                            Taller y Despachos<br/>
                            Lima, Perú
                        </div>

                        <div class="section-title">Destinatario / Entregar A:</div>
                        <div class="receiver-box">
                            <div class="name">${order.shipping_name}</div>
                            <div class="details">DNI: ${order.shipping_dni || 'No registrado'}</div>
                            <div class="details">📞 ${order.shipping_phone}</div>
                            <div class="address" style="${!order.shipping_address ? 'color: #999;' : ''}">
                                📍 ${order.shipping_address || 'Dirección de Recojo / Tienda Física'}
                            </div>
                        </div>

                        <div class="contents">
                            <strong>CONTENIDO DEL PAQUETE (${order.order_item?.length || 0} items)</strong>
                            <ul>${itemsList}</ul>
                        </div>

                        <div class="qr-section">
                            <img class="qr-code" src="https://api.qrserver.com/v1/create-qr-code/?size=150x150&data=" alt="QR" id="dynamic-qr" />
                            <div class="qr-text">
                                <strong>Rastrear Pedido</strong>
                                Escanea o escribe este ID en la web:
                                <br/><span style="font-family: monospace; font-size: 11px; margin-top: 2px; display:inline-block;">${order.code}</span>
                            </div>
                        </div>

                        <div class="footer">
                            <span style="display:inline-flex; align-items:center; gap:6px; margin-right: 16px;">
                                <i class="fa-brands fa-instagram" style="font-size: 13px;"></i>
                                @auraboutiqueme
                            </span>
                            <span style="display:inline-flex; align-items:center; gap:6px;">
                                <i class="fa-brands fa-tiktok" style="font-size: 13px;"></i>
                                @auraboutiqueme
                            </span>
                        </div>
                        <div class="date">
                            Generado: ${dayjs().format('DD/MM/YYYY HH:mm')}
                        </div>
                    </div>
                    <script>
                        document.getElementById('dynamic-qr').src = 'https://api.qrserver.com/v1/create-qr-code/?size=150x150&data=' + encodeURIComponent(window.location.origin + '/track/${order.code}');
                        window.onload = function() { window.print(); window.setTimeout(window.close, 800); }
                    </script>
                </body>
            </html>
        `;
        openPrintWindow(html);
    };

    const printStickerLogoOnly = async () => {
        const logoSrc = await getDocumentLogoSrc();
        const webHost = (typeof window !== 'undefined' ? window.location.origin : '').replace(/^https?:\/\//, '');

        const html = `
            <html>
                <head>
                    <title>Sticker logo - Aura Boutique</title>
                    <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css">
                    <link href="https://fonts.googleapis.com/css2?family=Playfair+Display:wght@500;700;900&family=Cinzel:wght@500;700&display=swap" rel="stylesheet">
<style>
                        @page { size: ${STICKER_W} ${STICKER_H}; margin: 0; }
                        * { box-sizing: border-box; }
                        html, body { margin: 0; padding: 0; background: #f0f0f0; color: #000; font-family: 'Inter', 'Helvetica Neue', Helvetica, Arial, sans-serif; }
                        .sticker {
                            width: ${STICKER_W};
                            max-width: ${STICKER_W};
                            height: ${STICKER_H};
                            margin: 0 auto;
                            padding: 28px 36px;
                            box-sizing: border-box;
                            display: flex;
                            flex-direction: column;
                            align-items: center;
                            justify-content: center;
                            background: #fff;
                            border-radius: 12px;
                        }
                        .logo { width: 9cm; height: 9cm; max-height: 56%; object-fit: cover; border-radius: 999px; border: 2px solid #c89f53; box-shadow: 0 0 0 1px rgba(200,159,83,0.25); }
                        .divider { width: 5.5cm; border-top: 1px solid #c89f53; margin: 16px auto 0; }
                        .brand { font-family: 'Cinzel', serif; font-size: 38px; font-weight: 700; letter-spacing: 6px; color: #2b2b2b; margin-top: 14px; line-height: 1; text-align: center; }
                        .socials { margin-top: 18px; display: flex; gap: 28px; align-items: center; font-size: 15px; color: #2b2b2b; }
                        .socials span { display: inline-flex; align-items: center; gap: 6px; }
                        .web { font-family: 'Cinzel', serif; margin-top: 12px; font-size: 12px; color: #888; letter-spacing: 2px; text-align: center; text-transform: lowercase; }
                        @media print {
                            html, body { background: #fff; }
                            .sticker { border: none; background: none; border-radius: 0; }
                        }
                    </style>
                </head>
                <body>
                    <div class="sticker">
                        <img class="logo" src="${escapeHtml(logoSrc)}" alt="Aura Boutique" />
                        <div class="divider"></div>
                        <div class="brand">AURA BOUTIQUE</div>
                        <div class="socials">
                            <span><i class="fa-brands fa-instagram" style="color:#c89f53;"></i> @auraboutiqueme</span>
                            <span><i class="fa-brands fa-tiktok" style="color:#c89f53;"></i> @auraboutiqueme</span>
                        </div>
                        <div class="web">${webHost}</div>
                    </div>
                    <script>
                        window.onload = function() { window.print(); window.setTimeout(window.close, 800); }
                    </script>
                </body>
            </html>
        `;
        openPrintWindow(html);
    };

    const createReceiptPng = async () => {
        if (!order) throw new Error('Pedido no encontrado');

        const trackingUrl = `${window.location.origin}/track/${order.code}`;
        const qrDataUrl = await QRCode.toDataURL(trackingUrl, {
            margin: 1,
            width: 240,
            color: {
                dark: '#2b211d',
                light: '#ffffff',
            },
        });
        const logoSrc = await getDocumentLogoSrc();
        const container = document.createElement('div');
        container.style.position = 'fixed';
        container.style.left = '-10000px';
        container.style.top = '0';
        container.style.width = '794px';
        container.style.background = '#fffaf3';
        container.innerHTML = buildReceiptHtml(order, trackingUrl, qrDataUrl, logoSrc);
        document.body.appendChild(container);

        try {
            const receiptElement = container.firstElementChild;
            if (!(receiptElement instanceof HTMLElement)) {
                throw new Error('No se pudo generar el comprobante');
            }

            await document.fonts?.ready;
            return await toPng(receiptElement, {
                cacheBust: true,
                pixelRatio: 2,
                backgroundColor: '#fffaf3',
            });
        } finally {
            container.remove();
        }
    };

    const handleDownloadReceiptImage = async () => {
        if (!order) return;

        setGeneratingReceipt('png');
        try {
            const dataUrl = await createReceiptPng();
            downloadDataUrl(dataUrl, getReceiptFilename(order.code, 'png'));
            toast.success('Imagen del comprobante descargada');
        } catch (error: unknown) {
            toast.error(getErrorMessage(error));
        } finally {
            setGeneratingReceipt(null);
        }
    };

    const handleDownloadReceiptPdf = async () => {
        if (!order) return;

        setGeneratingReceipt('pdf');
        try {
            const dataUrl = await createReceiptPng();
            const dimensions = await getImageDimensions(dataUrl);
            const pdf = new jsPDF({ orientation: 'portrait', unit: 'pt', format: 'a4' });
            const pageWidth = pdf.internal.pageSize.getWidth();
            const pageHeight = pdf.internal.pageSize.getHeight();
            const margin = 18;
            const imageWidth = pageWidth - margin * 2;
            const imageHeight = imageWidth * (dimensions.height / dimensions.width);

            if (imageHeight <= pageHeight - margin * 2) {
                pdf.addImage(dataUrl, 'PNG', margin, margin, imageWidth, imageHeight);
            } else {
                let remainingHeight = imageHeight;
                let yOffset = margin;

                while (remainingHeight > 0) {
                    pdf.addImage(dataUrl, 'PNG', margin, yOffset, imageWidth, imageHeight);
                    remainingHeight -= pageHeight - margin * 2;
                    if (remainingHeight > 0) {
                        pdf.addPage();
                        yOffset -= pageHeight - margin * 2;
                    }
                }
            }

            pdf.save(getReceiptFilename(order.code, 'pdf'));
            toast.success('PDF del comprobante descargado');
        } catch (error: unknown) {
            toast.error(getErrorMessage(error));
        } finally {
            setGeneratingReceipt(null);
        }
    };

    if (isLoading) {
        return <Card loading={true} />;
    }

    if (!order) {
        return <Card><Alert type="error" title="Pedido no encontrado" /></Card>;
    }

    const salesChannel = salesChannelMap[order.sales_channel || 'SHOP'] || { label: order.sales_channel || 'Shop', color: 'default' };
    const hasCustomizedOrderItems = (order.order_item || []).some((item) => item.is_customized === true || item.is_customized === 1);

    const itemsColumns: ColumnsType<OrderItem> = [
        {
            title: 'Producto / Variante',
            key: 'product',
            render: (_value, record) => (
                <Space orientation="vertical" size={2}>
                    <Text strong>{record.product_name}</Text>
                    <Text type="secondary" style={{ fontSize: 12 }}>SKU: {record.sku}</Text>
                    <Text type="secondary" style={{ fontSize: 12 }}>{record.variant_size} - {record.variant_color}</Text>
                    {(record.is_customized === true || record.is_customized === 1) && (
                        <>
                            <Tag color="gold" style={{ width: 'fit-content' }}>Personalizado</Tag>
                            {record.customization_group_label && (
                                <Text type="secondary" style={{ fontSize: 12 }}>{record.customization_group_label}</Text>
                            )}
                            {Number(record.customization_surcharge || 0) > 0 && (
                                <Text style={{ fontSize: 12, color: '#C89F53' }}>Recargo: {formatPEN(Number(record.customization_surcharge))}</Text>
                            )}
                            {record.custom_measurements_json && (() => {
                                try {
                                    const measurements = JSON.parse(record.custom_measurements_json) as Record<string, string>;
                                    return (
                                        <table style={{ marginTop: 4, borderCollapse: 'collapse', fontSize: 12 }}>
                                            <tbody>
                                                {Object.entries(measurements).map(([label, value]) => (
                                                    <tr key={label}>
                                                        <td style={{ padding: '2px 8px 2px 0', fontWeight: 600 }}>{label}</td>
                                                        <td style={{ padding: '2px 0' }}>{value}</td>
                                                    </tr>
                                                ))}
                                            </tbody>
                                        </table>
                                    );
                                } catch {
                                    return <Text type="secondary" style={{ fontSize: 12 }}>{record.custom_measurements_json}</Text>;
                                }
                            })()}
                        </>
                    )}
                </Space>
            ),
        },
        {
            title: 'Precio Unit.',
            dataIndex: 'unit_price',
            key: 'unit_price',
            render: (val: number) => formatPEN(Number(val)),
        },
        {
            title: 'Cant.',
            dataIndex: 'qty',
            key: 'qty',
        },
        {
            title: 'Subtotal',
            dataIndex: 'line_total',
            key: 'line_total',
            render: (val: number) => <Text strong>{formatPEN(Number(val))}</Text>,
        },
    ];

    const editableItemsColumns: ColumnsType<EditableOrderItem> = [
        {
            title: 'Producto / Variante',
            key: 'product',
            render: (_value, record) => (
                <Space orientation="vertical" size={2}>
                    <Text strong>{record.product_name}</Text>
                    <Text type="secondary" style={{ fontSize: 12 }}>SKU: {record.sku}</Text>
                    <Text type="secondary" style={{ fontSize: 12 }}>{record.size} - {record.color}</Text>
                </Space>
            ),
        },
        {
            title: 'Cant.',
            dataIndex: 'qty',
            key: 'qty',
            width: 120,
            render: (_value, record) => (
                <InputNumber
                    min={1}
                    precision={0}
                    value={record.qty}
                    onChange={(value) => updateEditItem(record.variant_id, { qty: Number(value || 1) })}
                    style={{ width: '100%' }}
                />
            ),
        },
        {
            title: 'Precio Unit.',
            dataIndex: 'unit_price',
            key: 'unit_price',
            width: 150,
            render: (_value, record) => (
                <InputNumber
                    min={0}
                    precision={2}
                    value={record.unit_price}
                    prefix="S/"
                    onChange={(value) => updateEditItem(record.variant_id, { unit_price: Number(value || 0) })}
                    style={{ width: '100%' }}
                />
            ),
        },
        {
            title: 'Subtotal',
            key: 'subtotal',
            render: (_value, record) => <Text strong>{formatPEN(record.qty * record.unit_price)}</Text>,
        },
        {
            title: 'Acciones',
            key: 'actions',
            width: 90,
            render: (_value, record) => (
                <Popconfirm
                    title="Quitar producto"
                    description="¿Eliminar este producto del pedido?"
                    okText="Sí"
                    cancelText="No"
                    onConfirm={() => setEditItems(prev => prev.filter(item => item.variant_id !== record.variant_id))}
                >
                    <Button type="text" danger icon={<DeleteOutlined />} />
                </Popconfirm>
            ),
        },
    ];

    return (
        <Space orientation="vertical" size="large" style={{ width: '100%' }}>
            <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, flex: '1 1 320px', flexWrap: 'wrap', minWidth: 0 }}>
                    <Link href="/admin/orders">
                        <Button icon={<LeftOutlined />}>Volver</Button>
                    </Link>
                    <Title level={4} style={{ margin: 0, minWidth: 0, maxWidth: '100%', lineHeight: 1.25 }}>
                        <span>Pedido </span>
                        <Text
                            code
                            strong
                            style={{
                                fontSize: 'inherit',
                                whiteSpace: 'normal',
                                wordBreak: 'break-word',
                                overflowWrap: 'anywhere',
                                lineHeight: 1.25,
                            }}
                        >
                            {order.code}
                        </Text>
                    </Title>
                    <Tag color={statusMap[order.status]?.color || 'default'}>
                        {statusMap[order.status]?.label || order.status}
                    </Tag>
                    <Tag color={salesChannel.color}>{salesChannel.label}</Tag>
                    {hasCustomizedOrderItems && <Tag color="gold">Personalizado</Tag>}
                </div>
<Space wrap style={{ justifyContent: 'flex-end', flex: '1 1 260px' }}>
                    <Dropdown.Button
                        icon={<PrinterOutlined />}
                        onClick={printShippingLabel}
                        menu={{
                            items: [
                                { key: 'label', label: 'Etiqueta A5 (media hoja A4)', onClick: printShippingLabel },
                                { key: 'sticker-full', label: 'Sticker etiqueta completa', onClick: printStickerFullLabel },
                                { key: 'sticker-logo', label: 'Sticker solo logo + marca', onClick: printStickerLogoOnly },
                            ],
                        }}
                    >
                        Imprimir Etiqueta
                    </Dropdown.Button>
                    <Button icon={<FilePdfOutlined />} onClick={handleDownloadReceiptPdf} loading={generatingReceipt === 'pdf'}>
                        Descargar PDF
                    </Button>
                    <Button icon={<FileImageOutlined />} onClick={handleDownloadReceiptImage} loading={generatingReceipt === 'png'}>
                        Descargar imagen
                    </Button>
                    {isEditing ? (
                        <>
                            <Button icon={<CloseOutlined />} onClick={handleCancelEdit} disabled={isSaving}>
                                Cancelar
                            </Button>
                            <Button type="primary" icon={<SaveOutlined />} onClick={handleSave} loading={isSaving}>
                                Guardar Cambios
                            </Button>
                        </>
                    ) : (
                        <Button type="primary" icon={<EditOutlined />} onClick={handleStartEdit}>
                            Editar Pedido
                        </Button>
                    )}
                </Space>
            </div>

            {hasCustomizedOrderItems && (
                <Alert
                    showIcon
                    type="warning"
                    message="Pedido personalizado"
                    description="Confirma medidas, color y adelanto antes de pasar el pedido a En confección. Usa los estados Medidas confirmadas, En confección y Listo para envío para controlar el avance operativo."
                />
            )}

            <Row gutter={[24, 24]}>
                <Col xs={24} md={16}>
                    <Card title="Artículos del Pedido" variant="borderless" style={{ marginBottom: 24 }}>
                        {isEditing && (
                            <Row gutter={[12, 12]} align="bottom" style={{ marginBottom: 24 }}>
                                <Col xs={24} md={12}>
                                    <Text strong>Producto / Variante</Text>
                                    <Select
                                        showSearch
                                        allowClear
                                        value={selectedVariantId}
                                        onChange={handleVariantChange}
                                        options={variantOptions}
                                        loading={productsLoading}
                                        optionFilterProp="label"
                                        placeholder="Buscar por producto, talla, color o SKU"
                                        style={{ width: '100%', marginTop: 8 }}
                                    />
                                </Col>
                                <Col xs={12} md={4}>
                                    <Text strong>Cantidad</Text>
                                    <InputNumber
                                        min={1}
                                        precision={0}
                                        value={selectedQty}
                                        onChange={(value) => setSelectedQty(Number(value || 1))}
                                        style={{ width: '100%', marginTop: 8 }}
                                    />
                                </Col>
                                <Col xs={12} md={4}>
                                    <Text strong>Precio</Text>
                                    <InputNumber
                                        min={0}
                                        precision={2}
                                        value={selectedPrice ?? undefined}
                                        onChange={(value) => setSelectedPrice(value === null ? null : Number(value))}
                                        style={{ width: '100%', marginTop: 8 }}
                                        prefix="S/"
                                    />
                                </Col>
                                <Col xs={24} md={4}>
                                    <Button type="primary" icon={<PlusOutlined />} onClick={handleAddItem} block>
                                        Agregar
                                    </Button>
                                </Col>
                            </Row>
                        )}

                        {isEditing ? (
                            <Table<EditableOrderItem>
                                columns={editableItemsColumns}
                                dataSource={editItems}
                                rowKey="variant_id"
                                pagination={false}
                            />
                        ) : (
                            <Table<OrderItem>
                                columns={itemsColumns}
                                dataSource={order.order_item}
                                rowKey="order_item_id"
                                pagination={false}
                            />
                        )}
                        <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 16 }}>
                            <Space orientation="vertical" align="end" size={2}>
                                <Text type="secondary">Subtotal: {formatPEN(isEditing ? editSubtotal : Number(order.subtotal))}</Text>
                                
                                {(isEditing ? editBundleDiscount : Number(order.bundle_discount || 0)) > 0 && (
                                    <Text type="success">
                                        Descuento Conjunto: -{formatPEN(isEditing ? editBundleDiscount : Number(order.bundle_discount))}
                                    </Text>
                                )}
                                
                                {order.coupon_code && (
                                    <Text type="danger">
                                        Cupón ({order.coupon_code}): -{formatPEN(Number(order.coupon_discount || 0))}
                                    </Text>
                                )}

                                {/* Fallback para pedidos muy antiguos */}
                                {isEditing && editOtherDiscount > 0 && (
                                     <Text type="danger">
                                        Descuento General: -{formatPEN(editOtherDiscount)}
                                    </Text>
                                )}

                                {!isEditing && !order.bundle_discount && !order.coupon_discount && Number(order.discount_total || 0) > 0 && !order.coupon_code && (
                                     <Text type="danger">
                                        Descuento General: -{formatPEN(Number(order.discount_total))}
                                    </Text>
                                )}

                                <Title level={4} style={{ margin: 0, marginTop: 8 }}>
                                    Total: {formatPEN(isEditing ? editTotal : Number(order.total))}
                                </Title>
                                {(isEditing ? editAmountPaid : Number(order.amount_paid || 0)) > 0 && (
                                    <Text type="secondary">
                                        Pagado: {formatPEN(isEditing ? editAmountPaid : Number(order.amount_paid || 0))}
                                    </Text>
                                )}
                                {(isEditing ? editBalanceDue : Number(order.balance_due || 0)) > 0 && (
                                    <Text type="warning">
                                        Saldo pendiente: {formatPEN(isEditing ? editBalanceDue : Number(order.balance_due || 0))}
                                    </Text>
                                )}
                            </Space>
                        </div>
                    </Card>

                    {!isEditing && order.notes && (
                        <Card title="Notas Internas" variant="borderless" style={{ marginBottom: 24 }}>
                            <Text>{order.notes}</Text>
                        </Card>
                    )}

                    <Card
                        title="Historial de pagos"
                        variant="borderless"
                        style={{ marginBottom: 24 }}
                        extra={
                            <Button
                                type="primary"
                                icon={<PlusOutlined />}
                                onClick={() => {
                                    paymentForm.resetFields();
                                    setPaymentModalOpen(true);
                                }}
                                disabled={!order || Number(order.balance_due || 0) <= 0}
                            >
                                Registrar pago
                            </Button>
                        }
                    >
                        {(!payments || payments.length === 0) ? (
                            <Text type="secondary">No se han registrado pagos para este pedido.</Text>
                        ) : (
                            <Table
                                dataSource={payments}
                                rowKey="payment_id"
                                size="small"
                                pagination={false}
                                columns={[
                                    {
                                        title: 'Fecha',
                                        dataIndex: 'created_at',
                                        render: (v: string) => dayjs(v).format('DD/MM/YYYY HH:mm'),
                                    },
                                    {
                                        title: 'Monto',
                                        dataIndex: 'amount',
                                        render: (v: number | string) => <strong>{formatPEN(Number(v || 0))}</strong>,
                                    },
                                    {
                                        title: 'Método',
                                        dataIndex: 'method',
                                        render: (v: string) => paymentMethodOptions.find(o => o.value === v)?.label || v,
                                    },
                                    {
                                        title: 'Referencia',
                                        dataIndex: 'reference',
                                        render: (v: string | null) => v || '-',
                                    },
                                    {
                                        title: 'Notas',
                                        dataIndex: 'notes',
                                        render: (v: string | null) => v || '-',
                                    },
                                    {
                                        title: '',
                                        render: (_: unknown, record: OrderPayment) => (
                                            <Popconfirm title="¿Eliminar este pago?" onConfirm={() => handleDeletePayment(record.payment_id)}>
                                                <Button size="small" icon={<DeleteOutlined />} danger />
                                            </Popconfirm>
                                        ),
                                    },
                                ]}
                                summary={(rows) => {
                                    const sum = rows.reduce((acc, r) => acc + Number((r as OrderPayment).amount || 0), 0);
                                    return (
                                        <Table.Summary.Row>
                                            <Table.Summary.Cell index={0}>Total pagado</Table.Summary.Cell>
                                            <Table.Summary.Cell index={1}><strong>{formatPEN(sum)}</strong></Table.Summary.Cell>
                                            <Table.Summary.Cell index={2} colSpan={4} />
                                        </Table.Summary.Row>
                                    );
                                }}
                            />
                        )}
                    </Card>

                    <Card title="Fotos del Pedido" variant="borderless">
                        <Space orientation="vertical" size="middle" style={{ width: '100%' }}>
                            <Alert
                                type="info"
                                showIcon
                                message="Las fotos se agregan como privadas. Activa 'Visible' solo en imágenes que el cliente pueda ver en su seguimiento."
                            />

                            <ImageUploader
                                onUploadSuccess={handleOrderPhotoUpload}
                                buttonText={isAddingPhoto ? 'Registrando foto...' : 'Añadir foto del pedido'}
                                multiple
                            />

                            {orderPhotos.length === 0 ? (
                                <Text type="secondary">Aún no hay fotos registradas para este pedido.</Text>
                            ) : (
                                <Row gutter={[12, 12]}>
                                    {orderPhotos.map((photo) => {
                                        const isPublic = isOrderPhotoPublic(photo);
                                        return (
                                            <Col xs={24} sm={12} lg={8} key={photo.photo_id}>
                                                <Card
                                                    size="small"
                                                    cover={
                                                        <Image
                                                            src={photo.url}
                                                            alt="Foto del pedido"
                                                            height={160}
                                                            style={{ width: '100%', objectFit: 'cover' }}
                                                        />
                                                    }
                                                >
                                                    <Space orientation="vertical" size="small" style={{ width: '100%' }}>
                                                        <Tag color={isPublic ? 'green' : 'default'}>
                                                            {isPublic ? 'Visible en seguimiento' : 'Privada'}
                                                        </Tag>
                                                        <Switch
                                                            checked={isPublic}
                                                            loading={photoBusyId === `${photo.photo_id}:visibility`}
                                                            checkedChildren="Visible"
                                                            unCheckedChildren="Privada"
                                                            onChange={(checked) => handleTogglePhotoVisibility(photo, checked)}
                                                        />
                                                        <Text type="secondary" style={{ fontSize: 12 }}>
                                                            {dayjs(photo.created_at).format('DD MMM YYYY, HH:mm')}
                                                        </Text>
                                                        <Popconfirm
                                                            title="Eliminar foto"
                                                            description="¿Eliminar esta foto del pedido?"
                                                            okText="Sí"
                                                            cancelText="No"
                                                            onConfirm={() => handleDeleteOrderPhoto(photo.photo_id)}
                                                        >
                                                            <Button
                                                                danger
                                                                icon={<DeleteOutlined />}
                                                                loading={photoBusyId === `${photo.photo_id}:delete`}
                                                                block
                                                            >
                                                                Eliminar
                                                            </Button>
                                                        </Popconfirm>
                                                    </Space>
                                                </Card>
                                            </Col>
                                        );
                                    })}
                                </Row>
                            )}
                        </Space>
                    </Card>
                </Col>
                
                <Col xs={24} md={8}>
                    {isEditing ? (
                        <Card title="Editar Datos del Pedido" variant="borderless" style={{ marginBottom: 24 }}>
                            <Form form={form} layout="vertical">
                                <Form.Item name="status" label="Estado" rules={[{ required: true, message: 'Selecciona un estado' }]}>
                                    <Select options={statusOptions} />
                                </Form.Item>

                                <Form.Item name="sales_channel" label="Canal" rules={[{ required: true, message: 'Selecciona un canal' }]}>
                                    <Select options={salesChannelOptions} />
                                </Form.Item>

                                <Form.Item name="external_reference" label="Referencia del canal">
                                    <Input placeholder="Usuario, link del chat, referencia externa" />
                                </Form.Item>

                                <Row gutter={12}>
                                    <Col xs={24} sm={12} md={24} lg={12}>
                                        <Form.Item name="payment_method" label="Método de pago">
                                            <Select allowClear options={paymentMethodOptions} />
                                        </Form.Item>
                                    </Col>
                                    <Col xs={24} sm={12} md={24} lg={12}>
                                        <Form.Item name="payment_reference" label="Referencia pago">
                                            <Input placeholder="Operación, voucher, etc." />
                                        </Form.Item>
                                    </Col>
                                </Row>

{(selectedEditStatus === 'PARTIALLY_PAID' || selectedEditStatus === 'SEPARATED') && (
                                    <Row gutter={12}>
                                        <Col xs={24} sm={12} md={24} lg={12}>
                                            <Form.Item
                                                name="amount_paid"
                                                label={selectedEditStatus === 'SEPARATED' ? 'Adelanto (opcional, puede ser 0)' : 'Adelanto pagado'}
                                                rules={[
                                                    { required: true, message: 'Ingresa el adelanto pagado' },
                                                    {
                                                        validator: async (_rule, value) => {
                                                            const paid = Number(value || 0);
                                                            if (selectedEditStatus === 'SEPARATED') {
                                                                if (paid >= 0 && paid < editTotal) return;
                                                                throw new Error('El adelanto debe ser mayor o igual a 0 y menor al total');
                                                            }
                                                            if (paid > 0 && paid < editTotal) return;
                                                            throw new Error('El adelanto debe ser mayor a 0 y menor al total');
                                                        }
                                                    }
                                                ]}
                                            >
                                                <InputNumber min={0} precision={2} prefix="S/" style={{ width: '100%' }} />
                                            </Form.Item>
                                        </Col>
                                        <Col xs={24} sm={12} md={24} lg={12}>
                                            <Text type="secondary">Saldo pendiente</Text>
                                            <Title level={5} style={{ marginTop: 8 }}>{formatPEN(editBalanceDue)}</Title>
                                        </Col>
                                    </Row>
                                )}

                                <Form.Item name="shipping_name" label="Cliente" rules={[{ required: true, message: 'Ingresa el nombre del cliente' }]}> 
                                    <Input placeholder="Nombre completo" />
                                </Form.Item>

                                <Form.Item
                                    name="shipping_dni"
                                    label="DNI"
                                    rules={[
                                        { required: true, message: 'Ingresa el DNI del cliente' },
                                        { pattern: /^\d{8}$/, message: 'El DNI debe tener 8 dígitos' },
                                    ]}
                                >
                                    <Input placeholder="Ej. 12345678" maxLength={8} inputMode="numeric" />
                                </Form.Item>

                                <Form.Item name="shipping_phone" label="Celular / WhatsApp" rules={[{ required: true, message: 'Ingresa el celular' }]}>
                                    <Input placeholder="Ej. 987654321" />
                                </Form.Item>

                                <Form.Item name="shipping_address" label="Dirección de entrega" rules={[{ required: true, message: 'Ingresa la dirección' }]}>
                                    <Input.TextArea rows={3} placeholder="Dirección de entrega o recojo coordinado" />
                                </Form.Item>

                                <Form.Item name="shipping_cost" label="Costo de envío (delivery propio)" tooltip="Si tú mismx llevan el pedido, ingresa el costo de envío. Se suma al total final.">
                                    <InputNumber min={0} precision={2} prefix="S/" style={{ width: '100%' }} placeholder="0.00" />
                                </Form.Item>

                                <Form.Item name="notes" label="Notas internas">
                                    <Input.TextArea rows={4} placeholder="Códigos de seguimiento, coordinación, observaciones, etc." />
                                </Form.Item>
                            </Form>
                        </Card>
                    ) : (
                        <Card title="Detalles del Cliente" variant="borderless" style={{ marginBottom: 24 }}>
                            <Descriptions column={1} size="small">
                                <Descriptions.Item label="Fecha">{dayjs(order.created_at).format('DD MMM YYYY, HH:mm')}</Descriptions.Item>
                                <Descriptions.Item label="Canal">{salesChannel.label}</Descriptions.Item>
                                {order.external_reference && (
                                    <Descriptions.Item label="Referencia canal">{order.external_reference}</Descriptions.Item>
                                )}
                                {order.payment_method && (
                                    <Descriptions.Item label="Método de pago">{order.payment_method}</Descriptions.Item>
                                )}
                                {order.payment_reference && (
                                    <Descriptions.Item label="Referencia pago">{order.payment_reference}</Descriptions.Item>
                                )}
                                <Descriptions.Item label="Pagado">{formatPEN(Number(order.amount_paid || 0))}</Descriptions.Item>
                                <Descriptions.Item label="Saldo pendiente">{formatPEN(Number(order.balance_due || 0))}</Descriptions.Item>
                                {Number(order.shipping_cost || 0) > 0 && (
                                    <Descriptions.Item label="Envío">{formatPEN(Number(order.shipping_cost))}</Descriptions.Item>
                                )}
                                <Descriptions.Item label="Nombre">{order.shipping_name}</Descriptions.Item>
                                <Descriptions.Item label="DNI">{order.shipping_dni || '-'}</Descriptions.Item>
                                <Descriptions.Item label="Teléfono / WS">{order.shipping_phone}</Descriptions.Item>
                                <Descriptions.Item label="Dirección">{order.shipping_address || '-'}</Descriptions.Item>
                            </Descriptions>
                            <Button
                                type="primary"
                                icon={<WhatsAppOutlined />}
                                style={{ backgroundColor: '#25D366', borderColor: '#25D366', width: '100%', marginTop: 16 }}
                                onClick={handleContactWhatsApp}
                            >
                                Contactar por WhatsApp
                            </Button>
                        </Card>
                    )}
                </Col>
            </Row>

            <Modal
                title="Registrar pago"
                open={paymentModalOpen}
                onCancel={() => setPaymentModalOpen(false)}
                onOk={handleRegisterPayment}
                confirmLoading={paymentSaving}
                okText="Registrar"
                cancelText="Cancelar"
            >
                <Form form={paymentForm} layout="vertical">
                    <Form.Item name="amount" label="Monto del pago" rules={[{ required: true, message: 'Ingresa el monto' }]}>
                        <InputNumber
                            min={0.01}
                            max={order ? Number(order.balance_due || 0) : undefined}
                            precision={2}
                            prefix="S/"
                            style={{ width: '100%' }}
                            placeholder="0.00"
                        />
                    </Form.Item>
                    <Form.Item name="method" label="Método" rules={[{ required: true, message: 'Selecciona un método' }]}>
                        <Select options={paymentMethodOptions} />
                    </Form.Item>
                    <Form.Item name="reference" label="Referencia (operación, voucher)">
                        <Input placeholder="Ej. 1234567890" />
                    </Form.Item>
                    <Form.Item name="notes" label="Notas">
                        <Input.TextArea rows={2} placeholder="Ej. Yape de S/.50 + efectivo S/.30" />
                    </Form.Item>
                    {order && Number(order.balance_due || 0) > 0 && (
                        <Text type="secondary" style={{ display: 'block', marginTop: 4 }}>
                            Saldo pendiente actual: {formatPEN(Number(order.balance_due || 0))}
                        </Text>
                    )}
                </Form>
            </Modal>
        </Space>
    );
}
