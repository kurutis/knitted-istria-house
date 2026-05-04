// app/api/admin/users/route.ts
import { authOptions } from "@/lib/auth";
import { supabase } from "@/lib/supabase";
import { getServerSession } from "next-auth";
import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { rateLimit, getClientIP } from "@/lib/rate-limit";
import { logError, logInfo, logApiRequest } from "@/lib/error-logger";
import { sanitize } from "@/lib/sanitize";
import { invalidateCache } from "@/lib/db-optimized";
import { z } from "zod";

// Схема валидации
const createUserSchema = z.object({
    email: z.string().email('Неверный формат email'),
    password: z.string().min(6, 'Пароль должен быть не менее 6 символов'),
    name: z.string().min(2, 'Имя должно содержать минимум 2 символа').max(100).optional(),
    phone: z.string().optional(),
    role: z.enum(['buyer', 'master', 'admin']).default('buyer'),
});

// Rate limiting
const limiter = rateLimit({ limit: 20, windowMs: 60 * 1000 });

// Валидация UUID
function isValidUUID(uuid: string): boolean {
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    return uuidRegex.test(uuid);
}

// Отправка уведомления новому пользователю
async function sendWelcomeNotification(userId: string, email: string, name: string, role: string) {
    try {
        const roleText = role === 'master' ? 'мастера' : role === 'admin' ? 'администратора' : 'покупателя';
        const welcomeMessage = role === 'master' 
            ? `Ваш аккаунт мастера был создан. Теперь вы можете добавлять товары и создавать мастер-классы.`
            : role === 'admin'
            ? `Ваш аккаунт администратора создан. У вас есть доступ ко всем функциям управления.`
            : `Ваш аккаунт покупателя создан. Добро пожаловать на нашу платформу!`;
        
        await supabase
            .from('notifications')
            .insert({
                user_id: userId,
                title: '🎉 Добро пожаловать!',
                message: `${welcomeMessage}\n\nEmail для входа: ${email}\n$${role !== 'admin' ? 'Пароль был отправлен администратором.' : ''}`,
                type: 'account_created',
                metadata: { 
                    created_by_admin: true,
                    role: role
                },
                created_at: new Date().toISOString(),
                is_read: false
            });
    } catch (error) {
        logError('Error sending welcome notification', error, 'warning');
    }
}

export async function POST(request: Request) {
    const startTime = Date.now();
    
    try {
        // Rate limiting
        const ip = getClientIP(request);
        const rateLimitResult = limiter(request);
        if (!rateLimitResult.success) {
            logInfo('Rate limit exceeded for admin user creation', { ip });
            return NextResponse.json({ 
                error: 'Слишком много запросов. Попробуйте через минуту.' 
            }, { status: 429 });
        }

        const session = await getServerSession(authOptions);

        if (!session || session.user?.role !== 'admin') {
            logInfo('Unauthorized admin user creation attempt', { ip });
            return NextResponse.json({ error: 'Неавторизован' }, { status: 401 });
        }

        const body = await request.json();
        
        // Валидация входных данных
        const validatedData = createUserSchema.parse({
            email: body.email,
            password: body.password,
            name: body.name,
            phone: body.phone,
            role: body.role
        });

        const email = sanitize.email(validatedData.email);
        const password = validatedData.password;
        const name = validatedData.name ? sanitize.text(validatedData.name) : email.split('@')[0];
        const phone = validatedData.phone ? sanitize.phone(validatedData.phone) : null;
        const userRole = validatedData.role;
        const now = new Date().toISOString();

        // Проверяем, существует ли пользователь
        const { data: existingUser, error: checkError } = await supabase
            .from('users')
            .select('id, email')
            .eq('email', email)
            .maybeSingle();

        if (checkError && checkError.code !== 'PGRST116') {
            logError('Error checking existing user', checkError);
            return NextResponse.json({ error: 'Ошибка проверки пользователя' }, { status: 500 });
        }

        if (existingUser) {
            return NextResponse.json({ error: 'Пользователь с таким email уже существует' }, { status: 400 });
        }

        // Проверка телефона на уникальность (если указан)
        if (phone) {
            const { data: existingPhone } = await supabase
                .from('profiles')
                .select('phone')
                .eq('phone', phone)
                .maybeSingle();

            if (existingPhone) {
                return NextResponse.json({ error: 'Пользователь с таким телефоном уже существует' }, { status: 400 });
            }
        }

        // Хешируем пароль
        const hashedPassword = await bcrypt.hash(password, 10);

        // Создаем пользователя
        const { data: newUser, error: createError } = await supabase
            .from('users')
            .insert({
                email,
                password_hash: hashedPassword,
                role: userRole,
                role_selected: true,
                is_active: true,
                created_at: now,
                updated_at: now
            })
            .select('id, email, role, created_at')
            .single();

        if (createError) {
            logError('Error creating user', createError);
            return NextResponse.json({ error: 'Ошибка создания пользователя' }, { status: 500 });
        }

        // Создаем профиль пользователя
        const { error: profileError } = await supabase
            .from('profiles')
            .insert({
                user_id: newUser.id,
                full_name: name,
                phone: phone,
                city: null,
                address: null,
                newsletter_agreement: false,
                created_at: now,
                updated_at: now
            });

        if (profileError) {
            logError('Error creating profile', profileError);
            // Откат: удаляем созданного пользователя
            await supabase.from('users').delete().eq('id', newUser.id);
            return NextResponse.json({ error: 'Ошибка создания профиля' }, { status: 500 });
        }

        // Если роль "master", создаем запись в таблице masters
        if (userRole === 'master') {
            const { error: masterError } = await supabase
                .from('masters')
                .insert({
                    user_id: newUser.id,
                    description: null,
                    is_verified: false,
                    is_partner: false,
                    rating: 0,
                    total_sales: 0,
                    custom_orders_enabled: false,
                    moderation_status: 'approved',
                    created_at: now,
                    updated_at: now
                });

            if (masterError) {
                logError('Error creating master record', masterError, 'warning');
            }
        }

        // Инвалидируем кэш пользователей
        invalidateCache(/^admin_users/);
        invalidateCache(/^user_/);

        // Логируем действие администратора
        await supabase
            .from('audit_logs')
            .insert({
                user_id: session.user.id,
                action: 'USER_CREATED_BY_ADMIN',
                entity_type: 'user',
                entity_id: newUser.id,
                new_values: { 
                    email: email, 
                    role: userRole,
                    name: name
                },
                created_at: now
            });

        // Отправляем уведомление новому пользователю
        await sendWelcomeNotification(newUser.id, email, name, userRole);

        logApiRequest('POST', '/api/admin/users', 201, Date.now() - startTime, session.user.id);
        logInfo(`Admin created new user`, { 
            userId: newUser.id,
            adminId: session.user.id,
            role: userRole,
            email: email
        });

        return NextResponse.json({ 
            success: true,
            message: 'Пользователь успешно создан', 
            userId: newUser.id,
            user: {
                id: newUser.id,
                email: newUser.email,
                role: newUser.role,
                name: name,
                created_at: newUser.created_at
            }
        }, { status: 201 });
        
    } catch (error) {
        if (error instanceof z.ZodError) {
            return NextResponse.json({ error: error.issues[0]?.message || 'Ошибка валидации' }, { status: 400 });
        }
        logError('Error creating user by admin', error);
        return NextResponse.json({ error: 'Ошибка создания пользователя' }, { status: 500 });
    }
}

