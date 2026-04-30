import { authOptions } from "@/lib/auth";
import { supabase } from "@/lib/supabase";
import { getServerSession } from "next-auth";
import { NextResponse } from "next/server";
import { uploadToS3, deleteFromS3 } from "@/lib/s3-storage";

export async function GET() {
    try {
        const session = await getServerSession(authOptions)

        if (!session || session.user?.role !== 'admin') {
            return NextResponse.json({ error: 'Неавторизован' }, { status: 401 })
        }

        const { data: categories, error } = await supabase
            .from('categories')
            .select('*')
            .order('name', { ascending: true })

        if (error) {
            console.error('Error fetching categories:', error)
            return NextResponse.json({ error: error.message || 'Ошибка загрузки категорий' }, { status: 500 })
        }

        const { data: productCounts, error: countError } = await supabase
            .from('products')
            .select('category', { count: 'exact', head: false })
            .eq('status', 'active')

        const countMap = new Map()
        productCounts?.forEach(product => {
            countMap.set(product.category, (countMap.get(product.category) || 0) + 1)
        })

        const rootCategories: any[] = []
        const categoriesMap = new Map()

        categories?.forEach(cat => {
            categoriesMap.set(cat.id, {
                ...cat,
                products_count: countMap.get(cat.name) || 0,
                subcategories: []
            })
        })

        categories?.forEach(cat => {
            if (cat.parent_category_id && categoriesMap.has(cat.parent_category_id)) {
                const parent = categoriesMap.get(cat.parent_category_id)
                parent.subcategories.push(categoriesMap.get(cat.id))
            } else if (!cat.parent_category_id) {
                rootCategories.push(categoriesMap.get(cat.id))
            }
        })

        return NextResponse.json(rootCategories, { status: 200 })
        
    } catch (error: any) {
        console.error('Error fetching categories:', error)
        return NextResponse.json({ error: error.message || 'Ошибка загрузки категорий' }, { status: 500 })
    }
}

export async function POST(request: Request) {
    try {
        const session = await getServerSession(authOptions)

        if (!session || session.user?.role !== 'admin') {
            return NextResponse.json({ error: 'Неавторизован' }, { status: 401 })
        }

        const formData = await request.formData()
        const name = formData.get('name') as string
        const description = formData.get('description') as string
        const parent_category_id = formData.get('parent_category_id') as string
        const iconFile = formData.get('icon') as File | null

        if (!name) {
            return NextResponse.json({ error: 'Название категории обязательно' }, { status: 400 })
        }

        // Проверяем существование категории
        const { data: existing, error: checkError } = await supabase
            .from('categories')
            .select('id')
            .ilike('name', name)
            .eq('parent_category_id', parent_category_id ? parseInt(parent_category_id) : null)

        if (existing && existing.length > 0) {
            return NextResponse.json({ error: 'Категория с таким названием уже существует' }, { status: 400 })
        }

        let iconUrl: string | null = null

        // Загружаем SVG иконку в S3
        if (iconFile && iconFile.size > 0) {
            iconUrl = await uploadToS3(iconFile, 'category-icons', `${Date.now()}-${name.replace(/\s/g, '-')}`)
        }

        // Создаем категорию
        const { data: newCategory, error: insertError } = await supabase
            .from('categories')
            .insert({
                name,
                description: description || null,
                parent_category_id: parent_category_id ? parseInt(parent_category_id) : null,
                icon_url: iconUrl,
                created_at: new Date().toISOString(),
                updated_at: new Date().toISOString()
            })
            .select()
            .single()

        if (insertError) {
            console.error('Error creating category:', insertError)
            return NextResponse.json({ error: 'Ошибка создания категории' }, { status: 500 })
        }

        return NextResponse.json(newCategory, { status: 201 })
        
    } catch (error: any) {
        console.error('Error creating category:', error)
        return NextResponse.json({ error: error.message || 'Ошибка создания категории' }, { status: 500 })
    }
}

