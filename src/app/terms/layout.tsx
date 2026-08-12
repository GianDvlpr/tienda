import type { Metadata } from 'next';

export const metadata: Metadata = {
    title: 'Términos y Condiciones',
    description: 'Términos y condiciones de compra de Aura Boutique: proceso de pago, disponibilidad de productos, prendas personalizadas y políticas aplicables a las compras en nuestra tienda online.',
    openGraph: {
        title: 'Términos y Condiciones | Aura Boutique',
        description: 'Conoce los términos y condiciones de compra de Aura Boutique.',
    },
};

export default function TermsLayout({ children }: { children: React.ReactNode }) {
    return children;
}
