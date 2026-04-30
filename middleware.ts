import { withAuth } from "next-auth/middleware";
import { NextResponse } from "next/server";

export default withAuth(
  function middleware(req) {
    const token = req.nextauth.token;
    const pathname = req.nextUrl.pathname;

    // Админ-панель
    if (pathname.startsWith('/admin')) {
      if (!token) {
        return NextResponse.redirect(new URL(`/auth/signin?callbackUrl=${encodeURIComponent(pathname)}`, req.url));
      }
      
      if (token.role !== 'admin') {
        return NextResponse.redirect(new URL('/', req.url));
      }
    }

    // Мастер-панель
    if (pathname.startsWith('/master')) {
      if (!token) {
        return NextResponse.redirect(new URL(`/auth/signin?callbackUrl=${encodeURIComponent(pathname)}`, req.url));
      }
      
      if (token.role !== 'master' && token.role !== 'admin') {
        return NextResponse.redirect(new URL('/', req.url));
      }
    }

    // Защищенные страницы для всех авторизованных пользователей
    const protectedPaths = ['/profile', '/favorites', '/shopping-cart', '/chats'];
    if (protectedPaths.some(path => pathname.startsWith(path))) {
      if (!token) {
        return NextResponse.redirect(new URL(`/auth/signin?callbackUrl=${encodeURIComponent(pathname)}`, req.url));
      }
    }

    return NextResponse.next();
  },
  {
    callbacks: {
      authorized: ({ token }) => {
        const publicPaths = ['/', '/auth/signin', '/auth/signup', '/auth/error', '/auth/role-selection', '/catalog', '/products', '/blog', '/api/auth', '/masters', '/master-classes'];
        
        const isPublicPath = publicPaths.some(path => req.nextUrl.pathname.startsWith(path));
        return isPublicPath || !!token;
      },
    }
  }
);

export const config = {
  matcher: [
    '/admin/:path*', 
    '/master/:path*', 
    '/profile/:path*', 
    '/orders/:path*',
    '/favorites/:path*',
    '/shopping-cart/:path*',
    '/chats/:path*'
  ]
};