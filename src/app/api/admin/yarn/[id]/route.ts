// src/app/api/admin/yarn/[id]/route.ts
import { authOptions } from "@/lib/auth";
import { supabase } from "@/lib/supabase";
import { getServerSession } from "next-auth";
import { NextResponse } from "next/server";

export async function GET(
    request: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const session = await getServerSession(authOptions)

        if (!session || session.user?.role !== 'admin') {
            return NextResponse.json({ error: 'Неавторизован' }, { status: 401 })
        }

        const { id } = await params

        const { data: yarn, error } = await supabase
            .from('yarn_catalog')
            .select('*')
            .eq('id', id)
            .single()

        if (error) {
            if (error.code === 'PGRST116') {
                return NextResponse.json({ error: 'Пряжа не найдена' }, { status: 404 })
            }
            return NextResponse.json({ error: error.message || 'Ошибка загрузки пряжи' }, { status: 500 })
        }

        return NextResponse.json(yarn, { status: 200 })
        
    } catch (error: any) {
        return NextResponse.json({ error: error.message || 'Ошибка загрузки пряжи' }, { status: 500 })
    }
}

export async function PUT(
    request: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const session = await getServerSession(authOptions)

        if (!session || session.user?.role !== 'admin') {
            return NextResponse.json({ error: 'Неавторизован' }, { status: 401 })
        }

        const { id } = await params
        const body = await request.json()

        // Убираем id из тела запроса, если он там есть
        const { id: _, ...updateData } = body
        
        // Добавляем updated_at
        updateData.updated_at = new Date().toISOString()

        const { data: updatedYarn, error } = await supabase
            .from('yarn_catalog')
            .update(updateData)
            .eq('id', id)
            .select()
            .single()

        if (error) {
            if (error.code === 'PGRST116') {
                return NextResponse.json({ error: 'Пряжа не найдена' }, { status: 404 })
            }
            return NextResponse.json({ error: error.message || 'Ошибка обновления пряжи' }, { status: 500 })
        }

        return NextResponse.json(updatedYarn, { status: 200 })
        
    } catch (error: any) {
        return NextResponse.json({ error: error.message || 'Ошибка обновления пряжи' }, { status: 500 })
    }
}

export async function DELETE(
    request: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const session = await getServerSession(authOptions)

        if (!session || session.user?.role !== 'admin') {
            return NextResponse.json({ error: 'Неавторизован' }, { status: 401 })
        }

        const { id } = await params

        // Проверяем, используется ли пряжа в товарах
        const { data: usedInProducts, error: checkError } = await supabase
            .from('product_yarn')
            .select('id', { count: 'exact', head: true })
            .eq('yarn_id', id)

        if (checkError) {
            console.error('Error checking product_yarn:', checkError)
            return NextResponse.json({ error: 'Ошибка проверки использования пряжи' }, { status: 500 })
        }

        if (usedInProducts && usedInProducts > 0) {
            return NextResponse.json({ 
                error: 'Невозможно удалить пряжу, так как она используется в товарах' 
            }, { status: 400 })
        }

        // Удаляем пряжу
        const { error: deleteError } = await supabase
            .from('yarn_catalog')
            .delete()
            .eq('id', id)

        if (deleteError) {
            if (deleteError.code === 'PGRST116') {
                return NextResponse.json({ error: 'Пряжа не найдена' }, { status: 404 })
            }
            return NextResponse.json({ error: deleteError.message || 'Ошибка удаления пряжи' }, { status: 500 })
        }

        return NextResponse.json({ message: 'Пряжа удалена' }, { status: 200 })
        
    } catch (error: any) {
        return NextResponse.json({ error: error.message || 'Ошибка удаления пряжи' }, { status: 500 })
    }
}