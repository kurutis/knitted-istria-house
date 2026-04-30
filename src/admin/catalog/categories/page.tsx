'use client'

import { useSession } from "next-auth/react"
import { useRouter } from "next/navigation"
import { useEffect, useState, useRef } from "react"
import { motion, AnimatePresence } from "framer-motion"

interface Subcategory {
    id: number
    name: string
    description: string
    products_count: number
    icon_url?: string
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
    icon_url?: string
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
    const [formData, setFormData] = useState({ name: '', description: '', parent_category_id: '' })
    const [iconFile, setIconFile] = useState<File | null>(null)
    const [iconPreview, setIconPreview] = useState<string | null>(null)
    const [saving, setSaving] = useState(false)
    const [expandedCategories, setExpandedCategories] = useState<Set<number>>(new Set())
    const fileInputRef = useRef<HTMLInputElement>(null)

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
        } catch (error) {
            alert('Ошибка загрузки категорий')
        } finally {
            setLoading(false)
        }
    }

    const handleIconChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0]
        if (file && (file.type === 'image/svg+xml' || file.type === 'image/svg')) {
            setIconFile(file)
            const reader = new FileReader()
            reader.onloadend = () => {
                setIconPreview(reader.result as string)
            }
            reader.readAsDataURL(file)
        } else {
            alert('Пожалуйста, выберите SVG файл')
        }
    }

    const handleAddCategory = async (e: React.FormEvent) => {
        e.preventDefault()
        setSaving(true)
        
        const formDataToSend = new FormData()
        formDataToSend.append('name', formData.name)
        formDataToSend.append('description', formData.description)
        if (formData.parent_category_id) {
            formDataToSend.append('parent_category_id', formData.parent_category_id)
        }
        if (iconFile) {
            formDataToSend.append('icon', iconFile)
        }

        try {
            const response = await fetch('/api/admin/categories', {
                method: 'POST',
                body: formDataToSend
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
        
        const formDataToSend = new FormData()
        formDataToSend.append('name', formData.name)
        formDataToSend.append('description', formData.description)
        formDataToSend.append('parent_category_id', parentCategoryId.toString())
        if (iconFile) {
            formDataToSend.append('icon', iconFile)
        }

        try {
            const response = await fetch('/api/admin/categories', {
                method: 'POST',
                body: formDataToSend
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
        
        const formDataToSend = new FormData()
        formDataToSend.append('id', selectedCategory.id.toString())
        formDataToSend.append('name', formData.name)
        formDataToSend.append('description', formData.description)
        if (formData.parent_category_id) {
            formDataToSend.append('parent_category_id', formData.parent_category_id)
        }
        if (iconFile) {
            formDataToSend.append('icon', iconFile)
        }
        if (selectedCategory.icon_url) {
            formDataToSend.append('existingIconUrl', selectedCategory.icon_url)
        }

        try {
            const response = await fetch('/api/admin/categories', {
                method: 'PUT',
                body: formDataToSend
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
        setIconPreview(category.icon_url || null)
        setIconFile(null)
        setShowEditModal(true)
    }

    const openSubcategoryModal = (categoryId: number) => {
        setParentCategoryId(categoryId)
        setFormData({ name: '', description: '', parent_category_id: '' })
        setIconPreview(null)
        setIconFile(null)
        setShowSubcategoryModal(true)
    }

    const resetForm = () => {
        setFormData({ name: '', description: '', parent_category_id: '' })
        setIconPreview(null)
        setIconFile(null)
        setParentCategoryId(null)
    }

    const toggleExpand = (categoryId: number) => {
        setExpandedCategories(prev => {
            const newSet = new Set(prev)
            if (newSet.has(categoryId)) {
                newSet.delete(categoryId)
            } else {
                newSet.add(categoryId)
            }
            return newSet
        })
    }

    const renderCategoryTree = (category: Category, level: number = 0) => {
        const indent = level * 32
        const hasSubcategories = category.subcategories && category.subcategories.length > 0
        const isExpanded = expandedCategories.has(category.id)

        return (
            <motion.div
                key={category.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3 }}
            >
                <motion.div
                    whileHover={{ scale: 1.01 }}
                    className={`border border-gray-200 rounded-xl p-4 mb-3 bg-white hover:shadow-lg transition-all duration-300`}
                    style={{ marginLeft: indent }}
                >
                    <div className="flex items-start justify-between">
                        <div className="flex-1">
                            <div className="flex items-center gap-3 mb-2">
                                {category.icon_url ? (
                                    <img src={category.icon_url} alt={category.name} className="w-8 h-8 object-contain" />
                                ) : (
                                    <span className="text-3xl">📁</span>
                                )}
                                <h3 className="font-['Montserrat_Alternates'] font-semibold text-lg text-gray-800">{category.name}</h3>
                                {level > 0 && (
                                    <span className="text-xs text-gray-500 bg-gray-100 px-2 py-1 rounded-full">Подкатегория</span>
                                )}
                                {hasSubcategories && (
                                    <button
                                        onClick={() => toggleExpand(category.id)}
                                        className="text-xs text-firm-orange hover:underline flex items-center gap-1"
                                    >
                                        {isExpanded ? '▲ Скрыть' : '▼ Показать'} ({category.subcategories.length})
                                    </button>
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
                                className="px-3 py-1.5 text-sm bg-gradient-to-r from-firm-orange to-firm-pink text-white rounded-xl hover:shadow-lg transition-all duration-300"
                                title="Добавить подкатегорию"
                            >
                                + Подкатегория
                            </button>
                            <button
                                onClick={() => openEditModal(category)}
                                className="p-2 text-gray-500 hover:text-firm-orange transition-all duration-300 rounded-lg hover:bg-gray-100"
                                title="Редактировать"
                            >
                                ✏️
                            </button>
                            <button
                                onClick={() => handleDeleteCategory(category)}
                                className="p-2 text-gray-500 hover:text-red-500 transition-all duration-300 rounded-lg hover:bg-gray-100"
                                title="Удалить"
                            >
                                🗑️
                            </button>
                        </div>
                    </div>
                </motion.div>

                <AnimatePresence>
                    {hasSubcategories && isExpanded && (
                        <motion.div
                            initial={{ opacity: 0, height: 0 }}
                            animate={{ opacity: 1, height: "auto" }}
                            exit={{ opacity: 0, height: 0 }}
                            transition={{ duration: 0.3 }}
                        >
                            {category.subcategories.map(sub => renderCategoryTree(sub as Category, level + 1))}
                        </motion.div>
                    )}
                </AnimatePresence>
            </motion.div>
        )
    }

    if (loading) {
        return (
            <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="flex items-center justify-center min-h-[60vh]"
            >
                <div className="text-center">
                    <motion.div
                        animate={{ rotate: 360 }}
                        transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                        className="w-16 h-16 border-4 border-firm-orange border-t-transparent rounded-full mx-auto"
                    />
                    <p className="mt-4 font-['Montserrat_Alternates'] text-gray-600">Загрузка категорий...</p>
                </div>
            </motion.div>
        )
    }

    return (
        <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="space-y-6 p-4 sm:p-6"
        >
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div>
                    <h1 className="font-['Montserrat_Alternates'] font-semibold text-2xl sm:text-3xl bg-gradient-to-r from-firm-orange to-firm-pink bg-clip-text text-transparent">
                        Категории товаров
                    </h1>
                    <p className="text-gray-500 text-sm mt-1">Управление основными категориями и подкатегориями</p>
                </div>
                <motion.button
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    onClick={() => setShowAddModal(true)}
                    className="px-4 py-2 bg-gradient-to-r from-firm-orange to-firm-pink text-white rounded-xl hover:shadow-lg transition-all duration-300 flex items-center gap-2"
                >
                    + Добавить категорию
                </motion.button>
            </div>

            <div className="space-y-3">
                {categories.length === 0 ? (
                    <div className="bg-white rounded-2xl shadow-xl p-12 text-center text-gray-500">
                        <p className="text-lg">Нет добавленных категорий</p>
                        <p className="text-sm mt-2">Нажмите кнопку "Добавить категорию" чтобы начать</p>
                    </div>
                ) : (
                    categories.map(category => renderCategoryTree(category, 0))
                )}
            </div>

            {/* Модальное окно добавления категории */}
            <AnimatePresence>
                {showAddModal && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50 p-4"
                        onClick={() => setShowAddModal(false)}
                    >
                        <motion.div
                            initial={{ scale: 0.9, opacity: 0 }}
                            animate={{ scale: 1, opacity: 1 }}
                            exit={{ scale: 0.9, opacity: 0 }}
                            className="bg-white rounded-2xl max-w-md w-full shadow-2xl"
                            onClick={(e) => e.stopPropagation()}
                        >
                            <div className="p-6">
                                <div className="flex justify-between items-center mb-4">
                                    <h2 className="font-['Montserrat_Alternates'] font-semibold text-xl">Добавить категорию</h2>
                                    <button onClick={() => setShowAddModal(false)} className="text-gray-500 hover:text-gray-700 text-2xl transition-colors">✕</button>
                                </div>
                                <form onSubmit={handleAddCategory} className="space-y-4">
                                    <div>
                                        <label className="block text-gray-700 mb-1 font-['Montserrat_Alternates']">Название *</label>
                                        <input type="text" name="name" value={formData.name} onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))} required className="w-full p-3 rounded-xl bg-gray-100 outline-none focus:ring-2 focus:ring-firm-orange transition-all duration-300" placeholder="Свитера, Шапки, Шарфы..." />
                                    </div>
                                    <div>
                                        <label className="block text-gray-700 mb-1 font-['Montserrat_Alternates']">SVG Иконка</label>
                                        <div className="flex items-center gap-4">
                                            {iconPreview && (
                                                <img src={iconPreview} alt="icon preview" className="w-12 h-12 object-contain border rounded-lg p-1" />
                                            )}
                                            <button
                                                type="button"
                                                onClick={() => fileInputRef.current?.click()}
                                                className="px-4 py-2 border border-gray-300 rounded-xl hover:bg-gray-50 transition-all duration-300"
                                            >
                                                Выбрать SVG
                                            </button>
                                            <input
                                                ref={fileInputRef}
                                                type="file"
                                                accept=".svg,image/svg+xml"
                                                onChange={handleIconChange}
                                                className="hidden"
                                            />
                                            {iconPreview && (
                                                <button
                                                    type="button"
                                                    onClick={() => { setIconPreview(null); setIconFile(null) }}
                                                    className="text-red-500 hover:text-red-600"
                                                >
                                                    Удалить
                                                </button>
                                            )}
                                        </div>
                                        <p className="text-xs text-gray-400 mt-1">Рекомендуемый размер: 32x32px, формат SVG</p>
                                    </div>
                                    <div>
                                        <label className="block text-gray-700 mb-1 font-['Montserrat_Alternates']">Описание</label>
                                        <textarea name="description" value={formData.description} onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))} rows={3} className="w-full p-3 rounded-xl bg-gray-100 outline-none focus:ring-2 focus:ring-firm-pink transition-all duration-300" placeholder="Описание категории..." />
                                    </div>
                                    <div className="flex gap-3 pt-4">
                                        <button type="submit" disabled={saving} className="flex-1 py-2 bg-gradient-to-r from-firm-orange to-firm-pink text-white rounded-xl hover:shadow-lg transition-all duration-300 disabled:opacity-50 font-medium">
                                            {saving ? 'Сохранение...' : 'Добавить'}
                                        </button>
                                        <button type="button" onClick={() => setShowAddModal(false)} className="flex-1 py-2 border border-gray-300 rounded-xl hover:bg-gray-50 transition-all duration-300">
                                            Отмена
                                        </button>
                                    </div>
                                </form>
                            </div>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Модальное окно добавления подкатегории */}
            <AnimatePresence>
                {showSubcategoryModal && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50 p-4"
                        onClick={() => setShowSubcategoryModal(false)}
                    >
                        <motion.div
                            initial={{ scale: 0.9, opacity: 0 }}
                            animate={{ scale: 1, opacity: 1 }}
                            exit={{ scale: 0.9, opacity: 0 }}
                            className="bg-white rounded-2xl max-w-md w-full shadow-2xl"
                            onClick={(e) => e.stopPropagation()}
                        >
                            <div className="p-6">
                                <div className="flex justify-between items-center mb-4">
                                    <h2 className="font-['Montserrat_Alternates'] font-semibold text-xl">Добавить подкатегорию</h2>
                                    <button onClick={() => setShowSubcategoryModal(false)} className="text-gray-500 hover:text-gray-700 text-2xl transition-colors">✕</button>
                                </div>
                                <form onSubmit={handleAddSubcategory} className="space-y-4">
                                    <div>
                                        <label className="block text-gray-700 mb-1 font-['Montserrat_Alternates']">Название *</label>
                                        <input type="text" name="name" value={formData.name} onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))} required className="w-full p-3 rounded-xl bg-gray-100 outline-none focus:ring-2 focus:ring-firm-orange transition-all duration-300" placeholder="Например: Свитера оверсайз, Детские свитера..." />
                                    </div>
                                    <div>
                                        <label className="block text-gray-700 mb-1 font-['Montserrat_Alternates']">SVG Иконка</label>
                                        <div className="flex items-center gap-4">
                                            {iconPreview && (
                                                <img src={iconPreview} alt="icon preview" className="w-12 h-12 object-contain border rounded-lg p-1" />
                                            )}
                                            <button
                                                type="button"
                                                onClick={() => fileInputRef.current?.click()}
                                                className="px-4 py-2 border border-gray-300 rounded-xl hover:bg-gray-50 transition-all duration-300"
                                            >
                                                Выбрать SVG
                                            </button>
                                            <input
                                                ref={fileInputRef}
                                                type="file"
                                                accept=".svg,image/svg+xml"
                                                onChange={handleIconChange}
                                                className="hidden"
                                            />
                                            {iconPreview && (
                                                <button
                                                    type="button"
                                                    onClick={() => { setIconPreview(null); setIconFile(null) }}
                                                    className="text-red-500 hover:text-red-600"
                                                >
                                                    Удалить
                                                </button>
                                            )}
                                        </div>
                                        <p className="text-xs text-gray-400 mt-1">Рекомендуемый размер: 32x32px, формат SVG</p>
                                    </div>
                                    <div>
                                        <label className="block text-gray-700 mb-1 font-['Montserrat_Alternates']">Описание</label>
                                        <textarea name="description" value={formData.description} onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))} rows={3} className="w-full p-3 rounded-xl bg-gray-100 outline-none focus:ring-2 focus:ring-firm-pink transition-all duration-300" placeholder="Описание подкатегории..." />
                                    </div>
                                    <div className="flex gap-3 pt-4">
                                        <button type="submit" disabled={saving} className="flex-1 py-2 bg-gradient-to-r from-firm-orange to-firm-pink text-white rounded-xl hover:shadow-lg transition-all duration-300 disabled:opacity-50 font-medium">
                                            {saving ? 'Сохранение...' : 'Добавить'}
                                        </button>
                                        <button type="button" onClick={() => setShowSubcategoryModal(false)} className="flex-1 py-2 border border-gray-300 rounded-xl hover:bg-gray-50 transition-all duration-300">
                                            Отмена
                                        </button>
                                    </div>
                                </form>
                            </div>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Модальное окно редактирования категории */}
            <AnimatePresence>
                {showEditModal && selectedCategory && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50 p-4"
                        onClick={() => setShowEditModal(false)}
                    >
                        <motion.div
                            initial={{ scale: 0.9, opacity: 0 }}
                            animate={{ scale: 1, opacity: 1 }}
                            exit={{ scale: 0.9, opacity: 0 }}
                            className="bg-white rounded-2xl max-w-md w-full shadow-2xl"
                            onClick={(e) => e.stopPropagation()}
                        >
                            <div className="p-6">
                                <div className="flex justify-between items-center mb-4">
                                    <h2 className="font-['Montserrat_Alternates'] font-semibold text-xl">Редактировать категорию</h2>
                                    <button onClick={() => setShowEditModal(false)} className="text-gray-500 hover:text-gray-700 text-2xl transition-colors">✕</button>
                                </div>
                                <form onSubmit={handleEditCategory} className="space-y-4">
                                    <div>
                                        <label className="block text-gray-700 mb-1 font-['Montserrat_Alternates']">Название *</label>
                                        <input type="text" name="name" value={formData.name} onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))} required className="w-full p-3 rounded-xl bg-gray-100 outline-none focus:ring-2 focus:ring-firm-orange transition-all duration-300" />
                                    </div>
                                    <div>
                                        <label className="block text-gray-700 mb-1 font-['Montserrat_Alternates']">SVG Иконка</label>
                                        <div className="flex items-center gap-4">
                                            {iconPreview && (
                                                <img src={iconPreview} alt="icon preview" className="w-12 h-12 object-contain border rounded-lg p-1" />
                                            )}
                                            <button
                                                type="button"
                                                onClick={() => fileInputRef.current?.click()}
                                                className="px-4 py-2 border border-gray-300 rounded-xl hover:bg-gray-50 transition-all duration-300"
                                            >
                                                {selectedCategory.icon_url ? 'Заменить SVG' : 'Выбрать SVG'}
                                            </button>
                                            <input
                                                ref={fileInputRef}
                                                type="file"
                                                accept=".svg,image/svg+xml"
                                                onChange={handleIconChange}
                                                className="hidden"
                                            />
                                            {(iconPreview || selectedCategory.icon_url) && (
                                                <button
                                                    type="button"
                                                    onClick={() => { setIconPreview(null); setIconFile(null) }}
                                                    className="text-red-500 hover:text-red-600"
                                                >
                                                    Удалить
                                                </button>
                                            )}
                                        </div>
                                        <p className="text-xs text-gray-400 mt-1">Рекомендуемый размер: 32x32px, формат SVG</p>
                                    </div>
                                    <div>
                                        <label className="block text-gray-700 mb-1 font-['Montserrat_Alternates']">Описание</label>
                                        <textarea name="description" value={formData.description} onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))} rows={3} className="w-full p-3 rounded-xl bg-gray-100 outline-none focus:ring-2 focus:ring-firm-pink transition-all duration-300" />
                                    </div>
                                    <div className="flex gap-3 pt-4">
                                        <button type="submit" disabled={saving} className="flex-1 py-2 bg-gradient-to-r from-firm-orange to-firm-pink text-white rounded-xl hover:shadow-lg transition-all duration-300 disabled:opacity-50 font-medium">
                                            {saving ? 'Сохранение...' : 'Сохранить'}
                                        </button>
                                        <button type="button" onClick={() => setShowEditModal(false)} className="flex-1 py-2 border border-gray-300 rounded-xl hover:bg-gray-50 transition-all duration-300">
                                            Отмена
                                        </button>
                                    </div>
                                </form>
                            </div>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>
        </motion.div>
    )
}