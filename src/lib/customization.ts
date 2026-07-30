export const CUSTOM_ORDER_NOTICE = 'Tiempo de confección: hasta 3 días hábiles como máximo. El plazo empieza a contar desde el siguiente día hábil de confirmado el pedido. Este tiempo no incluye el plazo de entrega de la agencia. Para iniciar la confección se requiere un adelanto del 30% del costo total del pedido personalizado.';

export const CUSTOM_MEASUREMENT_LABELS = {
    PANTS: ['Cintura', 'Cadera', 'Tiro delantero', 'Tiro espalda', 'Largo'],
    UPPER: ['Ancho busto', 'Ancho espalda', 'Cintura', 'Cadera', 'Largo'],
} as const;

export type CustomizationType = keyof typeof CUSTOM_MEASUREMENT_LABELS;

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
