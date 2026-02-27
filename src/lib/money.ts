export function formatPEN(value: number) {
    const n = Number.isFinite(value) ? value : 0;
    return `S/ ${n.toFixed(2)}`;
}