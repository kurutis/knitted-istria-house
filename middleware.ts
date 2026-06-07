import { withAuth } from "next-auth/middleware";
import { NextResponse } from "next/server";

export default withAuth(
  function middleware(req) {
    const token = req.nextauth.token;
    const pathname = req.nextUrl.pathname;

    if (pathname.startsWith('/api')) {
      return NextResponse.next();
    }

    if (pathname.startsWith('/admin')) {
      if (!token) {
        const signinUrl = new URL('/auth/signin', req.url);
        signinUrl.searchParams.set('callbackUrl', pathname);
        return NextResponse.redirect(signinUrl);
      }
      
      if (token.role !== 'admin') {
        return NextResponse.redirect(new URL('/', req.url));
      }
    }

    if (pathname.startsWith('/master')) {
      if (!token) {
        const signinUrl = new URL('/auth/signin', req.url);
        signinUrl.searchParams.set('callbackUrl', pathname);
        return NextResponse.redirect(signinUrl);
      }
      
      if (token.role !== 'master' && token.role !== 'admin') {
        return NextResponse.redirect(new URL('/', req.url));
      }
    }

    const protectedPaths = ['/profile', '/favorites', '/shopping-cart', '/chats', '/orders'];
    if (protectedPaths.some(path => pathname === path || pathname.startsWith(path + '/'))) {
      if (!token) {
        const signinUrl = new URL('/auth/signin', req.url);
        signinUrl.searchParams.set('callbackUrl', pathname);
        return NextResponse.redirect(signinUrl);
      }
    }

    return NextResponse.next();
  },
  {
    callbacks: {
      authorized: ({ token }) => {
        return true;
      },
    }
  }
);

export const config = {
  matcher: [
    '/api/:path*',
    '/admin/:path*',
    '/master/:path*',
    '/profile/:path*',
    '/favorites/:path*',
    '/shopping-cart/:path*',
    '/chats/:path*',
    '/orders/:path*',
  ]
};