import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { pool } from "@/lib/db";
import { writeFile, mkdir } from 'fs/promises';
import path from 'path';
import { existsSync } from 'fs';

export async function POST(request: Request) {
    let client;
    try {
        const session = await getServerSession(authOptions);

        if (!session || session.user?.role !== 'master') {
            return NextResponse.json({ error: 'Неавторизован' }, { status: 401 });
        }

        const formData = await request.formData();
    
        const title = formData.get('title') as string;
        const description = formData.get('description') as string;
        const price = parseFloat(formData.get('price') as string);
        const category = formData.get('category') as string;
        const technique = formData.get('technique') as string;
        const size = formData.get('size') as string;
        const care_instructions = formData.get('care_instructions') as string;
        const color = formData.get('color') as string;
        const yarn_id = formData.get('yarn_id') as string;
        const custom_yarn = formData.get('custom_yarn') as string;
        
        // Получаем изображения
        const images = formData.getAll('images') as File[];

        // Валидация
        if (!title || !price || !category) {
            return NextResponse.json({ error: 'Заполните обязательные поля' }, { status: 400 });
        }

        client = await pool.connect();
        await client.query('BEGIN');

        const masterResult = await client.query(
            `SELECT user_id FROM masters WHERE user_id = $1`,
            [session.user.id]
        );

        if (masterResult.rows.length === 0) {
            return NextResponse.json({ error: 'Мастер не найден' }, { status: 404 });
        }

        const productResult = await client.query(`
            INSERT INTO products (
                master_id, title, description, price, status,
                category, technique, size, care_instructions, color, created_at, updated_at
            ) VALUES ($1, $2, $3, $4, 'moderation', $5, $6, $7, $8, $9, NOW(), NOW())
            RETURNING id
        `, [session.user.id, title, description, price, category, technique, size, care_instructions, color]);

        const productId = productResult.rows[0].id;

        // Сохраняем изображения
        const uploadedImages: string[] = [];
        const uploadDir = path.join(process.cwd(), 'public/uploads/products');

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
            
            const imageUrl = `/uploads/products/${filename}`;
            uploadedImages.push(imageUrl);
            
            await client.query(`
                INSERT INTO product_images (product_id, image_url, sort_order)
                VALUES ($1, $2, $3)
            `, [productId, imageUrl, i]);
        }

        if (uploadedImages.length > 0) {
            await client.query(`
                UPDATE products SET main_image_url = $1 WHERE id = $2
            `, [uploadedImages[0], productId]);
        }

        if (yarn_id === 'custom' && custom_yarn) {
            // Создаем новую пряжу
            const yarnResult = await client.query(`
                INSERT INTO yarn_catalog (name, article, created_at, updated_at)
                VALUES ($1, $2, NOW(), NOW())
                RETURNING id
            `, [custom_yarn, `custom-${Date.now()}`]);
            
            await client.query(`
                INSERT INTO product_yarn (product_id, yarn_id, is_custom)
                VALUES ($1, $2, true)
            `, [productId, yarnResult.rows[0].id]);
        } else if (yarn_id && yarn_id !== 'custom') {
            await client.query(`
                INSERT INTO product_yarn (product_id, yarn_id, is_custom)
                VALUES ($1, $2, false)
            `, [productId, yarn_id]);
        }

        await client.query('COMMIT');

        return NextResponse.json({ 
            success: true, 
            message: 'Товар успешно создан и отправлен на модерацию',
            productId 
        }, { status: 201 });

    } catch (error: any) {
        if (client) await client.query('ROLLBACK');
        console.error('Error creating product:', error);
        return NextResponse.json({ error: error.message || 'Ошибка создания товара' }, { status: 500 });
    } finally {
        if (client) client.release();
    }
}

export async function GET() {
    let client;
    try {
        const session = await getServerSession(authOptions);

        if (!session || session.user?.role !== 'master') {
            return NextResponse.json({ error: 'Неавторизован' }, { status: 401 });
        }

        client = await pool.connect();

        const result = await client.query(`
            SELECT 
                p.*,
                (
                    SELECT json_agg(
                        json_build_object('id', pi.id, 'url', pi.image_url)
                        ORDER BY pi.sort_order
                    )
                    FROM product_images pi
                    WHERE pi.product_id = p.id
                ) as images
            FROM products p
            WHERE p.master_id = $1
            ORDER BY p.created_at DESC
        `, [session.user.id]);

        return NextResponse.json(result.rows, { status: 200 });
    } catch (error: any) {
        console.error('Error fetching products:', error);
        return NextResponse.json({ error: error.message || 'Ошибка загрузки товаров' }, { status: 500 });
    } finally {
        if (client) client.release();
    }
}