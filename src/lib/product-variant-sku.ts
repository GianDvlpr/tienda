function normalizeComparable(value: string) {
    return String(value || '')
        .trim()
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .toLowerCase();
}

function cleanSkuPart(value: string, maxLength: number) {
    return String(value || '')
        .trim()
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .replace(/\s+/g, '')
        .replace(/[^a-zA-Z0-9]/g, '')
        .substring(0, maxLength)
        .toUpperCase();
}

function generateSku(productName: string, color: string, size: string) {
    const namePart = cleanSkuPart(productName, 4);
    const colorPart = cleanSkuPart(color, 4);
    const sizePart = cleanSkuPart(size, 8);
    const sku = [namePart, colorPart, sizePart].filter(Boolean).join('-');

    return sku || 'VAR';
}

function normalizeSku(value: string) {
    return String(value || '')
        .trim()
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .replace(/\s+/g, '')
        .replace(/[^a-zA-Z0-9-]/g, '')
        .toUpperCase();
}

function uniqueSku(baseSku: string, usedSkus: Set<string>) {
    const base = (baseSku || 'VAR').substring(0, 80);
    let sku = base;
    let counter = 2;

    while (usedSkus.has(sku.toUpperCase())) {
        const suffix = `-${counter}`;
        sku = `${base.substring(0, 80 - suffix.length)}${suffix}`;
        counter += 1;
    }

    usedSkus.add(sku.toUpperCase());
    return sku;
}

export async function prepareVariantsWithUniqueSkus(
    tx: any,
    variants: any[] | undefined,
    productName: string,
    excludedVariantIds: string[] = []
) {
    const incomingVariants = Array.isArray(variants) ? variants : [];
    const seenCombinations = new Set<string>();

    for (const variant of incomingVariants) {
        const key = `${normalizeComparable(variant.size)}|${normalizeComparable(variant.color)}`;
        if (seenCombinations.has(key)) {
            throw new Error(`Variante duplicada: talla ${variant.size}, color ${variant.color}`);
        }
        seenCombinations.add(key);
    }

    const existingVariants = await tx.product_variant.findMany({
        where: excludedVariantIds.length > 0 ? { variant_id: { notIn: excludedVariantIds } } : undefined,
        select: { sku: true },
    });
    const usedSkus = new Set<string>(existingVariants.map((variant: any) => String(variant.sku || '').toUpperCase()).filter(Boolean));

    return incomingVariants.map((variant) => {
        const requestedSku = normalizeSku(variant.sku) || generateSku(productName, variant.color, variant.size);
        return {
            ...variant,
            sku: uniqueSku(requestedSku, usedSkus),
        };
    });
}

export function getTemporaryVariantSku(variantId: string, index: number) {
    return `TMP-${Date.now().toString(36)}-${String(variantId).replace(/-/g, '').substring(0, 12)}-${index}`.substring(0, 80);
}
