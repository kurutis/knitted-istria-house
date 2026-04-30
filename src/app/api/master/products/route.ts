import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { supabase } from "@/lib/supabase";
import { uploadToS3 } from "@/lib/s3-storage";

export async function POST(request: Request) {
    try {
        console.log('=== START CREATE PRODUCT ===');
        
        const session = await getServerSession(authOptions);
        console.log('Session:', session?.user?.id);
        
        if (!session?.user || session.user?.role !== 'master') {
            return NextResponse.json({ error: 'Неавторизован' }, { status: 401 });
        }

        const formData = await request.formData();
        
        const title = formData.get('title') as string;
        const price = parseFloat(formData.get('price') as string);
        const category = formData.get('category') as string;
        const images = formData.getAll('images') as File[];
        
        console.log('Product data:', { title, price, category, imagesCount: images.length });

        if (!title || !price || !category) {
            return NextResponse.json({ error: 'Заполните обязательные поля' }, { status: 400 });
        }

        if (images.length === 0) {
            return NextResponse.json({ error: 'Добавьте хотя бы одно изображение' }, { status: 400 });
        }

        const now = new Date().toISOString();

        // Создаем товар
        console.log('Creating product in Supabase...');
        const { data: product, error: productError } = await supabase
            .from('products')
            .insert({
                master_id: session.user.id,
                title,
                description: formData.get('description') as string || null,
                price,
                status: 'moderation',
                category,
                technique: formData.get('technique') as string || null,
                size: formData.get('size') as string || null,
                care_instructions: formData.get('care_instructions') as string || null,
                color: formData.get('color') as string || null,
                created_at: now,
                updated_at: now
            })
            .select()
            .single();

        if (productError) {
            console.error('Product creation error:', productError);
            return NextResponse.json({ error: 'Ошибка создания товара: ' + productError.message }, { status: 500 });
        }

        console.log('Product created:', product.id);

        const productId = product.id;
        const uploadedImageUrls: string[] = [];

        // Загружаем изображения в S3
        console.log('Uploading images to S3...');
        for (let i = 0; i < images.length; i++) {
            try {
                const image = images[i];
                console.log(`Uploading image ${i}:`, image.name, image.size);
                const imageUrl = await uploadToS3(image, 'products', `${productId}-${i}`);
                if (imageUrl) {
                    uploadedImageUrls.push(imageUrl);
                    console.log(`Image ${i} uploaded:`, imageUrl);
                    await supabase
                        .from('product_images')
                        .insert({ 
                            product_id: productId, 
                            image_url: imageUrl, 
                            sort_order: i 
                        });
                }
            } catch (uploadError) {
                console.error(`Error uploading image ${i}:`, uploadError);
            }
        }

        if (uploadedImageUrls.length > 0) {
            await supabase
                .from('products')
                .update({ main_image_url: uploadedImageUrls[0] })
                .eq('id', productId);
        }

        console.log('Product created successfully!');
        return NextResponse.json({ 
            success: true, 
            message: 'Товар успешно создан и отправлен на модерацию',
            productId 
        }, { status: 201 });
        
    } catch (error: any) {
        console.error('Error in POST /api/master/products:', error);
        return NextResponse.json({ 
            error: error.message || 'Ошибка создания товара' 
        }, { status: 500 });
    }
}

export async function GET() {
    try {
        const session = await getServerSession(authOptions);
        if (!session || session.user?.role !== 'master') {
            return NextResponse.json({ error: 'Неавторизован' }, { status: 401 });
        }

        const { data: products, error } = await supabase
            .from('products')
            .select(`
                *,
                product_images (
                    id,
                    image_url,
                    sort_order
                ),
                product_yarn (
                    yarn_id,
                    is_custom,
                    yarn_catalog (
                        id,
                        name,
                        article,
                        brand
                    )
                )
            `)
            .eq('master_id', session.user.id)
            .order('created_at', { ascending: false });

        if (error) {
            console.error('Error fetching products:', error);
            // ✅ Всегда возвращаем массив, даже при ошибке
            return NextResponse.json([], { status: 200 });
        }

        // ✅ Убеждаемся, что products - массив
        const productsArray = products || []
        
        const formattedProducts = productsArray.map((product: any) => ({
            ...product,
            images: product.product_images?.sort((a: any, b: any) => a.sort_order - b.sort_order) || [],
            yarns: product.product_yarn?.map((py: any) => py.yarn_catalog) || []
        }))

        return NextResponse.json(formattedProducts, { status: 200 });
        
    } catch (error: any) {
        console.error('Error in GET /api/master/products:', error);
        // ✅ Всегда возвращаем массив, даже при ошибке
        return NextResponse.json([], { status: 200 });
    }
}