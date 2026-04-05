export interface ProductListItem {
    productId: string;
    slug: string;
    name: string;
    minPrice: number;
    maxPrice: number;
    variantsInStock: number;
    primaryImageUrl: string | null;
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
}

export interface BundlePromotion {
    bundle_id: string;
    name: string;
    description: string | null;
    discount_amount: number;
    items: BundlePromotionItem[];
}

export interface ProductDetailResponse {
    product: ProductDetail;
    images: ProductImage[];
    variants: ProductVariant[];
    bundles?: BundlePromotion[];
}