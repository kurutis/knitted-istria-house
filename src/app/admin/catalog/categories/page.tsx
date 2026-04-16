'use client'

import { useSession } from "next-auth/react"
import { useRouter } from "next/navigation"
import { useEffect, useState } from "react"

interface Subcategory {
    id: number
    name: string
    description: string
    products_count: number
}

interface Category {
    id: number
    name: string
    description: string
    parent_category_id: number | null
    products_count: number
    subcategories: Subcategory[]
    created_at: string
    updated_at: string
}

export default function AdminCategoriesPage() {
    const { data: session, status } = useSession()
    const router = useRouter()
    const [categories, setCategories] = useState<Category[]>([])
    const [loading, setLoading] = useState(true)
    const [showAddModal, setShowAddModal] = useState(false)
    const [showEditModal, setShowEditModal] = useState(false)
    const [showSubcategoryModal, setShowSubcategoryModal] = useState(false)
    const [selectedCategory, setSelectedCategory] = useState<Category | null>(null)
    const [parentCategoryId, setParentCategoryId] = useState<number | null>(null)
    const [availableParents, setAvailableParents] = useState<Category[]>([])
    const [formData, setFormData] = useState({ name: '', description: '', parent_category_id: '' })
    const [saving, setSaving] = useState(false)

    useEffect(() => {
        if (status === 'loading') return

        if (!session || session.user?.role !== 'admin') {
            router.push('/auth/signin')
            return
        }

        loadCategories()
    }, [session, status, router])

    const loadCategories = async () => {
        try {
            setLoading(true)
            const response = await fetch('/api/admin/categories')
            if (!response.ok) throw new Error('Failed to load categories')
            
            const data = await response.json()
            setCategories(data || [])
            
            // Собираем все категории для выбора родителя
            const allCategories: Category[] = []
            const collectCategories = (cats: Category[]) => {
                cats.forEach(cat => {
                    allCategories.push(cat)
                    if (cat.subcategories?.length) {
                        collectCategories(cat.subcategories as Category[])
                    }
                })
            }
            collectCategories(data || [])
            setAvailableParents(allCategories)
        } catch (error) {
            console.error('Ошибка загрузки категорий:', error)
            alert('Ошибка загрузки категорий')
        } finally {
            setLoading(false)
        }
    }

    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
        const { name, value } = e.target
        setFormData(prev => ({ ...prev, [name]: value }))
    }

    const handleAddCategory = async (e: React.FormEvent) => {
        e.preventDefault()
        setSaving(true)
        
        try {
            const response = await fetch('/api/admin/categories', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    name: formData.name,
                    description: formData.description,
                    parent_category_id: formData.parent_category_id ? parseInt(formData.parent_category_id) : null
                })
            })
            
            if (!response.ok) {
                const error = await response.json()
                throw new Error(error.error || 'Failed to create category')
            }
            
            setShowAddModal(false)
            resetForm()
            await loadCategories()
            alert('Категория успешно добавлена')
        } catch (error: any) {
            alert(error.message || 'Ошибка при создании категории')
        } finally {
            setSaving(false)
        }
    }

    const handleAddSubcategory = async (e: React.FormEvent) => {
        e.preventDefault()
        if (!parentCategoryId) return
        
        setSaving(true)
        
        try {
            const response = await fetch('/api/admin/categories', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    name: formData.name,
                    description: formData.description,
                    parent_category_id: parentCategoryId
                })
            })
            
            if (!response.ok) {
                const error = await response.json()
                throw new Error(error.error || 'Failed to create subcategory')
            }
            
            setShowSubcategoryModal(false)
            resetForm()
            await loadCategories()
            alert('Подкатегория успешно добавлена')
        } catch (error: any) {
            alert(error.message || 'Ошибка при создании подкатегории')
        } finally {
            setSaving(false)
        }
    }

    const handleEditCategory = async (e: React.FormEvent) => {
        e.preventDefault()
        if (!selectedCategory) return
        
        setSaving(true)
        
        try {
            const response = await fetch('/api/admin/categories', {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    id: selectedCategory.id,
                    name: formData.name,
                    description: formData.description,
                    parent_category_id: formData.parent_category_id ? parseInt(formData.parent_category_id) : null
                })
            })
            
            if (!response.ok) {
                const error = await response.json()
                throw new Error(error.error || 'Failed to update category')
            }
            
            setShowEditModal(false)
            setSelectedCategory(null)
            resetForm()
            await loadCategories()
            alert('Категория успешно обновлена')
        } catch (error: any) {
            alert(error.message || 'Ошибка при обновлении категории')
        } finally {
            setSaving(false)
        }
    }

    const handleDeleteCategory = async (category: Category) => {
        if (!confirm(`Удалить категорию "${category.name}" со всеми подкатегориями?`)) return
        
        try {
            const response = await fetch(`/api/admin/categories?id=${category.id}`, { method: 'DELETE' })
            
            if (!response.ok) {
                const error = await response.json()
                throw new Error(error.error || 'Failed to delete')
            }
            
            await loadCategories()
            alert('Категория удалена')
        } catch (error: any) {
            alert(error.message || 'Ошибка при удалении категории')
        }
    }

    const openEditModal = (category: Category) => {
        setSelectedCategory(category)
        setFormData({
            name: category.name,
            description: category.description || '',
            parent_category_id: category.parent_category_id?.toString() || ''
        })
        setShowEditModal(true)
    }

    const openSubcategoryModal = (categoryId: number) => {
        setParentCategoryId(categoryId)
        setFormData({ name: '', description: '', parent_category_id: '' })
        setShowSubcategoryModal(true)
    }

    const resetForm = () => {
        setFormData({ name: '', description: '', parent_category_id: '' })
        setParentCategoryId(null)
    }

    const getCategoryIcon = (categoryName: string) => {
        const icons: Record<string, string> = {
            'Свитера': '🧶', 'Свитер': '🧶',
            'Шапки': '🧢', 'Шапка': '🧢',
            'Шарфы': '🧣', 'Шарф': '🧣',
            'Варежки': '🧤', 'Носки': '🧦',
            'Пледы': '🛋️', 'Плед': '🛋️',
            'Игрушки': '🧸', 'Игрушка': '🧸',
        }
        return icons[categoryName] || '📁'
    }

    const renderCategoryTree = (category: Category, level: number = 0) => {
        const indent = level * 24
        
        return (
            <div key={category.id}>
                <div className={`border border-gray-200 rounded-lg p-4 mb-3 bg-white hover:shadow-md transition-shadow`} style={{ marginLeft: indent }}>
                    <div className="flex items-start justify-between">
                        <div className="flex-1">
                            <div className="flex items-center gap-3 mb-2">
                                <span className="text-2xl">{getCategoryIcon(category.name)}</span>
                                <h3 className="font-['Montserrat_Alternates'] font-semibold text-lg">{category.name}</h3>
                                {level > 0 && (
                                    <span className="text-xs text-gray-400 bg-gray-100 px-2 py-1 rounded-full">
                                        Подкатегория
                                    </span>
                                )}
                            </div>
                            {category.description && (
                                <p className="text-gray-600 text-sm mb-2">{category.description}</p>
                            )}
                            <div className="flex gap-4 text-sm text-gray-500">
                                <span>📦 Товаров: {category.products_count || 0}</span>
                                <span>📅 {new Date(category.created_at).toLocaleDateString('ru-RU')}</span>
                            </div>
                        </div>
                        <div className="flex gap-2 ml-4">
                            <button
                                onClick={() => openSubcategoryModal(category.id)}
                                className="px-3 py-1 text-sm bg-firm-orange text-white rounded-lg hover:bg-opacity-90 transition"
                                title="Добавить подкатегорию"
                            >
                                + Подкатегория
                            </button>
                            <button
                                onClick={() => openEditModal(category)}
                                className="p-2 text-gray-500 hover:text-firm-orange transition"
                                title="Редактировать"
                            >
                                ✏️
                            </button>
                            <button
                                onClick={() => handleDeleteCategory(category)}
                                className="p-2 text-gray-500 hover:text-red-500 transition"
                                title="Удалить"
                            >
                                🗑️
                            </button>
                        </div>
                    </div>
                </div>
                {category.subcategories?.map(sub => renderCategoryTree(sub, level + 1))}
            </div>
        )
    }

    if (loading) {
        return (
            <div className="flex items-center justify-center min-h-[60vh]">
                <div className="text-center">
                    <div className="w-16 h-16 border-4 border-firm-orange border-t-transparent rounded-full animate-spin mx-auto"></div>
                    <p className="mt-4 font-['Montserrat_Alternates'] text-gray-600">Загрузка категорий...</p>
                </div>
            </div>
        )
    }

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center">
                <div>
                    <h1 className="font-['Montserrat_Alternates'] font-semibold text-2xl">Категории товаров</h1>
                    <p className="text-gray-500 text-sm mt-1">Управление основными категориями и подкатегориями</p>
                </div>
                <button
                    onClick={() => setShowAddModal(true)}
                    className="px-4 py-2 bg-firm-orange text-white rounded-lg hover:bg-opacity-90 transition flex items-center gap-2"
                >
                    <span>+</span> Добавить категорию
                </button>
            </div>

            <div className="space-y-3">
                {categories.length === 0 ? (
                    <div className="bg-white rounded-lg shadow-md p-12 text-center text-gray-500">
                        Нет добавленных категорий
                    </div>
                ) : (
                    categories.map(category => renderCategoryTree(category, 0))
                )}
            </div>
            {showAddModal && (
                <div className="fixed inset-0 bg-[#00000059] bg-opacity-50 flex items-center justify-center z-50 p-4" onClick={() => setShowAddModal(false)}>
                    <div className="bg-white rounded-lg max-w-md w-full" onClick={(e) => e.stopPropagation()}>
                        <div className="p-6">
                            <div className="flex justify-between items-center mb-4">
                                <h2 className="font-['Montserrat_Alternates'] font-semibold text-xl">Добавить категорию</h2>
                                <button onClick={() => setShowAddModal(false)} className="text-gray-500 hover:text-gray-700 text-xl">✕</button>
                            </div>
                            <form onSubmit={handleAddCategory} className="space-y-4">
                                <div>
                                    <label className="block text-gray-700 mb-1 font-['Montserrat_Alternates']">Название *</label>
                                    <input
                                        type="text"
                                        name="name"
                                        value={formData.name}
                                        onChange={handleInputChange}
                                        required
                                        className="w-full p-2 rounded-lg bg-[#EAEAEA] outline-firm-orange"
                                        placeholder="Свитера, Шапки, Шарфы..."
                                    />
                                </div>
                                <div>
                                    <label className="block text-gray-700 mb-1 font-['Montserrat_Alternates']">Описание</label>
                                    <textarea
                                        name="description"
                                        value={formData.description}
                                        onChange={handleInputChange}
                                        rows={3}
                                        className="w-full p-2 rounded-lg bg-[#EAEAEA] outline-firm-pink"
                                        placeholder="Описание категории..."
                                    />
                                </div>
                                <div className="flex gap-3 pt-4">
                                    <button type="submit" disabled={saving} className="flex-1 py-2 bg-firm-orange text-white rounded-lg hover:bg-opacity-90 transition disabled:opacity-50">
                                        {saving ? 'Сохранение...' : 'Добавить'}
                                    </button>
                                    <button type="button" onClick={() => setShowAddModal(false)} className="flex-1 py-2 border border-gray-300 rounded-lg hover:bg-gray-100 transition">Отмена</button>
                                </div>
                            </form>
                        </div>
                    </div>
                </div>
            )}

            {showSubcategoryModal && (
                <div className="fixed inset-0 bg-[#00000059] bg-opacity-50 flex items-center justify-center z-50 p-4" onClick={() => setShowSubcategoryModal(false)}>
                    <div className="bg-white rounded-lg max-w-md w-full" onClick={(e) => e.stopPropagation()}>
                        <div className="p-6">
                            <div className="flex justify-between items-center mb-4">
                                <h2 className="font-['Montserrat_Alternates'] font-semibold text-xl">Добавить подкатегорию</h2>
                                <button onClick={() => setShowSubcategoryModal(false)} className="text-gray-500 hover:text-gray-700 text-xl">✕</button>
                            </div>
                            <form onSubmit={handleAddSubcategory} className="space-y-4">
                                <div>
                                    <label className="block text-gray-700 mb-1 font-['Montserrat_Alternates']">Название *</label>
                                    <input
                                        type="text"
                                        name="name"
                                        value={formData.name}
                                        onChange={handleInputChange}
                                        required
                                        className="w-full p-2 rounded-lg bg-[#EAEAEA] outline-firm-orange"
                                        placeholder="Например: Свитера оверсайз, Детские свитера..."
                                    />
                                </div>
                                <div>
                                    <label className="block text-gray-700 mb-1 font-['Montserrat_Alternates']">Описание</label>
                                    <textarea
                                        name="description"
                                        value={formData.description}
                                        onChange={handleInputChange}
                                        rows={3}
                                        className="w-full p-2 rounded-lg bg-[#EAEAEA] outline-firm-pink"
                                        placeholder="Описание подкатегории..."
                                    />
                                </div>
                                <div className="flex gap-3 pt-4">
                                    <button type="submit" disabled={saving} className="flex-1 py-2 bg-firm-pink text-white rounded-lg hover:bg-opacity-90 transition disabled:opacity-50">
                                        {saving ? 'Сохранение...' : 'Добавить'}
                                    </button>
                                    <button type="button" onClick={() => setShowSubcategoryModal(false)} className="flex-1 py-2 border border-gray-300 rounded-lg hover:bg-gray-100 transition">Отмена</button>
                                </div>
                            </form>
                        </div>
                    </div>
                </div>
            )}

            {/* Модальное окно редактирования категории */}
            {showEditModal && selectedCategory && (
                <div className="fixed inset-0 bg-[#00000059] bg-opacity-50 flex items-center justify-center z-50 p-4" onClick={() => setShowEditModal(false)}>
                    <div className="bg-white rounded-lg max-w-md w-full" onClick={(e) => e.stopPropagation()}>
                        <div className="p-6">
                            <div className="flex justify-between items-center mb-4">
                                <h2 className="font-['Montserrat_Alternates'] font-semibold text-xl">Редактировать категорию</h2>
                                <button onClick={() => setShowEditModal(false)} className="text-gray-500 hover:text-gray-700 text-xl">✕</button>
                            </div>
                            <form onSubmit={handleEditCategory} className="space-y-4">
                                <div>
                                    <label className="block text-gray-700 mb-1 font-['Montserrat_Alternates']">Название *</label>
                                    <input
                                        type="text"
                                        name="name"
                                        value={formData.name}
                                        onChange={handleInputChange}
                                        required
                                        className="w-full p-2 rounded-lg bg-[#EAEAEA] outline-firm-orange"
                                    />
                                </div>
                                <div>
                                    <label className="block text-gray-700 mb-1 font-['Montserrat_Alternates']">Описание</label>
                                    <textarea
                                        name="description"
                                        value={formData.description}
                                        onChange={handleInputChange}
                                        rows={3}
                                        className="w-full p-2 rounded-lg bg-[#EAEAEA] outline-firm-pink"
                                    />
                                </div>
                                <div className="flex gap-3 pt-4">
                                    <button type="submit" disabled={saving} className="flex-1 py-2 bg-firm-orange text-white rounded-lg hover:bg-opacity-90 transition disabled:opacity-50">
                                        {saving ? 'Сохранение...' : 'Сохранить'}
                                    </button>
                                    <button type="button" onClick={() => setShowEditModal(false)} className="flex-1 py-2 border border-gray-300 rounded-lg hover:bg-gray-100 transition">Отмена</button>
                                </div>
                            </form>
                        </div>
                    </div>
                </div>
            )}
        </div>
    )
}