'use client'

import { useSearchParams } from "next/navigation"
import Link from "next/link"

export default function AuthErrorPage() {
    const searchParams = useSearchParams()
    const error = searchParams.get('error')

    const errorMessages: Record<string, string> = {'CredentialsSignin': 'Неверный email или пароль', 'Default': 'Произошла ошибка при входе', 'Configuration': 'Ошибка конфигурации системы', 'AccessDenied': 'Доступ запрещен', 'Verification': 'Ошибка верификации'}
    const errorMessage = error ? errorMessages[error] || error: 'Неизвестная ошибка'

    return(
        <div>
            <div>
                <div>
                    <div>
                        <svg className="h-6 w-6 text-red-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.732-.833-2.502 0L4.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
                        </svg>
                    </div>
                    <h2>Ошибка авторизации</h2>
                    <p>{errorMessage}</p>
                    <div>
                        <Link href="/auth/signin">Попробовать снова</Link>
                        <Link href="/">На главную</Link>
                    </div>
                    <div>
                        <p>Если ошибка повторяется, свяжитесь с поддержкой:</p>
                        <p><a href="mailto:support@example.com">support@example.com</a></p>
                    </div>
                </div>
            </div>
        </div>
    )
}