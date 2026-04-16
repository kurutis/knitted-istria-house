'use client'

import { useSession } from "next-auth/react"
import { useRouter } from "next/navigation"
import { useEffect, useState } from "react"
import Image from "next/image"
import Link from "next/link"

interface Yarn {
    id: string
    name: string
    article: string
    brand: string
    color: string
    composition: string
    weight_grams: number
    length_meters: number
    price: number
    in_stock: boolean
    stock_quantity: number
    image_url: string
    description: string
    used_in_products: number
    created_at: string
    updated_at: string
}

export default function AdminYarnCatalogPage() {
    const { data: session, status } = useSession()
    const router = useRouter()
    const [yarns, setYarns] = useState<Yarn[]>([])
    const [loading, setLoading] = useState(true)
    const [showAddModal, setShowAddModal] = useState(false)
    const [showEditModal, setShowEditModal] = useState(false)
    const [selectedYarn, setSelectedYarn] = useState<Yarn | null>(null)
    const [formData, setFormData] = useState({name: '', article: '', brand: '', color: '', composition: '', weight_grams: '', length_meters: '', price: '', in_stock: true, stock_quantity: '', image_url: '', description: ''})
    const [saving, setSaving] = useState(false)

    useEffect(() => {
        if (status === 'loading') return

        if (!session || session.user?.role !== 'admin') {
            router.push('/auth/signin')
            return
        }

        loadYarns()
    }, [session, status, router])

    const loadYarns = async () => {
        try {
            setLoading(true)
            const response = await fetch('/api/admin/yarn')
            if (!response.ok) throw new Error('Failed to load yarns')
            
            const data = await response.json()
            setYarns(data || [])
        } catch (error) {
            console.error('Ошибка загрузки пряжи:', error)
        } finally {
            setLoading(false)
        }
    }

    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
        const { name, value, type } = e.target
        setFormData(prev => ({...prev,[name]: type === 'checkbox' ? (e.target as HTMLInputElement).checked : value}))
    }

    const handleAddYarn = async (e: React.FormEvent) => {
        e.preventDefault()
        setSaving(true)
        
        try {
            const response = await fetch('/api/admin/yarn', {method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({...formData, weight_grams: formData.weight_grams ? parseFloat(formData.weight_grams) : null, length_meters: formData.length_meters ? parseFloat(formData.length_meters) : null, price: formData.price ? parseFloat(formData.price) : null, stock_quantity: formData.stock_quantity ? parseInt(formData.stock_quantity) : 0})})
            
            if (!response.ok) throw new Error('Failed to create yarn')
            
            setShowAddModal(false)
            resetForm()
            await loadYarns()
        } catch (error) {
            console.error('Ошибка при создании пряжи:', error)
            alert('Ошибка при создании пряжи')
        } finally {
            setSaving(false)
        }
    }

    const handleEditYarn = async (e: React.FormEvent) => {
        e.preventDefault()
        if (!selectedYarn) return
        
        setSaving(true)
        
        try {
            const response = await fetch(`/api/admin/yarn/${selectedYarn.id}`, {method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({...formData, weight_grams: formData.weight_grams ? parseFloat(formData.weight_grams) : null, length_meters: formData.length_meters ? parseFloat(formData.length_meters) : null, price: formData.price ? parseFloat(formData.price) : null, stock_quantity: formData.stock_quantity ? parseInt(formData.stock_quantity) : 0})})
            
            if (!response.ok) throw new Error('Failed to update yarn')
            
            setShowEditModal(false)
            setSelectedYarn(null)
            resetForm()
            await loadYarns()
        } catch (error) {
            console.error('Ошибка при обновлении пряжи:', error)
            alert('Ошибка при обновлении пряжи')
        } finally {
            setSaving(false)
        }
    }

    const handleDeleteYarn = async (yarn: Yarn) => {
        if (!confirm(`Удалить пряжу "${yarn.name}"?`)) return
        
        try {
            const response = await fetch(`/api/admin/yarn/${yarn.id}`, {method: 'DELETE'})
            
            if (!response.ok) {
                const error = await response.json()
                throw new Error(error.error || 'Failed to delete')
            }
            
            await loadYarns()
        } catch (error: any) {
            console.error('Ошибка при удалении:', error)
            alert(error.message || 'Ошибка при удалении пряжи')
        }
    }

    const openEditModal = (yarn: Yarn) => {
        setSelectedYarn(yarn)
        setFormData({name: yarn.name, article: yarn.article, brand: yarn.brand || '', color: yarn.color || '', composition: yarn.composition || '', weight_grams: yarn.weight_grams?.toString() || '', length_meters: yarn.length_meters?.toString() || '', price: yarn.price?.toString() || '', in_stock: yarn.in_stock, stock_quantity: yarn.stock_quantity?.toString() || '', image_url: yarn.image_url || '', description: yarn.description || ''})
        setShowEditModal(true)
    }

    const resetForm = () => {
        setFormData({name: '', article: '', brand: '',  color: '', composition: '', weight_grams: '', length_meters: '', price: '', in_stock: true, stock_quantity: '', image_url: '', description: ''})
    }

    if (loading) {
        return (
            <div className="flex items-center justify-center min-h-[60vh]">
                <div className="text-center">
                    <div className="w-16 h-16 border-4 border-firm-orange border-t-transparent rounded-full animate-spin mx-auto"></div>
                    <p className="mt-4 font-['Montserrat_Alternates'] text-gray-600">Загрузка каталога пряжи...</p>
                </div>
            </div>
        )
    }

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center">
                <h1 className="font-['Montserrat_Alternates'] font-semibold text-2xl">Каталог пряжи</h1>
                <button onClick={() => setShowAddModal(true)} className="px-4 py-2 bg-firm-orange text-white rounded-lg hover:bg-opacity-90 transition flex items-center gap-2"><span>+</span> Добавить пряжу</button>
            </div>

            <div className="bg-white rounded-lg shadow-md overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full">
                        <thead className="bg-[#EAEAEA]">
                            <tr>
                                <th className="text-left p-4">Изображение</th>
                                <th className="text-left p-4">Название / Артикул</th>
                                <th className="text-left p-4">Бренд / Цвет</th>
                                <th className="text-left p-4">Характеристики</th>
                                <th className="text-left p-4">Цена / Наличие</th>
                                <th className="text-left p-4">Используется</th>
                                <th className="text-left p-4">Действия</th>
                            </tr>
                        </thead>
                        <tbody>
                            {yarns.length === 0 ? (
                                <tr>
                                    <td colSpan={7} className="text-center p-8 text-gray-500">
                                        Нет добавленной пряжи
                                    </td>
                                </tr>
                            ) : (
                                yarns.map((yarn) => (
                                    <tr key={yarn.id} className="border-b border-gray-200 hover:bg-[#FAFAFA] transition-colors">
                                        <td className="p-4">
                                            <div className="w-12 h-12 bg-[#EAEAEA] rounded-lg overflow-hidden">
                                                {yarn.image_url ? (<Image src={yarn.image_url} alt={yarn.name} className="w-full h-full object-cover" />) : (<div className="w-full h-full flex items-center justify-center text-gray-400 text-xl">🧶</div>)}
                                            </div>
                                        </td>
                                        <td className="p-4">
                                            <div className="font-semibold">{yarn.name}</div>
                                            <div className="text-sm text-gray-500">Арт: {yarn.article}</div>
                                        </td>
                                        <td className="p-4">
                                            <div>{yarn.brand || '-'}</div>
                                            <div className="text-sm text-gray-500">{yarn.color || '-'}</div>
                                        </td>
                                        <td className="p-4">
                                            <div className="text-sm">
                                                {yarn.weight_grams && <div>🧶 {yarn.weight_grams} г</div>}
                                                {yarn.length_meters && <div>📏 {yarn.length_meters} м</div>}
                                                {yarn.composition && <div className="text-xs text-gray-500 truncate max-w-[150px]">{yarn.composition}</div>}
                                            </div>
                                        </td>
                                        <td className="p-4">
                                            <div className="font-semibold text-firm-orange">{yarn.price?.toLocaleString()} ₽</div>
                                            <div className="text-sm">
                                                {yarn.in_stock ? (<span className="text-green-600">В наличии: {yarn.stock_quantity}</span>) : (<span className="text-red-600">Нет в наличии</span>)}
                                            </div>
                                        </td>
                                        <td className="p-4">
                                            <span className="px-2 py-1 bg-blue-100 text-blue-700 rounded-full text-xs">
                                                {yarn.used_in_products || 0} товаров
                                            </span>
                                        </td>
                                        <td className="p-4">
                                            <div className="flex gap-2">
                                                <button onClick={() => openEditModal(yarn)} className="px-3 py-1 text-sm bg-firm-orange text-white rounded-lg hover:bg-opacity-90 transition">Редактировать</button>
                                                <button onClick={() => handleDeleteYarn(yarn)} className="px-3 py-1 text-sm bg-red-500 text-white rounded-lg hover:bg-red-600 transition">Удалить</button>
                                            </div>
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            {showAddModal && (
                <div className="fixed inset-0 bg-[#00000059] bg-opacity-50 flex items-center justify-center z-50 p-4" onClick={() => setShowAddModal(false)}>
                    <div className="bg-white rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
                        <div className="p-6">
                            <div className="flex justify-between items-center mb-4">
                                <h2 className="font-['Montserrat_Alternates'] font-semibold text-2xl">Добавить пряжу</h2>
                                <button onClick={() => setShowAddModal(false)} className="text-gray-500 hover:text-gray-700 text-xl">✕</button>
                            </div>

                            <form onSubmit={handleAddYarn} className="space-y-4">
                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-gray-700 mb-1 font-['Montserrat_Alternates']">Название *</label>
                                        <input type="text" name="name" value={formData.name} onChange={handleInputChange} required className="w-full p-2 rounded-lg bg-[#EAEAEA] outline-firm-orange" />
                                    </div>
                                    <div>
                                        <label className="block text-gray-700 mb-1 font-['Montserrat_Alternates']">Артикул *</label>
                                        <input type="text" name="article" value={formData.article} onChange={handleInputChange} required className="w-full p-2 rounded-lg bg-[#EAEAEA] outline-firm-orange" />
                                    </div>
                                </div>

                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-gray-700 mb-1 font-['Montserrat_Alternates']">Бренд</label>
                                        <input type="text" name="brand" value={formData.brand} onChange={handleInputChange} className="w-full p-2 rounded-lg bg-[#EAEAEA] outline-firm-pink" />
                                    </div>
                                    <div>
                                        <label className="block text-gray-700 mb-1 font-['Montserrat_Alternates']">Цвет</label>
                                        <input type="text" name="color" value={formData.color} onChange={handleInputChange} className="w-full p-2 rounded-lg bg-[#EAEAEA] outline-firm-pink" />
                                    </div>
                                </div>

                                <div>
                                    <label className="block text-gray-700 mb-1 font-['Montserrat_Alternates']">Состав</label>
                                    <input type="text" name="composition" value={formData.composition} onChange={handleInputChange} className="w-full p-2 rounded-lg bg-[#EAEAEA] outline-firm-orange" placeholder="100% шерсть, 50% акрил 50% полиамид..." />
                                </div>

                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-gray-700 mb-1 font-['Montserrat_Alternates']">Вес (г)</label>
                                        <input type="number" name="weight_grams" value={formData.weight_grams} onChange={handleInputChange} step="0.01" className="w-full p-2 rounded-lg bg-[#EAEAEA] outline-firm-pink" />
                                    </div>
                                    <div>
                                        <label className="block text-gray-700 mb-1 font-['Montserrat_Alternates']">Длина (м)</label>
                                        <input type="number" name="length_meters" value={formData.length_meters} onChange={handleInputChange} step="0.01" className="w-full p-2 rounded-lg bg-[#EAEAEA] outline-firm-pink" />
                                    </div>
                                </div>

                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-gray-700 mb-1 font-['Montserrat_Alternates']">Цена (₽)</label>
                                        <input type="number" name="price" value={formData.price} onChange={handleInputChange} step="0.01" className="w-full p-2 rounded-lg bg-[#EAEAEA] outline-firm-orange" />
                                    </div>
                                    <div>
                                        <label className="block text-gray-700 mb-1 font-['Montserrat_Alternates']">Количество на складе</label>
                                        <input type="number" name="stock_quantity" value={formData.stock_quantity} onChange={handleInputChange} className="w-full p-2 rounded-lg bg-[#EAEAEA] outline-firm-orange" />
                                    </div>
                                </div>

                                <div className="flex items-center gap-3">
                                    <input type="checkbox" name="in_stock" checked={formData.in_stock} onChange={handleInputChange} className="w-5 h-5 accent-firm-orange" />
                                    <label className="text-gray-700">В наличии</label>
                                </div>

                                <div>
                                    <label className="block text-gray-700 mb-1 font-['Montserrat_Alternates']">URL изображения</label>
                                    <input type="url" name="image_url" value={formData.image_url} onChange={handleInputChange} className="w-full p-2 rounded-lg bg-[#EAEAEA] outline-firm-pink"  placeholder="https://..." />
                                </div>

                                <div>
                                    <label className="block text-gray-700 mb-1 font-['Montserrat_Alternates']">Описание</label>
                                    <textarea name="description" value={formData.description} onChange={handleInputChange} rows={3} className="w-full p-2 rounded-lg bg-[#EAEAEA] outline-firm-orange" />
                                </div>

                                <div className="flex gap-3 pt-4">
                                    <button type="submit" disabled={saving} className="flex-1 py-2 bg-firm-orange text-white rounded-lg hover:bg-opacity-90 transition disabled:opacity-50">{saving ? 'Сохранение...' : 'Добавить'} </button>
                                    <button type="button" onClick={() => setShowAddModal(false)} className="flex-1 py-2 border border-gray-300 rounded-lg hover:bg-gray-100 transition">Отмена</button>
                                </div>
                            </form>
                        </div>
                    </div>
                </div>
            )}

            {showEditModal && selectedYarn && (
                <div className="fixed inset-0 bg-[#00000059] bg-opacity-50 flex items-center justify-center z-50 p-4" onClick={() => setShowEditModal(false)}>
                    <div className="bg-white rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
                        <div className="p-6">
                            <div className="flex justify-between items-center mb-4">
                                <h2 className="font-['Montserrat_Alternates'] font-semibold text-2xl">Редактировать пряжу</h2>
                                <button onClick={() => setShowEditModal(false)} className="text-gray-500 hover:text-gray-700 text-xl">✕</button>
                            </div>

                            <form onSubmit={handleEditYarn} className="space-y-4">
                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-gray-700 mb-1 font-['Montserrat_Alternates']">Название *</label>
                                        <input type="text" name="name" value={formData.name} onChange={handleInputChange} required className="w-full p-2 rounded-lg bg-[#EAEAEA] outline-firm-orange"/>
                                    </div>
                                    <div>
                                        <label className="block text-gray-700 mb-1 font-['Montserrat_Alternates']">Артикул *</label>
                                        <input type="text" name="article" value={formData.article} onChange={handleInputChange} required className="w-full p-2 rounded-lg bg-[#EAEAEA] outline-firm-orange" />
                                    </div>
                                </div>

                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-gray-700 mb-1 font-['Montserrat_Alternates']">Бренд</label>
                                        <input type="text" name="brand" value={formData.brand} onChange={handleInputChange} className="w-full p-2 rounded-lg bg-[#EAEAEA] outline-firm-pink" />
                                    </div>
                                    <div>
                                        <label className="block text-gray-700 mb-1 font-['Montserrat_Alternates']">Цвет</label>
                                        <input type="text" name="color" value={formData.color} onChange={handleInputChange} className="w-full p-2 rounded-lg bg-[#EAEAEA] outline-firm-pink" />
                                    </div>
                                </div>

                                <div>
                                    <label className="block text-gray-700 mb-1 font-['Montserrat_Alternates']">Состав</label>
                                    <input type="text" name="composition" value={formData.composition} onChange={handleInputChange} className="w-full p-2 rounded-lg bg-[#EAEAEA] outline-firm-orange" />
                                </div>

                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-gray-700 mb-1 font-['Montserrat_Alternates']">Вес (г)</label>
                                        <input type="number" name="weight_grams" value={formData.weight_grams} onChange={handleInputChange} step="0.01" className="w-full p-2 rounded-lg bg-[#EAEAEA] outline-firm-pink" />
                                    </div>
                                    <div>
                                        <label className="block text-gray-700 mb-1 font-['Montserrat_Alternates']">Длина (м)</label>
                                        <input type="number" name="length_meters" value={formData.length_meters} onChange={handleInputChange} step="0.01" className="w-full p-2 rounded-lg bg-[#EAEAEA] outline-firm-pink" />
                                    </div>
                                </div>

                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-gray-700 mb-1 font-['Montserrat_Alternates']">Цена (₽)</label>
                                        <input type="number" name="price" value={formData.price} onChange={handleInputChange} step="0.01" className="w-full p-2 rounded-lg bg-[#EAEAEA] outline-firm-orange" />
                                    </div>
                                    <div>
                                        <label className="block text-gray-700 mb-1 font-['Montserrat_Alternates']">Количество на складе</label>
                                        <input type="number" name="stock_quantity" value={formData.stock_quantity} onChange={handleInputChange} className="w-full p-2 rounded-lg bg-[#EAEAEA] outline-firm-orange" />
                                    </div>
                                </div>

                                <div className="flex items-center gap-3">
                                    <input type="checkbox" name="in_stock" checked={formData.in_stock} onChange={handleInputChange} className="w-5 h-5 accent-firm-orange" />
                                    <label className="text-gray-700">В наличии</label>
                                </div>

                                <div>
                                    <label className="block text-gray-700 mb-1 font-['Montserrat_Alternates']">URL изображения</label>
                                    <input type="url" name="image_url" value={formData.image_url} onChange={handleInputChange} className="w-full p-2 rounded-lg bg-[#EAEAEA] outline-firm-pink" />
                                </div>

                                <div>
                                    <label className="block text-gray-700 mb-1 font-['Montserrat_Alternates']">Описание</label>
                                    <textarea name="description" value={formData.description} onChange={handleInputChange} rows={3} className="w-full p-2 rounded-lg bg-[#EAEAEA] outline-firm-orange" />
                                </div>

                                <div className="flex gap-3 pt-4">
                                    <button type="submit" disabled={saving} className="flex-1 py-2 bg-firm-orange text-white rounded-lg hover:bg-opacity-90 transition disabled:opacity-50">{saving ? 'Сохранение...' : 'Сохранить'}</button>
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