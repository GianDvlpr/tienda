export interface CheckoutItemInput {
    variantId: string;
    qty: number;
}

export interface CheckoutRequest {
    items: CheckoutItemInput[];

    customerName: string;
    customerPhone?: string | null;
    customerEmail?: string | null;

    shippingName: string;
    shippingPhone: string;
    shippingAddress: string;
    shippingCity?: string | null;
    shippingReference?: string | null;

    notes?: string | null;

    paymentMethod?: 'YAPE' | 'PLIN' | 'TRANSFER' | null;
}

export interface CheckoutResponse {
    orderId: string;
    code: string;
}