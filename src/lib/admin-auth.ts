export type AdminRole = 'ADMIN' | 'SELLER';

export type AdminSession = {
    user_id: string;
    username: string;
    role: AdminRole;
    iat: number;
    exp: number;
};

const TOKEN_MAX_AGE_SECONDS = 60 * 60 * 24 * 7;

function getSecret() {
    const secret = process.env.ADMIN_AUTH_SECRET;
    if (secret) return secret;

    if (process.env.NODE_ENV !== 'production') {
        return 'dev-only-admin-auth-secret-change-me';
    }

    throw new Error('ADMIN_AUTH_SECRET no está configurado');
}

function bytesToBase64Url(bytes: Uint8Array) {
    let binary = '';
    for (const byte of bytes) binary += String.fromCharCode(byte);
    return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/g, '');
}

function base64UrlToBytes(value: string) {
    const base64 = value.replace(/-/g, '+').replace(/_/g, '/').padEnd(Math.ceil(value.length / 4) * 4, '=');
    const binary = atob(base64);
    const bytes = new Uint8Array(binary.length);
    for (let index = 0; index < binary.length; index++) bytes[index] = binary.charCodeAt(index);
    return bytes;
}

function encodeJson(value: unknown) {
    return bytesToBase64Url(new TextEncoder().encode(JSON.stringify(value)));
}

function decodeJson<T>(value: string) {
    return JSON.parse(new TextDecoder().decode(base64UrlToBytes(value))) as T;
}

async function hmacSha256(value: string) {
    const key = await crypto.subtle.importKey(
        'raw',
        new TextEncoder().encode(getSecret()),
        { name: 'HMAC', hash: 'SHA-256' },
        false,
        ['sign']
    );
    return new Uint8Array(await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(value)));
}

function safeEqual(left: string, right: string) {
    if (left.length !== right.length) return false;
    let result = 0;
    for (let index = 0; index < left.length; index++) {
        result |= left.charCodeAt(index) ^ right.charCodeAt(index);
    }
    return result === 0;
}

export async function createAdminToken(input: Pick<AdminSession, 'user_id' | 'username' | 'role'>) {
    const now = Math.floor(Date.now() / 1000);
    const payload: AdminSession = {
        ...input,
        iat: now,
        exp: now + TOKEN_MAX_AGE_SECONDS,
    };
    const body = `${encodeJson({ alg: 'HS256', typ: 'JWT' })}.${encodeJson(payload)}`;
    const signature = bytesToBase64Url(await hmacSha256(body));
    return `${body}.${signature}`;
}

export async function verifyAdminToken(token?: string) {
    if (!token) return null;

    const parts = token.split('.');
    if (parts.length !== 3) return null;

    const [header, payload, signature] = parts;
    if (!header || !payload || !signature) return null;

    const body = `${header}.${payload}`;
    const expectedSignature = bytesToBase64Url(await hmacSha256(body));
    if (!safeEqual(signature, expectedSignature)) return null;

    const session = decodeJson<AdminSession>(payload);
    if (!session.user_id || !session.username || !session.role || !session.exp) return null;
    if (session.role !== 'ADMIN' && session.role !== 'SELLER') return null;
    if (session.exp <= Math.floor(Date.now() / 1000)) return null;

    return session;
}

export const adminTokenMaxAge = TOKEN_MAX_AGE_SECONDS;
