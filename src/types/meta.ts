export type StoreMetaResponse = {
    collections: { collectionId: string; slug: string; name: string; description: string | null }[];
    filters: { sizes: string[]; colors: string[] };
    priceRange: { minPrice: number; maxPrice: number };
};