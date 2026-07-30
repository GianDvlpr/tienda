export interface ProductListItem {
    productId: string;
    slug: string;
    name: string;
    minPrice: number;
    maxPrice: number;
    variantsInStock: number;
    primaryImageUrl: string | null;
    secondaryImageUrl: string | null;
    isCustomizable?: boolean;
    customizationSurcharge?: number;
}


export interface ProductListResponse {
    items: ProductListItem[];
    total: number;
    page: number;
    pageSize: number;
}

export interface ProductImage {
    imageId: string;
    url: string;
    publicId: string;
    color?: string | null;
    sortOrder: number;
}

export interface ProductVariant {
    variantId: string;
    sku: string;
    size: string;
    color: string;
    price: number;
    stock: number;
}

export interface ProductDetail {
    productId: string;
    slug: string;
    name: string;
    description: string | null;
    basePrice: number;
    size_guide_url?: string | null;
    size_guide_json?: string | null;
    isCustomizable?: boolean;
    customizationType?: 'PANTS' | 'UPPER' | null;
    customizationSurcharge?: number;
    customFabricSupplyId?: string | null;

    collection?: {
        name: string;
        slug: string;
    } | null;
}

export interface BundlePromotionItem {
    productId: string;
    name: string;
    slug: string;
    primaryImageUrl: string | null;
    variantId?: string;
    unitPrice?: number;
    size?: string;
    color?: string;
    sku?: string;
    isCustomizable?: boolean;
    customizationType?: 'PANTS' | 'UPPER' | null;
    customizationSurcharge?: number;
    sizeGuideJson?: string | null;
}

export interface BundlePromotion {
    bundle_id: string;
    name: string;
    description: string | null;
    discount_amount: number;
    bundle_price?: number | null;
    tier_2_price?: number | null;
    tier_3_price?: number | null;
    customization_surcharge?: number | null;
    items: BundlePromotionItem[];
}

export interface ProductDetailResponse {
    product: ProductDetail;
    images: ProductImage[];
    variants: ProductVariant[];
    bundles?: BundlePromotion[];
}
