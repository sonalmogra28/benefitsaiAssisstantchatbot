import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';

export function middleware(req: NextRequest) {
  const url = new URL(req.url);
  const pathname = url.pathname;

  // Protect admin API routes
  if (pathname.startsWith('/api/admin')) {
    const auth = req.headers.get('authorization');
    const role = (req.headers.get('x-user-role') || '').toLowerCase();

    const isAuthorizedRole = role === 'admin' || role === 'super-admin' || role === 'company-admin';
    if (!auth || !isAuthorizedRole) {
      const redirectUrl = new URL('/login', req.url);
      return NextResponse.redirect(redirectUrl, { status: 307 });
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/api/admin/:path*', '/((?!_next/static|_next/image|favicon.ico).*)'],
};
