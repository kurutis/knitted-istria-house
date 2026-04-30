import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { supabase } from "@/lib/supabase";
import { uploadToS3 } from "@/lib/s3-storage";

export async function GET() {
    try {
        const session = await getServerSession(authOptions);

        if (!session?.user || session.user.role !== 'master') {
            return NextResponse.json({ error: 'Неавторизован' }, { status: 401 });
        }

        const { data: masterData, error } = await supabase
            .from('users')
            .select(`
                id,
                email,
                role,
                profiles!left (
                    full_name,
                    phone,
                    city,
                    address,
                    avatar_url,
                    newsletter_agreement
                ),
                masters!left (
                    description,
                    is_verified,
                    is_partner,
                    rating,
                    total_sales,
                    custom_orders_enabled
                )
            `)
            .eq('id', session.user.id)
            .eq('role', 'master')
            .single();

        if (error) {
            console.error('Supabase error:', error);
            if (error.code === 'PGRST116') {
                return NextResponse.json({ error: 'Мастер не найден' }, { status: 404 });
            }
            return NextResponse.json({ error: 'Ошибка загрузки профиля' }, { status: 500 });
        }

        const profile = {
            id: masterData.id,
            email: masterData.email,
            role: masterData.role,
            fullname: masterData.profiles?.full_name || masterData.email,
            phone: masterData.profiles?.phone || '',
            city: masterData.profiles?.city || '',
            address: masterData.profiles?.address || '',
            avatarUrl: masterData.profiles?.avatar_url || null,
            newsletter_agreement: masterData.profiles?.newsletter_agreement || false,
            description: masterData.masters?.description || '',
            is_verified: masterData.masters?.is_verified || false,
            is_partner: masterData.masters?.is_partner || false,
            rating: masterData.masters?.rating || 0,
            total_sales: masterData.masters?.total_sales || 0,
            custom_orders_enabled: masterData.masters?.custom_orders_enabled || false,
            followers: 0
        };

        return NextResponse.json(profile);
        
    } catch (error) {
        console.error('GET Error:', error);
        return NextResponse.json({ error: 'Ошибка загрузки профиля' }, { status: 500 });
    }
}

export async function PUT(request: Request) {
    try {
        const session = await getServerSession(authOptions);

        if (!session?.user || session.user.role !== 'master') {
            return NextResponse.json({ error: 'Неавторизован' }, { status: 401 });
        }

        const formData = await request.formData();
        
        const fullname = formData.get('fullname') as string || '';
        const phone = formData.get('phone') as string || '';
        const city = formData.get('city') as string || '';
        const address = formData.get('address') as string || '';
        const description = formData.get('description') as string || '';
        const custom_orders_enabled = formData.get('custom_orders_enabled') === 'true';
        const avatarFile = formData.get('avatar') as File | null;

        let avatarUrl: string | null = null;

        if (avatarFile && avatarFile.size > 0) {
            try {
                // Удаляем старый аватар
                const { data: oldProfile } = await supabase
                    .from('profiles')
                    .select('avatar_url')
                    .eq('user_id', session.user.id)
                    .single();

                // Загружаем новый аватар в S3
                avatarUrl = await uploadToS3(avatarFile, 'avatars', session.user.id);
                
                if (!avatarUrl) {
                    console.error('Failed to upload avatar to S3');
                } else {
                    console.log('Avatar uploaded:', avatarUrl);
                }
            } catch (uploadError) {
                console.error('S3 upload error:', uploadError);
                // Не возвращаем ошибку, продолжаем без аватара
            }
        }

        if (!fullname) {
            return NextResponse.json({ error: "Имя обязательно" }, { status: 400 });
        }

        const now = new Date().toISOString();

        const profileUpdateData: any = {
            full_name: fullname,
            phone: phone || null,
            city: city || null,
            address: address || null,
            updated_at: now
        };

        if (avatarUrl) {
            profileUpdateData.avatar_url = avatarUrl;
        }

        const { error: profileError } = await supabase
            .from('profiles')
            .update(profileUpdateData)
            .eq('user_id', session.user.id);

        if (profileError) {
            console.error('Profile update error:', profileError);
            return NextResponse.json({ error: 'Ошибка обновления профиля: ' + profileError.message }, { status: 500 });
        }

        const { error: masterError } = await supabase
            .from('masters')
            .update({
                description: description || null,
                custom_orders_enabled: custom_orders_enabled,
                updated_at: now
            })
            .eq('user_id', session.user.id);

        if (masterError) {
            console.error('Master update error:', masterError);
        }

        return NextResponse.json({ 
            success: true, 
            message: 'Профиль обновлен',
            avatarUrl: avatarUrl
        });
        
    } catch (error) {
        console.error('PUT Error:', error);
        return NextResponse.json({ error: 'Ошибка обновления профиля: ' + String(error) }, { status: 500 });
    }
}