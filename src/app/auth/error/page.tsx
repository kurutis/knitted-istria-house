'use client';

import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { Suspense } from 'react';

function ErrorContent() {
  const searchParams = useSearchParams();
  const error = searchParams.get('error');
  
  const getErrorMessage = () => {
    switch (error) {
      case 'OAuthCallback':
        return 'Ошибка при входе через социальную сеть. Пожалуйста, попробуйте снова.';
      case 'Callback':
        return 'Ошибка при обработке запроса. Пожалуйста, попробуйте снова.';
      case 'AccessDenied':
        return 'Доступ запрещен. У вас нет прав для входа.';
      case 'Configuration':
        return 'Ошибка конфигурации. Пожалуйста, свяжитесь с администратором.';
      default:
        return 'Произошла ошибка при авторизации. Пожалуйста, попробуйте снова.';
    }
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] px-4">
      <div className="bg-white rounded-lg shadow-md p-8 max-w-md w-full text-center">
        <div className="text-red-500 text-6xl mb-4">⚠️</div>
        <h1 className="font-['Montserrat_Alternates'] font-semibold text-2xl mb-4">
          Ошибка авторизации
        </h1>
        <p className="text-gray-600 mb-6">{getErrorMessage()}</p>
        <div className="flex flex-col gap-3">
          <Link
            href="/auth/signin"
            className="px-6 py-3 bg-firm-orange text-white rounded-lg hover:bg-opacity-90 transition"
          >
            Попробовать снова
          </Link>
          <Link
            href="/"
            className="text-sm text-gray-500 hover:text-firm-orange transition"
          >
            Вернуться на главную
          </Link>
        </div>
      </div>
    </div>
  );
}

export default function AuthErrorPage() {
  return (
    <Suspense fallback={<div className="flex justify-center items-center min-h-[60vh]">Загрузка...</div>}>
      <ErrorContent />
    </Suspense>
  );
}