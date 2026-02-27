export type CollectionItem = {
    collectionId: string;
    slug: string;
    name: string;
    description: string | null;
};

export type CollectionsResponse = {
    items: CollectionItem[];
};