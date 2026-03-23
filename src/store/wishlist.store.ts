import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export type WishlistItem = {
    variantId: string;
    productId: string;
    slug: string;
    name: string;
    size: string;
    color: string;
    sku: string;
    imageUrl?: string | null;
    unitPrice: number;
};

type WishlistState = {
    items: WishlistItem[];
    addItem: (item: WishlistItem) => void;
    removeItem: (variantId: string) => void;
    clear: () => void;
    isInWishlist: (variantId: string) => boolean;
    totalItems: () => number;
};

export const useWishlistStore = create<WishlistState>()(
    persist(
        (set, get) => ({
            items: [],
            
            addItem: (item) => {
                set((state) => {
                    const exists = state.items.some((x) => x.variantId === item.variantId);
                    if (exists) return state; // Prevent duplicates
                    return { items: [...state.items, item] };
                });
            },

            removeItem: (variantId) =>
                set((state) => ({ items: state.items.filter((x) => x.variantId !== variantId) })),

            clear: () => set({ items: [] }),

            isInWishlist: (variantId) => get().items.some(x => x.variantId === variantId),

            totalItems: () => get().items.length,
        }),
        {
            name: 'shop-wishlist',
            partialize: (state) => ({ items: state.items }),
        }
    )
);
