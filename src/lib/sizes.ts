export const SIZE_ORDER = ['XXS', 'XS', 'S', 'M', 'L', 'XL', 'XXL', 'XXXL', '4XL'];

export function sortSizes(sizes: string[]): string[] {
    return [...sizes].sort((a, b) => {
        const indexA = SIZE_ORDER.indexOf(a.toUpperCase());
        const indexB = SIZE_ORDER.indexOf(b.toUpperCase());
        
        if (indexA === -1 && indexB === -1) return a.localeCompare(b);
        if (indexA === -1) return 1;
        if (indexB === -1) return -1;
        
        return indexA - indexB;
    });
}
