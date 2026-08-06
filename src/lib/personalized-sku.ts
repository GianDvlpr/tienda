export function buildCustomSku(productName: string, baseSku?: string | null, size?: string | null, color?: string | null) {
    let prefix: string;
    if (baseSku && baseSku.includes('-')) {
        prefix = baseSku.split('-')[0];
    } else {
        prefix = productName.replace(/\s+/g, '').slice(0, 4).toUpperCase() || 'PERS';
    }

    const sizePart = size ? size.trim().toUpperCase() : '';
    const colorPart = color ? color.trim().toUpperCase().slice(0, 3) : '';

    return [prefix, 'PERS', sizePart, colorPart].filter(Boolean).join('-');
}
