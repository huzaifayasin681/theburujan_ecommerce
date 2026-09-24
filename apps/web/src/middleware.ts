import { NextResponse, type NextRequest } from 'next/server';

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const hasSession = Boolean(
    request.cookies.get('access_token')?.value || request.cookies.get('refresh_token')?.value
  );

  // Separate Admin route protection
  if (pathname.startsWith('/admin')) {
    // Exclude /admin/login from redirect loop
    if (pathname === '/admin/login') {
      return NextResponse.next();
    }
    if (!hasSession) {
      const adminLogin = new URL('/admin/login', request.url);
      return NextResponse.redirect(adminLogin);
    }
  }

  // Customer account & checkout protection
  if (!hasSession && (pathname.startsWith('/account') || pathname === '/checkout')) {
    const login = new URL('/login', request.url);
    login.searchParams.set('returnTo', pathname);
    return NextResponse.redirect(login);
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/account/:path*', '/admin/:path*', '/checkout'],
};
