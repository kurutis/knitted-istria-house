import { getServerSession } from "next-auth";
import { authOptions } from "./auth";
import { NextResponse } from "next/server";
import { logError, logInfo } from "./error-logger";

export type UserRole = 'admin' | 'master' | 'buyer' | 'moderator';

export interface SessionWithRole {
    user: {
        id: string;
        email: string;
        role: UserRole;
        name?: string | null;
        image?: string | null;
    };
}

interface AuthOptions {
    redirectTo?: string;
    silent?: boolean;
}

const ERROR_MESSAGES = {unauthorized: 'Неавторизован', forbidden: 'Доступ запрещен', invalidRole: 'Недостаточно прав для выполнения операции'};

export async function requireAuth(options: AuthOptions = {}): Promise<SessionWithRole | NextResponse> {
    try {
        const session = await getServerSession(authOptions);
        
        if (!session?.user) {
            if (!options.silent) {logInfo('Unauthorized access attempt', { redirectTo: options.redirectTo })}
            
            if (options.redirectTo) {return NextResponse.redirect(new URL(options.redirectTo, process.env.NEXTAUTH_URL))}
            
            return NextResponse.json({ error: ERROR_MESSAGES.unauthorized }, { status: 401 });
        }
        
        const userRole = (session.user.role || 'buyer') as UserRole;
        
        return {user: {id: session.user.id, email: session.user.email || '', role: userRole, name: session.user.name, image: session.user.image}};
        
    } catch (error) {
        logError('Auth guard error', error);
        return NextResponse.json({ error: 'Ошибка проверки авторизации' }, { status: 500 });
    }
}

export async function requireRole(roles: UserRole | UserRole[], options: AuthOptions = {}): Promise<SessionWithRole | NextResponse> {
    const rolesArray = Array.isArray(roles) ? roles : [roles];
    
    const authResult = await requireAuth(options);
    
    if (authResult instanceof NextResponse) {return authResult}
    
    const session = authResult;
    const userRole = session.user.role;
    
    if (!rolesArray.includes(userRole)) {
        if (!options.silent) {logInfo('Forbidden access attempt', {userId: session.user.id, userRole, requiredRoles: rolesArray, path: options.redirectTo})}
        
        if (options.redirectTo) { return NextResponse.redirect(new URL(options.redirectTo, process.env.NEXTAUTH_URL))}
        
        return NextResponse.json({ error: ERROR_MESSAGES.forbidden, requiredRoles: rolesArray, userRole }, { status: 403 });
    }
    
    return session;
}

export async function requireAdmin(options: AuthOptions = {}): Promise<SessionWithRole | NextResponse> {return requireRole('admin', options)}
export async function requireMaster(options: AuthOptions = {}): Promise<SessionWithRole | NextResponse> {return requireRole(['master', 'admin'], options)}
export async function requireBuyer(options: AuthOptions = {}): Promise<SessionWithRole | NextResponse> {return requireRole(['buyer', 'admin'], options)}
export async function requireModerator(options: AuthOptions = {}): Promise<SessionWithRole | NextResponse> {return requireRole(['moderator', 'admin'], options);}

export async function hasRole(roles: UserRole | UserRole[]): Promise<boolean> {
    try {
        const session = await getServerSession(authOptions);
        if (!session?.user) return false;
        
        const rolesArray = Array.isArray(roles) ? roles : [roles];
        const userRole = (session.user.role || 'buyer') as UserRole;
        
        return rolesArray.includes(userRole);
    } catch (error) {
        logError('Error checking role', error);
        return false;
    }
}

export async function getAuthenticatedSession(): Promise<SessionWithRole> {
    const session = await getServerSession(authOptions);
    
    if (!session?.user) {throw new Error(ERROR_MESSAGES.unauthorized)}
    
    return {user: {id: session.user.id, email: session.user.email || '', role: (session.user.role || 'buyer') as UserRole, name: session.user.name, image: session.user.image}};
}

export function withAuth(handler: (session: SessionWithRole, request: Request) => Promise<NextResponse>, roles?: UserRole | UserRole[]) {
    return async (request: Request) => {
        try {
            let session: SessionWithRole | NextResponse;
            
            if (roles) {
                session = await requireRole(roles);
            } else {
                session = await requireAuth();
            }
            
            if (session instanceof NextResponse) {return session}
            
            return await handler(session, request);
            
        } catch (error) {
            logError('API auth error', error);
            return NextResponse.json({ error: 'Внутренняя ошибка сервера' }, { status: 500 });
        }
    };
}

export function AuthGuard(roles?: UserRole | UserRole[]) {
    return function (target: object, propertyKey: string, descriptor: PropertyDescriptor) {
        const originalMethod = descriptor.value;
        
        descriptor.value = async function (request: Request, ...args: unknown[]) {
            try {
                let session: SessionWithRole | NextResponse;
                
                if (roles) {
                    session = await requireRole(roles);
                } else {
                    session = await requireAuth();
                }
                
                if (session instanceof NextResponse) {return session}
                
                return await originalMethod.apply(this, [session, request, ...args]);
                
            } catch (error) {
                logError(`Auth guard error in ${propertyKey}`, error);
                return NextResponse.json({ error: 'Внутренняя ошибка сервера' }, { status: 500 });
            }
        };
        
        return descriptor;
    };
}