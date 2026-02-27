import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export type CartItem = {
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
};

type CartState = {
    items: CartItem[];
    addItem: (item: Omit<CartItem, 'qty'>, qty?: number) => void;
    removeItem: (variantId: string) => void;
    setQty: (variantId: string, qty: number) => void;
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
                    const idx = state.items.findIndex((x) => x.variantId === item.variantId);
                    if (idx >= 0) {
                        const next = [...state.items];
                        next[idx] = { ...next[idx], qty: next[idx].qty + q };
                        return { items: next };
                    }
                    return { items: [...state.items, { ...item, qty: q }] };
                });
            },

            removeItem: (variantId) =>
                set((state) => ({ items: state.items.filter((x) => x.variantId !== variantId) })),

            setQty: (variantId, qty) => {
                const q = Math.max(1, Math.floor(qty));
                set((state) => ({
                    items: state.items.map((x) => (x.variantId === variantId ? { ...x, qty: q } : x)),
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