// PUT - обновить категорию
export async function PUT(request: Request) {
    try {
        const session = await getServerSession(authOptions)

        if (!session || session.user?.role !== 'admin') {
            return NextResponse.json({ error: 'Неавторизован' }, { status: 401 })
        }

        const formData = await request.formData()
        const id = formData.get('id') as string
        const name = formData.get('name') as string
        const description = formData.get('description') as string
        const parent_category_id = formData.get('parent_category_id') as string
        const iconFile = formData.get('icon') as File | null
        const existingIconUrl = formData.get('existingIconUrl') as string

        if (!id || !name) {
            return NextResponse.json({ error: 'ID и название категории обязательны' }, { status: 400 })
        }

        // Получаем старую категорию
        const { data: oldCategory } = await supabase
            .from('categories')
            .select('icon_url')
            .eq('id', id)
            .single()

        let iconUrl = existingIconUrl

        // Загружаем новую иконку если есть
        if (iconFile && iconFile.size > 0) {
            // Удаляем старую иконку
            if (oldCategory?.icon_url) {
                await deleteFromS3(oldCategory.icon_url)
            }
            iconUrl = await uploadToS3(iconFile, 'category-icons', `${Date.now()}-${name.replace(/\s/g, '-')}`)
        }

        // Обновляем категорию
        const { data: updatedCategory, error: updateError } = await supabase
            .from('categories')
            .update({
                name,
                description: description || null,
                parent_category_id: parent_category_id ? parseInt(parent_category_id) : null,
                icon_url: iconUrl,
                updated_at: new Date().toISOString()
            })
            .eq('id', id)
            .select()
            .single()

        if (updateError) {
            if (updateError.code === 'PGRST116') {
                return NextResponse.json({ error: 'Категория не найдена' }, { status: 404 })
            }
            console.error('Error updating category:', updateError)
            return NextResponse.json({ error: 'Ошибка обновления категории' }, { status: 500 })
        }

        return NextResponse.json(updatedCategory, { status: 200 })
        
    } catch (error: any) {
        console.error('Error updating category:', error)
        return NextResponse.json({ error: error.message || 'Ошибка обновления категории' }, { status: 500 })
    }
}

// DELETE - удалить категорию
export async function DELETE(request: Request) {
    try {
        const session = await getServerSession(authOptions)

        if (!session || session.user?.role !== 'admin') {
            return NextResponse.json({ error: 'Неавторизован' }, { status: 401 })
        }

        const { searchParams } = new URL(request.url)
        const id = searchParams.get('id')

        if (!id) {
            return NextResponse.json({ error: 'ID категории обязателен' }, { status: 400 })
        }

        // Получаем категорию для удаления иконки
        const { data: category } = await supabase
            .from('categories')
            .select('name, icon_url')
            .eq('id', id)
            .single()

        if (category?.icon_url) {
            await deleteFromS3(category.icon_url)
        }

        // Проверяем, есть ли товары в этой категории
        const { count } = await supabase
            .from('products')
            .select('*', { count: 'exact', head: true })
            .eq('category', category?.name)
            .eq('status', 'active')

        if (count && count > 0) {
            return NextResponse.json({ 
                error: 'Невозможно удалить категорию, так как есть товары в этой категории' 
            }, { status: 400 })
        }

        const { error: deleteError } = await supabase
            .from('categories')
            .delete()
            .eq('id', id)

        if (deleteError) {
            console.error('Error deleting category:', deleteError)
            return NextResponse.json({ error: 'Ошибка удаления категории' }, { status: 500 })
        }

        return NextResponse.json({ message: 'Категория удалена' }, { status: 200 })
        
    } catch (error: any) {
        console.error('Error deleting category:', error)
        return NextResponse.json({ error: error.message || 'Ошибка удаления категории' }, { status: 500 })
    }
}