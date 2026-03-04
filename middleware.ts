import { withAuth } from "next-auth/middleware";
import { NextResponse } from "next/server";

export default withAuth(
  function middleware(req) {
    const token = req.nextauth.token;
    const pathname = req.nextUrl.pathname;

    if (pathname.startsWith('/admin')) {
      if (!token) {
        return NextResponse.redirect(new URL(`/auth/signin?callbackUrl=${encodeURIComponent(pathname)}`, req.url));
      }
      
      if (token.role !== 'admin') {return NextResponse.redirect(new URL('/', req.url));}
    }

    if (pathname.startsWith('/master')) {
      if (!token) {
        return NextResponse.redirect(new URL(`/auth/signin?callbackUrl=${encodeURIComponent(pathname)}`, req.url));
      }
      
      if (token.role !== 'master' && token.role !== 'admin') {
        return NextResponse.redirect(new URL('/', req.url));
      }
    }

    return NextResponse.next();
  },
  {
    callbacks: {
      authorized: ({ token }) => {
        const publicPaths = ['/', '/auth/signin', '/auth/signup', '/auth/error', '/auth/role-selection', '/catalog', '/products', '/blog', '/api/auth'];
        
        const isPublicPath = publicPaths.some(path => req.nextUrl.pathname.startsWith(path));
        return isPublicPath || !!token;
      },
    }
  }
);

export const config = {
  matcher: ['/admin/:path*', '/master/:path*', '/profile/:path*', '/orders/:path*',]
};