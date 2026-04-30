import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { supabase } from "@/lib/supabase";

export async function GET(request: Request) {
    const { searchParams } = new URL(request.url);
    const query = searchParams.get('q') || '';
    const session = await getServerSession(authOptions);
    
    if (!query.trim()) {
        return NextResponse.json({ masters: [], posts: [] });
    }

    try {
        const searchQuery = query.trim();
        const searchWords = searchQuery.toLowerCase().split(/\s+/);
        
        // ========================
        // ПОИСК МАСТЕРОВ
        // ========================
        
        // Сначала получаем мастеров с базовой информацией
        let mastersQuery = supabase
            .from('users')
            .select(`
                id,
                email,
                profiles!left (
                    full_name,
                    avatar_url,
                    city
                ),
                masters!left (
                    rating,
                    total_sales,
                    is_verified,
                    is_partner
                ),
                products!left (
                    id,
                    status
                ),
                blog_posts!left (
                    id
                )
            `)
            .eq('role', 'master')
            .limit(10)

        // Поиск по имени или email
        if (searchQuery) {
            mastersQuery = mastersQuery.or(`profiles.full_name.ilike.%${searchQuery}%,email.ilike.%${searchQuery}%,profiles.city.ilike.%${searchQuery}%`)
        }

        const { data: mastersData, error: mastersError } = await mastersQuery

        if (mastersError) {
            console.error('Error searching masters:', mastersError);
        }

        // Получаем подписки пользователя
        let followingSet = new Set()
        if (session?.user?.id) {
            const { data: following } = await supabase
                .from('master_followers')
                .select('master_id')
                .eq('follower_id', session.user.id)

            if (following) {
                followingSet = new Set(following.map(f => f.master_id))
            }
        }

        // Форматируем мастеров
        const masters = mastersData?.map(master => ({
            id: master.id,
            name: master.profiles?.full_name || master.email,
            avatar_url: master.profiles?.avatar_url,
            city: master.profiles?.city,
            products_count: master.products?.filter((p: any) => p.status === 'active').length || 0,
            posts_count: master.blog_posts?.length || 0,
            rating: master.masters?.rating || 0,
            is_verified: master.masters?.is_verified || false,
            is_partner: master.masters?.is_partner || false,
            is_following: followingSet.has(master.id)
        })) || []

        // ========================
        // ПОИСК ПОСТОВ
        // ========================
        
        let postsQuery = supabase
            .from('blog_posts')
            .select(`
                id,
                title,
                content,
                main_image_url,
                created_at,
                master_id,
                views_count,
                likes_count,
                users!inner (
                    id,
                    email,
                    profiles!left (
                        full_name,
                        avatar_url
                    )
                )
            `)
            .eq('status', 'published')
            .limit(20)

        // Поиск по заголовку или содержанию
        if (searchQuery) {
            postsQuery = postsQuery.or(`title.ilike.%${searchQuery}%,content.ilike.%${searchQuery}%`)
        }

        const { data: postsData, error: postsError } = await postsQuery
            .order('created_at', { ascending: false })

        if (postsError) {
            console.error('Error searching posts:', postsError);
        }

        // Получаем лайки пользователя
        let userLikes = new Set()
        if (session?.user?.id && postsData && postsData.length > 0) {
            const postIds = postsData.map(p => p.id)
            const { data: likes } = await supabase
                .from('blog_likes')
                .select('post_id')
                .in('post_id', postIds)
                .eq('user_id', session.user.id)

            if (likes) {
                userLikes = new Set(likes.map(l => l.post_id))
            }
        }

        // Получаем количество комментариев для постов
        let commentsMap = new Map()
        if (postsData && postsData.length > 0) {
            const postIds = postsData.map(p => p.id)
            const { data: comments } = await supabase
                .from('blog_comments')
                .select('post_id')
                .in('post_id', postIds)

            if (comments) {
                comments.forEach(c => {
                    commentsMap.set(c.post_id, (commentsMap.get(c.post_id) || 0) + 1)
                })
            }
        }

        // Форматируем посты с подсветкой
        const posts = postsData?.map(post => {
            let highlightedTitle = post.title;
            let highlightedContent = post.content.substring(0, 500);
            
            searchWords.forEach(keyword => {
                if (keyword.length < 2) return;
                const regex = new RegExp(`(${keyword})`, 'gi');
                highlightedTitle = highlightedTitle.replace(regex, '<mark class="bg-yellow-200 text-gray-900">$1</mark>');
                highlightedContent = highlightedContent.replace(regex, '<mark class="bg-yellow-200 text-gray-900">$1</mark>');
            });
            
            return {
                id: post.id,
                title: post.title,
                content: post.content,
                main_image_url: post.main_image_url,
                created_at: post.created_at,
                master_id: post.master_id,
                master_name: post.users?.profiles?.full_name || post.users?.email,
                master_avatar: post.users?.profiles?.avatar_url,
                views_count: post.views_count || 0,
                likes_count: post.likes_count || 0,
                comments_count: commentsMap.get(post.id) || 0,
                is_liked: session?.user?.id ? userLikes.has(post.id) : false,
                highlighted_title: highlightedTitle,
                highlighted_content: highlightedContent
            }
        }) || []

        return NextResponse.json({
            masters: masters,
            posts: posts,
            query: searchQuery
        })
        
    } catch (error) {
        console.error('Error searching:', error);
        return NextResponse.json({ masters: [], posts: [], error: 'Search failed' }, { status: 500 });
    }
}