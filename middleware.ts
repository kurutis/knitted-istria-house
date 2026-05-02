import { withAuth } from "next-auth/middleware";
import { NextResponse } from "next/server";

export default withAuth(
  function middleware(req) {
    const token = req.nextauth.token;
    const pathname = req.nextUrl.pathname;

    // Логирование для отладки (только в development)
    if (process.env.NODE_ENV === 'development') {
      console.log(`[Middleware] Path: ${pathname}, Token: ${!!token}, Role: ${token?.role}`);
    }

    // ============ АДМИН ПАНЕЛЬ ============
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

    // ============ МАСТЕР ПАНЕЛЬ ============
    if (pathname.startsWith('/master')) {
      // Редирект с несуществующего /master/chats на /chats
      if (pathname === '/master/chats') {
        return NextResponse.redirect(new URL('/chats', req.url));
      }

      if (!token) {
        const signinUrl = new URL('/auth/signin', req.url);
        signinUrl.searchParams.set('callbackUrl', pathname);
        return NextResponse.redirect(signinUrl);
      }
      
      if (token.role !== 'master' && token.role !== 'admin') {
        return NextResponse.redirect(new URL('/', req.url));
      }
    }

    // ============ ЗАЩИЩЁННЫЕ СТРАНИЦЫ (для всех авторизованных) ============
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
      authorized: ({ token, req }) => {
        const pathname = req.nextUrl.pathname;
        
        // Публичные пути (доступны без авторизации)
        const publicPaths = [
          '/', '/auth/signin', '/auth/signup', '/auth/error', 
          '/auth/role-selection', '/catalog', '/catalog/', 
          '/products', '/blog', '/blog/', '/api/auth', 
          '/masters', '/masters/', '/master-classes', '/master-classes/',
          '/api/masters', '/api/catalog', '/api/blog'
        ];
        
        const isPublicPath = publicPaths.some(path => 
          pathname === path || pathname.startsWith(path + '/')
        );
        
        // Оптимизация: проверяем API маршруты
        if (pathname.startsWith('/api/') && !pathname.startsWith('/api/auth/')) {
          // API маршруты требуют авторизации (кроме auth)
          return !!token;
        }
        
        return isPublicPath || !!token;
      },
    },
  }
);

export const config = {
  matcher: [
    /*
     * Матчер для всех защищённых маршрутов:
     * - /admin/*
     * - /master/*
     * - /profile/*
     * - /favorites/*
     * - /shopping-cart/*
     * - /chats/*
     * - /orders/*
     * - /api/* (кроме /api/auth/*)
     */
    '/admin/:path*',
    '/master/:path*',
    '/profile/:path*',
    '/favorites/:path*',
    '/shopping-cart/:path*',
    '/chats/:path*',
    '/orders/:path*',
    '/api/:path*',
  ],
};