'use client'

import Link from "next/link"
import { motion } from "framer-motion"
import { useState } from "react"
import { EditIcon } from "@/components/icons/EditIcon"
import { DeleteIcon } from "@/components/icons/DeleteIcon"
import { ViewsIcon } from "@/components/icons/ViewsIcon"
import { CalendarIcon } from "@/components/icons/CalendarIcon"
import { Productslcon } from "@/components/icons/Productslcon"
import AddProductModal from "@/components/modals/AddProductModal"
import EditProductModal from "@/components/modals/EditProductModal"

export interface Product {
  id: string;
  title: string;
  price: number;
  main_image_url: string | null;
  master_name?: string;
  views: number;
  created_at: string;
  status: 'moderation' | 'active' | 'draft' | 'rejected' | 'blocked';
  category?: string;
  technique?: string;
  size?: string;
  color?: string;
  care_instructions?: string;
  description?: string;
  images?: Array<{ id: string; image_url: string; sort_order: number }>;
}

interface MasterProductsListProps {
    products: Product[]
    onDelete: (productId: string) => void
    onProductAdded?: () => void
    masterName?: string
    loading?: boolean
    categories?: CategoryItem[]
    yarns?: YarnItem[]
}

interface CategoryItem {
    id: number;
    name: string;
    subcategories?: CategoryItem[];
}

interface YarnItem {
    id: string;
    name: string;
    brand: string;
}

const getStatusColor = (status: string) => {
    switch(status){
        case 'moderation': return 'bg-yellow-50 text-yellow-700 border-yellow-200'
        case 'active': return 'bg-green-50 text-firm-green border-green-200'
        case 'draft': return 'bg-gray-50 text-firm-gray border-gray-200'
        case 'rejected': return 'bg-red-50 text-firm-red border-red-200'
        case 'blocked': return 'bg-red-50 text-firm-red border-red-200'
        default: return 'bg-gray-50 text-firm-gray border-gray-200'
    }
}

const getStatusText = (status: string) => {
    switch(status){
        case 'moderation': return 'На модерации'
        case 'active': return 'Активен'
        case 'draft': return 'Черновик'
        case 'rejected': return 'Отклонен'
        case 'blocked': return 'Заблокирован'
        default: return status
    }
}

const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('ru-RU', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric'
    })
}

