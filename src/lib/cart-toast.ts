'use client';

import { toast } from 'sonner';
import { useUIStore } from '@/store/ui.store';

export function notifyCartAdded(name: string, size?: string | null, color?: string | null, beforeOpen?: () => void) {
    return toast.success('Agregado a tu carrito', {
        description: [name, size ? `Talla ${size}` : null, color].filter(Boolean).join(' · '),
        action: {
            label: 'Ver carrito',
            onClick: () => {
                beforeOpen?.();
                useUIStore.getState().closeQuickView();
                useUIStore.getState().setCartOpen(true);
            },
        },
    });
}
