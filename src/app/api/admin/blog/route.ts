import { authOptions } from "@/lib/auth"
import { supabase } from "@/lib/supabase"
import { getServerSession } from "next-auth"
import { NextResponse } from "next/server"

export async function GET() {
    try {
        const session = await getServerSession(authOptions)
        if (!session || session.user?.role !== 'admin') {
            return NextResponse.json({ error: 'Неавторизирован' }, { status: 401 })
        }

        // Получаем посты на модерации или черновики
        const { data: posts, error } = await supabase
            .from('blog_posts')
            .select(`
                id,
                title,
                content,
                excerpt,
                category,
                tags,
                main_image_url,
                views_count,
                likes_count,
                status,
                created_at,
                updated_at,
                master_id,
                users!inner (
                    email,
                    profiles!left (
                        full_name,
                        avatar_url
                    )
                ),
                blog_images (
                    id,
                    image_url,
                    sort_order
                ),
                blog_comments (count)
            `)
            .in('status', ['moderation', 'draft'])
            .order('created_at', { ascending: false })

        if (error) {
            console.error('Supabase error:', error)
            return NextResponse.json({ error: 'Ошибка загрузки постов' }, { status: 500 })
        }

        // Форматируем данные
        const formattedPosts = posts?.map(post => ({
            id: post.id,
            title: post.title,
            content: post.content,
            excerpt: post.excerpt,
            category: post.category,
            tags: post.tags,
            main_image_url: post.main_image_url,
            views_count: post.views_count,
            likes_count: post.likes_count,
            status: post.status,
            created_at: post.created_at,
            updated_at: post.updated_at,
            author_id: post.master_id,
            author_email: post.users?.email,
            author_name: post.users?.profiles?.full_name || post.users?.email,
            author_avatar: post.users?.profiles?.avatar_url,
            images: post.blog_images?.sort((a, b) => a.sort_order - b.sort_order) || [],
            comments_count: post.blog_comments?.length || 0
        })) || []

        return NextResponse.json(formattedPosts, { status: 200 })
        
    } catch (error: any) {
        console.error('Error:', error)
        return NextResponse.json({ error: error.message || 'Ошибка загрузки постов' }, { status: 500 })
    }
}

export async function PUT(request: Request) {
    try {
        const session = await getServerSession(authOptions)
        if (!session || session.user?.role !== 'admin') {
            return NextResponse.json({ error: 'Неавторизирован' }, { status: 401 })
        }

        const body = await request.json()
        const { postId, action, reason } = body

        if (!postId || !action) {
            return NextResponse.json({ error: 'Неверные параметры' }, { status: 400 })
        }

        let newStatus = ''
        let updateData: any = {
            updated_at: new Date().toISOString()
        }

        switch (action) {
            case 'approve':
                newStatus = 'published'
                updateData.status = newStatus
                break
            case 'reject':
                newStatus = 'draft'
                updateData.status = newStatus
                break
            case 'block':
                newStatus = 'blocked'
                updateData.status = newStatus
                updateData.moderation_comment = reason || 'Заблокировано модератором'
                break
            default:
                return NextResponse.json({ error: 'Неизвестное действие' }, { status: 400 })
        }

        // Обновляем статус поста
        const { error } = await supabase
            .from('blog_posts')
            .update(updateData)
            .eq('id', postId)

        if (error) {
            console.error('Supabase error:', error)
            return NextResponse.json({ error: 'Ошибка обработки запроса' }, { status: 500 })
        }

        return NextResponse.json({ message: 'Действие выполнено успешно' }, { status: 200 })
        
    } catch (error: any) {
        console.error('Error:', error)
        return NextResponse.json({ error: error.message || 'Ошибка обработки запроса' }, { status: 500 })
    }
}