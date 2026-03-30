import React from 'react';
import { Metadata } from 'next';
import ReclamacionesClient from './ReclamacionesClient';

export const metadata: Metadata = {
    title: 'Libro de Reclamaciones | Aura Boutique',
    description: 'Atención al cliente y libro de reclamaciones virtual de Aura Boutique. Estamos para escucharte y mejorar tu experiencia.',
    robots: {
        index: false,
        follow: true,
    },
};

export default function ReclamacionesPage() {
    return <ReclamacionesClient />;
}
