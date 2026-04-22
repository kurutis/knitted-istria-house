import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { pool } from "@/lib/db";

export async function GET(request: Request) {
    const { searchParams } = new URL(request.url);
    const query = searchParams.get('q') || '';
    const session = await getServerSession(authOptions);
    
    if (!query.trim()) {
        return NextResponse.json({ masters: [], posts: [] });
    }

    let client;
    try {
        client = await pool.connect();

        const searchQuery = query.trim();
        
        // Нормализация запроса для поиска с опечатками
        // Разбиваем на слова для лучшего поиска
        const searchWords = searchQuery.split(/\s+/);
        
        // Построение условий для поиска с опечатками
        const buildFuzzyCondition = (column: string, words: string[]) => {
            return words.map(word => {
                if (word.length < 2) return '';
                return `(${column} % $${word} OR ${column} ILIKE $${word} OR word_similarity(${column}, $${word}) > 0.3)`;
            }).filter(Boolean).join(' OR ');
        };

        // Поиск мастеров с поддержкой опечаток
        const mastersResult = await client.query(`
            SELECT 
                u.id,
                COALESCE(p.full_name, u.email) as name,
                p.avatar_url,
                p.city,
                COUNT(DISTINCT pr.id) as products_count,
                COUNT(DISTINCT bp.id) as posts_count,
                EXISTS(
                    SELECT 1 FROM follows f 
                    WHERE f.follower_id = $2 AND f.following_id = u.id
                ) as is_following,
                GREATEST(
                    similarity(COALESCE(p.full_name, u.email), $1),
                    similarity(COALESCE(p.city, ''), $1),
                    similarity(u.email, $1),
                    word_similarity(COALESCE(p.full_name, u.email), $1),
                    word_similarity(COALESCE(p.city, ''), $1)
                ) as relevance
            FROM users u
            LEFT JOIN profiles p ON u.id = p.user_id
            LEFT JOIN products pr ON u.id = pr.master_id AND pr.status = 'active'
            LEFT JOIN blog_posts bp ON u.id = bp.master_id
            WHERE u.role = 'master'
                AND (
                    -- Оператор % для fuzzy поиска
                    COALESCE(p.full_name, u.email) % $1
                    OR COALESCE(p.city, '') % $1
                    OR u.email % $1
                    -- word_similarity для поиска похожих слов
                    OR word_similarity(COALESCE(p.full_name, u.email), $1) > 0.3
                    OR word_similarity(COALESCE(p.city, ''), $1) > 0.3
                    -- Дополнительно для длинных запросов
                    OR similarity(COALESCE(p.full_name, u.email), $1) > 0.2
                )
            GROUP BY u.id, p.full_name, p.avatar_url, p.city, u.email
            ORDER BY relevance DESC, name ASC
            LIMIT 10
        `, [searchQuery, session?.user?.id || null]);

        // Поиск постов с поддержкой опечаток
        const postsResult = await client.query(`
            SELECT 
                bp.id,
                bp.title,
                bp.content,
                bp.main_image_url,
                bp.created_at,
                bp.master_id,
                COALESCE(p.full_name, u.email) as master_name,
                p.avatar_url as master_avatar,
                COALESCE(l.likes_count, 0) as likes_count,
                COALESCE(c.comments_count, 0) as comments_count,
                EXISTS(
                    SELECT 1 FROM blog_likes bl 
                    WHERE bl.post_id = bp.id AND bl.user_id = $2
                ) as is_liked,
                GREATEST(
                    similarity(bp.title, $1),
                    similarity(bp.content, $1),
                    word_similarity(bp.title, $1),
                    word_similarity(bp.content, $1)
                ) as relevance
            FROM blog_posts bp
            JOIN users u ON bp.master_id = u.id
            LEFT JOIN profiles p ON u.id = p.user_id
            LEFT JOIN (
                SELECT post_id, COUNT(*) as likes_count
                FROM blog_likes
                GROUP BY post_id
            ) l ON bp.id = l.post_id
            LEFT JOIN (
                SELECT post_id, COUNT(*) as comments_count
                FROM blog_comments
                GROUP BY post_id
            ) c ON bp.id = c.post_id
            WHERE (
                bp.title % $1
                OR bp.content % $1
                OR word_similarity(bp.title, $1) > 0.3
                OR word_similarity(bp.content, $1) > 0.3
                OR similarity(bp.title, $1) > 0.2
                OR similarity(bp.content, $1) > 0.2
            )
            ORDER BY relevance DESC, bp.created_at DESC
            LIMIT 20
        `, [searchQuery, session?.user?.id || null]);

        // Подсветка слов
        const postsWithHighlight = postsResult.rows.map(post => {
            let highlightedTitle = post.title;
            let highlightedContent = post.content.substring(0, 500);
            
            const keywords = searchQuery.toLowerCase().split(/\s+/);
            
            keywords.forEach(keyword => {
                if (keyword.length < 2) return;
                // Экранируем спецсимволы
                const escapedKeyword = keyword.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
                const regex = new RegExp(`(${escapedKeyword})`, 'gi');
                highlightedTitle = highlightedTitle.replace(regex, '<mark class="bg-yellow-200 text-gray-900">$1</mark>');
                highlightedContent = highlightedContent.replace(regex, '<mark class="bg-yellow-200 text-gray-900">$1</mark>');
            });
            
            return {
                ...post,
                highlighted_title: highlightedTitle,
                highlighted_content: highlightedContent
            };
        });

        return NextResponse.json({
            masters: mastersResult.rows,
            posts: postsWithHighlight,
            query: searchQuery
        });
    } catch (error) {
        console.error('Error searching:', error);
        return NextResponse.json({ masters: [], posts: [], error: 'Search failed' }, { status: 500 });
    } finally {
        if (client) client.release();
    }
}