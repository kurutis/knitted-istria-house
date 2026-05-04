'use client'

import React, { useState, useEffect, useRef, JSX } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { useRouter } from 'next/navigation'
import MediaGallery from '@/components/blog/MediaGallery'
import { AnimatedButton } from '@/components/ui/AnimatedButton'
import { motion, AnimatePresence } from 'framer-motion'

interface Order {
    id: string
    order_number: string
    status: 'new' | 'confirmed' | 'shipped' | 'delivered' | 'cancelled'
    created_at: string
    product_title: string
    buyer_name: string
    total_amount: number
}

interface BlogPost {
    id: string
    title: string
    content: string
    excerpt: string
    images?: Array<{ id: string; url: string; sort_order: number }>
    main_image_url: string
    created_at: string
    views_count: number
    likes_count: number
    comments_count: number
    author_name: string
    author_avatar: string
    master_id: string
    is_liked?: boolean
    comments?: Array<{
        id: string;
        content: string;
        created_at: string;
        author_name: string;
        author_avatar?: string;
    }>
}

interface Notification {
    id: string
    type: 'order' | 'comment' | 'review' | 'system'
    title: string
    message: string
    is_read: boolean
    created_at: string
    link?: string
}

interface MasterStats {
    total_orders: number
    new_orders: number
    total_products: number
    total_views: number
    total_followers: number
}

type CategoryItem = {
    id: number;
    name: string;
    subcategories?: CategoryItem[];
}

