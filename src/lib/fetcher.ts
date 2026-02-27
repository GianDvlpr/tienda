export async function fetcher<T>(url: string): Promise<T> {
    const res = await fetch(url);

    if (!res.ok) {
        const errBody = await res.json().catch(() => ({}));
        const msg = errBody?.error ?? `HTTP ${res.status}`;
        throw new Error(msg);
    }

    return res.json() as Promise<T>;
}