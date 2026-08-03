import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { verifyAdminToken } from '@/lib/admin-auth';

function unauthorized(request: NextRequest) {
    if (request.nextUrl.pathname.startsWith('/api/')) {
        return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    return NextResponse.redirect(new URL('/admin/login', request.url));
}

function forbidden(request: NextRequest) {
    if (request.nextUrl.pathname.startsWith('/api/')) {
        return NextResponse.json({ error: 'Acceso denegado' }, { status: 403 });
    }

    return NextResponse.redirect(new URL('/admin', request.url));
}

function isPath(pathname: string, basePath: string) {
    return pathname === basePath || pathname.startsWith(`${basePath}/`);
}

function sellerCanAccess(request: NextRequest) {
    const { pathname } = request.nextUrl;

    if (pathname === '/admin' || isPath(pathname, '/admin/orders')) return true;
    if (pathname === '/api/admin/me') return true;
    if (pathname === '/api/admin/dashboard' || pathname === '/api/admin/dashboard/alerts') return true;
    if (isPath(pathname, '/api/admin/orders')) return true;
    if (request.method === 'GET' && isPath(pathname, '/api/admin/products')) return true;

    return false;
}

export async function middleware(request: NextRequest) {
    const { pathname } = request.nextUrl;

    if (pathname.startsWith('/admin') || pathname.startsWith('/api/admin')) {
        if (pathname === '/admin/login' || pathname === '/api/admin/login' || pathname === '/api/admin/logout') {
            return NextResponse.next();
        }

        const token = request.cookies.get('admin_token')?.value;
        const session = await verifyAdminToken(token);

        if (!session) {
            return unauthorized(request);
        }

        if (session.role === 'SELLER' && !sellerCanAccess(request)) {
            return forbidden(request);
        }
    }

    return NextResponse.next();
}

export const config = {
    matcher: ['/admin/:path*', '/api/admin/:path*'],
};