export default function MasterDashboard({ session }: { session: { user: { id: string; name: string; email: string; role: string } } | null }) {
    const router = useRouter()
    const [orders, setOrders] = useState<Order[]>([])
    const [recentPosts, setRecentPosts] = useState<BlogPost[]>([])
    const [myPosts, setMyPosts] = useState<BlogPost[]>([])
    const [notifications, setNotifications] = useState<Notification[]>([])
    const [stats, setStats] = useState<MasterStats>({total_orders: 0, new_orders: 0, total_products: 0, total_views: 0, total_followers: 0})
    const [loading, setLoading] = useState(true)
    const [showNotifications, setShowNotifications] = useState(false)
    const [showAddProductModal, setShowAddProductModal] = useState(false)
    const [showAddPostModal, setShowAddPostModal] = useState(false)
    const [showAddClassModal, setShowAddClassModal] = useState(false)
    const [showComments, setShowComments] = useState<string | null>(null)
    const [commentText, setCommentText] = useState('')
    const [commentLoading, setCommentLoading] = useState(false)
    const [saving, setSaving] = useState(false)
    const [activeTab, setActiveTab] = useState<'recent' | 'my'>('recent')
    const fileInputRef = useRef<HTMLInputElement>(null)
    const [categories, setCategories] = useState<{ id: number; name: string; subcategories?: { id: number; name: string; subcategories?: unknown[] }[] }[]>([])
    const [yarns, setYarns] = useState<{ id: string; name: string; brand: string }[]>([])
    const [images, setImages] = useState<File[]>([])
    const [imagePreviews, setImagePreviews] = useState<string[]>([])
    const techniques = ['Лицевая гладь', 'Изнаночная гладь', 'Резинка', 'Платочная вязка', 'Косы', 'Араны', 'Жаккард', 'Ленивый жаккард', 'Патентная резинка', 'Ажур', 'Сетка', 'Рис', 'Путанка', 'Бриошь', 'Другое']
    const sizes = ['XS', 'S', 'M', 'L', 'XL', 'XXL', 'Не применимо']
    const [postImages, setPostImages] = useState<File[]>([])
    const [postImagePreviews, setPostImagePreviews] = useState<string[]>([])
    const postFileInputRef = useRef<HTMLInputElement>(null)
    const [postForm, setPostForm] = useState({title: '', content: '', excerpt: '', category: '', tags: ''})
    const blogTags = ['Мастер-класс', 'Обзор пряжи', 'Новая коллекция', 'Советы', 'Вдохновение', 'История создания', 'Техника вязания', 'Новости']
    const [productForm, setProductForm] = useState({title: '', description: '', price: '', category: '', technique: '', size: '', care_instructions: '', yarn_id: '', custom_yarn: '', color: ''})
    const [classImages, setClassImages] = useState<File[]>([])
    const [classImagePreviews, setClassImagePreviews] = useState<string[]>([])
    const classFileInputRef = useRef<HTMLInputElement>(null)
    const [classForm, setClassForm] = useState({title: '', description: '', type: 'online', price: '', max_participants: '', date_time: '', duration_minutes: '', location: '', online_link: '', materials: ''})

    useEffect(() => {fetchMasterData()}, [])

    useEffect(() => {
        if (showAddProductModal) {
            loadCategories()
            loadYarns()
        }
    }, [showAddProductModal])

    const handleClassInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
        const { name, value } = e.target
        setClassForm(prev => ({ ...prev, [name]: value }))
    }

    const handleClassImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
        const files = Array.from(e.target.files || [])
        
        if (classImages.length + files.length > 10) {
            alert('Можно загрузить не более 10 фотографий')
            return
        }
        
        const validFiles = files.filter(file => {
            if (file.size > 10 * 1024 * 1024) {
                alert(`Файл ${file.name} превышает 10MB`)
                return false
            }
            if (!file.type.startsWith('image/')) {
                alert(`Файл ${file.name} не является изображением`)
                return false
            }
            return true
        })
        
        setClassImages(prev => [...prev, ...validFiles])
        
        validFiles.forEach(file => {
            const reader = new FileReader()
            reader.onloadend = () => {
                setClassImagePreviews(prev => [...prev, reader.result as string])
            }
            reader.readAsDataURL(file)
        })
    }

    const removeClassImage = (index: number) => {
        setClassImages(prev => prev.filter((_, i) => i !== index))
        setClassImagePreviews(prev => prev.filter((_, i) => i !== index))
    }

    const handleSubmitClass = async (e: React.FormEvent) => {
        e.preventDefault()
        
        if (!classForm.title) {
            alert('Введите название мастер-класса')
            return
        }
        
        if (!classForm.description) {
            alert('Введите описание мастер-класса')
            return
        }
        
        if (!classForm.date_time) {
            alert('Укажите дату и время проведения')
            return
        }
        
        setSaving(true)

        try {
            const formData = new FormData()
            formData.append('title', classForm.title)
            formData.append('description', classForm.description)
            formData.append('type', classForm.type)
            formData.append('price', classForm.price)
            formData.append('max_participants', classForm.max_participants)
            formData.append('date_time', classForm.date_time)
            formData.append('duration_minutes', classForm.duration_minutes)
            formData.append('location', classForm.location)
            formData.append('online_link', classForm.online_link)
            formData.append('materials', classForm.materials)

            if (classImages.length > 0) {
                formData.append('image', classImages[0])
            }

            const response = await fetch('/api/master/master-classes', {
                method: 'POST',
                body: formData
            })

            const data = await response.json()

            if (!response.ok) {
                throw new Error(data.error || 'Failed to create master class')
            }

            setShowAddClassModal(false)
            resetClassForm()
            fetchMasterData()
            alert('Мастер-класс успешно создан!')
        } catch (error) {
            console.error('Ошибка при создании мастер-класса:', error)
            alert('Ошибка при создании мастер-класса')
        } finally {
            setSaving(false)
        }
    }

    const resetClassForm = () => {
        setClassForm({
            title: '',
            description: '',
            type: 'online',
            price: '',
            max_participants: '',
            date_time: '',
            duration_minutes: '',
            location: '',
            online_link: '',
            materials: ''
        })
        setClassImages([])
        setClassImagePreviews([])
    }

    const handleLike = async (postId: string, isFromMyPosts = false) => {
        if (!session) {
            window.location.href = '/auth/signin?callbackUrl=/master/dashboard'
            return
        }

        try {
            const post = isFromMyPosts ? myPosts.find(p => p.id === postId) : recentPosts.find(p => p.id === postId)
            const response = await fetch(`/api/blog/posts/${postId}/like`, {
                method: post?.is_liked ? 'DELETE' : 'POST'
            })

            if (response.ok) {
                if (isFromMyPosts) {
                    setMyPosts(prev => prev.map(p => 
                        p.id === postId 
                            ? { 
                                ...p, 
                                is_liked: !p.is_liked,
                                likes_count: p.is_liked ? p.likes_count - 1 : p.likes_count + 1
                              }
                            : p
                    ))
                } else {
                    setRecentPosts(prev => prev.map(p => 
                        p.id === postId 
                            ? { 
                                ...p, 
                                is_liked: !p.is_liked,
                                likes_count: p.is_liked ? p.likes_count - 1 : p.likes_count + 1
                              }
                            : p
                    ))
                }
            }
        } catch (error) {
            console.error('Error toggling like:', error)
        }
    }

    const handleComment = async (postId: string, isFromMyPosts = false) => {
        if (!session) {
            window.location.href = '/auth/signin?callbackUrl=/master/dashboard'
            return
        }

        if (!commentText.trim()) return

        setCommentLoading(true)
        try {
            const response = await fetch(`/api/blog/posts/${postId}/comment`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ content: commentText })
            })

            if (response.ok) {
                const newComment = await response.json()
                if (isFromMyPosts) {
                    setMyPosts(prev => prev.map(p =>
                        p.id === postId
                            ? {
                                ...p,
                                comments: [newComment, ...(p.comments || [])],
                                comments_count: p.comments_count + 1
                              }
                            : p
                    ))
                } else {
                    setRecentPosts(prev => prev.map(p =>
                        p.id === postId
                            ? {
                                ...p,
                                comments: [newComment, ...(p.comments || [])],
                                comments_count: p.comments_count + 1
                              }
                            : p
                    ))
                }
                setCommentText('')
                setShowComments(postId)
            }
        } catch (error) {
            console.error('Error adding comment:', error)
        } finally {
            setCommentLoading(false)
        }
    }

    const fetchMasterData = async () => {
        try {
            setLoading(true)
            
            const [ordersRes, recentPostsRes, myPostsRes, notifRes, statsRes] = await Promise.all([
                fetch('/api/master/orders'),
                fetch('/api/blog/posts?limit=4'),
                fetch('/api/master/blog'),
                fetch('/api/master/notifications'),
                fetch('/api/master/stats')
            ])
            
            const ordersData = await ordersRes.json()
            const recentPostsData = await recentPostsRes.json()
            const myPostsData = await myPostsRes.json()
            const notifData = await notifRes.json()
            const statsData = await statsRes.json()
            
            // ✅ Проверяем, что данные являются массивами
            setOrders(Array.isArray(ordersData) ? ordersData : [])
            setRecentPosts(Array.isArray(recentPostsData) ? recentPostsData : [])
            setMyPosts(Array.isArray(myPostsData) ? myPostsData : [])
            setNotifications(Array.isArray(notifData) ? notifData : [])
            setStats(statsData || { total_orders: 0, new_orders: 0, total_products: 0, total_views: 0, total_followers: 0 })
            
            // ✅ Также проверьте products в stats, если там есть products
            // Если statsData содержит products, убедитесь что это массив
            
        } catch (error) {
            console.error('Error fetching master data:', error)
            // Устанавливаем значения по умолчанию при ошибке
            setOrders([])
            setRecentPosts([])
            setMyPosts([])
            setNotifications([])
            setStats({ total_orders: 0, new_orders: 0, total_products: 0, total_views: 0, total_followers: 0 })
        } finally {
            setLoading(false)
        }
    }

    const loadCategories = async () => {
        try {
            const response = await fetch('/api/catalog/categories')
            const data = await response.json()
            setCategories(data.categories || [])
        } catch (error) {
            console.error('Ошибка загрузки категорий:', error)
        }
    }

    const loadYarns = async () => {
        try {
            const response = await fetch('/api/catalog/yarn')
            const data = await response.json()
            setYarns(data || [])
        } catch (error) {
            console.error('Ошибка загрузки пряжи:', error)
        }
    }

    const renderCategoryOptions = (categories: CategoryItem[], level = 0) => {
        const options: JSX.Element[] = []
        categories.forEach(cat => {
            const prefix = '—'.repeat(level)
            options.push(
                <option key={cat.id} value={cat.name}>{prefix} {cat.name}</option>
            )
            if (cat.subcategories && cat.subcategories.length > 0) {
                options.push(...renderCategoryOptions(cat.subcategories, level + 1))
            }
        })
        return options
    }

    const handleProductInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
        const { name, value } = e.target
        setProductForm(prev => ({ ...prev, [name]: value }))
    }

    const handlePostInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
        const { name, value } = e.target
        setPostForm(prev => ({ ...prev, [name]: value }))
    }

    const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
        const files = Array.from(e.target.files || [])
        
        if (images.length + files.length > 10) {
            alert('Можно загрузить не более 10 фотографий')
            return
        }
        
        const validFiles = files.filter(file => {
            if (file.size > 10 * 1024 * 1024) {
                alert(`Файл ${file.name} превышает 10MB`)
                return false
            }
            if (!file.type.startsWith('image/')) {
                alert(`Файл ${file.name} не является изображением`)
                return false
            }
            return true
        })
        
        setImages(prev => [...prev, ...validFiles])
        
        validFiles.forEach(file => {
            const reader = new FileReader()
            reader.onloadend = () => {setImagePreviews(prev => [...prev, reader.result as string])}
            reader.readAsDataURL(file)
        })
    }

    const removeImage = (index: number) => {
        setImages(prev => prev.filter((_, i) => i !== index))
        setImagePreviews(prev => prev.filter((_, i) => i !== index))
    }

    const moveImage = (fromIndex: number, toIndex: number) => {
        const newImages = [...images]
        const newPreviews = [...imagePreviews]
        
        const [movedImage] = newImages.splice(fromIndex, 1)
        const [movedPreview] = newPreviews.splice(fromIndex, 1)
        
        newImages.splice(toIndex, 0, movedImage)
        newPreviews.splice(toIndex, 0, movedPreview)
        
        setImages(newImages)
        setImagePreviews(newPreviews)
    }

    const markNotificationAsRead = async (notificationId: string) => {
        try {
            await fetch(`/api/master/notifications/${notificationId}`, { method: 'PATCH' })
            setNotifications(prev => prev.map(n => n.id === notificationId ? { ...n, is_read: true } : n))
        } catch (error) {
            console.error('Error marking notification as read:', error)
        }
    }

    const getStatusColor = (status: string) => {
        switch(status) {
            case 'new': return 'bg-blue-100 text-blue-700'
            case 'confirmed': return 'bg-green-100 text-green-700'
            case 'shipped': return 'bg-purple-100 text-purple-700'
            case 'delivered': return 'bg-gray-100 text-gray-700'
            case 'cancelled': return 'bg-red-100 text-red-700'
            default: return 'bg-gray-100 text-gray-700'
        }
    }

    const getStatusText = (status: string) => {
        switch(status) {
            case 'new': return '🆕 Новый'
            case 'confirmed': return '✅ Подтвержден'
            case 'shipped': return '📦 Отправлен'
            case 'delivered': return '🏠 Доставлен'
            case 'cancelled': return '❌ Отменен'
            default: return status
        }
    }

    const getNotificationIcon = (type: string) => {
        switch(type) {
            case 'order': return '📦'
            case 'comment': return '💬'
            case 'review': return '⭐'
            default: return '🔔'
        }
    }

    const handlePostImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
        const files = Array.from(e.target.files || [])
        
        if (postImages.length + files.length > 10) {
            alert('Можно загрузить не более 10 фотографий')
            return
        }
        
        const validFiles = files.filter(file => {
            if (file.size > 10 * 1024 * 1024) {
                alert(`Файл ${file.name} превышает 10MB`)
                return false
            }
            if (!file.type.startsWith('image/')) {
                alert(`Файл ${file.name} не является изображением`)
                return false
            }
            return true
        })
        
        setPostImages(prev => [...prev, ...validFiles])
        
        validFiles.forEach(file => {
            const reader = new FileReader()
            reader.onloadend = () => {
                setPostImagePreviews(prev => [...prev, reader.result as string])
            }
            reader.readAsDataURL(file)
        })
    }

    const removePostImage = (index: number) => {
        setPostImages(prev => prev.filter((_, i) => i !== index))
        setPostImagePreviews(prev => prev.filter((_, i) => i !== index))
    }

    const handleSubmitPost = async (e: React.FormEvent) => {
        e.preventDefault()
        
        if (!postForm.title) {
            alert('Введите заголовок поста')
            return
        }
        
        if (!postForm.content) {
            alert('Введите содержание поста')
            return
        }
        
        setSaving(true)

        try {
            const formData = new FormData()
            formData.append('title', postForm.title)
            formData.append('content', postForm.content)
            formData.append('excerpt', postForm.excerpt)
            formData.append('category', postForm.category)
            formData.append('tags', postForm.tags)

            postImages.forEach(image => {
                formData.append('images', image)
            })

            const response = await fetch('/api/master/blog', {
                method: 'POST',
                body: formData
            })

            const data = await response.json()

            if (!response.ok) {
                throw new Error(data.error || 'Failed to create post')
            }

            setShowAddPostModal(false)
            resetPostForm()
            fetchMasterData()
            alert('Пост успешно создан!')
        } catch (error) {
            console.error('Ошибка при создании поста:', error)
            alert('Ошибка при создании поста')
        } finally {
            setSaving(false)
        }
    }

    const resetPostForm = () => {
        setPostForm({
            title: '',
            content: '',
            excerpt: '',
            category: '',
            tags: ''
        })
        setPostImages([])
        setPostImagePreviews([])
    }

    const handleSubmitProduct = async (e: React.FormEvent) => {
        e.preventDefault()
        
        if (images.length === 0) {
            alert('Добавьте хотя бы одну фотографию товара')
            return
        }
        
        setSaving(true)

        try {
            const formData = new FormData()
            formData.append('title', productForm.title)
            formData.append('description', productForm.description)
            formData.append('price', productForm.price)
            formData.append('category', productForm.category)
            formData.append('technique', productForm.technique)
            formData.append('size', productForm.size)
            formData.append('care_instructions', productForm.care_instructions)
            formData.append('color', productForm.color)
            
            if (productForm.yarn_id === 'custom') {
                formData.append('custom_yarn', productForm.custom_yarn)
            } else if (productForm.yarn_id) {
                formData.append('yarn_id', productForm.yarn_id)
            }

            images.forEach(image => {
                formData.append('images', image)
            })

            const response = await fetch('/api/master/products', {
                method: 'POST',
                body: formData
            })

            const data = await response.json()

            if (!response.ok) {
                throw new Error(data.error || 'Failed to create product')
            }

            setShowAddProductModal(false)
            resetProductForm()
            fetchMasterData()
            alert('Товар успешно создан и отправлен на модерацию')
        } catch (error) {
            alert('Ошибка при создании товара')
        } finally {
            setSaving(false)
        }
    }

    const resetProductForm = () => {
        setProductForm({
            title: '', description: '', price: '', category: '', 
            technique: '', size: '', care_instructions: '', 
            yarn_id: '', custom_yarn: '', color: ''
        })
        setImages([])
        setImagePreviews([])
    }

    const formatDate = (dateString: string) => {
        const date = new Date(dateString)
        const now = new Date()
        const diff = Math.floor((now.getTime() - date.getTime()) / 1000 / 60 / 60)
        
        if (diff < 1) return 'только что'
        if (diff < 24) return `${diff} ч назад`
        return date.toLocaleDateString('ru-RU')
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
                    <p className="mt-4 font-['Montserrat_Alternates'] text-gray-600">Загрузка кабинета мастера...</p>
                </div>
            </motion.div>
        )
    }

    const unreadCount = notifications.filter(n => !n.is_read).length

    return (
        <div className="min-h-screen bg-gradient-to-br from-gray-50 via-white to-gray-50">
            <div className="max-w-7xl mx-auto px-4 py-8">
                {/* Анимированный заголовок */}
                <motion.div 
                    initial={{ opacity: 0, y: -20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.5 }}
                    className="bg-gradient-to-r from-firm-orange to-firm-pink rounded-2xl p-8 mb-8 text-white shadow-xl"
                >
                    <div className="flex justify-between items-center flex-wrap gap-4">
                        <div>
                            <h1 className="font-['Montserrat_Alternates'] text-white font-bold text-3xl mb-2">
                                Добро пожаловать, {session?.user?.name}!
                            </h1>
                            <p className="text-white/80">Вот что происходит с вашим магазином сегодня</p>
                        </div>
                        <div className="flex items-center gap-4">
                            <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
                                <Link href="/master/chats" className="relative block">
                                    <div className="w-12 h-12 bg-white/20 backdrop-blur rounded-full flex items-center justify-center hover:bg-white/30 transition-colors">
                                        <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                                        </svg>
                                    </div>
                                    {stats.total_followers > 0 && (
                                        <span className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 text-white text-xs rounded-full flex items-center justify-center animate-pulse">
                                            {stats.total_followers > 9 ? '9+' : stats.total_followers}
                                        </span>
                                    )}
                                </Link>
                            </motion.div>

                            <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }} className="relative">
                                <button 
                                    onClick={() => setShowNotifications(!showNotifications)} 
                                    className="relative w-12 h-12 bg-white/20 backdrop-blur rounded-full flex items-center justify-center hover:bg-white/30 transition-colors"
                                >
                                    <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
                                    </svg>
                                    {unreadCount > 0 && (
                                        <span className="absolute -top-1 -right-1 w-5 h-5 bg-yellow-400 text-white text-xs rounded-full flex items-center justify-center animate-bounce">
                                            {unreadCount > 9 ? '9+' : unreadCount}
                                        </span>
                                    )}
                                </button>

                                <AnimatePresence>
                                    {showNotifications && (
                                        <motion.div 
                                            initial={{ opacity: 0, y: 10, scale: 0.95 }}
                                            animate={{ opacity: 1, y: 0, scale: 1 }}
                                            exit={{ opacity: 0, y: 10, scale: 0.95 }}
                                            className="absolute right-0 mt-2 w-80 bg-white rounded-2xl shadow-2xl z-50 border border-gray-100 overflow-hidden"
                                        >
                                            <div className="p-4 bg-gradient-to-r from-firm-orange to-firm-pink">
                                                <h3 className="font-semibold text-white">Уведомления</h3>
                                            </div>
                                            <div className="max-h-96 overflow-y-auto">
                                                {notifications.length === 0 ? (
                                                    <div className="p-6 text-center text-gray-500">Нет уведомлений</div>
                                                ) : (
                                                    notifications.map((notif, idx) => (
                                                        <motion.div 
                                                            key={notif.id}
                                                            initial={{ opacity: 0, x: -20 }}
                                                            animate={{ opacity: 1, x: 0 }}
                                                            transition={{ delay: idx * 0.05 }}
                                                            className={`p-4 border-b border-gray-100 hover:bg-gray-50 cursor-pointer transition-all duration-300 ${!notif.is_read ? 'bg-gradient-to-r from-firm-orange/5 to-firm-pink/5' : ''}`}
                                                            onClick={() => {markNotificationAsRead(notif.id); if (notif.link) router.push(notif.link); setShowNotifications(false)}}
                                                        >
                                                            <div className="flex items-start gap-3">
                                                                <span className="text-2xl">{getNotificationIcon(notif.type)}</span>
                                                                <div className="flex-1">
                                                                    <p className="font-medium text-sm">{notif.title}</p>
                                                                    <p className="text-xs text-gray-500 mt-1">{notif.message}</p>
                                                                    <p className="text-xs text-gray-400 mt-2">{new Date(notif.created_at).toLocaleDateString('ru-RU')}</p>
                                                                </div>
                                                                {!notif.is_read && <div className="w-2 h-2 bg-firm-orange rounded-full animate-pulse mt-2"></div>}
                                                            </div>
                                                        </motion.div>
                                                    ))
                                                )}
                                            </div>
                                            <div className="p-3 bg-gray-50 text-center">
                                                <Link href="/master/notifications" className="text-sm text-firm-orange hover:underline">
                                                    Все уведомления
                                                </Link>
                                            </div>
                                        </motion.div>
                                    )}
                                </AnimatePresence>
                            </motion.div>
                        </div>
                    </div>
                </motion.div>

                {/* Статистика с анимацией */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
                    {[
                        { label: 'Новые заказы', value: stats.new_orders, icon: '🆕', color: 'from-blue-500 to-blue-600' },
                        { label: 'Всего заказов', value: stats.total_orders, icon: '📦', color: 'from-green-500 to-green-600' },
                        { label: 'Товаров', value: stats.total_products, icon: '🧶', color: 'from-orange-500 to-orange-600' },
                        { label: 'Просмотров', value: stats.total_views, icon: '👁️', color: 'from-purple-500 to-purple-600' }
                    ].map((stat, idx) => (
                        <motion.div
                            key={stat.label}
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: idx * 0.1 }}
                            whileHover={{ y: -5, transition: { duration: 0.2 } }}
                            className="bg-white rounded-2xl shadow-lg p-6 hover:shadow-xl transition-all duration-300"
                        >
                            <div className="flex items-center justify-between">
                                <div>
                                    <p className="text-gray-500 text-sm font-['Montserrat_Alternates']">{stat.label}</p>
                                    <p className={`text-3xl font-bold mt-1 bg-gradient-to-r ${stat.color} bg-clip-text text-transparent`}>
                                        {stat.value.toLocaleString()}
                                    </p>
                                </div>
                                <span className="text-4xl">{stat.icon}</span>
                            </div>
                        </motion.div>
                    ))}
                </div>

                {/* Быстрые действия */}
                <motion.div 
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.4 }}
                    className="flex flex-wrap justify-center gap-4 mb-12"
                >
                    <motion.button
                        whileHover={{ scale: 1.05 }}
                        whileTap={{ scale: 0.95 }}
                        onClick={() => setShowAddProductModal(true)}
                        className="px-6 py-3 bg-gradient-to-r from-firm-orange to-firm-pink text-white rounded-xl font-['Montserrat_Alternates'] font-medium shadow-lg hover:shadow-xl transition-all duration-300 flex items-center gap-2"
                    >
                        🧶 Добавить товар
                    </motion.button>
                    <motion.button
                        whileHover={{ scale: 1.05 }}
                        whileTap={{ scale: 0.95 }}
                        onClick={() => setShowAddClassModal(true)}
                        className="px-6 py-3 bg-gradient-to-r from-firm-pink to-purple-500 text-white rounded-xl font-['Montserrat_Alternates'] font-medium shadow-lg hover:shadow-xl transition-all duration-300 flex items-center gap-2"
                    >
                        🎓 Создать мастер-класс
                    </motion.button>
                    <motion.button
                        whileHover={{ scale: 1.05 }}
                        whileTap={{ scale: 0.95 }}
                        onClick={() => setShowAddPostModal(true)}
                        className="px-6 py-3 bg-gradient-to-r from-gray-600 to-gray-700 text-white rounded-xl font-['Montserrat_Alternates'] font-medium shadow-lg hover:shadow-xl transition-all duration-300 flex items-center gap-2"
                    >
                        ✍️ Написать пост
                    </motion.button>
                </motion.div>

                {/* Заказы */}
                <motion.div 
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.5 }}
                    className="bg-white rounded-2xl shadow-xl mb-8 overflow-hidden"
                >
                    <div className="p-6 border-b border-gray-200">
                        <h2 className="font-['Montserrat_Alternates'] font-semibold text-2xl flex items-center gap-2">
                            📦 Заказы
                            {orders.filter(o => o.status === 'new').length > 0 && (
                                <span className="bg-red-500 text-white text-xs px-2 py-1 rounded-full animate-pulse">
                                    {orders.filter(o => o.status === 'new').length} новых
                                </span>
                            )}
                        </h2>
                    </div>
                    <div className="divide-y divide-gray-100">
                        {orders.length === 0 ? (
                            <div className="p-12 text-center text-gray-500">У вас пока нет заказов</div>
                        ) : (
                            orders.slice(0, 5).map((order, idx) => (
                                <motion.div 
                                    key={order.id}
                                    initial={{ opacity: 0, x: -20 }}
                                    animate={{ opacity: 1, x: 0 }}
                                    transition={{ delay: idx * 0.05 }}
                                    whileHover={{ backgroundColor: '#f9fafb' }}
                                    className="p-6 transition-all duration-300"
                                >
                                    <div className="flex justify-between items-start flex-wrap gap-4">
                                        <div className="flex-1">
                                            <div className="flex items-center gap-3 mb-2 flex-wrap">
                                                <span className={`px-3 py-1 rounded-full text-xs font-medium ${getStatusColor(order.status)}`}>
                                                    {getStatusText(order.status)}
                                                </span>
                                                <span className="text-sm text-gray-500">№{order.order_number}</span>
                                            </div>
                                            <p className="font-medium text-lg">{order.product_title}</p>
                                            <div className="flex flex-wrap gap-4 mt-2 text-sm text-gray-500">
                                                <span>👤 {order.buyer_name}</span>
                                                <span>💰 {order.total_amount.toLocaleString()} ₽</span>
                                                <span>📅 {new Date(order.created_at).toLocaleDateString('ru-RU')}</span>
                                            </div>
                                        </div>
                                        <Link href={`/master/orders/${order.id}`}>
                                            <motion.button 
                                                whileHover={{ scale: 1.05 }}
                                                whileTap={{ scale: 0.95 }}
                                                className="px-4 py-2 text-sm border-2 border-firm-orange text-firm-orange rounded-xl hover:bg-firm-orange hover:text-white transition-all duration-300"
                                            >
                                                Подробнее
                                            </motion.button>
                                        </Link>
                                    </div>
                                </motion.div>
                            ))
                        )}
                    </div>
                    {orders.length > 5 && (
                        <div className="p-4 text-center border-t bg-gray-50">
                            <Link href="/master/orders" className="text-sm text-firm-orange hover:underline">
                                Все заказы →
                            </Link>
                        </div>
                    )}
                </motion.div>

                {/* Лента новостей */}
                <motion.div 
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.6 }}
                    className="bg-white rounded-2xl shadow-xl overflow-hidden"
                >
                    <div className="p-6 border-gray-200 border-b">
                        <div className="flex gap-6">
                            <button
                                onClick={() => setActiveTab('recent')}
                                className={`pb-2 font-['Montserrat_Alternates'] font-medium transition-all duration-300 relative ${activeTab === 'recent' ? 'text-firm-orange' : 'text-gray-500 hover:text-gray-700'}`}
                            >
                                Свежие посты
                                {activeTab === 'recent' && (
                                    <motion.div 
                                        layoutId="underline"
                                        className="absolute bottom-0 left-0 right-0 h-0.5 bg-gradient-to-r from-firm-orange to-firm-pink"
                                    />
                                )}
                            </button>
                            <button
                                onClick={() => setActiveTab('my')}
                                className={`pb-2 font-['Montserrat_Alternates'] font-medium transition-all duration-300 relative ${activeTab === 'my' ? 'text-firm-pink' : 'text-gray-500 hover:text-gray-700'}`}
                            >
                                Мои посты
                                {activeTab === 'my' && (
                                    <motion.div 
                                        layoutId="underline"
                                        className="absolute bottom-0 left-0 right-0 h-0.5 bg-gradient-to-r from-firm-pink to-firm-orange"
                                    />
                                )}
                            </button>
                        </div>
                    </div>

                    <AnimatePresence mode="wait">
                        {activeTab === 'recent' && (
                            <motion.div
                                key="recent"
                                initial={{ opacity: 0, y: 20 }}
                                animate={{ opacity: 1, y: 0 }}
                                exit={{ opacity: 0, y: -20 }}
                                transition={{ duration: 0.3 }}
                                className="divide-y divide-gray-100"
                            >
                                {recentPosts.length === 0 ? (
                                    <div className="p-12 text-center text-gray-500">
                                        <p>Пока нет постов</p>
                                    </div>
                                ) : (
                                    recentPosts.map((post, idx) => (
                                        <motion.div 
                                            key={post.id}
                                            initial={{ opacity: 0, y: 20 }}
                                            animate={{ opacity: 1, y: 0 }}
                                            transition={{ delay: idx * 0.05 }}
                                            whileHover={{ backgroundColor: '#f9fafb' }}
                                            className="p-6 transition-all duration-300"
                                        >
                                            <div className="max-w-3xl mx-auto">
                                                <Link href={`/masters/${post.master_id}`} className="flex items-center gap-3 group mb-4">
                                                    <motion.div 
                                                        whileHover={{ scale: 1.1 }}
                                                        className="w-12 h-12 rounded-full bg-gradient-to-r from-firm-orange to-firm-pink flex items-center justify-center text-white font-bold overflow-hidden"
                                                    >
                                                        {post.author_avatar ? (
                                                            <img src={post.author_avatar} alt={post.author_name} className="w-full h-full object-cover" />
                                                        ) : (
                                                            post.author_name?.charAt(0).toUpperCase()
                                                        )}
                                                    </motion.div>
                                                    <div>
                                                        <p className="font-semibold group-hover:text-firm-orange transition-colors">{post.author_name}</p>
                                                        <p className="text-xs text-gray-400">{formatDate(post.created_at)}</p>
                                                    </div>
                                                </Link>

                                                <div>
                                                    <h3 className="font-['Montserrat_Alternates'] font-semibold text-2xl mb-3 hover:text-firm-orange transition-colors">
                                                        <Link href={`/blog/${post.id}`}>{post.title}</Link>
                                                    </h3>
                                                    
                                                    {((post.images && post.images.length > 0) || post.main_image_url) && (
                                                        <MediaGallery 
                                                            images={post.images || [post.main_image_url]} 
                                                            video={null}
                                                            title={post.title}
                                                        />
                                                    )}
                                                    
                                                    <p className="text-gray-600 mt-4 line-clamp-3">
                                                        {post.excerpt || post.content?.substring(0, 300)}...
                                                    </p>
                                                    
                                                    <Link 
                                                        href={`/blog/${post.id}`}
                                                        className="text-firm-orange hover:underline text-sm mt-3 inline-flex items-center gap-1 group"
                                                    >
                                                        Читать полностью
                                                        <motion.span 
                                                            initial={{ x: 0 }}
                                                            whileHover={{ x: 5 }}
                                                            className="inline-block"
                                                        >
                                                            →
                                                        </motion.span>
                                                    </Link>
                                                </div>

                                                <div className="flex items-center gap-6 pt-4 mt-4 border-t border-gray-100">
                                                    <AnimatedButton
                                                        icon={
                                                            <svg 
                                                                className="w-6 h-6" 
                                                                viewBox="0 0 24 24" 
                                                                fill={post.is_liked ? "#D97C8E" : "none"}
                                                                stroke={post.is_liked ? "#D97C8E" : "#F4A67F"}
                                                                strokeWidth="1.5"
                                                            >
                                                                <path 
                                                                    strokeLinecap="round" 
                                                                    strokeLinejoin="round" 
                                                                    d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" 
                                                                />
                                                            </svg>
                                                        }
                                                        count={post.likes_count}
                                                        isActive={post.is_liked || false}
                                                        onClick={() => handleLike(post.id, false)}
                                                        activeColor="text-firm-pink"
                                                    />
                                                    
                                                    <AnimatedButton
                                                        icon={
                                                            <svg 
                                                                className="w-6 h-6" 
                                                                viewBox="0 0 24 24" 
                                                                fill="none" 
                                                                stroke={showComments === post.id ? "#F97316" : "#9CA3AF"}
                                                                strokeWidth="1.5"
                                                            >
                                                                <path 
                                                                    strokeLinecap="round" 
                                                                    strokeLinejoin="round" 
                                                                    d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" 
                                                                />
                                                            </svg>
                                                        }
                                                        count={post.comments_count}
                                                        isActive={showComments === post.id}
                                                        onClick={() => setShowComments(showComments === post.id ? null : post.id)}
                                                        activeColor="text-firm-orange"
                                                    />
                                                    
                                                    <div className="flex-1"></div>
                                                    <span className="text-sm text-gray-400 flex items-center gap-1">
                                                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                                                        </svg>
                                                        {post.views_count}
                                                    </span>
                                                </div>

                                                <AnimatePresence>
                                                    {showComments === post.id && (
                                                        <motion.div 
                                                            initial={{ opacity: 0, height: 0 }}
                                                            animate={{ opacity: 1, height: 'auto' }}
                                                            exit={{ opacity: 0, height: 0 }}
                                                            className="mt-4 pt-4 border-t bg-gray-50 rounded-xl p-4 overflow-hidden"
                                                        >
                                                            {session && (
                                                                <div className="flex gap-3 mb-4">
                                                                    <div className="w-8 h-8 rounded-full bg-gradient-to-r from-firm-orange to-firm-pink flex items-center justify-center text-white text-sm font-bold flex-shrink-0">
                                                                        {session.user.name?.charAt(0).toUpperCase()}
                                                                    </div>
                                                                    <div className="flex-1">
                                                                        <textarea
                                                                            value={commentText}
                                                                            onChange={(e) => setCommentText(e.target.value)}
                                                                            placeholder="Написать комментарий..."
                                                                            rows={2}
                                                                            className="w-full p-3 rounded-xl bg-white border border-gray-200 focus:outline-none focus:ring-2 focus:ring-firm-orange transition-all duration-300"
                                                                        />
                                                                        <motion.button
                                                                            whileHover={{ scale: 1.02 }}
                                                                            whileTap={{ scale: 0.98 }}
                                                                            onClick={() => handleComment(post.id, false)}
                                                                            disabled={commentLoading || !commentText.trim()}
                                                                            className="mt-2 px-5 py-2 bg-gradient-to-r from-firm-orange to-firm-pink text-white rounded-xl text-sm hover:shadow-lg transition-all duration-300 disabled:opacity-50"
                                                                        >
                                                                            {commentLoading ? 'Отправка...' : 'Отправить'}
                                                                        </motion.button>
                                                                    </div>
                                                                </div>
                                                            )}
                                                            
                                                            <div className="space-y-3 max-h-96 overflow-y-auto">
                                                                {post.comments?.length === 0 ? (
                                                                    <p className="text-gray-400 text-sm text-center py-4">
                                                                        Будьте первым, кто оставит комментарий
                                                                    </p>
                                                                ) : (
                                                                    post.comments?.map((comment: { id: string; content: string; created_at: string; author_name: string; author_avatar?: string }) => (
                                                                        <div key={comment.id} className="flex gap-3">
                                                                            <div className="w-8 h-8 rounded-full bg-gray-300 flex items-center justify-center text-white text-sm font-bold flex-shrink-0 overflow-hidden">
                                                                                {comment.author_avatar ? (
                                                                                    <img src={comment.author_avatar} alt={comment.author_name} className="w-full h-full object-cover" />
                                                                                ) : (
                                                                                    comment.author_name?.charAt(0).toUpperCase()
                                                                                )}
                                                                            </div>
                                                                            <div className="flex-1">
                                                                                <div className="bg-white rounded-xl p-3 shadow-sm">
                                                                                    <p className="font-semibold text-sm">{comment.author_name}</p>
                                                                                    <p className="text-gray-700 text-sm mt-1">{comment.content}</p>
                                                                                </div>
                                                                                <p className="text-xs text-gray-400 mt-1">{formatDate(comment.created_at)}</p>
                                                                            </div>
                                                                        </div>
                                                                    ))
                                                                )}
                                                            </div>
                                                        </motion.div>
                                                    )}
                                                </AnimatePresence>
                                            </div>
                                        </motion.div>
                                    ))
                                )}
                            </motion.div>
                        )}

                        {activeTab === 'my' && (
                            <motion.div
                                key="my"
                                initial={{ opacity: 0, y: 20 }}
                                animate={{ opacity: 1, y: 0 }}
                                exit={{ opacity: 0, y: -20 }}
                                transition={{ duration: 0.3 }}
                                className="divide-y divide-gray-100"
                            >
                                {myPosts.length === 0 ? (
                                    <div className="p-12 text-center text-gray-500">
                                        <p>У вас пока нет постов</p>
                                        <motion.button 
                                            whileHover={{ scale: 1.05 }}
                                            onClick={() => setShowAddPostModal(true)} 
                                            className="text-firm-orange hover:underline mt-2 inline-block"
                                        >
                                            Написать первый пост →
                                        </motion.button>
                                    </div>
                                ) : (
                                    myPosts.map((post, idx) => (
                                        <motion.div 
                                            key={post.id}
                                            initial={{ opacity: 0, y: 20 }}
                                            animate={{ opacity: 1, y: 0 }}
                                            transition={{ delay: idx * 0.05 }}
                                            whileHover={{ backgroundColor: '#f9fafb' }}
                                            className="p-6 transition-all duration-300"
                                        >
                                            <div className="max-w-3xl mx-auto">
                                                <div className="flex items-center gap-3 mb-4">
                                                    <div className="w-12 h-12 rounded-full bg-gradient-to-r from-firm-orange to-firm-pink flex items-center justify-center text-white font-bold overflow-hidden">
                                                        {post.author_avatar ? (
                                                            <img src={post.author_avatar} alt={post.author_name} className="w-full h-full object-cover" />
                                                        ) : (
                                                            post.author_name?.charAt(0).toUpperCase()
                                                        )}
                                                    </div>
                                                    <div>
                                                        <p className="font-semibold">{post.author_name}</p>
                                                        <p className="text-xs text-gray-400">{formatDate(post.created_at)}</p>
                                                    </div>
                                                </div>

                                                <div>
                                                    <h3 className="font-['Montserrat_Alternates'] font-semibold text-2xl mb-3 hover:text-firm-orange transition-colors">
                                                        <Link href={`/blog/${post.id}`}>{post.title}</Link>
                                                    </h3>
                                                    
                                                    {((post.images && post.images.length > 0) || post.main_image_url) && (
                                                        <MediaGallery 
                                                            images={post.images || [post.main_image_url]} 
                                                            video={null}
                                                            title={post.title}
                                                        />
                                                    )}
                                                    
                                                    <p className="text-gray-600 mt-4 line-clamp-3">
                                                        {post.excerpt || post.content?.substring(0, 300)}...
                                                    </p>
                                                    
                                                    <Link 
                                                        href={`/blog/${post.id}`}
                                                        className="text-firm-orange hover:underline text-sm mt-3 inline-flex items-center gap-1 group"
                                                    >
                                                        Читать полностью
                                                        <motion.span 
                                                            initial={{ x: 0 }}
                                                            whileHover={{ x: 5 }}
                                                            className="inline-block"
                                                        >
                                                            →
                                                        </motion.span>
                                                    </Link>
                                                </div>

                                                <div className="flex items-center gap-6 pt-4 mt-4 border-t border-gray-100">
                                                    <AnimatedButton
                                                        icon={
                                                            <svg 
                                                                className="w-6 h-6" 
                                                                viewBox="0 0 24 24" 
                                                                fill={post.is_liked ? "#D97C8E" : "none"}
                                                                stroke={post.is_liked ? "#D97C8E" : "#9CA3AF"}
                                                                strokeWidth="1.5"
                                                            >
                                                                <path 
                                                                    strokeLinecap="round" 
                                                                    strokeLinejoin="round" 
                                                                    d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" 
                                                                />
                                                            </svg>
                                                        }
                                                        count={post.likes_count}
                                                        isActive={post.is_liked || false}
                                                        onClick={() => handleLike(post.id, true)}
                                                        activeColor="text-firm-pink"
                                                    />
                                                    
                                                    <AnimatedButton
                                                        icon={
                                                            <svg 
                                                                className="w-6 h-6" 
                                                                viewBox="0 0 24 24" 
                                                                fill="none" 
                                                                stroke={showComments === post.id ? "#F4A67F" : "#9CA3AF"}
                                                                strokeWidth="1.5"
                                                            >
                                                                <path 
                                                                    strokeLinecap="round" 
                                                                    strokeLinejoin="round" 
                                                                    d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" 
                                                                />
                                                            </svg>
                                                        }
                                                        count={post.comments_count}
                                                        isActive={showComments === post.id}
                                                        onClick={() => setShowComments(showComments === post.id ? null : post.id)}
                                                        activeColor="text-firm-orange"
                                                    />
                                                    
                                                    <div className="flex-1"></div>
                                                    <span className="text-sm text-gray-400 flex items-center gap-1">
                                                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                                                        </svg>
                                                        {post.views_count}
                                                    </span>
                                                </div>

                                                <AnimatePresence>
                                                    {showComments === post.id && (
                                                        <motion.div 
                                                            initial={{ opacity: 0, height: 0 }}
                                                            animate={{ opacity: 1, height: 'auto' }}
                                                            exit={{ opacity: 0, height: 0 }}
                                                            className="mt-4 pt-4 border-t bg-gray-50 rounded-xl p-4 overflow-hidden"
                                                        >
                                                            {session && (
                                                                <div className="flex gap-3 mb-4">
                                                                    <div className="w-8 h-8 rounded-full bg-gradient-to-r from-firm-orange to-firm-pink flex items-center justify-center text-white text-sm font-bold flex-shrink-0">
                                                                        {session.user.name?.charAt(0).toUpperCase()}
                                                                    </div>
                                                                    <div className="flex-1">
                                                                        <textarea
                                                                            value={commentText}
                                                                            onChange={(e) => setCommentText(e.target.value)}
                                                                            placeholder="Написать комментарий..."
                                                                            rows={2}
                                                                            className="w-full p-3 rounded-xl bg-white border border-gray-200 focus:outline-none focus:ring-2 focus:ring-firm-orange transition-all duration-300"
                                                                        />
                                                                        <motion.button
                                                                            whileHover={{ scale: 1.02 }}
                                                                            whileTap={{ scale: 0.98 }}
                                                                            onClick={() => handleComment(post.id, true)}
                                                                            disabled={commentLoading || !commentText.trim()}
                                                                            className="mt-2 px-5 py-2 bg-gradient-to-r from-firm-orange to-firm-pink text-white rounded-xl text-sm hover:shadow-lg transition-all duration-300 disabled:opacity-50"
                                                                        >
                                                                            {commentLoading ? 'Отправка...' : 'Отправить'}
                                                                        </motion.button>
                                                                    </div>
                                                                </div>
                                                            )}
                                                            
                                                            <div className="space-y-3 max-h-96 overflow-y-auto">
                                                                {post.comments?.length === 0 ? (
                                                                    <p className="text-gray-400 text-sm text-center py-4">
                                                                        Будьте первым, кто оставит комментарий
                                                                    </p>
                                                                ) : (
                                                                    post.comments?.map((comment: { id: string; content: string; created_at: string; author_name: string; author_avatar?: string }) => (
                                                                        <div key={comment.id} className="flex gap-3">
                                                                            <div className="w-8 h-8 rounded-full bg-gray-300 flex items-center justify-center text-white text-sm font-bold flex-shrink-0 overflow-hidden">
                                                                                {comment.author_avatar ? (
                                                                                    <img src={comment.author_avatar} alt={comment.author_name} className="w-full h-full object-cover" />
                                                                                ) : (
                                                                                    comment.author_name?.charAt(0).toUpperCase()
                                                                                )}
                                                                            </div>
                                                                            <div className="flex-1">
                                                                                <div className="bg-white rounded-xl p-3 shadow-sm">
                                                                                    <p className="font-semibold text-sm">{comment.author_name}</p>
                                                                                    <p className="text-gray-700 text-sm mt-1">{comment.content}</p>
                                                                                </div>
                                                                                <p className="text-xs text-gray-400 mt-1">{formatDate(comment.created_at)}</p>
                                                                            </div>
                                                                        </div>
                                                                    ))
                                                                )}
                                                            </div>
                                                        </motion.div>
                                                    )}
                                                </AnimatePresence>
                                            </div>
                                        </motion.div>
                                    ))
                                )}
                            </motion.div>
                        )}
                    </AnimatePresence>
                </motion.div>

                {/* Модальные окна с полупрозрачным фоном как в админке */}
                <AnimatePresence>
                    {showAddProductModal && (
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50 p-4"
                            onClick={() => setShowAddProductModal(false)}
                        >
                            <motion.div
                                initial={{ scale: 0.9, opacity: 0, y: 20 }}
                                animate={{ scale: 1, opacity: 1, y: 0 }}
                                exit={{ scale: 0.9, opacity: 0, y: 20 }}
                                transition={{ type: "spring", damping: 25, stiffness: 300 }}
                                className="bg-white rounded-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto shadow-2xl"
                                onClick={(e) => e.stopPropagation()}
                            >
                                <div className="sticky top-0 bg-white border-b border-gray-200 p-4 flex justify-between items-center">
                                    <h2 className="font-['Montserrat_Alternates'] font-semibold text-2xl bg-gradient-to-r from-firm-orange to-firm-pink bg-clip-text text-transparent">
                                        Добавить товар
                                    </h2>
                                    <button onClick={() => setShowAddProductModal(false)} className="text-gray-400 hover:text-gray-600 text-2xl transition-colors">✕</button>
                                </div>

                                <form onSubmit={handleSubmitProduct} className="p-6 space-y-6">
                                    {/* Форма товара - остаётся без изменений */}
                                    <div>
                                        <label className="block text-gray-700 mb-2 font-['Montserrat_Alternates'] font-medium">Добавьте фото (до 10 шт.) <span className="text-red-500">*</span></label>
                                        <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center hover:border-firm-orange transition cursor-pointer" onClick={() => fileInputRef.current?.click()}>
                                            <input type="file" accept="image/*" multiple onChange={handleImageSelect} className="hidden" ref={fileInputRef} />
                                            <div className="flex flex-col items-center gap-2">
                                                <svg className="w-12 h-12 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>
                                                <span className="text-gray-500">Нажмите для выбора файлов</span>
                                                <span className="text-xs text-gray-400">PNG, JPG, WEBP до 10MB</span>
                                            </div>
                                        </div>
                                        {imagePreviews.length > 0 && (
                                            <div className="mt-4">
                                                <p className="text-sm text-gray-500 mb-2">Загружено фото: {imagePreviews.length}/10</p>
                                                <div className="grid grid-cols-4 gap-3">
                                                    {imagePreviews.map((preview, idx) => (
                                                        <div key={idx} className="relative group aspect-square rounded-lg overflow-hidden border-2 border-gray-200">
                                                            <Image width={160} height={160} src={preview} alt="preview" className="w-full h-full object-cover"/>
                                                            <button type="button" onClick={() => removeImage(idx)} className="absolute top-1 right-1 w-6 h-6 bg-red-500 text-white rounded-full text-xs flex items-center justify-center opacity-0 group-hover:opacity-100 transition">✕</button>
                                                            {idx === 0 && <div className="absolute bottom-1 left-1 bg-firm-orange text-white text-xs px-1.5 py-0.5 rounded">Главное</div>}
                                                        </div>
                                                    ))}
                                                </div>
                                            </div>
                                        )}
                                    </div>

                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                        <div>
                                            <label className="block text-gray-700 mb-1 font-['Montserrat_Alternates'] font-medium">Название товара <span className="text-red-500">*</span></label>
                                            <input type="text" name="title" value={productForm.title} onChange={handleProductInputChange} required className="w-full p-3 rounded-xl bg-gray-100 outline-none focus:ring-2 focus:ring-firm-orange transition-all duration-300" />
                                        </div>
                                        <div>
                                            <label className="block text-gray-700 mb-1 font-['Montserrat_Alternates'] font-medium">Категория <span className="text-red-500">*</span></label>
                                            <select className="w-full p-3 rounded-xl bg-gray-100 outline-none focus:ring-2 focus:ring-firm-pink transition-all duration-300" name="category" value={productForm.category} onChange={handleProductInputChange} required>
                                                <option value="">Выберите категорию</option>
                                                {renderCategoryOptions(categories as unknown as CategoryItem[])}
                                            </select>
                                        </div>
                                    </div>

                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                        <div>
                                            <label className="block text-gray-700 mb-1 font-['Montserrat_Alternates'] font-medium">Название пряжи</label>
                                            <select name="yarn_id" value={productForm.yarn_id} onChange={handleProductInputChange} className="w-full p-3 rounded-xl bg-gray-100 outline-none focus:ring-2 focus:ring-firm-orange transition-all duration-300">
                                                <option value="">Выберите пряжу</option>
                                                {yarns.map(yarn => (<option key={yarn.id} value={yarn.id}>{yarn.name} - {yarn.brand}</option>))}
                                                <option value="custom">Другая пряжа (указать вручную)</option>
                                            </select>
                                            {productForm.yarn_id === 'custom' && (<input type="text" name="custom_yarn" value={productForm.custom_yarn} onChange={handleProductInputChange} placeholder="Укажите название пряжи" className="w-full mt-2 p-3 rounded-xl bg-gray-100 outline-none focus:ring-2 focus:ring-firm-pink transition-all duration-300" />)}
                                        </div>
                                        <div>
                                            <label className="block text-gray-700 mb-1 font-['Montserrat_Alternates'] font-medium">Техника вязки</label>
                                            <select name="technique" value={productForm.technique} onChange={handleProductInputChange} className="w-full p-3 rounded-xl bg-gray-100 outline-none focus:ring-2 focus:ring-firm-orange transition-all duration-300">
                                                <option value="">Выберите технику</option>
                                                {techniques.map(tech => (<option key={tech} value={tech}>{tech}</option>))}
                                            </select>
                                        </div>
                                    </div>

                                    <div>
                                        <label className="block text-gray-700 mb-1 font-['Montserrat_Alternates'] font-medium">Описание</label>
                                        <textarea name="description" value={productForm.description} onChange={handleProductInputChange} rows={4} className="w-full p-3 rounded-xl bg-gray-100 outline-none focus:ring-2 focus:ring-firm-pink transition-all duration-300" />
                                    </div>

                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                        <div>
                                            <label className="block text-gray-700 mb-1 font-['Montserrat_Alternates'] font-medium">Цвет</label>
                                            <input type="text" name="color" value={productForm.color} onChange={handleProductInputChange} className="w-full p-3 rounded-xl bg-gray-100 outline-none focus:ring-2 focus:ring-firm-orange transition-all duration-300" />
                                        </div>
                                        <div>
                                            <label className="block text-gray-700 mb-1 font-['Montserrat_Alternates'] font-medium">Уход</label>
                                            <input type="text" name="care_instructions" value={productForm.care_instructions} onChange={handleProductInputChange} className="w-full p-3 rounded-xl bg-gray-100 outline-none focus:ring-2 focus:ring-firm-pink transition-all duration-300" />
                                        </div>
                                    </div>

                                    <div>
                                        <label className="block text-gray-700 mb-1 font-['Montserrat_Alternates'] font-medium">Размер</label>
                                        <div className="flex flex-wrap gap-3">
                                            {sizes.map(size => (
                                                <label key={size} className="flex items-center gap-2 cursor-pointer">
                                                    <input type="radio" name="size" value={size} checked={productForm.size === size} onChange={handleProductInputChange} className="w-4 h-4 accent-firm-orange" />
                                                    <span className="text-sm">{size}</span>
                                                </label>
                                            ))}
                                        </div>
                                    </div>

                                    <div>
                                        <label className="block text-gray-700 mb-1 font-['Montserrat_Alternates'] font-medium">Цена <span className="text-red-500">*</span></label>
                                        <div className="relative">
                                            <input type="number" name="price" value={productForm.price} onChange={handleProductInputChange} required min="0" step="100" className="w-full p-3 rounded-xl bg-gray-100 outline-none focus:ring-2 focus:ring-firm-orange transition-all duration-300" />
                                            <span className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-500">₽</span>
                                        </div>
                                    </div>

                                    <div className="flex gap-3 pt-4 border-t border-gray-200">
                                        <motion.button type="submit" whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }} disabled={saving} className="flex-1 py-3 bg-gradient-to-r from-firm-orange to-firm-pink text-white rounded-xl hover:shadow-lg transition-all duration-300 disabled:opacity-50 font-['Montserrat_Alternates'] font-medium">
                                            {saving ? 'Сохранение...' : 'Опубликовать товар'}
                                        </motion.button>
                                        <button type="button" onClick={() => setShowAddProductModal(false)} className="px-6 py-3 border border-gray-300 rounded-xl hover:bg-gray-50 transition-all duration-300">Отмена</button>
                                    </div>
                                </form>
                            </motion.div>
                        </motion.div>
                    )}
                </AnimatePresence>

                {/* Модальное окно создания мастер-класса */}
                <AnimatePresence>
                    {showAddClassModal && (
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50 p-4"
                            onClick={() => setShowAddClassModal(false)}
                        >
                            <motion.div
                                initial={{ scale: 0.9, opacity: 0, y: 20 }}
                                animate={{ scale: 1, opacity: 1, y: 0 }}
                                exit={{ scale: 0.9, opacity: 0, y: 20 }}
                                className="bg-white rounded-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto shadow-2xl"
                                onClick={(e) => e.stopPropagation()}
                            >
                                <div className="sticky top-0 bg-white border-b border-gray-200 p-4 flex justify-between items-center">
                                    <h2 className="font-['Montserrat_Alternates'] font-semibold text-2xl bg-gradient-to-r from-firm-pink to-purple-500 bg-clip-text text-transparent">
                                        Создать мастер-класс
                                    </h2>
                                    <button onClick={() => setShowAddClassModal(false)} className="text-gray-400 hover:text-gray-600 text-2xl transition-colors">✕</button>
                                </div>

                                <form onSubmit={handleSubmitClass} className="p-6 space-y-6">
                                    <div>
                                        <label className="block text-gray-700 mb-2 font-['Montserrat_Alternates'] font-medium">Анонсирующее изображение</label>
                                        <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center hover:border-firm-pink transition cursor-pointer" onClick={() => classFileInputRef.current?.click()}>
                                            <input type="file" accept="image/*" onChange={handleClassImageSelect} className="hidden" ref={classFileInputRef} />
                                            <div className="flex flex-col items-center gap-2">
                                                <svg className="w-12 h-12 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>
                                                <span className="text-gray-500">Загрузить изображение</span>
                                                <span className="text-xs text-gray-400">PNG, JPG, WEBP до 10MB</span>
                                            </div>
                                        </div>
                                        {classImagePreviews.length > 0 && (
                                            <div className="mt-4">
                                                <div className="grid grid-cols-4 gap-3">
                                                    {classImagePreviews.map((preview, idx) => (
                                                        <div key={idx} className="relative group aspect-square rounded-lg overflow-hidden border-2 border-gray-200">
                                                            <Image width={160} height={160} src={preview} alt="preview" className="w-full h-full object-cover" />
                                                            <button type="button" onClick={() => removeClassImage(idx)} className="absolute top-1 right-1 w-6 h-6 bg-red-500 text-white rounded-full text-xs flex items-center justify-center opacity-0 group-hover:opacity-100 transition">✕</button>
                                                        </div>
                                                    ))}
                                                </div>
                                            </div>
                                        )}
                                    </div>

                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                        <div>
                                            <label className="block text-gray-700 mb-1 font-['Montserrat_Alternates'] font-medium">Название <span className="text-red-500">*</span></label>
                                            <input type="text" name="title" value={classForm.title} onChange={handleClassInputChange} required className="w-full p-3 rounded-xl bg-gray-100 outline-none focus:ring-2 focus:ring-firm-pink transition-all duration-300" />
                                        </div>
                                        <div>
                                            <label className="block text-gray-700 mb-1 font-['Montserrat_Alternates'] font-medium">Тип</label>
                                            <div className="flex gap-4">
                                                <label className="flex items-center gap-2 cursor-pointer">
                                                    <input type="radio" name="type" value="online" checked={classForm.type === 'online'} onChange={handleClassInputChange} className="w-4 h-4 accent-firm-orange" />
                                                    <span>Онлайн</span>
                                                </label>
                                                <label className="flex items-center gap-2 cursor-pointer">
                                                    <input type="radio" name="type" value="offline" checked={classForm.type === 'offline'} onChange={handleClassInputChange} className="w-4 h-4 accent-firm-pink" />
                                                    <span>Офлайн</span>
                                                </label>
                                            </div>
                                        </div>
                                    </div>

                                    <div>
                                        <label className="block text-gray-700 mb-1 font-['Montserrat_Alternates'] font-medium">Описание <span className="text-red-500">*</span></label>
                                        <textarea name="description" value={classForm.description} onChange={handleClassInputChange} rows={4} required className="w-full p-3 rounded-xl bg-gray-100 outline-none focus:ring-2 focus:ring-firm-pink transition-all duration-300" />
                                    </div>

                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                        <div>
                                            <label className="block text-gray-700 mb-1 font-['Montserrat_Alternates'] font-medium">Цена (₽)</label>
                                            <input type="number" name="price" value={classForm.price} onChange={handleClassInputChange} min="0" step="100" className="w-full p-3 rounded-xl bg-gray-100 outline-none focus:ring-2 focus:ring-firm-pink transition-all duration-300" />
                                        </div>
                                        <div>
                                            <label className="block text-gray-700 mb-1 font-['Montserrat_Alternates'] font-medium">Максимум участников</label>
                                            <input type="number" name="max_participants" value={classForm.max_participants} onChange={handleClassInputChange} min="1" className="w-full p-3 rounded-xl bg-gray-100 outline-none focus:ring-2 focus:ring-firm-pink transition-all duration-300" />
                                        </div>
                                    </div>

                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                        <div>
                                            <label className="block text-gray-700 mb-1 font-['Montserrat_Alternates'] font-medium">Дата и время <span className="text-red-500">*</span></label>
                                            <input type="datetime-local" name="date_time" value={classForm.date_time} onChange={handleClassInputChange} required className="w-full p-3 rounded-xl bg-gray-100 outline-none focus:ring-2 focus:ring-firm-pink transition-all duration-300" />
                                        </div>
                                        <div>
                                            <label className="block text-gray-700 mb-1 font-['Montserrat_Alternates'] font-medium">Длительность (мин)</label>
                                            <input type="number" name="duration_minutes" value={classForm.duration_minutes} onChange={handleClassInputChange} min="30" step="30" className="w-full p-3 rounded-xl bg-gray-100 outline-none focus:ring-2 focus:ring-firm-pink transition-all duration-300" />
                                        </div>
                                    </div>

                                    {classForm.type === 'offline' && (
                                        <div>
                                            <label className="block text-gray-700 mb-1 font-['Montserrat_Alternates'] font-medium">Место проведения</label>
                                            <input type="text" name="location" value={classForm.location} onChange={handleClassInputChange} className="w-full p-3 rounded-xl bg-gray-100 outline-none focus:ring-2 focus:ring-firm-pink transition-all duration-300" />
                                        </div>
                                    )}

                                    {classForm.type === 'online' && (
                                        <div>
                                            <label className="block text-gray-700 mb-1 font-['Montserrat_Alternates'] font-medium">Ссылка на трансляцию</label>
                                            <input type="url" name="online_link" value={classForm.online_link} onChange={handleClassInputChange} className="w-full p-3 rounded-xl bg-gray-100 outline-none focus:ring-2 focus:ring-firm-pink transition-all duration-300" />
                                        </div>
                                    )}

                                    <div>
                                        <label className="block text-gray-700 mb-1 font-['Montserrat_Alternates'] font-medium">Необходимые материалы</label>
                                        <textarea name="materials" value={classForm.materials} onChange={handleClassInputChange} rows={3} className="w-full p-3 rounded-xl bg-gray-100 outline-none focus:ring-2 focus:ring-firm-pink transition-all duration-300" />
                                    </div>

                                    <div className="flex gap-3 pt-4 border-t">
                                        <motion.button type="submit" whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }} disabled={saving} className="flex-1 py-3 bg-gradient-to-r from-firm-pink to-purple-500 text-white rounded-xl hover:shadow-lg transition-all duration-300 disabled:opacity-50 font-['Montserrat_Alternates'] font-medium">
                                            {saving ? 'Создание...' : 'Создать мастер-класс'}
                                        </motion.button>
                                        <button type="button" onClick={() => setShowAddClassModal(false)} className="px-6 py-3 border border-gray-300 rounded-xl hover:bg-gray-50 transition-all duration-300">Отмена</button>
                                    </div>
                                </form>
                            </motion.div>
                        </motion.div>
                    )}
                </AnimatePresence>

                {/* Модальное окно создания поста */}
                <AnimatePresence>
                    {showAddPostModal && (
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50 p-4"
                            onClick={() => setShowAddPostModal(false)}
                        >
                            <motion.div
                                initial={{ scale: 0.9, opacity: 0, y: 20 }}
                                animate={{ scale: 1, opacity: 1, y: 0 }}
                                exit={{ scale: 0.9, opacity: 0, y: 20 }}
                                className="bg-white rounded-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto shadow-2xl"
                                onClick={(e) => e.stopPropagation()}
                            >
                                <div className="sticky top-0 bg-white border-b border-gray-200 p-4 flex justify-between items-center">
                                    <h2 className="font-['Montserrat_Alternates'] font-semibold text-2xl bg-gradient-to-r from-gray-600 to-gray-700 bg-clip-text text-transparent">
                                        Новая запись в блоге
                                    </h2>
                                    <button onClick={() => setShowAddPostModal(false)} className="text-gray-400 hover:text-gray-600 text-2xl transition-colors">✕</button>
                                </div>

                                <form onSubmit={handleSubmitPost} className="p-6 space-y-6">
                                    <div>
                                        <label className="block text-gray-700 mb-2 font-['Montserrat_Alternates'] font-medium">Добавьте фото</label>
                                        <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center hover:border-gray-500 transition cursor-pointer" onClick={() => postFileInputRef.current?.click()}>
                                            <input type="file" accept="image/*" multiple onChange={handlePostImageSelect} className="hidden" ref={postFileInputRef} />
                                            <div className="flex flex-col items-center gap-2">
                                                <svg className="w-12 h-12 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>
                                                <span className="text-gray-500">Загрузить с устройства</span>
                                                <span className="text-xs text-gray-400">PNG, JPG, WEBP до 10MB</span>
                                            </div>
                                        </div>
                                        {postImagePreviews.length > 0 && (
                                            <div className="mt-4">
                                                <div className="grid grid-cols-4 gap-3">
                                                    {postImagePreviews.map((preview, idx) => (
                                                        <div key={idx} className="relative group aspect-square rounded-lg overflow-hidden border-2 border-gray-200">
                                                            <Image width={160} height={160} src={preview} alt="preview" className="w-full h-full object-cover" />
                                                            <button type="button" onClick={() => removePostImage(idx)} className="absolute top-1 right-1 w-6 h-6 bg-red-500 text-white rounded-full text-xs flex items-center justify-center opacity-0 group-hover:opacity-100 transition">✕</button>
                                                        </div>
                                                    ))}
                                                </div>
                                            </div>
                                        )}
                                    </div>

                                    <div>
                                        <label className="block text-gray-700 mb-1 font-['Montserrat_Alternates'] font-medium">Заголовок <span className="text-red-500">*</span></label>
                                        <input type="text" name="title" value={postForm.title} onChange={handlePostInputChange} required className="w-full p-3 rounded-xl bg-gray-100 outline-none focus:ring-2 focus:ring-gray-500 transition-all duration-300" />
                                    </div>

                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                        <div>
                                            <label className="block text-gray-700 mb-1 font-['Montserrat_Alternates'] font-medium">Категория</label>
                                            <select name="category" value={postForm.category} onChange={handlePostInputChange} className="w-full p-3 rounded-xl bg-gray-100 outline-none focus:ring-2 focus:ring-gray-500 transition-all duration-300">
                                                <option value="">Выберите категорию</option>
                                                {blogTags.map(tag => (<option key={tag} value={tag}>{tag}</option>))}
                                            </select>
                                        </div>
                                        <div>
                                            <label className="block text-gray-700 mb-1 font-['Montserrat_Alternates'] font-medium">Теги</label>
                                            <select name="tags" value={postForm.tags} onChange={handlePostInputChange} className="w-full p-3 rounded-xl bg-gray-100 outline-none focus:ring-2 focus:ring-gray-500 transition-all duration-300">
                                                <option value="">Выберите тег</option>
                                                {blogTags.map(tag => (<option key={tag} value={tag}>{tag}</option>))}
                                            </select>
                                        </div>
                                    </div>

                                    <div>
                                        <label className="block text-gray-700 mb-1 font-['Montserrat_Alternates'] font-medium">Краткое описание (анонс)</label>
                                        <textarea name="excerpt" value={postForm.excerpt} onChange={handlePostInputChange} rows={2} className="w-full p-3 rounded-xl bg-gray-100 outline-none focus:ring-2 focus:ring-gray-500 transition-all duration-300" />
                                    </div>

                                    <div>
                                        <label className="block text-gray-700 mb-1 font-['Montserrat_Alternates'] font-medium">Содержание <span className="text-red-500">*</span></label>
                                        <textarea name="content" value={postForm.content} onChange={handlePostInputChange} rows={10} required className="w-full p-3 rounded-xl bg-gray-100 outline-none focus:ring-2 focus:ring-gray-500 transition-all duration-300" />
                                    </div>

                                    <div className="flex gap-3 pt-4 border-t">
                                        <motion.button type="submit" whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }} disabled={saving} className="flex-1 py-3 bg-gradient-to-r from-gray-600 to-gray-700 text-white rounded-xl hover:shadow-lg transition-all duration-300 disabled:opacity-50 font-['Montserrat_Alternates'] font-medium">
                                            {saving ? 'Публикация...' : 'Опубликовать пост'}
                                        </motion.button>
                                        <button type="button" onClick={() => setShowAddPostModal(false)} className="px-6 py-3 border border-gray-300 rounded-xl hover:bg-gray-50 transition-all duration-300">Отмена</button>
                                    </div>
                                </form>
                            </motion.div>
                        </motion.div>
                    )}
                </AnimatePresence>
            </div>
        </div>
    )
}
