import { withAuth } from "next-auth/middleware";
import { NextResponse } from "next/server";

export default withAuth(
  function middleware(req) {
    const token = req.nextauth.token;
    const pathname = req.nextUrl.pathname;

    // Пропускаем API запросы (они обрабатываются отдельно в API маршрутах)
    if (pathname.startsWith('/api')) {
      return NextResponse.next();
    }

    // Админ-панель - только для админов
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

    // Мастер-панель - только для мастеров
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

    // Защищённые страницы для авторизованных пользователей
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
        // Все страницы (кроме защищённых) доступны без авторизации
        return true;
      },
    }
  }
);

export const config = {
  matcher: [
    '/api/:path*', // Добавляем API в matcher, но пропускаем в middleware
    '/admin/:path*',
    '/master/:path*',
    '/profile/:path*',
    '/favorites/:path*',
    '/shopping-cart/:path*',
    '/chats/:path*',
    '/orders/:path*',
  ]
};