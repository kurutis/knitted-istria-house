// app/api/admin/products/route.ts
import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { supabase } from "@/lib/supabase";

interface ProductUpdateData {
    status: string;
    updated_at: string;
    moderation_comment?: string;
}

export async function GET(request: Request) {
    try {
        const session = await getServerSession(authOptions);
        
        if (!session || session.user?.role !== 'admin') {
            return NextResponse.json({ error: 'Неавторизован' }, { status: 401 });
        }

        // Получаем ВСЕ товары (без фильтрации по статусу)
        const { data: products, error } = await supabase
            .from('products')
            .select(`
                id,
                title,
                description,
                price,
                status,
                category,
                technique,
                size,
                main_image_url,
                created_at,
                views,
                master_id
            `)
            .order('created_at', { ascending: false });

        if (error) {
            console.error('Supabase error:', error);
            return NextResponse.json({ error: 'Ошибка загрузки товаров' }, { status: 500 });
        }

        if (!products || products.length === 0) {
            return NextResponse.json([], { status: 200 });
        }

        // Получаем ID мастеров
        const masterIds = products.map(p => p.master_id).filter(Boolean);
        
        // Получаем данные пользователей (мастеров)
        const userMap = new Map();
        if (masterIds.length > 0) {
            const { data: users } = await supabase
                .from('users')
                .select('id, email')
                .in('id', masterIds);
            
            users?.forEach(u => {
                userMap.set(u.id, u);
            });
        }

        // Получаем профили мастеров
        const profileMap = new Map();
        if (masterIds.length > 0) {
            const { data: profiles } = await supabase
                .from('profiles')
                .select('user_id, full_name')
                .in('user_id', masterIds);
            
            profiles?.forEach(p => {
                profileMap.set(p.user_id, p);
            });
        }

        // Форматируем результат
        const formattedProducts = products.map(product => {
            const user = userMap.get(product.master_id);
            const profile = profileMap.get(product.master_id);
            
            return {
                id: product.id,
                title: product.title || '',
                description: product.description || '',
                price: parseFloat(product.price?.toString() || '0'),
                status: product.status,
                category: product.category || '',
                technique: product.technique || '',
                size: product.size || '',
                main_image_url: product.main_image_url,
                created_at: product.created_at,
                views: product.views || 0,
                master_id: product.master_id,
                master_name: profile?.full_name || user?.email?.split('@')[0] || 'Мастер',
                master_email: user?.email || '',
                images: []
            };
        });

        return NextResponse.json(formattedProducts, { status: 200 });
        
    } catch (error) {
        console.error('Error fetching products:', error);
        return NextResponse.json({ error: 'Ошибка загрузки товаров' }, { status: 500 });
    }
}

export async function PUT(request: Request) {
    try {
        const session = await getServerSession(authOptions);
        
        if (!session || session.user?.role !== 'admin') {
            return NextResponse.json({ error: 'Неавторизован' }, { status: 401 });
        }

        const body = await request.json();
        const { productId, action, reason } = body;

        if (!productId || !action) {
            return NextResponse.json({ error: 'Не указан ID товара или действие' }, { status: 400 });
        }

        // Проверяем существование товара
        const { data: existingProduct, error: checkError } = await supabase
            .from('products')
            .select('id, status, title, master_id')
            .eq('id', productId)
            .single();

        if (checkError || !existingProduct) {
            return NextResponse.json({ error: 'Товар не найден' }, { status: 404 });
        }

        const now = new Date().toISOString();
        let newStatus = '';
        let message = '';

        switch (action) {
            case 'approve':
                if (existingProduct.status !== 'moderation' && existingProduct.status !== 'draft') {
                    return NextResponse.json({ error: 'Товар уже опубликован' }, { status: 400 });
                }
                newStatus = 'active';
                message = 'Товар успешно одобрен и опубликован';
                break;
            case 'reject':
                if (existingProduct.status !== 'moderation') {
                    return NextResponse.json({ error: 'Товар уже отклонён' }, { status: 400 });
                }
                newStatus = 'rejected';
                message = 'Товар отклонен';
                break;
            case 'draft':
                if (existingProduct.status !== 'moderation') {
                    return NextResponse.json({ error: 'Товар уже в черновиках' }, { status: 400 });
                }
                newStatus = 'draft';
                message = 'Товар отправлен на доработку';
                break;
            default:
                return NextResponse.json({ error: 'Неизвестное действие' }, { status: 400 });
        }

        // Обновляем статус товара - используем конкретный тип вместо any
        const updateData: ProductUpdateData = {
            status: newStatus,
            updated_at: now
        };

        if (action === 'reject' && reason) {
            updateData.moderation_comment = reason;
        }

        const { error: updateError } = await supabase
            .from('products')
            .update(updateData)
            .eq('id', productId);

        if (updateError) {
            console.error('Error updating product:', updateError);
            return NextResponse.json({ error: 'Ошибка обновления товара' }, { status: 500 });
        }

        // Отправляем уведомление мастеру
        if (existingProduct.master_id) {
            await supabase
                .from('notifications')
                .insert({
                    user_id: existingProduct.master_id,
                    title: action === 'approve' ? '✅ Товар одобрен' : action === 'reject' ? '❌ Товар отклонен' : '📝 Товар на доработку',
                    message: action === 'approve' 
                        ? `Ваш товар "${existingProduct.title}" успешно прошел модерацию и опубликован!`
                        : action === 'reject'
                        ? `Ваш товар "${existingProduct.title}" не прошел модерацию. Причина: ${reason || 'Не указана'}`
                        : `Ваш товар "${existingProduct.title}" отправлен на доработку. Пожалуйста, внесите необходимые изменения.`,
                    type: 'product_moderation',
                    metadata: { 
                        product_id: productId,
                        product_title: existingProduct.title, 
                        action: action,
                        reason: reason || null,
                        new_status: newStatus
                    },
                    created_at: now,
                    is_read: false
                });
        }

        return NextResponse.json({ 
            success: true, 
            message: message 
        }, { status: 200 });
        
    } catch (error) {
        console.error('Error in PUT:', error);
        return NextResponse.json({ error: 'Ошибка обработки запроса' }, { status: 500 });
    }
}