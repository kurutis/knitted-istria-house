import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { supabase } from "@/lib/supabase";

// GET - получить все мастер-классы мастера
export async function GET() {
    const session = await getServerSession(authOptions);
    if (!session?.user || session.user.role !== 'master') {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    try {
        const { data: masterClasses, error } = await supabase
            .from('master_classes')
            .select(`*, master_class_registrations!left ( id, user_id, payment_status, created_at, users!inner ( id, email, profiles!left ( full_name, phone, avatar_url ) ) )`)
            .eq('master_id', session.user.id)
            .order('date_time', { ascending: true });

        if (error) {
            return NextResponse.json([], { status: 500 });
        }

        const formattedClasses = masterClasses?.map(mc => ({
            ...mc,
            registrations: mc.master_class_registrations?.map(reg => ({
                id: reg.id,
                user_id: reg.user_id,
                user_name: reg.users?.profiles?.full_name || reg.users?.email,
                user_email: reg.users?.email,
                user_phone: reg.users?.profiles?.phone,
                payment_status: reg.payment_status,
                created_at: reg.created_at
            })) || []
        })) || [];

        return NextResponse.json(formattedClasses);
    } catch (error) {
        return NextResponse.json([], { status: 500 });
    }
}

// POST - создать новый мастер-класс
export async function POST(request: Request) {
    const session = await getServerSession(authOptions);
    if (!session?.user || session.user.role !== 'master') {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    try {
        const formData = await request.formData();
        const title = formData.get('title') as string;
        const description = formData.get('description') as string;
        const type = formData.get('type') as string;
        const price = parseFloat(formData.get('price') as string) || 0;
        const max_participants = parseInt(formData.get('max_participants') as string) || 10;
        const date_time = formData.get('date_time') as string;
        const duration_minutes = parseInt(formData.get('duration_minutes') as string) || 60;
        const location = formData.get('location') as string;
        const online_link = formData.get('online_link') as string;
        const materials = formData.get('materials') as string;
        const imageFile = formData.get('image') as File | null;

        if (!title || !description || !date_time) {
            return NextResponse.json({ error: 'Заполните обязательные поля' }, { status: 400 });
        }

        const now = new Date().toISOString();

        const { data: newClass, error: insertError } = await supabase
            .from('master_classes')
            .insert({
                master_id: session.user.id,
                title,
                description,
                type,
                status: 'published',
                price,
                max_participants,
                current_participants: 0,
                date_time,
                duration_minutes,
                location: location || null,
                online_link: online_link || null,
                materials: materials || null,
                created_at: now,
                updated_at: now
            })
            .select()
            .single();

        if (insertError) {
            return NextResponse.json({ error: 'Ошибка создания мастер-класса' }, { status: 500 });
        }

        const classId = newClass.id;

        if (imageFile && imageFile.size > 0) {
            const imageUrl = await uploadToS3(imageFile, 'classes', classId);
            if (imageUrl) {
                await supabase
                    .from('master_classes')
                    .update({ image_url: imageUrl })
                    .eq('id', classId);
            }
        }

        return NextResponse.json({ success: true, id: classId, message: 'Мастер-класс создан' });
    } catch (error) {
        return NextResponse.json({ error: 'Ошибка создания мастер-класса' }, { status: 500 });
    }
}

// PUT - обновить мастер-класс
export async function PUT(request: Request) {
    const session = await getServerSession(authOptions);
    if (!session?.user || session.user.role !== 'master') {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    try {
        const formData = await request.formData();
        const classId = formData.get('id') as string;
        const title = formData.get('title') as string;
        const description = formData.get('description') as string;
        const type = formData.get('type') as string;
        const price = parseFloat(formData.get('price') as string) || 0;
        const max_participants = parseInt(formData.get('max_participants') as string) || 10;
        const date_time = formData.get('date_time') as string;
        const duration_minutes = parseInt(formData.get('duration_minutes') as string) || 60;
        const location = formData.get('location') as string;
        const online_link = formData.get('online_link') as string;
        const materials = formData.get('materials') as string;
        const imageFile = formData.get('image') as File | null;

        if (!classId || !title || !description || !date_time) {
            return NextResponse.json({ error: 'Заполните обязательные поля' }, { status: 400 });
        }

        // Проверяем, принадлежит ли мастер-класс мастеру
        const { data: existing, error: checkError } = await supabase
            .from('master_classes')
            .select('master_id')
            .eq('id', classId)
            .single()

        if (checkError || existing?.master_id !== session.user.id) {
            return NextResponse.json({ error: 'Мастер-класс не найден' }, { status: 404 });
        }

        // Обновляем данные
        const updateData: any = {
            title,
            description,
            type,
            price,
            max_participants,
            date_time,
            duration_minutes,
            location: location || null,
            online_link: online_link || null,
            materials: materials || null,
            updated_at: new Date().toISOString()
        }

        const { error: updateError } = await supabase
            .from('master_classes')
            .update(updateData)
            .eq('id', classId)

        if (updateError) {
            console.error('Error updating master class:', updateError);
            return NextResponse.json({ error: 'Ошибка обновления мастер-класса' }, { status: 500 });
        }

        // Обновляем изображение
        if (imageFile && imageFile.size > 0) {
            // Удаляем старое изображение
            const { data: oldClass } = await supabase
                .from('master_classes')
                .select('image_url')
                .eq('id', classId)
                .single()

            if (oldClass?.image_url) {
                const oldPath = oldClass.image_url.split('/classes/')[1]
                if (oldPath) {
                    await supabase.storage.from('classes').remove([oldPath])
                }
            }

            // Загружаем новое изображение
            const fileExt = imageFile.name.split('.').pop();
            const fileName = `${classId}/${Date.now()}.${fileExt}`;
            
            const { error: uploadError } = await supabase.storage
                .from('classes')
                .upload(fileName, imageFile, { cacheControl: '3600' })

            if (!uploadError) {
                const { data: { publicUrl } } = supabase.storage
                    .from('classes')
                    .getPublicUrl(fileName)
                
                await supabase
                    .from('master_classes')
                    .update({ image_url: publicUrl })
                    .eq('id', classId)
            }
        }

        return NextResponse.json({ success: true, message: 'Мастер-класс обновлен' })
        
    } catch (error) {
        console.error('Error updating master class:', error);
        return NextResponse.json({ error: 'Ошибка обновления мастер-класса' }, { status: 500 });
    }
}

// DELETE - удалить мастер-класс
export async function DELETE(request: Request) {
    const session = await getServerSession(authOptions);
    if (!session?.user || session.user.role !== 'master') {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const classId = searchParams.get('id');

    if (!classId) {
        return NextResponse.json({ error: 'ID мастер-класса обязателен' }, { status: 400 });
    }

    try {
        // Проверяем, принадлежит ли мастер-класс мастеру
        const { data: existing, error: checkError } = await supabase
            .from('master_classes')
            .select('master_id, image_url')
            .eq('id', classId)
            .single()

        if (checkError || existing?.master_id !== session.user.id) {
            return NextResponse.json({ error: 'Мастер-класс не найден' }, { status: 404 });
        }

        // Удаляем изображение из Storage
        if (existing?.image_url) {
            const oldPath = existing.image_url.split('/classes/')[1]
            if (oldPath) {
                await supabase.storage.from('classes').remove([oldPath])
            }
        }

        // Удаляем папку с изображениями
        await supabase.storage.from('classes').remove([`${classId}`])

        // Удаляем мастер-класс (регистрации удалятся каскадно)
        const { error: deleteError } = await supabase
            .from('master_classes')
            .delete()
            .eq('id', classId)

        if (deleteError) {
            console.error('Error deleting master class:', deleteError);
            return NextResponse.json({ error: 'Ошибка удаления мастер-класса' }, { status: 500 });
        }

        return NextResponse.json({ success: true, message: 'Мастер-класс удален' })
        
    } catch (error) {
        console.error('Error deleting master class:', error);
        return NextResponse.json({ error: 'Ошибка удаления мастер-класса' }, { status: 500 });
    }
}