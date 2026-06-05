'use client'

import { useSession } from "next-auth/react"
import { useRouter } from "next/navigation"
import { useEffect, useState } from "react"
import { motion, AnimatePresence } from "framer-motion"
import toast from "react-hot-toast"
import ConfirmModal from "@/components/ui/ConfirmModal"
import { PlusIcon } from "@/components/icons/PlusIcon"
import { SearchIcon } from "@/components/icons/SearchIcon"
import { EditIcon } from "@/components/icons/EditIcon"
import { DeleteIcon } from "@/components/icons/DeleteIcon"
import { SaveIcon } from "@/components/icons/SaveIcon"
import { CloseIcon } from "@/components/icons/CloseIcon"
import { RefreshIcon } from "@/components/icons/RefreshIcon"
import { WeightIcon } from "@/components/icons/WeightIcon"
import { RulerIcon } from "@/components/icons/RulerIcon"
import { PackageIcon } from "@/components/icons/PackageIcon"
import { CheckCircleIcon } from "@/components/icons/CheckCircleIcon"
import { CancelIcon } from "@/components/icons/CancelIcon"
import { ImageIcon } from "@/components/icons/ImageIcon"
import { Productslcon } from "@/components/icons/Productslcon"

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
    const [searchTerm, setSearchTerm] = useState('')
    const [filterInStock, setFilterInStock] = useState<'all' | 'in_stock' | 'out_of_stock'>('all')
    
    const [confirmModal, setConfirmModal] = useState<{isOpen: boolean; title: string; message: string; onConfirm: () => void; type?: 'danger' | 'warning' | 'info'}>({isOpen: false, title: '', message: '', onConfirm: () => {}, type: 'danger'})

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
            toast.success('Каталог пряжи загружен')
        } catch (error) {
            console.error('Ошибка загрузки пряжи:', error)
            toast.error('Ошибка загрузки пряжи')
        } finally {
            setLoading(false)
        }
    }

    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
        const { name, value, type } = e.target
        setFormData(prev => ({...prev, [name]: type === 'checkbox' ? (e.target as HTMLInputElement).checked : value}))
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
            toast.success('Пряжа успешно добавлена')
        } catch (error) {
            console.error('Ошибка при создании пряжи:', error)
            toast.error('Ошибка при создании пряжи')
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
            toast.success('Пряжа успешно обновлена')
        } catch (error) {
            console.error('Ошибка при обновлении пряжи:', error)
            toast.error('Ошибка при обновлении пряжи')
        } finally {
            setSaving(false)
        }
    }

    const handleDeleteYarn = async (yarn: Yarn) => {
        setConfirmModal({
            isOpen: true,
            title: 'Удаление пряжи',
            message: `Вы уверены, что хотите удалить пряжу "${yarn.name}"? Это действие нельзя отменить.`,
            type: 'danger',
            onConfirm: async () => {
                setConfirmModal(prev => ({ ...prev, isOpen: false }))
                try {
                    const response = await fetch(`/api/admin/yarn/${yarn.id}`, { method: 'DELETE' })
                    
                    if (!response.ok) {
                        const error = await response.json()
                        throw new Error(error.error || 'Failed to delete')
                    }
                    
                    await loadYarns()
                    toast.success('Пряжа удалена')
                } catch (error) {
                    const errorMessage = error instanceof Error ? error.message : 'Ошибка при удалении пряжи'
                    toast.error(errorMessage)
                }
            }
        })
    }

    const openEditModal = (yarn: Yarn) => {
        setSelectedYarn(yarn)
        setFormData({name: yarn.name, article: yarn.article, brand: yarn.brand || '', color: yarn.color || '', composition: yarn.composition || '', weight_grams: yarn.weight_grams?.toString() || '', length_meters: yarn.length_meters?.toString() || '', price: yarn.price?.toString() || '', in_stock: yarn.in_stock, stock_quantity: yarn.stock_quantity?.toString() || '', image_url: yarn.image_url || '', description: yarn.description || ''})
        setShowEditModal(true)
    }

    const resetForm = () => {setFormData({name: '', article: '', brand: '', color: '', composition: '', weight_grams: '', length_meters: '', price: '', in_stock: true, stock_quantity: '', image_url: '', description: ''})}

    const filteredYarns = yarns.filter(yarn => {
        const matchesSearch = yarn.name.toLowerCase().includes(searchTerm.toLowerCase()) || yarn.article.toLowerCase().includes(searchTerm.toLowerCase()) || (yarn.brand && yarn.brand.toLowerCase().includes(searchTerm.toLowerCase()))
        const matchesStock = filterInStock === 'all' ? true : filterInStock === 'in_stock' ? yarn.in_stock : !yarn.in_stock
        return matchesSearch && matchesStock
    })

    if (loading) {
        return (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex items-center justify-center min-h-[60vh] bg-main">
                <div className="text-center">
                    <motion.div animate={{ rotate: 360 }} transition={{ duration: 1, repeat: Infinity, ease: "linear" }} className="w-16 h-16 border-4 border-firm-orange border-t-transparent rounded-full mx-auto" />
                    <p className="mt-4 font-['Montserrat_Alternates'] text-firm-gray flex items-center justify-center gap-2">Загрузка каталога пряжи...</p>
                </div>
            </motion.div>
        )
    }

    return (
        <>
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }} className="space-y-6 p-4 sm:p-6 bg-main min-h-screen">
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                    <motion.h1  initial={{ x: -20, opacity: 0 }} animate={{ x: 0, opacity: 1 }} className="font-['Montserrat_Alternates'] font-semibold text-2xl sm:text-3xl bg-linear-to-r from-firm-orange to-firm-pink bg-clip-text text-transparent">Каталог пряжи</motion.h1>
                    <motion.button whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }} onClick={() => setShowAddModal(true)} className="px-4 py-2 bg-linea-to-r from-firm-orange to-firm-pink text-main rounded-xl hover:shadow-lg transition-all duration-300 flex items-center gap-2"> <PlusIcon size={18} color="#f9f9f9" />Добавить пряжу</motion.button>
                </div>

                <motion.div initial={{ y: -20, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ delay: 0.1 }} className="flex flex-col sm:flex-row gap-4">
                    <div className="flex-1 relative">
                        <SearchIcon size={18} color="#737682" className="absolute left-3 top-1/2 transform -translate-y-1/2" />
                        <input type="text" placeholder="Поиск по названию, артикулу или бренду..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="w-full p-3 pl-10 rounded-xl bg-forms text-text outline-none focus:ring-2 focus:ring-firm-orange transition-all duration-300" />
                    </div>
                    <select value={filterInStock} onChange={(e) => setFilterInStock(e.target.value as 'all' | 'in_stock' | 'out_of_stock')} className="p-3 rounded-xl bg-forms text-text outline-none focus:ring-2 focus:ring-firm-pink transition-all duration-300 cursor-pointer" >
                        <option value="all">Все</option>
                        <option value="in_stock">В наличии</option>
                        <option value="out_of_stock">Нет в наличии</option>
                    </select>
                </motion.div>

                <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: 0.2 }} className="bg-main rounded-2xl shadow-xl overflow-hidden">
                    <div className="overflow-x-auto">
                        <table className="w-full">
                            <thead className="bg-linear-to-r from-gray-50 to-gray-100">
                                <tr>
                                    <th className="text-left p-4 font-['Montserrat_Alternates'] font-semibold text-firm-gray">Изображение</th>
                                    <th className="text-left p-4 font-['Montserrat_Alternates'] font-semibold text-firm-gray">Название / Артикул</th>
                                    <th className="text-left p-4 font-['Montserrat_Alternates'] font-semibold text-firm-gray hidden md:table-cell">Бренд / Цвет</th>
                                    <th className="text-left p-4 font-['Montserrat_Alternates'] font-semibold text-firm-gray hidden lg:table-cell">Характеристики</th>
                                    <th className="text-left p-4 font-['Montserrat_Alternates'] font-semibold text-firm-gray">Цена / Наличие</th>
                                    <th className="text-left p-4 font-['Montserrat_Alternates'] font-semibold text-firm-gray hidden sm:table-cell">Используется</th>
                                    <th className="text-left p-4 font-['Montserrat_Alternates'] font-semibold text-firm-gray">Действия</th>
                                </tr>
                            </thead>
                            <tbody>
                                <AnimatePresence>
                                    {filteredYarns.length === 0 ? (
                                        <motion.tr initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} >
                                            <td colSpan={7} className="text-center p-12 text-firm-gray">
                                                <PackageIcon size={48} color="#737682" className="mx-auto mb-4 opacity-50" />
                                                <p className="text-lg">Нет добавленной пряжи</p>
                                                <p className="text-sm mt-2">Нажмите кнопку &quot;Добавить пряжу&quot; чтобы начать</p>
                                            </td>
                                        </motion.tr>
                                    ) : (
                                        filteredYarns.map((yarn, index) => (
                                            <motion.tr key={yarn.id} initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 20 }} transition={{ delay: index * 0.03 }} className="border-b border-gray-100 hover:bg-linear-to-r hover:from-gray-50 to-transparent transition-all duration-300 group">
                                                <td className="p-4">
                                                    <motion.div whileHover={{ scale: 1.1 }} className="w-12 h-12 bg-linear-to-r from-gray-100 to-gray-200 rounded-xl overflow-hidden shadow-sm flex items-center justify-center" >
                                                        {yarn.image_url ? (<img src={yarn.image_url} alt={yarn.name} className="w-full h-full object-cover" />) : (<ImageIcon size={24} color="#737682" />)}
                                                    </motion.div>
                                                </td>
                                                <td className="p-4">
                                                    <div className="font-semibold text-text">{yarn.name}</div>
                                                    <div className="text-sm text-firm-gray">Арт: {yarn.article}</div>
                                                </td>
                                                <td className="p-4 hidden md:table-cell">
                                                    <div className="text-text">{yarn.brand || '—'}</div>
                                                    <div className="text-sm text-firm-gray">{yarn.color || '—'}</div>
                                                </td>
                                                <td className="p-4 hidden lg:table-cell">
                                                    <div className="text-sm text-firm-gray space-y-1">
                                                        {yarn.weight_grams && (
                                                            <div className="flex items-center gap-1">
                                                                <WeightIcon size={12} color="#737682" />
                                                                {yarn.weight_grams} г
                                                            </div>
                                                        )}
                                                        {yarn.length_meters && (
                                                            <div className="flex items-center gap-1">
                                                                <RulerIcon size={12} color="#737682" />
                                                                {yarn.length_meters} м
                                                            </div>
                                                        )}
                                                        {yarn.composition && (
                                                            <div className="text-xs text-firm-gray truncate max-w-[150px]">
                                                                {yarn.composition.substring(0, 30)}
                                                            </div>
                                                        )}
                                                    </div>
                                                </td>
                                                <td className="p-4">
                                                    <div className="font-semibold text-firm-orange">{yarn.price?.toLocaleString()} ₽</div>
                                                    <div className="text-sm">
                                                        {yarn.in_stock ? (<span className="text-firm-green flex items-center gap-1"><CheckCircleIcon size={12} color="#94D06C" />{yarn.stock_quantity} шт</span>) : (<span className="text-firm-red flex items-center gap-1"><CancelIcon size={12} color="#D77C7C" />Нет в наличии</span>)}
                                                    </div>
                                                </td>
                                                <td className="p-4 hidden sm:table-cell">
                                                    <span className="px-2 py-1 bg-firm-pink/20 text-firm-pink rounded-full text-xs font-medium"><Productslcon size={12} color="#D97C8E" /> {yarn.used_in_products || 0} товаров</span>
                                                </td>
                                                <td className="p-4">
                                                    <div className="flex gap-2">
                                                        <motion.button whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }} onClick={() => openEditModal(yarn)} className="px-3 py-1.5 text-sm bg-linear-to-r from-firm-orange to-firm-pink text-main rounded-lg hover:shadow-lg transition-all duration-300 flex items-center gap-1"><EditIcon size={14} color="#f9f9f9" />Ред.</motion.button>
                                                        <motion.button whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }} onClick={() => handleDeleteYarn(yarn)} className="px-3 py-1.5 text-sm bg-firm-red text-main rounded-lg hover:shadow-lg transition-all duration-300 flex items-center gap-1"><DeleteIcon size={14} color="#f9f9f9" />Удалить</motion.button>
                                                    </div>
                                                </td>
                                            </motion.tr>
                                        ))
                                    )}
                                </AnimatePresence>
                            </tbody>
                        </table>
                    </div>
                </motion.div>

                <AnimatePresence>
                    {showAddModal && (
                        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 bg-main-black/40 backdrop-blur-sm flex items-center justify-center z-50 p-4" onClick={() => setShowAddModal(false)}>
                            <motion.div initial={{ scale: 0.9, opacity: 0, y: 20 }} animate={{ scale: 1, opacity: 1, y: 0 }} exit={{ scale: 0.9, opacity: 0, y: 20 }} transition={{ type: "spring", damping: 25, stiffness: 300 }} className="bg-main rounded-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto shadow-2xl" onClick={(e) => e.stopPropagation()} >
                                <div className="p-6">
                                    <div className="flex justify-between items-center mb-4">
                                        <h2 className="font-['Montserrat_Alternates'] font-semibold text-2xl bg-linear-to-r from-firm-orange to-firm-pink bg-clip-text text-transparent">Добавить пряжу</h2>
                                        <button onClick={() => setShowAddModal(false)} className="text-firm-gray hover:text-text transition-colors"><CloseIcon size={24} color="#737682" /></button>
                                    </div>

                                    <form onSubmit={handleAddYarn} className="space-y-4">
                                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                            <div>
                                                <label className="block text-text mb-1 font-['Montserrat_Alternates']">Название *</label>
                                                <input type="text" name="name" value={formData.name} onChange={handleInputChange} required className="w-full p-3 rounded-xl bg-forms text-text outline-none focus:ring-2 focus:ring-firm-orange transition-all duration-300" />
                                            </div>
                                            <div>
                                                <label className="block text-text mb-1 font-['Montserrat_Alternates']">Артикул *</label>
                                                <input type="text" name="article" value={formData.article} onChange={handleInputChange} required className="w-full p-3 rounded-xl bg-forms text-text outline-none focus:ring-2 focus:ring-firm-orange transition-all duration-300" />
                                            </div>
                                        </div>

                                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                            <div>
                                                <label className="block text-text mb-1 font-['Montserrat_Alternates']">Бренд</label>
                                                <input type="text" name="brand" value={formData.brand} onChange={handleInputChange} className="w-full p-3 rounded-xl bg-forms text-text outline-none focus:ring-2 focus:ring-firm-pink transition-all duration-300" />
                                            </div>
                                            <div>
                                                <label className="block text-text mb-1 font-['Montserrat_Alternates']">Цвет</label>
                                                <input type="text" name="color" value={formData.color} onChange={handleInputChange} className="w-full p-3 rounded-xl bg-forms text-text outline-none focus:ring-2 focus:ring-firm-pink transition-all duration-300" />
                                            </div>
                                        </div>

                                        <div>
                                            <label className="block text-text mb-1 font-['Montserrat_Alternates']">Состав</label>
                                            <input type="text" name="composition" value={formData.composition} onChange={handleInputChange} className="w-full p-3 rounded-xl bg-forms text-text outline-none focus:ring-2 focus:ring-firm-orange transition-all duration-300" placeholder="100% шерсть, 50% акрил 50% полиамид..." />
                                        </div>

                                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                            <div>
                                                <label className="block text-text mb-1 font-['Montserrat_Alternates']">Вес (г)</label>
                                                <input type="number" name="weight_grams" value={formData.weight_grams} onChange={handleInputChange} step="0.01" className="w-full p-3 rounded-xl bg-forms text-text outline-none focus:ring-2 focus:ring-firm-pink transition-all duration-300" />
                                            </div>
                                            <div>
                                                <label className="block text-text mb-1 font-['Montserrat_Alternates']">Длина (м)</label>
                                                <input type="number" name="length_meters" value={formData.length_meters} onChange={handleInputChange} step="0.01" className="w-full p-3 rounded-xl bg-forms text-text outline-none focus:ring-2 focus:ring-firm-pink transition-all duration-300" />
                                            </div>
                                        </div>

                                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                            <div>
                                                <label className="block text-text mb-1 font-['Montserrat_Alternates']">Цена (₽)</label>
                                                <input type="number" name="price" value={formData.price} onChange={handleInputChange} step="0.01" className="w-full p-3 rounded-xl bg-forms text-text outline-none focus:ring-2 focus:ring-firm-orange transition-all duration-300" />
                                            </div>
                                            <div>
                                                <label className="block text-text mb-1 font-['Montserrat_Alternates']">Количество на складе</label>
                                                <input type="number" name="stock_quantity" value={formData.stock_quantity} onChange={handleInputChange} className="w-full p-3 rounded-xl bg-forms text-text outline-none focus:ring-2 focus:ring-firm-orange transition-all duration-300" />
                                            </div>
                                        </div>

                                        <div className="flex items-center gap-3">
                                            <input type="checkbox" name="in_stock" checked={formData.in_stock} onChange={handleInputChange}  className="w-5 h-5 rounded accent-firm-orange" />
                                            <label className="text-text">В наличии</label>
                                        </div>

                                        <div>
                                            <label className="block text-text mb-1 font-['Montserrat_Alternates']">URL изображения</label>
                                            <input type="url" name="image_url" value={formData.image_url} onChange={handleInputChange} className="w-full p-3 rounded-xl bg-forms text-text outline-none focus:ring-2 focus:ring-firm-pink transition-all duration-300" placeholder="https://..." />
                                        </div>

                                        <div>
                                            <label className="block text-text mb-1 font-['Montserrat_Alternates']">Описание</label>
                                            <textarea name="description" value={formData.description} onChange={handleInputChange} rows={3} className="w-full p-3 rounded-xl bg-forms text-text outline-none focus:ring-2 focus:ring-firm-orange transition-all duration-300" />
                                        </div>

                                        <div className="flex gap-3 pt-4">
                                            <motion.button type="submit" whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}  disabled={saving}  className="flex-1 py-3 bg-linear-to-r from-firm-orange to-firm-pink text-main rounded-xl hover:shadow-lg transition-all duration-300 disabled:opacity-50 font-medium flex items-center justify-center gap-2">{saving ? (<><RefreshIcon size={18} color="#f9f9f9" className="animate-spin" />Сохранение...</>) : (<><PlusIcon size={18} color="#f9f9f9" />Добавить</>)}</motion.button>
                                            <button type="button" onClick={() => setShowAddModal(false)} className="flex-1 py-3 border border-gray-300 rounded-xl hover:bg-forms transition-all duration-300 text-text">Отмена</button>
                                        </div>
                                    </form>
                                </div>
                            </motion.div>
                        </motion.div>
                    )}
                </AnimatePresence>

                <AnimatePresence>
                    {showEditModal && selectedYarn && (
                        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 bg-main-black/40 backdrop-blur-sm flex items-center justify-center z-50 p-4" onClick={() => setShowEditModal(false)}>
                            <motion.div initial={{ scale: 0.9, opacity: 0, y: 20 }} animate={{ scale: 1, opacity: 1, y: 0 }} exit={{ scale: 0.9, opacity: 0, y: 20 }} transition={{ type: "spring", damping: 25, stiffness: 300 }} className="bg-main rounded-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto shadow-2xl" onClick={(e) => e.stopPropagation()}>
                                <div className="p-6">
                                    <div className="flex justify-between items-center mb-4">
                                        <h2 className="font-['Montserrat_Alternates'] font-semibold text-2xl bg-linear-to-r from-firm-orange to-firm-pink bg-clip-text text-transparent">Редактировать пряжу</h2>
                                        <button onClick={() => setShowEditModal(false)} className="text-firm-gray hover:text-text transition-colors"><CloseIcon size={24} color="#737682" /></button>
                                    </div>

                                    <form onSubmit={handleEditYarn} className="space-y-4">
                                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                            <div>
                                                <label className="block text-text mb-1 font-['Montserrat_Alternates']">Название *</label>
                                                <input type="text" name="name" value={formData.name} onChange={handleInputChange} required className="w-full p-3 rounded-xl bg-forms text-text outline-none focus:ring-2 focus:ring-firm-orange transition-all duration-300" />
                                            </div>
                                            <div>
                                                <label className="block text-text mb-1 font-['Montserrat_Alternates']">Артикул *</label>
                                                <input type="text" name="article" value={formData.article} onChange={handleInputChange} required className="w-full p-3 rounded-xl bg-forms text-text outline-none focus:ring-2 focus:ring-firm-orange transition-all duration-300" />
                                            </div>
                                        </div>

                                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                            <div>
                                                <label className="block text-text mb-1 font-['Montserrat_Alternates']">Бренд</label>
                                                <input type="text" name="brand" value={formData.brand} onChange={handleInputChange} className="w-full p-3 rounded-xl bg-forms text-text outline-none focus:ring-2 focus:ring-firm-pink transition-all duration-300" />
                                            </div>
                                            <div>
                                                <label className="block text-text mb-1 font-['Montserrat_Alternates']">Цвет</label>
                                                <input type="text" name="color" value={formData.color} onChange={handleInputChange} className="w-full p-3 rounded-xl bg-forms text-text outline-none focus:ring-2 focus:ring-firm-pink transition-all duration-300" />
                                            </div>
                                        </div>

                                        <div>
                                            <label className="block text-text mb-1 font-['Montserrat_Alternates']">Состав</label>
                                            <input type="text" name="composition" value={formData.composition} onChange={handleInputChange} className="w-full p-3 rounded-xl bg-forms text-text outline-none focus:ring-2 focus:ring-firm-orange transition-all duration-300" />
                                        </div>

                                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                            <div>
                                                <label className="block text-text mb-1 font-['Montserrat_Alternates']">Вес (г)</label>
                                                <input type="number" name="weight_grams" value={formData.weight_grams} onChange={handleInputChange} step="0.01" className="w-full p-3 rounded-xl bg-forms text-text outline-none focus:ring-2 focus:ring-firm-pink transition-all duration-300" />
                                            </div>
                                            <div>
                                                <label className="block text-text mb-1 font-['Montserrat_Alternates']">Длина (м)</label>
                                                <input type="number" name="length_meters" value={formData.length_meters} onChange={handleInputChange} step="0.01" className="w-full p-3 rounded-xl bg-forms text-text outline-none focus:ring-2 focus:ring-firm-pink transition-all duration-300" />
                                            </div>
                                        </div>

                                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                            <div>
                                                <label className="block text-text mb-1 font-['Montserrat_Alternates']">Цена (₽)</label>
                                                <input type="number" name="price" value={formData.price} onChange={handleInputChange} step="0.01" className="w-full p-3 rounded-xl bg-forms text-text outline-none focus:ring-2 focus:ring-firm-orange transition-all duration-300" />
                                            </div>
                                            <div>
                                                <label className="block text-text mb-1 font-['Montserrat_Alternates']">Количество на складе</label>
                                                <input type="number" name="stock_quantity" value={formData.stock_quantity} onChange={handleInputChange} className="w-full p-3 rounded-xl bg-forms text-text outline-none focus:ring-2 focus:ring-firm-orange transition-all duration-300" />
                                            </div>
                                        </div>

                                        <div className="flex items-center gap-3">
                                            <input type="checkbox" name="in_stock" checked={formData.in_stock} onChange={handleInputChange} className="w-5 h-5 rounded accent-firm-orange" />
                                            <label className="text-text">В наличии</label>
                                        </div>

                                        <div>
                                            <label className="block text-text mb-1 font-['Montserrat_Alternates']">URL изображения</label>
                                            <input type="url" name="image_url" value={formData.image_url} onChange={handleInputChange} className="w-full p-3 rounded-xl bg-forms text-text outline-none focus:ring-2 focus:ring-firm-pink transition-all duration-300" />
                                        </div>

                                        <div>
                                            <label className="block text-text mb-1 font-['Montserrat_Alternates']">Описание</label>
                                            <textarea name="description" value={formData.description} onChange={handleInputChange} rows={3} className="w-full p-3 rounded-xl bg-forms text-text outline-none focus:ring-2 focus:ring-firm-orange transition-all duration-300" />
                                        </div>

                                        <div className="flex gap-3 pt-4">
                                            <motion.button type="submit" whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }} disabled={saving} className="flex-1 py-3 bg-linear-to-r from-firm-orange to-firm-pink text-main rounded-xl hover:shadow-lg transition-all duration-300 disabled:opacity-50 font-medium flex items-center justify-center gap-2">{saving ? (<><RefreshIcon size={18} color="#f9f9f9" className="animate-spin" />Сохранение...</>) : (<><SaveIcon size={18} color="#f9f9f9" />Сохранить</>)}</motion.button>
                                            <button type="button" onClick={() => setShowEditModal(false)} className="flex-1 py-3 border border-gray-300 rounded-xl hover:bg-forms transition-all duration-300 text-text">Отмена</button>
                                        </div>
                                    </form>
                                </div>
                            </motion.div>
                        </motion.div>
                    )}
                </AnimatePresence>
            </motion.div>

            <ConfirmModal isOpen={confirmModal.isOpen} title={confirmModal.title} message={confirmModal.message} type={confirmModal.type} onConfirm={confirmModal.onConfirm} onCancel={() => setConfirmModal(prev => ({ ...prev, isOpen: false }))} />
        </>
    )
}