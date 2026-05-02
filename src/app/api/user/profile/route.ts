import { NextResponse } from "next/server"
import { getServerSession } from "next-auth/next"
import { authOptions } from "@/lib/auth"
import { supabase } from "@/lib/supabase"
import { uploadToS3, deleteFromS3 } from "@/lib/s3-storage"

export async function GET() {
    try {
        const session = await getServerSession(authOptions)
        if (!session?.user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
        }

        const { data: user, error } = await supabase
            .from('users')
            .select(`id, email, profiles!left ( full_name, phone, city, address, avatar_url, newsletter_agreement )`)
            .eq('id', session.user.id)
            .single()

        if (error) {
            return NextResponse.json({ error: "Ошибка загрузки профиля" }, { status: 500 })
        }

        return NextResponse.json({
            fullname: user.profiles?.full_name || '',
            email: user.email || '',
            phone: user.profiles?.phone || '',
            city: user.profiles?.city || '',
            address: user.profiles?.address || '',
            avatarUrl: user.profiles?.avatar_url || null,
            newsletterAgreement: user.profiles?.newsletter_agreement || false,
            role: user.role || 'buyer'  // Добавь это поле
        })
    } catch (error) {
        return NextResponse.json({ error: "Ошибка загрузки профиля" }, { status: 500 })
    }
}

export async function PUT(request: Request) {
    try {
        const session = await getServerSession(authOptions)
        if (!session?.user) {
            return NextResponse.json({ error: "Не авторизован" }, { status: 401 })
        }

        const formData = await request.formData()
        
        const fullname = formData.get('fullname') as string || ''
        const phone = formData.get('phone') as string || ''
        const city = formData.get('city') as string || ''
        const address = formData.get('address') as string || ''
        const newsletterAgreement = formData.get('newsletterAgreement') === 'true'
        const avatarFile = formData.get('avatar') as File | null

        let avatarUrl: string | null = null

        if (avatarFile && avatarFile.size > 0) {
            // Получаем старый аватар
            const { data: oldProfile } = await supabase
                .from('profiles')
                .select('avatar_url')
                .eq('user_id', session.user.id)
                .single()

            if (oldProfile?.avatar_url) {
                await deleteFromS3(oldProfile.avatar_url)
            }

            // Загружаем новый аватар
            avatarUrl = await uploadToS3(avatarFile, 'avatars', session.user.id)
        }

        const profileData: any = {
            full_name: fullname,
            phone: phone || null,
            city: city || null,
            address: address || null,
            newsletter_agreement: newsletterAgreement,
            updated_at: new Date().toISOString()
        }

        if (avatarUrl) {
            profileData.avatar_url = avatarUrl
        }

        await supabase
            .from('profiles')
            .update(profileData)
            .eq('user_id', session.user.id)

        return NextResponse.json({ success: true, message: "Профиль успешно обновлен", avatarUrl })
    } catch (error) {
        console.error("Error updating profile:", error)
        return NextResponse.json({ error: "Ошибка обновления профиля" }, { status: 500 })
    }
}