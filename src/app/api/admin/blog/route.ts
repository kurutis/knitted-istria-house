import { authOptions } from "@/lib/auth"
import { pool } from "@/lib/db"
import { getServerSession } from "next-auth"
import { NextResponse } from "next/server"

export async function GET() {
    let client
    try{
        const session = await getServerSession(authOptions)
        if (!session || session.user?.role !== 'admin'){return NextResponse.json({error: 'Неавторизирован'}, {status: 401})}

        client = await pool.connect()
        const result = await client.query(`SELECT bp.id, bp.title, bp.content, bp.excerpt, bp.category, bp.tags, bp.main_image_url, bp.views_count, bp.likes_count, bp.status, bp.created_at, bp.updated_at, u.id as author_id, u.email as author_email, COALESCE(p.full_name, u.email) as author_name, p.avatar_url as author_avatar, (SELECT json_agg( json_build_object( 'id', bi.id, 'url', bi.image_url, 'sort_order', bi.sort_order) ORDER BY bi.sort_order ) FROM blog_images bi WHERE bi.post_id = bp.id ) as images, ( SELECT COUNT(*) FROM blog_comments bc WHERE bc.post_id = bp.id ) as comments_count FROM blog_posts bp JOIN masters m ON bp.master_id = m.user_id JOIN users u ON m.user_id = u.id LEFT JOIN profiles p ON u.id = p.user_id WHERE bp.status = 'moderation' OR bp.status = 'draft' ORDER BY bp.created_at DESC`)
        return NextResponse.json(result.rows, {status: 200})
    }catch(error: any){
        return NextResponse.json({error: error.message || 'Ошибка загрузки постов'}, {status: 500})
    }finally{
        if (client) client.release()
    }
}

export async function PUT(request:Request) {
    let client
    try{
        const session = await getServerSession(authOptions)
        if (!session || session.user?.role !== 'admin'){return NextResponse.json({error: 'Неавторизирован'}, {status: 401})}
        const body = await request.json
        const {postId, action, reason} = body

        if (!postId || !action){return NextResponse.json({error: 'Неверные параметры'}, {status: 400})}

        client = await pool.connect()
        await client.query('BEGIN')

        switch (action) {
            case 'approve': await client.query(`UPDATE blog_posts SET status = 'published', updated_at = NOW() WHERE id = $1`, [postId])
                break
            case 'reject': await client.query(`UPDATE blog_posts SET status = 'draft', updated_at = NOW() WHERE id = $1`, [postId])
                break
            case 'block': await client.query(`UPDATE blog_posts SET status = 'blocked', updated_at = NOW(), moderation_comment = $2 WHERE id = $1`, [postId, reason || 'Заблокировано модератором'])
                break
            default: 
                await client.query(`ROLLBACK`)
                return NextResponse.json({error: 'Неизвестное действие'}, {status: 400})
        }

        await client.query(`COMMIT`)
        return NextResponse.json({message: 'Действие выполнено успешно'}, {status: 200})
    }catch(error: any){
        if (client) await client.query('ROLLBACK')
        return NextResponse.json({error: error.message || 'Ошибка обработки запроса'}, {status: 500})
    }finally{
        if (client) client.release()
    }
}