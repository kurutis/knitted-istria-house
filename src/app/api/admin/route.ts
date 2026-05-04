// app/api/admin/verify/route.ts
import { authOptions } from "@/lib/auth";
import { getServerSession } from "next-auth";
import { NextResponse } from "next/server";
import { getClientIP } from "@/lib/rate-limit";
import { logInfo, logError, logApiRequest } from "@/lib/error-logger";

export async function GET(request: Request) {
    const startTime = Date.now();
    const ip = getClientIP(request);
    
    try {
        const session = await getServerSession(authOptions);

        // Проверка авторизации
        if (!session?.user) {
            logInfo('Admin verify - unauthorized', { ip });
            return NextResponse.json({ 
                isValid: false,
                error: 'Неавторизован',
                code: 'UNAUTHORIZED'
            }, { status: 401 });
        }

        // Проверка роли
        const isValidAdmin = session.user.role === 'admin';
        
        if (!isValidAdmin) {
            logInfo('Admin verify - forbidden', { 
                ip, 
                userId: session.user.id, 
                role: session.user.role 
            });
            return NextResponse.json({ 
                isValid: false,
                error: 'Доступ запрещен',
                code: 'FORBIDDEN',
                role: session.user.role
            }, { status: 403 });
        }

        logApiRequest('GET', '/api/admin/verify', 200, Date.now() - startTime, session.user.id);

        return NextResponse.json({ 
            isValid: true,
            user: {
                id: session.user.id,
                email: session.user.email,
                role: session.user.role
            }
        }, { status: 200 });
        
    } catch (error) {
        logError('Admin verify endpoint error', error);
        return NextResponse.json({ 
            isValid: false,
            error: 'Внутренняя ошибка сервера',
            code: 'INTERNAL_ERROR'
        }, { status: 500 });
    }
}