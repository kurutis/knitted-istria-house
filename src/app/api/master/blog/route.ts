import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { pool } from "@/lib/db";
import { writeFile, mkdir } from 'fs/promises';
import path from 'path';
import { existsSync } from 'fs';

export async function GET() {
    const session = await getServerSession(authOptions);
    if (!session?.user || session.user.role !== 'master') {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    let client;
    try {
        client = await pool.connect();

        const result = await client.query(`
            SELECT 
                bp.*,
                COALESCE(p.full_name, u.email) as author_name,
                p.avatar_url as author_avatar,
                COALESCE(bc.comments_count, 0) as comments_count,
                (
                    SELECT json_agg(
                        json_build_object('id', bi.id, 'url', bi.image_url, 'sort_order', bi.sort_order)
                        ORDER BY bi.sort_order
                    )
                    FROM blog_images bi
                    WHERE bi.post_id = bp.id
                ) as images
            FROM blog_posts bp
            JOIN users u ON bp.master_id = u.id
            LEFT JOIN profiles p ON u.id = p.user_id
            LEFT JOIN (
                SELECT post_id, COUNT(*) as comments_count
                FROM blog_comments
                GROUP BY post_id
            ) bc ON bp.id = bc.post_id
            WHERE bp.master_id = $1
            ORDER BY bp.created_at DESC
        `, [session.user.id]);
        
        return NextResponse.json(result.rows);
    } catch (error) {
        console.error('Error fetching posts:', error);
        return NextResponse.json([], { status: 500 });
    } finally {
        if (client) client.release();
    }
}

export async function POST(request: Request) {
    const session = await getServerSession(authOptions);
    if (!session?.user || session.user.role !== 'master') {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    let client;
    try {
        const formData = await request.formData();
        
        const title = formData.get('title') as string;
        const content = formData.get('content') as string;
        const excerpt = formData.get('excerpt') as string;
        const category = formData.get('category') as string;
        const tags = formData.get('tags') as string;
        const images = formData.getAll('images') as File[];

        if (!title || !content) {
            return NextResponse.json({ error: 'Заголовок и содержание обязательны' }, { status: 400 });
        }

        client = await pool.connect();
        await client.query('BEGIN');

        const result = await client.query(`
            INSERT INTO blog_posts (
                master_id, title, content, excerpt, category, tags, created_at, updated_at
            ) VALUES ($1, $2, $3, $4, $5, $6, NOW(), NOW())
            RETURNING id
        `, [session.user.id, title, content, excerpt || null, category || null, tags ? [tags] : null]);

        const postId = result.rows[0].id;

        if (images.length > 0) {
            const uploadDir = path.join(process.cwd(), 'public/uploads/blog');
            if (!existsSync(uploadDir)) {
                await mkdir(uploadDir, { recursive: true });
            }

            for (let i = 0; i < images.length; i++) {
                const image = images[i];
                const bytes = await image.arrayBuffer();
                const buffer = Buffer.from(bytes);
                
                const timestamp = Date.now();
                const filename = `${timestamp}-${i}-${image.name.replace(/\s/g, '_')}`;
                const filePath = path.join(uploadDir, filename);
                
                await writeFile(filePath, buffer);
                
                const imageUrl = `/uploads/blog/${filename}`;
                
                if (i === 0) {
                    await client.query(`
                        UPDATE blog_posts SET main_image_url = $1 WHERE id = $2
                    `, [imageUrl, postId]);
                }
                
                await client.query(`
                    INSERT INTO blog_images (post_id, image_url, sort_order)
                    VALUES ($1, $2, $3)
                `, [postId, imageUrl, i]);
            }
        }

        await client.query('COMMIT');

        return NextResponse.json({ 
            success: true, 
            message: 'Пост успешно создан',
            postId 
        });
    } catch (error) {
        if (client) await client.query('ROLLBACK');
        console.error('Error creating post:', error);
        return NextResponse.json({ error: 'Ошибка создания поста' }, { status: 500 });
    } finally {
        if (client) client.release();
    }
}