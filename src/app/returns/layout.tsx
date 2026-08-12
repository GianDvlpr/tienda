import type { Metadata } from 'next';

export const metadata: Metadata = {
    title: 'Cambios y Devoluciones',
    description: 'Política de cambios y devoluciones de Aura Boutique: plazos de 7 días calendario, condiciones de las prendas y proceso de cambio o reembolso.',
    openGraph: {
        title: 'Cambios y Devoluciones | Aura Boutique',
        description: 'Conoce la política de cambios y devoluciones de Aura Boutique.',
    },
};

export default function ReturnsLayout({ children }: { children: React.ReactNode }) {
    return children;
}
