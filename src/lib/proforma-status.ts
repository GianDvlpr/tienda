export const proformaStatusMap: Record<string, { label: string, color: string }> = {
    'DRAFT': { label: 'Borrador', color: 'default' },
    'SENT': { label: 'Enviada', color: 'blue' },
    'ACCEPTED': { label: 'Aceptada', color: 'gold' },
    'CONVERTED': { label: 'Convertida a pedido', color: 'green' },
    'CANCELLED': { label: 'Cancelada', color: 'red' },
};
