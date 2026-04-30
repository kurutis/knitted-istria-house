import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { supabase } from "@/lib/supabase";

export async function PATCH(
    request: Request,
    { params }: { params: Promise<{ productId: string }> }
) {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
        return NextResponse.json({ error: 'Неавторизован' }, { status: 401 });
    }

    const { productId } = await params;
    const { quantity } = await request.json();

    if (!productId || quantity === undefined) {
        return NextResponse.json({ error: 'Неверные параметры' }, { status: 400 });
    }

    try {
        if (quantity <= 0) {
            // Удаляем товар из корзины
            const { error: deleteError } = await supabase
                .from('cart')
                .delete()
                .eq('user_id', session.user.id)
                .eq('product_id', productId)

            if (deleteError) {
                console.error('Error deleting from cart:', deleteError);
                return NextResponse.json({ error: 'Ошибка удаления из корзины' }, { status: 500 });
            }
        } else {
            // Обновляем количество
            const { error: updateError } = await supabase
                .from('cart')
                .update({
                    quantity: quantity,
                    updated_at: new Date().toISOString()
                })
                .eq('user_id', session.user.id)
                .eq('product_id', productId)

            if (updateError) {
                console.error('Error updating cart:', updateError);
                return NextResponse.json({ error: 'Ошибка обновления корзины' }, { status: 500 });
            }
        }

        return NextResponse.json({ success: true });
        
    } catch (error) {
        console.error('Error updating cart:', error);
        return NextResponse.json({ error: 'Ошибка обновления корзины' }, { status: 500 });
    }
}