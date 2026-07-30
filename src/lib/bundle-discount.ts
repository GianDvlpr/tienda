export type BundleDiscountCartItem = {
    productId: string;
    qty: number;
    unitPrice: number;
    customizationSurcharge?: number | null;
};

export type BundleDiscountPromotion = {
    requiredProductIds: string[];
    discount_amount?: number | null;
    bundle_price?: number | null;
    tier_2_price?: number | null;
    tier_3_price?: number | null;
};

function normalizeId(value: string) {
    return String(value || '').trim().toLowerCase();
}

function calculateBundleSetDiscount(pricesByProduct: Record<string, number[]>, requiredProductIds: string[], bundle: BundleDiscountPromotion) {
    if (requiredProductIds.length === 0) return 0;
    const possibleSets = Math.min(...requiredProductIds.map((id) => pricesByProduct[id]?.length || 0));
    if (possibleSets <= 0) return 0;

    const setSubtotals = Array.from({ length: possibleSets }, (_, setIndex) => (
        requiredProductIds.reduce((sum, id) => sum + (pricesByProduct[id]?.[setIndex] || 0), 0)
    ));
    const tiers = [
        { qty: 1, price: Number(bundle.bundle_price || 0) },
        { qty: 2, price: Number(bundle.tier_2_price || 0) },
        { qty: 3, price: Number(bundle.tier_3_price || 0) },
    ].filter((tier) => tier.price > 0);
    const legacyDiscount = Number(bundle.discount_amount || 0);

    if (tiers.length === 0 && legacyDiscount <= 0) return 0;

    const dp = Array(possibleSets + 1).fill(0);
    for (let i = 1; i <= possibleSets; i += 1) {
        dp[i] = dp[i - 1];

        if (legacyDiscount > 0 && !bundle.bundle_price) {
            dp[i] = Math.max(dp[i], dp[i - 1] + legacyDiscount);
        }

        for (const tier of tiers) {
            if (i < tier.qty) continue;

            const packSubtotal = setSubtotals.slice(i - tier.qty, i).reduce((sum, value) => sum + value, 0);
            const savings = Math.max(0, packSubtotal - tier.price);
            dp[i] = Math.max(dp[i], dp[i - tier.qty] + savings);
        }
    }

    return dp[possibleSets];
}

export function calculateBundleDiscount(items: BundleDiscountCartItem[], bundles: BundleDiscountPromotion[]) {
    if (items.length === 0 || bundles.length === 0) return 0;

    let totalSavings = 0;

    for (const bundle of bundles) {
        const requiredProductIds = (bundle.requiredProductIds || []).map(normalizeId).filter(Boolean);
        if (requiredProductIds.length === 0) continue;

        const requiredSet = new Set(requiredProductIds);
        const cartProductStats: Record<string, number> = {};
        const pricesByProduct: Record<string, number[]> = {};

        for (const item of items) {
            const productId = normalizeId(item.productId);
            const qty = Math.max(0, Math.floor(Number(item.qty || 0)));

            if (!productId || qty <= 0) continue;
            cartProductStats[productId] = (cartProductStats[productId] || 0) + qty;

            if (requiredSet.has(productId)) {
                for (let i = 0; i < qty; i += 1) {
                    const unitPrice = Math.max(0, Number(item.unitPrice || 0) - Number(item.customizationSurcharge || 0));
                    pricesByProduct[productId] = [...(pricesByProduct[productId] || []), unitPrice];
                }
            }
        }

        Object.keys(pricesByProduct).forEach((productId) => {
            pricesByProduct[productId].sort((a, b) => b - a);
        });

        const hasAllRequired = requiredProductIds.every((id) => (cartProductStats[id] || 0) > 0);
        totalSavings += hasAllRequired ? calculateBundleSetDiscount(pricesByProduct, requiredProductIds, bundle) : 0;
    }

    return totalSavings;
}
