import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export function middleware(request: NextRequest) {
    const { pathname } = request.nextUrl;

    if (pathname.startsWith('/admin')) {
        // Permitir acceso libre al login
        if (pathname === '/admin/login') {
            return NextResponse.next();
        }

        const token = request.cookies.get('admin_token')?.value;

        if (!token) {
            const loginUrl = new URL('/admin/login', request.url);
            return NextResponse.redirect(loginUrl);
        }

        try {
            const payload = JSON.parse(atob(token));
            
            if (payload.role === 'SELLER') {
                const isAllowed = pathname === '/admin' || pathname.startsWith('/admin/orders');
                if (!isAllowed) {
                    return NextResponse.redirect(new URL('/admin', request.url));
                }
            }
        } catch (e) {
            // Invalid token
            return NextResponse.redirect(new URL('/admin/login', request.url));
        }
    }

    return NextResponse.next();
}

export const config = {
    matcher: ['/admin/:path*'],
};
