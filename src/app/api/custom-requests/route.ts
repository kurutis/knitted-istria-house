import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { supabase } from "@/lib/supabase";

export async function POST(request: Request) {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
        return NextResponse.json({ error: 'Неавторизован' }, { status: 401 });
    }

    const { masterId, name, email, description, budget } = await request.json();

    if (!masterId || !name || !email || !description) {
        return NextResponse.json({ error: 'Заполните обязательные поля' }, { status: 400 });
    }

    try {
        // Проверяем, существует ли мастер
        const { data: master, error: masterError } = await supabase
            .from('masters')
            .select('user_id, custom_orders_enabled')
            .eq('user_id', masterId)
            .maybeSingle()

        if (masterError) {
            console.error('Error checking master:', masterError);
            return NextResponse.json({ error: 'Ошибка проверки мастера' }, { status: 500 });
        }

        if (!master) {
            return NextResponse.json({ error: 'Мастер не найден' }, { status: 404 });
        }

        // Проверяем, принимает ли мастер индивидуальные заказы
        if (master.custom_orders_enabled === false) {
            return NextResponse.json({ error: 'Мастер не принимает индивидуальные заказы' }, { status: 400 });
        }

        // Создаем запрос
        const { data: customRequest, error: insertError } = await supabase
            .from('custom_requests')
            .insert({
                master_id: masterId,
                user_id: session.user.id,
                buyer_name: name,
                buyer_email: email,
                description: description,
                budget: budget || null,
                status: 'pending',
                created_at: new Date().toISOString()
            })
            .select()
            .single()

        if (insertError) {
            console.error('Error creating custom request:', insertError);
            return NextResponse.json({ error: 'Ошибка отправки запроса' }, { status: 500 });
        }

        // Создаем уведомление для мастера
        const { error: notificationError } = await supabase
            .from('notifications')
            .insert({
                user_id: masterId,
                title: 'Новый индивидуальный заказ',
                message: `Пользователь ${name} отправил запрос на индивидуальный заказ`,
                type: 'custom_request',
                metadata: { request_id: customRequest.id },
                created_at: new Date().toISOString()
            })

        if (notificationError) {
            console.error('Error creating notification:', notificationError);
            // Не возвращаем ошибку, так как запрос уже создан
        }

        return NextResponse.json({ 
            success: true, 
            message: 'Запрос отправлен',
            requestId: customRequest.id
        })
        
    } catch (error) {
        console.error('Error creating custom request:', error);
        return NextResponse.json({ error: 'Ошибка отправки запроса' }, { status: 500 });
    }
}

// GET - получить запросы пользователя
export async function GET(request: Request) {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
        return NextResponse.json({ error: 'Неавторизован' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const masterId = searchParams.get('masterId');
    const status = searchParams.get('status');

    try {
        let query = supabase
            .from('custom_requests')
            .select(`
                *,
                users!user_id (
                    id,
                    email,
                    profiles!left (
                        full_name,
                        avatar_url
                    )
                ),
                masters!master_id (
                    user_id,
                    users!inner (
                        id,
                        email,
                        profiles!left (
                            full_name,
                            avatar_url
                        )
                    )
                )
            `)

        // Если запрос для мастера (просмотр входящих)
        if (masterId) {
            query = query.eq('master_id', masterId)
        } else {
            // Если запрос для покупателя (просмотр своих запросов)
            query = query.eq('user_id', session.user.id)
        }

        if (status) {
            query = query.eq('status', status)
        }

        const { data: requests, error } = await query
            .order('created_at', { ascending: false })

        if (error) {
            console.error('Error fetching custom requests:', error);
            return NextResponse.json([], { status: 500 });
        }

        // Форматируем данные
        const formattedRequests = requests?.map(req => ({
            id: req.id,
            master_id: req.master_id,
            user_id: req.user_id,
            buyer_name: req.buyer_name,
            buyer_email: req.buyer_email,
            description: req.description,
            budget: req.budget,
            status: req.status,
            created_at: req.created_at,
            master_name: req.masters?.users?.profiles?.full_name || req.masters?.users?.email,
            master_avatar: req.masters?.users?.profiles?.avatar_url,
            user_name: req.users?.profiles?.full_name || req.users?.email
        })) || []

        return NextResponse.json(formattedRequests)
        
    } catch (error) {
        console.error('Error fetching custom requests:', error);
        return NextResponse.json([], { status: 500 });
    }
}

// PUT - обновить статус запроса (для мастера)
export async function PUT(request: Request) {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
        return NextResponse.json({ error: 'Неавторизован' }, { status: 401 });
    }

    const { requestId, status, response } = await request.json();

    if (!requestId || !status) {
        return NextResponse.json({ error: 'ID запроса и статус обязательны' }, { status: 400 });
    }

    if (!['pending', 'accepted', 'rejected', 'completed'].includes(status)) {
        return NextResponse.json({ error: 'Неверный статус' }, { status: 400 });
    }

    try {
        // Проверяем, что пользователь является мастером для этого запроса
        const { data: customRequest, error: checkError } = await supabase
            .from('custom_requests')
            .select('master_id, user_id, buyer_name')
            .eq('id', requestId)
            .single()

        if (checkError) {
            if (checkError.code === 'PGRST116') {
                return NextResponse.json({ error: 'Запрос не найден' }, { status: 404 });
            }
            return NextResponse.json({ error: 'Ошибка проверки запроса' }, { status: 500 });
        }

        if (customRequest.master_id !== session.user.id) {
            return NextResponse.json({ error: 'Доступ запрещен' }, { status: 403 });
        }

        // Обновляем статус
        const updateData: any = {
            status: status,
            updated_at: new Date().toISOString()
        }

        if (response) {
            updateData.response = response
        }

        const { error: updateError } = await supabase
            .from('custom_requests')
            .update(updateData)
            .eq('id', requestId)

        if (updateError) {
            console.error('Error updating request:', updateError);
            return NextResponse.json({ error: 'Ошибка обновления статуса' }, { status: 500 });
        }

        // Создаем уведомление для покупателя
        let statusText = ''
        switch (status) {
            case 'accepted':
                statusText = 'принял'
                break
            case 'rejected':
                statusText = 'отклонил'
                break
            case 'completed':
                statusText = 'завершил'
                break
            default:
                statusText = 'обновил'
        }

        await supabase
            .from('notifications')
            .insert({
                user_id: customRequest.user_id,
                title: 'Статус индивидуального заказа обновлен',
                message: `Мастер ${statusText} ваш запрос на индивидуальный заказ`,
                type: 'custom_request',
                metadata: { request_id: requestId, status: status },
                created_at: new Date().toISOString()
            })

        return NextResponse.json({ success: true, message: 'Статус обновлен' })
        
    } catch (error) {
        console.error('Error updating custom request:', error);
        return NextResponse.json({ error: 'Ошибка обновления статуса' }, { status: 500 });
    }
}