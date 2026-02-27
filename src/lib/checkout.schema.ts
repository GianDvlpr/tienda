import { z } from 'zod';

export const checkoutSchema = z.object({
    shippingName: z.string().min(3, 'Nombre mínimo 3 caracteres'),
    shippingPhone: z.string().min(7, 'Teléfono inválido'),
    shippingAddress: z.string().min(8, 'Dirección muy corta'),
    shippingCity: z.string().optional(),
    shippingReference: z.string().optional(),
    notes: z.string().optional(),

    paymentMethod: z.enum(['YAPE', 'PLIN', 'TRANSFER']).default('YAPE'),
});

export type CheckoutFormValues = z.infer<typeof checkoutSchema>;