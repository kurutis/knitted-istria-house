import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { supabase } from "@/lib/supabase";

// PUT - обновить товар
export async function PUT(
    request: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const session = await getServerSession(authOptions);
        if (!session?.user || session.user?.role !== 'master') {
            return NextResponse.json({ error: 'Неавторизован' }, { status: 401 });
        }

        const { id } = await params;
        const body = await request.json();
        
        const {
            title,
            description,
            price,
            category,
            technique,
            size,
            color,
            care_instructions
        } = body;

        if (!title || !price || !category) {
            return NextResponse.json({ error: 'Заполните обязательные поля' }, { status: 400 });
        }

        // Проверяем, принадлежит ли товар этому мастеру
        const { data: existingProduct, error: checkError } = await supabase
            .from('products')
            .select('master_id')
            .eq('id', id)
            .single();

        if (checkError) {
            if (checkError.code === 'PGRST116') {
                return NextResponse.json({ error: 'Товар не найден' }, { status: 404 });
            }
            return NextResponse.json({ error: 'Ошибка проверки товара' }, { status: 500 });
        }

        if (existingProduct.master_id !== session.user.id) {
            return NextResponse.json({ error: 'У вас нет прав на редактирование этого товара' }, { status: 403 });
        }

        // Обновляем товар
        const { data: updatedProduct, error: updateError } = await supabase
            .from('products')
            .update({
                title,
                description: description || null,
                price,
                category,
                technique: technique || null,
                size: size || null,
                color: color || null,
                care_instructions: care_instructions || null,
                updated_at: new Date().toISOString()
            })
            .eq('id', id)
            .select()
            .single();

        if (updateError) {
            console.error('Error updating product:', updateError);
            return NextResponse.json({ error: 'Ошибка обновления товара' }, { status: 500 });
        }

        return NextResponse.json({ 
            success: true, 
            message: 'Товар успешно обновлен',
            product: updatedProduct
        }, { status: 200 });
        
    } catch (error: any) {
        console.error('Error in PUT /api/master/products/[id]:', error);
        return NextResponse.json({ error: error.message || 'Ошибка обновления товара' }, { status: 500 });
    }
}

// DELETE - удалить товар
export async function DELETE(
    request: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const session = await getServerSession(authOptions);
        if (!session?.user || session.user?.role !== 'master') {
            return NextResponse.json({ error: 'Неавторизован' }, { status: 401 });
        }

        const { id } = await params;

        // Проверяем, принадлежит ли товар этому мастеру
        const { data: existingProduct, error: checkError } = await supabase
            .from('products')
            .select('master_id')
            .eq('id', id)
            .single();

        if (checkError) {
            if (checkError.code === 'PGRST116') {
                return NextResponse.json({ error: 'Товар не найден' }, { status: 404 });
            }
            return NextResponse.json({ error: 'Ошибка проверки товара' }, { status: 500 });
        }

        if (existingProduct.master_id !== session.user.id) {
            return NextResponse.json({ error: 'У вас нет прав на удаление этого товара' }, { status: 403 });
        }

        // Удаляем товар (связанные записи удалятся каскадно)
        const { error: deleteError } = await supabase
            .from('products')
            .delete()
            .eq('id', id);

        if (deleteError) {
            console.error('Error deleting product:', deleteError);
            return NextResponse.json({ error: 'Ошибка удаления товара' }, { status: 500 });
        }

        return NextResponse.json({ 
            success: true, 
            message: 'Товар успешно удален'
        }, { status: 200 });
        
    } catch (error: any) {
        console.error('Error in DELETE /api/master/products/[id]:', error);
        return NextResponse.json({ error: error.message || 'Ошибка удаления товара' }, { status: 500 });
    }
}