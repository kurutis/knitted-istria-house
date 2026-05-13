// app/api/admin/yarn/[id]/route.ts
import { authOptions } from "@/lib/auth";
import { supabase } from "@/lib/supabase";
import { getServerSession } from "next-auth";
import { NextResponse } from "next/server";

function isValidUUID(uuid: string): boolean {
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    return uuidRegex.test(uuid);
}

export async function PUT(
    request: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const session = await getServerSession(authOptions);

        if (!session || session.user?.role !== 'admin') {
            return NextResponse.json({ error: 'Неавторизован' }, { status: 401 });
        }

        const { id } = await params;
        
        if (!id || !isValidUUID(id)) {
            return NextResponse.json({ error: 'Неверный формат ID' }, { status: 400 });
        }

        const body = await request.json();

        const now = new Date().toISOString();

        const { data: updatedYarn, error } = await supabase
            .from('yarn_catalog')
            .update({
                name: body.name,
                article: body.article,
                brand: body.brand || null,
                color: body.color || null,
                composition: body.composition || null,
                weight_grams: body.weight_grams ? parseFloat(body.weight_grams) : null,
                length_meters: body.length_meters ? parseFloat(body.length_meters) : null,
                price: body.price ? parseFloat(body.price) : null,
                in_stock: body.in_stock ?? true,
                stock_quantity: body.stock_quantity ? parseInt(body.stock_quantity) : 0,
                image_url: body.image_url || null,
                description: body.description || null,
                updated_at: now
            })
            .eq('id', id)
            .select()
            .single();

        if (error) {
            console.error('Error updating yarn:', error);
            return NextResponse.json({ error: 'Ошибка обновления пряжи' }, { status: 500 });
        }

        return NextResponse.json({ 
            success: true, 
            message: 'Пряжа успешно обновлена',
            yarn: updatedYarn
        }, { status: 200 });
        
    } catch (error) {
        console.error('Error in PUT:', error);
        return NextResponse.json({ error: 'Ошибка обновления пряжи' }, { status: 500 });
    }
}

export async function DELETE(
    request: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const session = await getServerSession(authOptions);

        if (!session || session.user?.role !== 'admin') {
            return NextResponse.json({ error: 'Неавторизован' }, { status: 401 });
        }

        const { id } = await params;
        
        if (!id || !isValidUUID(id)) {
            return NextResponse.json({ error: 'Неверный формат ID' }, { status: 400 });
        }

        // Проверяем, используется ли пряжа в товарах
        const { count: usedInProducts } = await supabase
            .from('product_yarn')
            .select('id', { count: 'exact', head: true })
            .eq('yarn_id', id);

        if (usedInProducts && usedInProducts > 0) {
            return NextResponse.json({ 
                error: 'Невозможно удалить пряжу, так как она используется в товарах' 
            }, { status: 400 });
        }

        const { error } = await supabase
            .from('yarn_catalog')
            .delete()
            .eq('id', id);

        if (error) {
            console.error('Error deleting yarn:', error);
            return NextResponse.json({ error: 'Ошибка удаления пряжи' }, { status: 500 });
        }

        return NextResponse.json({ 
            success: true, 
            message: 'Пряжа успешно удалена'
        }, { status: 200 });
        
    } catch (error) {
        console.error('Error in DELETE:', error);
        return NextResponse.json({ error: 'Ошибка удаления пряжи' }, { status: 500 });
    }
}