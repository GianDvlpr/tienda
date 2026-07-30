import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export type CartItem = {
    cartItemId?: string;
    variantId: string;
    productId: string;
    slug: string;
    name: string;
    size: string;
    color: string;
    sku: string;
    imageUrl?: string | null;
    unitPrice: number;
    qty: number;
    isCustomized?: boolean;
    customMeasurements?: Record<string, string> | null;
    customizationSurcharge?: number;
    customizationGroupId?: string | null;
    customizationGroupLabel?: string | null;
};

type CartState = {
    items: CartItem[];
    addItem: (item: Omit<CartItem, 'qty'>, qty?: number) => void;
    removeItem: (cartItemId: string) => void;
    setQty: (cartItemId: string, qty: number) => void;
    clear: () => void;

    // selectors
    totalItems: () => number;
    subtotal: () => number;
};

export const useCartStore = create<CartState>()(
    persist(
        (set, get) => ({
            items: [],

            addItem: (item, qty = 1) => {
                const q = Math.max(1, Math.floor(qty));
                set((state) => {
                    const itemKey = item.cartItemId || (item.isCustomized ? `${item.variantId}:custom:${Date.now()}` : item.variantId);
                    const itemWithKey = { ...item, cartItemId: itemKey };
                    const idx = state.items.findIndex((x) => (x.cartItemId || x.variantId) === itemKey);
                    if (idx >= 0) {
                        const next = [...state.items];
                        next[idx] = { ...next[idx], qty: next[idx].qty + q };
                        return { items: next };
                    }
                    return { items: [...state.items, { ...itemWithKey, qty: q }] };
                });
            },

            removeItem: (cartItemId) =>
                set((state) => ({ items: state.items.filter((x) => (x.cartItemId || x.variantId) !== cartItemId) })),

            setQty: (cartItemId, qty) => {
                const q = Math.max(1, Math.floor(qty));
                set((state) => ({
                    items: state.items.map((x) => ((x.cartItemId || x.variantId) === cartItemId ? { ...x, qty: q } : x)),
                }));
            },

            clear: () => set({ items: [] }),

            totalItems: () => get().items.reduce((acc, x) => acc + x.qty, 0),

            subtotal: () => get().items.reduce((acc, x) => acc + x.unitPrice * x.qty, 0),
        }),
        {
            name: 'shop-cart',
            partialize: (state) => ({ items: state.items }),
        }
    )
);
