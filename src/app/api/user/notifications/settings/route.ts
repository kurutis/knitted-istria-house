// app/api/notification-settings/route.ts
import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { supabase } from "@/lib/supabase";
import { rateLimit } from "@/lib/rate-limit";
import { cachedQuery, invalidateCache } from "@/lib/db-optimized";
import { logError, logInfo } from "@/lib/error-logger";

interface Settings {
    orderStatus?: boolean;
    promotions?: boolean;
    messages?: boolean;
    newsletterAgreement?: boolean;
    master_updates?: boolean;
    custom_requests?: boolean;
}

interface ProfileUpdateData {
    updated_at: string;
    notification_order_status?: boolean;
    notification_promotions?: boolean;
    notification_messages?: boolean;
    newsletter_agreement?: boolean;
    notification_master_updates?: boolean;
    notification_custom_requests?: boolean;
}

// Rate limiting
const getLimiter = rateLimit({ limit: 60, windowMs: 60 * 1000 }); // 60 запросов в минуту
const putLimiter = rateLimit({ limit: 20, windowMs: 60 * 1000 }); // 20 обновлений в минуту

// Схема валидации настроек
const notificationSettingsSchema = {
    orderStatus: { type: 'boolean', required: false },
    promotions: { type: 'boolean', required: false },
    messages: { type: 'boolean', required: false },
    newsletterAgreement: { type: 'boolean', required: false }
};

function validateSettings(settings: Settings): { valid: boolean; error?: string } {
    const validKeys: (keyof Settings)[] = ['orderStatus', 'promotions', 'messages', 'newsletterAgreement', 'master_updates', 'custom_requests'];
    
    for (const key of Object.keys(settings) as (keyof Settings)[]) {
        if (!validKeys.includes(key)) {
            return { valid: false, error: `Неизвестный параметр: ${String(key)}` };
        }
        if (typeof settings[key] !== 'boolean') {
            return { valid: false, error: `Параметр ${String(key)} должен быть булевым значением` };
        }
    }
    
    return { valid: true };
}

// GET - получить настройки уведомлений
export async function GET(request: Request) {
    const startTime = Date.now();
    
    try {
        const session = await getServerSession(authOptions);
        
        if (!session?.user) {
            return NextResponse.json({ error: 'Неавторизован' }, { status: 401 });
        }

        // Rate limiting
        const ip = request.headers.get('x-forwarded-for') || 'unknown';
        const rateLimitResult = getLimiter(request);
        if (!rateLimitResult.success) {
            return NextResponse.json({ 
                error: 'Слишком много запросов. Попробуйте через минуту.',
                settings: getDefaultSettings()
            }, { status: 429 });
        }

        // Кэшируем настройки
        const cacheKey = `notification_settings_${session.user.id}`;
        
        const settings = await cachedQuery(cacheKey, async () => {
            // Проверяем, существует ли профиль
            const { data: profileExists } = await supabase
                .from('profiles')
                .select('user_id')
                .eq('user_id', session.user.id)
                .maybeSingle();

            // Если профиля нет, создаем
            if (!profileExists) {
                const now = new Date().toISOString();
                await supabase
                    .from('profiles')
                    .insert({
                        user_id: session.user.id,
                        created_at: now,
                        updated_at: now
                    });
            }

            // Получаем настройки
            const { data: profile, error } = await supabase
                .from('profiles')
                .select(`
                    notification_order_status,
                    notification_promotions,
                    notification_messages,
                    notification_master_updates,
                    notification_custom_requests,
                    newsletter_agreement
                `)
                .eq('user_id', session.user.id)
                .maybeSingle();

            if (error && error.code !== 'PGRST116') {
                logError('Error fetching notification settings', error);
                throw new Error('DATABASE_ERROR');
            }

            // Возвращаем настройки с дефолтными значениями
            return {
                order_status: profile?.notification_order_status ?? true,
                promotions: profile?.notification_promotions ?? true,
                messages: profile?.notification_messages ?? false,
                master_updates: profile?.notification_master_updates ?? true,
                custom_requests: profile?.notification_custom_requests ?? true,
                newsletter_agreement: profile?.newsletter_agreement ?? false
            };
        });

        logInfo('Notification settings fetched', {
            userId: session.user.id,
            duration: Date.now() - startTime
        });

        return NextResponse.json({
            success: true,
            settings,
            meta: {
                cached: Date.now() - startTime < 100,
                timestamp: new Date().toISOString()
            }
        }, { status: 200 });
        
    } catch (error) {
        logError('Error fetching notification settings', error);
        return NextResponse.json({ 
            error: 'Ошибка загрузки настроек',
            settings: getDefaultSettings()
        }, { status: 500 });
    }
}

