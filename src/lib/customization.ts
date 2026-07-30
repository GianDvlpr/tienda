export const CUSTOM_ORDER_NOTICE = 'Tiempo de confección: hasta 3 días hábiles como máximo. El plazo empieza a contar desde el siguiente día hábil de confirmado el pedido. Este tiempo no incluye el plazo de entrega de la agencia. Para iniciar la confección se requiere un adelanto del 30% del costo total del pedido personalizado.';

export const CUSTOM_MEASUREMENT_LABELS = {
    PANTS: ['Cintura', 'Cadera', 'Tiro delantero', 'Tiro espalda', 'Largo'],
    UPPER: ['Ancho busto', 'Ancho espalda', 'Cintura', 'Cadera', 'Largo'],
} as const;

export type CustomizationType = keyof typeof CUSTOM_MEASUREMENT_LABELS;

export const CUSTOM_COLOR_OPTIONS = [
    { name: 'Negro', hex: '#1A1A1E', available: true },
    { name: 'Azul Noche', hex: '#20254B', available: true },
    { name: 'Vino', hex: '#7B2B55', available: true },
    { name: 'Chocolate', hex: '#7B553D', available: true },
    { name: 'Verde Botella', hex: '#2C5C54', available: true },
    { name: 'Rojo', hex: '#C92B31', available: true },
    { name: 'Azul Rey', hex: '#5565D9', available: true },
    { name: 'Naranja', hex: '#E75A3C', available: true },
    { name: 'Turquesa', hex: '#5FD4DF', available: false },
    { name: 'Fucsia', hex: '#B73AAE', available: true },
    { name: 'Orquídea', hex: '#C85DBA', available: true },
    { name: 'Rosa Barbie', hex: '#E45FC8', available: true },
    { name: 'Verde Salvia', hex: '#8A9488', available: true },
    { name: 'Rosa Palo', hex: '#DFC7D7', available: true },
    { name: 'Topo', hex: '#A3978D', available: true },
    { name: 'Beige Oscuro', hex: '#C7B29A', available: true },
    { name: 'Marfil', hex: '#E8E2D5', available: true },
    { name: 'Beige Claro', hex: '#F2E7D7', available: true },
    { name: 'Verde Menta', hex: '#BDDCC8', available: true },
    { name: 'Lavanda', hex: '#AEA7E9', available: true },
    { name: 'Rosa Bebé', hex: '#E7D0E2', available: true },
    { name: 'Celeste Bebé', hex: '#B8D5F1', available: true },
    { name: 'Amarillo Pastel', hex: '#DFE08F', available: true },
    { name: 'Gris Perla', hex: '#E4E7EE', available: true },
    { name: 'Perla', hex: '#FCFCFC', available: true },
] as const;

export type CustomColorOption = {
    name: string;
    hex: string;
    available: boolean;
};

export function getAvailableCustomColorName(preferredColor?: string | null, colors: readonly CustomColorOption[] = CUSTOM_COLOR_OPTIONS) {
    const normalizedPreferred = String(preferredColor || '').trim().normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
    const matching = colors.find((color) => (
        color.available && color.name.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase() === normalizedPreferred
    ));

    return matching?.name || colors.find((color) => color.available)?.name || 'Negro';
}

type SizeGuideData = {
    columns?: string[];
    rows?: { label: string; values: string[] }[];
};

function normalizeLabel(value: string) {
    return String(value || '')
        .trim()
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .replace(/\(.*?\)/g, '')
        .replace(/[^a-zA-Z0-9]+/g, '')
        .toLowerCase();
}

export function parseSizeGuideJson(value?: string | null): SizeGuideData | null {
    if (!value) return null;
    try {
        const parsed = JSON.parse(value) as SizeGuideData;
        if (Array.isArray(parsed.columns) && Array.isArray(parsed.rows)) return parsed;
    } catch {
        return null;
    }
    return null;
}

export function getMeasurementsForSize(sizeGuideJson: string | null | undefined, size: string | null | undefined, labels: readonly string[]) {
    const guide = parseSizeGuideJson(sizeGuideJson);
    const result = Object.fromEntries(labels.map((label) => [label, ''])) as Record<string, string>;
    if (!guide || !size) return result;

    const columnIndex = guide.columns?.findIndex((col) => normalizeLabel(col) === normalizeLabel(size)) ?? -1;
    if (columnIndex < 0) return result;

    for (const label of labels) {
        const row = guide.rows?.find((item) => {
            const normalizedRow = normalizeLabel(item.label);
            const normalizedLabel = normalizeLabel(label);
            return normalizedRow === normalizedLabel || normalizedRow.includes(normalizedLabel) || normalizedLabel.includes(normalizedRow);
        });
        if (row?.values?.[columnIndex]) {
            result[label] = String(row.values[columnIndex]);
        }
    }

    return result;
}