export default function MasterProductsList({
    products, 
    onDelete, 
    onProductAdded, 
    masterName, 
    loading = false, 
    categories = [], 
    yarns = []
}: MasterProductsListProps) {
    const [showAddModal, setShowAddModal] = useState(false)
    const [editingProduct, setEditingProduct] = useState<Product | null>(null)
    const [isEditModalOpen, setIsEditModalOpen] = useState(false)
    const [hoveredEditId, setHoveredEditId] = useState<string | null>(null)
    const [hoveredDeleteId, setHoveredDeleteId] = useState<string | null>(null)

    const handleEditClick = (product: Product) => {
        setEditingProduct(product)
        setIsEditModalOpen(true)
    }

    if (loading) {
        return (
            <div className="flex justify-center py-12">
                <motion.div animate={{ rotate: 360 }} transition={{ duration: 1, repeat: Infinity, ease: "linear" }} className="w-8 h-8 border-2 border-firm-orange border-t-transparent rounded-full" />
            </div>
        )
    }

    if (products.length === 0) {
        return (
            <>
                <motion.div 
                    initial={{ opacity: 0, y: 20 }} 
                    animate={{ opacity: 1, y: 0 }} 
                    className="text-center py-12 bg-gray-50 rounded-xl"
                >
                    <Productslcon className="w-16 h-16 mx-auto text-firm-gray mb-4" />
                    <p className="text-firm-gray mb-4">У вас пока нет товаров</p>
                    <button onClick={() => setShowAddModal(true)} className="inline-flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-firm-orange to-firm-pink text-white rounded-xl hover:shadow-lg transition-all duration-300">
                        Добавить первый товар →
                    </button>
                </motion.div>
                
                <AddProductModal 
                    isOpen={showAddModal} 
                    onClose={() => setShowAddModal(false)} 
                    onSuccess={() => {
                        setShowAddModal(false);
                        if (onProductAdded) onProductAdded()
                    }} 
                    categories={categories} 
                    yarns={yarns} 
                />
            </>
        )
    }

    return (
        <>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-5">
                {products.map((product, index) => (
                    <motion.div
                        key={product.id}
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: index * 0.05 }}
                        whileHover={{ y: -5 }}
                        className="bg-main rounded-xl overflow-hidden shadow-md hover:shadow-xl transition-all duration-300 group border border-gray-100 flex flex-col"
                    >
                        <Link href={`/catalog/${product.id}`} className="block relative aspect-square bg-gray-100 overflow-hidden">
                            {product.main_image_url ? (
                                <img
                                    src={product.main_image_url}
                                    alt={product.title}
                                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                                />
                            ) : (
                                <div className="w-full h-full flex items-center justify-center">
                                    <Productslcon className="w-12 h-12" color="#D1D5DB" />
                                </div>
                            )}
                            
                            <div className="absolute top-2 left-2">
                                <span className={`px-2 py-0.5 rounded-full text-[10px] font-medium border ${getStatusColor(product.status)}`}>
                                    {getStatusText(product.status)}
                                </span>
                            </div>
                        </Link>

                        <div className="p-3 flex flex-col flex-1">
                            <Link href={`/catalog/${product.id}`} className="flex-1">
                                <h3 className="font-['Montserrat_Alternates'] font-semibold text-sm mb-1 line-clamp-2 hover:text-firm-orange transition-colors text-text">
                                    {product.title}
                                </h3>
                            </Link>
                            <p className="text-[11px] text-firm-gray mb-2 line-clamp-1">
                                {product.master_name || masterName}
                            </p>
                            
                            <div className="flex items-center justify-between mt-auto">
                                <span className="font-['Montserrat_Alternates'] font-bold text-base text-firm-pink">
                                    {product.price.toLocaleString()} ₽
                                </span>
                                
                                <div className="flex gap-1.5">
                                    <button
                                        onMouseEnter={() => setHoveredEditId(product.id)}
                                        onMouseLeave={() => setHoveredEditId(null)}
                                        onClick={() => handleEditClick(product)}
                                        className="p-1.5 rounded-lg bg-gray-100 hover:bg-firm-orange transition-all duration-300"
                                        title="Редактировать"
                                    >
                                        <EditIcon 
                                            className="w-3.5 h-3.5 transition-all duration-300" 
                                            color={hoveredEditId === product.id ? "#f9f9f9" : "#F4A67F"} 
                                        />
                                    </button>
                                    <button
                                        onMouseEnter={() => setHoveredDeleteId(product.id)}
                                        onMouseLeave={() => setHoveredDeleteId(null)}
                                        onClick={() => onDelete(product.id)}
                                        className="p-1.5 rounded-lg bg-gray-100 hover:bg-firm-red transition-all duration-300"
                                        title="Удалить"
                                    >
                                        <DeleteIcon 
                                            className="w-3.5 h-3.5 transition-all duration-300" 
                                            color={hoveredDeleteId === product.id ? "#f9f9f9" : "#D77C7C"} 
                                        />
                                    </button>
                                </div>
                            </div>
        
                            <div className="mt-2 pt-2 border-t border-gray-100 flex justify-between items-center text-[10px] text-firm-gray">
                                <div className="flex items-center gap-0.5">
                                    <ViewsIcon />
                                    <span>{product.views || 0}</span>
                                </div>
                                <div className="flex items-center gap-0.5">
                                    <CalendarIcon className="w-2.5 h-2.5" color="#737682" />
                                    <span>{formatDate(product.created_at)}</span>
                                </div>
                            </div>
                        </div>
                    </motion.div>
                ))}
            </div>

            <AddProductModal 
                isOpen={showAddModal} 
                onClose={() => setShowAddModal(false)} 
                onSuccess={() => {
                    setShowAddModal(false);
                    if (onProductAdded) onProductAdded()
                }} 
                categories={categories} 
                yarns={yarns} 
            />
            
            <EditProductModal 
                isOpen={isEditModalOpen} 
                onClose={() => {
                    setIsEditModalOpen(false);
                    setEditingProduct(null);
                }} 
                onSuccess={() => {
                    setIsEditModalOpen(false);
                    setEditingProduct(null);
                    if (onProductAdded) onProductAdded();
                }} 
                product={editingProduct ? {
                    id: editingProduct.id,
                    title: editingProduct.title,
                    description: editingProduct.description || "",
                    price: editingProduct.price,
                    category: editingProduct.category || "",
                    technique: editingProduct.technique || "",
                    size: editingProduct.size || "",
                    care_instructions: editingProduct.care_instructions || "",
                    color: editingProduct.color || ""
                } : {
                    id: "",
                    title: "",
                    description: "",
                    price: 0,
                    category: "",
                    technique: "",
                    size: "",
                    care_instructions: "",
                    color: ""
                }} 
                categories={categories} 
            />
        </>
    )
}