// GET - получить список пользователей для админ-панели
export async function GET(request: Request) {
    const startTime = Date.now();
    
    try {
        const session = await getServerSession(authOptions);

        if (!session || session.user?.role !== 'admin') {
            return NextResponse.json({ error: 'Неавторизован' }, { status: 401 });
        }

        const { searchParams } = new URL(request.url);
        const role = searchParams.get('role');
        const search = searchParams.get('search');
        const limit = Math.min(parseInt(searchParams.get('limit') || '20'), 100);
        const page = parseInt(searchParams.get('page') || '1');
        const offset = (page - 1) * limit;

        // Кэш-ключ
        const cacheKey = `admin_users_${role || 'all'}_${search || 'none'}_${page}_${limit}`;
        
        // Здесь можно добавить cachedQuery для кэширования
        // Для краткости опустим, но в production стоит добавить

        let query = supabase
            .from('users')
            .select(`
                id,
                email,
                role,
                is_active,
                is_banned,
                created_at,
                updated_at,
                profiles (
                    full_name,
                    phone,
                    city,
                    avatar_url
                ),
                masters (
                    is_verified,
                    is_partner,
                    rating,
                    total_sales
                )
            `, { count: 'exact' });

        if (role && role !== 'all') {
            query = query.eq('role', role);
        }

        if (search) {
            const safeSearch = sanitize.text(search);
            query = query.or(`email.ilike.%${safeSearch}%,profiles.full_name.ilike.%${safeSearch}%`);
        }

        const { data: users, error, count } = await query
            .order('created_at', { ascending: false })
            .range(offset, offset + limit - 1);

        if (error) {
            logError('Error fetching users for admin', error);
            return NextResponse.json({ error: 'Ошибка загрузки пользователей' }, { status: 500 });
        }

        const formattedUsers = users?.map(user => ({
            id: user.id,
            email: user.email,
            role: user.role,
            is_active: user.is_active,
            is_banned: user.is_banned,
            created_at: user.created_at,
            updated_at: user.updated_at,
            name: user.profiles?.[0]?.full_name || user.email?.split('@')[0],
            phone: user.profiles?.[0]?.phone,
            city: user.profiles?.[0]?.city,
            avatar: user.profiles?.[0]?.avatar_url,
            is_verified: user.masters?.[0]?.is_verified || false,
            is_partner: user.masters?.[0]?.is_partner || false,
            rating: user.masters?.[0]?.rating || 0,
            total_sales: user.masters?.[0]?.total_sales || 0
        })) || [];

        return NextResponse.json({
            users: formattedUsers,
            pagination: {
                total: count || 0,
                page,
                limit,
                totalPages: Math.ceil((count || 0) / limit)
            }
        }, { status: 200 });
        
    } catch (error) {
        logError('Error fetching admin users', error);
        return NextResponse.json({ error: 'Ошибка загрузки пользователей' }, { status: 500 });
    }
}