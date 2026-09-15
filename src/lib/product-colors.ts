const COLOR_MAP: Record<string, string> = {
    'negro': '#000000',
    'blanco': '#ffffff',
    'hueso': '#f7f1e4',
    'crema': '#fff3d6',
    'perla': '#f4f0e8',
    'rojo': '#df1b1b',
    'azul': '#1b40df',
    'azul noche': '#0b1f46',
    'azul marino': '#001f3f',
    'navy': '#001f3f',
    'verde': '#1bdf50',
    'verde militar': '#4b5320',
    'olivo': '#708238',
    'amarillo': '#dfcc1b',
    'naranja': '#df761b',
    'rosado': '#ffb6c1',
    'palo rosa': '#d8a0a6',
    'fucsia': '#ff00a8',
    'morado': '#800080',
    'gris': '#808080',
    'plomo': '#707070',
    'beige': '#f5f5dc',
    'arena': '#c2a878',
    'champagne': '#f7e7ce',
    'nude': '#e3bc9a',
    'marrón': '#8b4513',
    'marron': '#8b4513',
    'chocolate': '#4e2b1f',
    'cafe': '#6f4e37',
    'café': '#6f4e37',
    'celeste': '#87ceeb',
    'vino': '#722f37',
    'borgoña': '#800020',
    'borgona': '#800020',
    'lila': '#c8a2c8',
};

function normalizeColorName(color: string) {
    return String(color || '')
        .trim()
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .toLowerCase();
}

export function getColorHex(color: string) {
    const normalized = normalizeColorName(color);
    const normalizedMap = Object.entries(COLOR_MAP).reduce<Record<string, string>>((acc, [name, hex]) => {
        acc[normalizeColorName(name)] = hex;
        return acc;
    }, {});

    if (normalizedMap[normalized]) return normalizedMap[normalized];

    const partialMatch = Object.keys(normalizedMap)
        .sort((a, b) => b.length - a.length)
        .find((name) => normalized.includes(name) || name.includes(normalized));

    return partialMatch ? normalizedMap[partialMatch] : '#ccc';
}

export function getContrastColor(hex: string) {
    const normalized = hex.replace('#', '');
    if (normalized.length !== 6) return '#000';

    const r = parseInt(normalized.slice(0, 2), 16);
    const g = parseInt(normalized.slice(2, 4), 16);
    const b = parseInt(normalized.slice(4, 6), 16);
    const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255;

    return luminance > 0.6 ? '#000' : '#fff';
}