// PUT - обновить настройки уведомлений
export async function PUT(request: Request) {
    const startTime = Date.now();
    
    try {
        const session = await getServerSession(authOptions);
        
        if (!session?.user) {
            return NextResponse.json({ error: 'Неавторизован' }, { status: 401 });
        }

        // Rate limiting
        const ip = request.headers.get('x-forwarded-for') || 'unknown';
        const rateLimitResult = putLimiter(request);
        if (!rateLimitResult.success) {
            return NextResponse.json({ 
                error: 'Слишком много запросов. Попробуйте через минуту.' 
            }, { status: 429 });
        }

        const body = await request.json();
        
        // Валидация
        const validation = validateSettings(body);
        if (!validation.valid) {
            return NextResponse.json({ error: validation.error }, { status: 400 });
        }

        // Проверяем, существует ли профиль
        const { data: profileExists, error: checkError } = await supabase
            .from('profiles')
            .select('user_id')
            .eq('user_id', session.user.id)
            .maybeSingle();

        if (checkError) {
            logError('Error checking profile existence', checkError);
            return NextResponse.json({ error: 'Ошибка проверки профиля' }, { status: 500 });
        }

        const now = new Date().toISOString();
        let updateError = null;

        // Если профиля нет, создаем
        if (!profileExists) {
            const { error: insertError } = await supabase
                .from('profiles')
                .insert({
                    user_id: session.user.id,
                    notification_order_status: body.orderStatus ?? true,
                    notification_promotions: body.promotions ?? true,
                    notification_messages: body.messages ?? false,
                    newsletter_agreement: body.newsletterAgreement ?? false,
                    created_at: now,
                    updated_at: now
                });

            if (insertError) {
                logError('Error creating profile', insertError);
                return NextResponse.json({ error: 'Ошибка создания профиля' }, { status: 500 });
            }
        } else {
            // Обновляем существующий профиль
            const updateData: ProfileUpdateData = { updated_at: now };
            
            if (body.orderStatus !== undefined) updateData.notification_order_status = body.orderStatus;
            if (body.promotions !== undefined) updateData.notification_promotions = body.promotions;
            if (body.messages !== undefined) updateData.notification_messages = body.messages;
            if (body.newsletterAgreement !== undefined) updateData.newsletter_agreement = body.newsletterAgreement;
            
            // Дополнительные настройки для мастеров
            if (session.user.role === 'master') {
                if (body.master_updates !== undefined) updateData.notification_master_updates = body.master_updates;
                if (body.custom_requests !== undefined) updateData.notification_custom_requests = body.custom_requests;
            }

            const { error: updateErr } = await supabase
                .from('profiles')
                .update(updateData)
                .eq('user_id', session.user.id);

            updateError = updateErr;
        }

        if (updateError) {
            logError('Error updating notification settings', updateError);
            return NextResponse.json({ error: 'Ошибка обновления настроек' }, { status: 500 });
        }

        // Инвалидируем кэш
        invalidateCache(`notification_settings_${session.user.id}`);

        logInfo('Notification settings updated', {
            userId: session.user.id,
            updates: Object.keys(body),
            duration: Date.now() - startTime
        });

        return NextResponse.json({ 
            success: true, 
            message: 'Настройки уведомлений обновлены'
        }, { status: 200 });
        
    } catch (error) {
        logError('Error updating notification settings', error);
        return NextResponse.json({ error: 'Ошибка обновления настроек' }, { status: 500 });
    }
}

// PATCH - быстрое обновление конкретной настройки
export async function PATCH(request: Request) {
    try {
        const session = await getServerSession(authOptions);
        
        if (!session?.user) {
            return NextResponse.json({ error: 'Неавторизован' }, { status: 401 });
        }

        const { setting, value } = await request.json();
        
        const validSettings = ['orderStatus', 'promotions', 'messages', 'masterUpdates', 'customRequests', 'newsletterAgreement'];
        
        if (!setting || !validSettings.includes(setting)) {
            return NextResponse.json({ error: 'Неверный параметр настройки' }, { status: 400 });
        }
        
        if (typeof value !== 'boolean') {
            return NextResponse.json({ error: 'Значение должно быть булевым' }, { status: 400 });
        }

        const columnMap: Record<string, string> = {
            orderStatus: 'notification_order_status',
            promotions: 'notification_promotions',
            messages: 'notification_messages',
            masterUpdates: 'notification_master_updates',
            customRequests: 'notification_custom_requests',
            newsletterAgreement: 'newsletter_agreement'
        };

        const { error } = await supabase
            .from('profiles')
            .update({
                [columnMap[setting]]: value,
                updated_at: new Date().toISOString()
            })
            .eq('user_id', session.user.id);

        if (error) {
            logError('Error updating notification setting', error);
            return NextResponse.json({ error: 'Ошибка обновления' }, { status: 500 });
        }

        // Инвалидируем кэш
        invalidateCache(`notification_settings_${session.user.id}`);

        return NextResponse.json({ 
            success: true, 
            message: 'Настройка обновлена'
        }, { status: 200 });
        
    } catch (error) {
        logError('Error updating notification setting', error);
        return NextResponse.json({ error: 'Ошибка обновления' }, { status: 500 });
    }
}

// Дефолтные настройки
function getDefaultSettings() {
    return {
        order_status: true,
        promotions: true,
        messages: false,
        master_updates: true,
        custom_requests: true,
        newsletter_agreement: false
    };
}