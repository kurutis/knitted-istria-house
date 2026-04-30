import { withAuth } from "next-auth/middleware";
import { NextResponse } from "next/server";

export default withAuth(
  function middleware(req) {
    const token = req.nextauth.token;
    const pathname = req.nextUrl.pathname;

    console.log('Middleware - pathname:', pathname);
    console.log('Middleware - token exists:', !!token);
    console.log('Middleware - token role:', token?.role);

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
        const publicPaths = [
          '/', '/auth/signin', '/auth/signup', '/auth/error', 
          '/auth/role-selection', '/catalog', '/products', '/blog', 
          '/api/auth', '/masters', '/master-classes'
        ];
        
        const isPublicPath = publicPaths.some(path => req.nextUrl.pathname === path || req.nextUrl.pathname.startsWith(path));
        
        // Для отладки
        console.log('authorized - path:', req.nextUrl.pathname);
        console.log('authorized - isPublicPath:', isPublicPath);
        console.log('authorized - has token:', !!token);
        
        // Разрешаем доступ к публичным страницам всегда, к остальным - только с токеном
        if (isPublicPath) return true;
        return !!token;
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