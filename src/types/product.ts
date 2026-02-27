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
}

export interface ProductDetailResponse {
    product: ProductDetail;
    images: ProductImage[];
    variants: ProductVariant[];
}