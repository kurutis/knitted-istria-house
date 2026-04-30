import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { supabase } from "@/lib/supabase";

export async function GET() {
    const session = await getServerSession(authOptions);
    
    try {
        // Получаем посты с данными авторов
        let query = supabase
            .from('blog_posts')
            .select(`
                id,
                title,
                content,
                category,
                tags,
                main_image_url,
                views_count,
                likes_count,
                created_at,
                master_id,
                users!inner (
                    id,
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
                blog_comments!left (
                    id
                ),
                blog_likes!left (
                    user_id
                )
            `)
            .eq('status', 'published')
            .order('created_at', { ascending: false })

        // Если пользователь авторизован, получаем его лайки
        let userLikes: Set<string> = new Set()
        if (session?.user?.id) {
            const { data: likes } = await supabase
                .from('blog_likes')
                .select('post_id')
                .eq('user_id', session.user.id)
            
            if (likes) {
                userLikes = new Set(likes.map(like => like.post_id))
            }
        }

        const { data: posts, error } = await query

        if (error) {
            console.error('Error fetching blog posts:', error)
            return NextResponse.json([], { status: 500 })
        }

        // Форматируем данные
        const formattedPosts = posts?.map(post => ({
            id: post.id,
            title: post.title,
            content: post.content,
            category: post.category,
            tags: post.tags,
            main_image_url: post.main_image_url,
            views_count: post.views_count || 0,
            likes_count: post.likes_count || 0,
            created_at: post.created_at,
            master_id: post.master_id,
            master_name: post.users?.profiles?.full_name || post.users?.email,
            master_avatar: post.users?.profiles?.avatar_url,
            images: post.blog_images?.sort((a: any, b: any) => a.sort_order - b.sort_order) || [],
            comments_count: post.blog_comments?.length || 0,
            is_liked: session?.user?.id ? userLikes.has(post.id) : false
        })) || []

        return NextResponse.json(formattedPosts)
        
    } catch (error) {
        console.error('Error fetching blog posts:', error)
        return NextResponse.json([], { status: 500 })
    }
}