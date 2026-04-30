import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { supabase } from "@/lib/supabase";
import { uploadToS3 } from "@/lib/s3-storage";

export async function GET() {
    const session = await getServerSession(authOptions);
    if (!session?.user || session.user.role !== 'master') {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    try {
        const { data: posts, error } = await supabase
            .from('blog_posts')
            .select(`*, users!inner ( id, email, profiles!left ( full_name, avatar_url ) ), blog_images ( id, image_url, sort_order )`)
            .eq('master_id', session.user.id)
            .order('created_at', { ascending: false });

        if (error) {
            return NextResponse.json([], { status: 500 });
        }

        const formattedPosts = posts?.map(post => ({
            ...post,
            author_name: post.users?.profiles?.full_name || post.users?.email,
            author_avatar: post.users?.profiles?.avatar_url,
            images: post.blog_images?.sort((a, b) => a.sort_order - b.sort_order) || []
        })) || [];

        return NextResponse.json(formattedPosts);
    } catch (error) {
        return NextResponse.json([], { status: 500 });
    }
}

export async function POST(request: Request) {
    const session = await getServerSession(authOptions);
    if (!session?.user || session.user.role !== 'master') {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

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

        const now = new Date().toISOString();

        const { data: newPost, error: insertError } = await supabase
            .from('blog_posts')
            .insert({
                master_id: session.user.id,
                title,
                content,
                excerpt: excerpt || null,
                category: category || null,
                tags: tags ? [tags] : null,
                status: 'draft',
                created_at: now,
                updated_at: now
            })
            .select()
            .single();

        if (insertError) {
            return NextResponse.json({ error: 'Ошибка создания поста' }, { status: 500 });
        }

        const postId = newPost.id;

        for (let i = 0; i < images.length; i++) {
            const imageUrl = await uploadToS3(images[i], 'blog', `${postId}-${i}`);
            if (imageUrl) {
                await supabase
                    .from('blog_images')
                    .insert({ post_id: postId, image_url: imageUrl, sort_order: i });
                
                if (i === 0) {
                    await supabase
                        .from('blog_posts')
                        .update({ main_image_url: imageUrl })
                        .eq('id', postId);
                }
            }
        }

        return NextResponse.json({ success: true, message: 'Пост успешно создан', postId });
    } catch (error) {
        console.error('Error creating post:', error);
        return NextResponse.json({ error: 'Ошибка создания поста' }, { status: 500 });
    }
}