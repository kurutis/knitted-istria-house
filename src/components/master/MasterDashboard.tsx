'use client'

import { useState, useEffect, useRef } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { useRouter } from 'next/navigation'

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
    excerpt: string
    created_at: string
    views_count: number
    likes_count: number
    comments_count: number
    author_name: string
    author_avatar: string
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

export default function MasterDashboard({ session }: { session: any }) {
    const router = useRouter()
    const [orders, setOrders] = useState<Order[]>([])
    const [blogPosts, setBlogPosts] = useState<BlogPost[]>([])
    const [notifications, setNotifications] = useState<Notification[]>([])
    const [stats, setStats] = useState<MasterStats>({total_orders: 0, new_orders: 0, total_products: 0, total_views: 0, total_followers: 0})
    const [loading, setLoading] = useState(true)
    const [showNotifications, setShowNotifications] = useState(false)
    const [showAddProductModal, setShowAddProductModal] = useState(false)
    const [showAddPostModal, setShowAddPostModal] = useState(false)
    const [saving, setSaving] = useState(false)
    const fileInputRef = useRef<HTMLInputElement>(null)
    const [categories, setCategories] = useState<any[]>([])
    const [yarns, setYarns] = useState<any[]>([])
    const [images, setImages] = useState<File[]>([])
    const [imagePreviews, setImagePreviews] = useState<string[]>([])
    const techniques = ['Лицевая гладь', 'Изнаночная гладь', 'Резинка', 'Платочная вязка', 'Косы', 'Араны', 'Жаккард', 'Ленивый жаккард', 'Патентная резинка', 'Ажур', 'Сетка', 'Рис', 'Путанка', 'Бриошь', 'Другое']
    const sizes = ['XS', 'S', 'M', 'L', 'XL', 'XXL', 'Не применимо']
    const [postImages, setPostImages] = useState<File[]>([])
    const [postImagePreviews, setPostImagePreviews] = useState<string[]>([])
    const postFileInputRef = useRef<HTMLInputElement>(null)
    const [postForm, setPostForm] = useState({title: '', content: '', excerpt: '', category: '', tags: ''})
    const blogTags = ['Мастер-класс', 'Обзор пряжи', 'Новая коллекция', 'Советы', 'Вдохновение', 'История создания', 'Техника вязания', 'Новости']
    const [productForm, setProductForm] = useState({title: '', description: '', price: '', category: '', technique: '', size: '', care_instructions: '',  yarn_id: '', custom_yarn: '', color: ''})
    const [classImages, setClassImages] = useState<File[]>([])
    const [showAddClassModal, setShowAddClassModal] = useState(false)
    const [classImagePreviews, setClassImagePreviews] = useState<string[]>([])
    const classFileInputRef = useRef<HTMLInputElement>(null)
    const [classForm, setClassForm] = useState({title: '',  description: '', type: 'online', price: '', max_participants: '', date_time: '', duration_minutes: '', location: '', online_link: '', materials: ''})

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

            classImages.forEach(image => {
                formData.append('images', image)
            })

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
            alert('Мастер-класс успешно создан и отправлен на модерацию!')
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

    const fetchMasterData = async () => {
        try {
            setLoading(true)
            
            const ordersRes = await fetch('/api/master/orders')
            const ordersData = await ordersRes.json()
            setOrders(ordersData || [])
            
            const blogRes = await fetch('/api/master/blog')
            const blogData = await blogRes.json()
            setBlogPosts(blogData || [])
            
            const notifRes = await fetch('/api/master/notifications')
            const notifData = await notifRes.json()
            setNotifications(notifData || [])
            
            const statsRes = await fetch('/api/master/stats')
            const statsData = await statsRes.json()
            setStats(statsData)
            
        } catch (error) {
            console.error('Error fetching master data:', error)
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

    const renderCategoryOptions = (categories: any[], level = 0) => {
    const options: JSX.Element[] = [];
        categories.forEach(cat => {
            const prefix = '—'.repeat(level);
            options.push(
                <option key={cat.id} value={cat.name}>{prefix} {cat.name}</option>
            );
            if (cat.subcategories && cat.subcategories.length > 0) {options.push(...renderCategoryOptions(cat.subcategories, level + 1));}
        });
        
        return options;
    };

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
            alert('Пост успешно создан и отправлен на модерацию!')
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

    if (loading) {
        return (
            <div className="flex items-center justify-center min-h-[60vh]">
                <div className="text-center">
                    <div className="w-16 h-16 border-4 border-firm-orange border-t-transparent rounded-full animate-spin mx-auto"></div>
                    <p className="mt-4 font-['Montserrat_Alternates'] text-gray-600">Загрузка...</p>
                </div>
            </div>
        )
    }

    const unreadCount = notifications.filter(n => !n.is_read).length

    return (
        <div className="max-w-7xl mx-auto px-4 py-6">
            <div className="flex justify-between items-center mb-6 pb-4 border-b border-gray-200">
                <div>
                    <h1 className="font-['Montserrat_Alternates'] font-bold text-2xl">Добро пожаловать, {session.user.name}!</h1>
                    <p className="text-gray-500 text-sm mt-1">Вот что происходит с вашим магазином сегодня</p>
                </div>
                <div className="flex items-center gap-4">
                    <Link href="/master/chats" className="relative">
                        <div className="w-10 h-10 rounded-full bg-[#EAEAEA] flex items-center justify-center hover:bg-firm-orange hover:text-white transition-colors">
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" /></svg>
                        </div>
                        {stats.total_followers > 0 && (<span className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 text-white text-xs rounded-full flex items-center justify-center">{stats.total_followers > 9 ? '9+' : stats.total_followers}</span>)}
                    </Link>

                    <div className="relative">
                        <button onClick={() => setShowNotifications(!showNotifications)} className="relative w-10 h-10 rounded-full bg-[#EAEAEA] flex items-center justify-center hover:bg-firm-orange hover:text-white transition-colors"><svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" /></svg>{unreadCount > 0 && (<span className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 text-white text-xs rounded-full flex items-center justify-center">{unreadCount > 9 ? '9+' : unreadCount}</span>)}</button>

                        {showNotifications && (
                            <div className="absolute right-0 mt-2 w-80 bg-white rounded-lg shadow-xl z-50 border border-gray-200">
                                <div className="p-3 border-b border-gray-200">
                                    <h3 className="font-semibold">Уведомления</h3>
                                </div>
                                <div className="max-h-96 overflow-y-auto">
                                    {notifications.length === 0 ? (
                                        <div className="p-4 text-center text-gray-500">Нет уведомлений</div>
                                    ) : (
                                        notifications.map(notif => (
                                            <div key={notif.id} className={`p-3 border-b border-gray-100 hover:bg-gray-50 cursor-pointer ${!notif.is_read ? 'bg-blue-50' : ''}`} onClick={() => {markNotificationAsRead(notif.id); if (notif.link) router.push(notif.link); setShowNotifications(false)}}>
                                                <div className="flex items-start gap-3">
                                                    <span className="text-xl">{getNotificationIcon(notif.type)}</span>
                                                    <div className="flex-1">
                                                        <p className="font-medium text-sm">{notif.title}</p>
                                                        <p className="text-xs text-gray-500 mt-1">{notif.message}</p>
                                                        <p className="text-xs text-gray-400 mt-1">{new Date(notif.created_at).toLocaleDateString('ru-RU')}</p>
                                                    </div>
                                                    {!notif.is_read && (<div className="w-2 h-2 bg-blue-500 rounded-full mt-2"></div>)}
                                                </div>
                                            </div>
                                        ))
                                    )}
                                </div>
                                <div className="p-2 border-t border-gray-200 text-center">
                                    <Link href="/master/notifications" className="text-sm text-firm-orange hover:underline">Все уведомления</Link>
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            </div>

            <div className="grid grid-cols-4 gap-4 mb-8">
                <div className="bg-white rounded-lg shadow-md p-4">
                    <p className="text-gray-500 text-sm">Новые заказы</p>
                    <p className="text-2xl font-bold text-firm-orange">{stats.new_orders}</p>
                </div>
                <div className="bg-white rounded-lg shadow-md p-4">
                    <p className="text-gray-500 text-sm">Всего заказов</p>
                    <p className="text-2xl font-bold text-firm-pink">{stats.total_orders}</p>
                </div>
                <div className="bg-white rounded-lg shadow-md p-4">
                    <p className="text-gray-500 text-sm">Товаров</p>
                    <p className="text-2xl font-bold text-firm-orange">{stats.total_products}</p>
                </div>
                <div className="bg-white rounded-lg shadow-md p-4">
                    <p className="text-gray-500 text-sm">Просмотров</p>
                    <p className="text-2xl font-bold text-firm-pink">{stats.total_views}</p>
                </div>
            </div>

            <div className="flex justify-center gap-4 mb-8">
                <button onClick={() => setShowAddProductModal(true)} className="px-6 py-3 bg-firm-orange text-white rounded-lg hover:bg-opacity-90 transition flex items-center gap-2"><span>+</span> Добавить товар</button>
                <button onClick={() => setShowAddClassModal(true)} className="px-6 py-3 bg-firm-pink text-white rounded-lg hover:bg-opacity-90 transition flex items-center gap-2"><span>+</span> Создать мастер-класс</button>
                <button onClick={() => setShowAddPostModal(true)} className="px-6 py-3 border-2 border-firm-orange text-firm-orange rounded-lg hover:bg-firm-orange hover:text-white transition">✍️ Написать пост</button>
            </div>

            {showAddProductModal && (
                <div className="fixed inset-0 bg-[#00000059] bg-opacity-50 flex items-center justify-center z-50 p-4" onClick={() => setShowAddProductModal(false)}>
                    <div className="bg-white rounded-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
                        <div className="sticky top-0 bg-white border-b border-gray-200 p-4 flex justify-between items-center">
                            <h2 className="font-['Montserrat_Alternates'] font-semibold text-2xl">Добавить товар</h2>
                            <button onClick={() => setShowAddProductModal(false)} className="text-gray-500 hover:text-gray-700 text-2xl">✕</button>
                        </div>

                        <form onSubmit={handleSubmitProduct} className="p-6 space-y-6">
                            {/* Загрузка фото с предпросмотром */}
                            <div>
                                <label className="block text-gray-700 mb-2 font-['Montserrat_Alternates'] font-medium">Добавьте фото (до 10 шт.) <span className="text-red-500">*</span></label>
                                
                                {/* Кнопка загрузки */}
                                <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center hover:border-firm-orange transition cursor-pointer" onClick={() => fileInputRef.current?.click()}>
                                    <input type="file" accept="image/*" multiple onChange={handleImageSelect} className="hidden" ref={fileInputRef} />
                                    <div className="flex flex-col items-center gap-2">
                                        <svg className="w-12 h-12 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>
                                        <span className="text-gray-500">Нажмите для выбора файлов</span>
                                        <span className="text-xs text-gray-400">PNG, JPG, WEBP до 10MB</span>
                                    </div>
                                </div>
                                
                                {/* Предпросмотр изображений */}
                                {imagePreviews.length > 0 && (
                                    <div className="mt-4">
                                        <p className="text-sm text-gray-500 mb-2">Загружено фото: {imagePreviews.length}/10 <span className="text-xs text-gray-400 ml-2">(перетащите для изменения порядка)</span></p>
                                        <div className="grid grid-cols-4 gap-3">
                                            {imagePreviews.map((preview, idx) => (
                                                <div key={idx} draggable onDragStart={(e) => {e.dataTransfer.setData('text/plain', idx.toString())}} onDragOver={(e) => e.preventDefault()} onDrop={(e) => {e.preventDefault(); const fromIndex = parseInt(e.dataTransfer.getData('text/plain')); moveImage(fromIndex, idx) }} className="relative group aspect-square rounded-lg overflow-hidden border-2 border-gray-200 hover:border-firm-orange transition cursor-move">
                                                    <Image width={160} height={160} src={preview} alt={`preview-${idx}`} className="w-full h-full object-cover"/>
                                                    <button type="button" onClick={() => removeImage(idx)} className="absolute top-1 right-1 w-6 h-6 bg-red-500 text-white rounded-full text-xs flex items-center justify-center opacity-0 group-hover:opacity-100 transition">✕</button>
                                                    {idx === 0 && (
                                                        <div className="absolute bottom-1 left-1 bg-firm-orange text-white text-xs px-1.5 py-0.5 rounded">
                                                            Главное
                                                        </div>
                                                    )}
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                )}
                            </div>

                            {/* Название товара */}
                            <div>
                                <label className="block text-gray-700 mb-1 font-['Montserrat_Alternates'] font-medium">Название товара <span className="text-red-500">*</span></label>
                                <input type="text" name="title" value={productForm.title} onChange={handleProductInputChange} required className="w-full p-3 rounded-lg bg-[#f1f1f1] outline-firm-orange" placeholder="Например: Свитер «Зимний уют»" />
                            </div>

                            {/* Категория */}
                            <div>
                                <label className="block text-gray-700 mb-1 font-['Montserrat_Alternates'] font-medium">Категория <span className="text-red-500">*</span></label>
                                <select className="w-full p-3 rounded-lg bg-[#f1f1f1] outline-firm-pink" name="category" value={productForm.category} onChange={handleProductInputChange} required>
                                    <option value="">Выберите категорию</option>
                                    {renderCategoryOptions(categories)}
                                </select>
                            </div>

                            {/* Пряжа */}
                            <div>
                                <label className="block text-gray-700 mb-1 font-['Montserrat_Alternates'] font-medium">Название пряжи</label>
                                <select name="yarn_id" value={productForm.yarn_id} onChange={handleProductInputChange} className="w-full p-3 rounded-lg bg-[#f1f1f1] outline-firm-orange">
                                    <option value="">Выберите пряжу</option>
                                        {yarns.map(yarn => (<option key={yarn.id} value={yarn.id}>{yarn.name} - {yarn.brand} ({yarn.color})</option>))}
                                    <option value="custom">Другая пряжа (указать вручную)</option>
                                </select>
                                
                                {productForm.yarn_id === 'custom' && (<input type="text" name="custom_yarn" value={productForm.custom_yarn} onChange={handleProductInputChange} placeholder="Укажите название пряжи" className="w-full mt-2 p-3 rounded-lg bg-[#EAEAEA] outline-firm-pink" />)}
                            </div>

                            {/* Техника вязки */}
                            <div>
                                <label className="block text-gray-700 mb-1 font-['Montserrat_Alternates'] font-medium">Техника вязки</label>
                                <select name="technique" value={productForm.technique} onChange={handleProductInputChange} className="w-full p-3 rounded-lg bg-[#f1f1f1] outline-firm-orange">
                                    <option value="">Выберите технику</option>
                                    {techniques.map(tech => (<option key={tech} value={tech}>{tech}</option>))}
                                </select>
                            </div>

                            {/* Описание */}
                            <div>
                                <label className="block text-gray-700 mb-1 font-['Montserrat_Alternates'] font-medium">Описание</label>
                                <textarea name="description" value={productForm.description} onChange={handleProductInputChange} rows={4} className="w-full p-3 rounded-lg bg-[#f1f1f1] outline-firm-pink" placeholder="Опишите ваше изделие, особенности, материалы..." />
                            </div>

                            {/* Цвет */}
                            <div>
                                <label className="block text-gray-700 mb-1 font-['Montserrat_Alternates'] font-medium">Цвет</label>
                                <input type="text" name="color" value={productForm.color} onChange={handleProductInputChange} className="w-full p-3 rounded-lg bg-[#f1f1f1] outline-firm-orange" placeholder="Например: Серый, Бордовый, Меланж..." />
                            </div>

                            {/* Уход */}
                            <div>
                                <label className="block text-gray-700 mb-1 font-['Montserrat_Alternates'] font-medium">Уход</label>
                                <input type="text" name="care_instructions" value={productForm.care_instructions} onChange={handleProductInputChange} className="w-full p-3 rounded-lg bg-[#f1f1f1] outline-firm-pink" placeholder="Ручная стирка при 30°, не отбеливать, сушить в горизонтальном положении" />
                            </div>

                            {/* Размер */}
                            <div>
                                <label className="block text-gray-700 mb-1 font-['Montserrat_Alternates'] font-medium">Размер</label>
                                <div className="flex flex-wrap gap-3">
                                    {sizes.map(size => (
                                        <label key={size} className="flex items-center gap-2 cursor-pointer">
                                            <input type="radio" name="size" value={size}  checked={productForm.size === size} onChange={handleProductInputChange} className="w-4 h-4 accent-firm-orange" />
                                            <span className="text-sm">{size}</span>
                                        </label>
                                    ))}
                                </div>
                            </div>

                            {/* Цена */}
                            <div>
                                <label className="block text-gray-700 mb-1 font-['Montserrat_Alternates'] font-medium">Цена <span className="text-red-500">*</span></label>
                                <div className="relative">
                                    <input type="number" name="price" value={productForm.price} onChange={handleProductInputChange} required min="0" step="100" className="w-full p-3 rounded-lg bg-[#f1f1f1] outline-firm-orange pr-16" placeholder="3500" />
                                    <span className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-500">₽</span>
                                </div>
                            </div>

                            {/* Кнопки */}
                            <div className="flex gap-3 pt-4 border-t border-gray-200">
                                <button type="submit" disabled={saving} className="flex-1 py-3 bg-firm-orange text-white rounded-lg hover:bg-opacity-90 transition disabled:opacity-50 font-['Montserrat_Alternates'] font-medium">{saving ? 'Сохранение...' : 'Опубликовать товар'}</button>
                                <button type="button" onClick={() => setShowAddProductModal(false)}  className="px-6 py-3 border border-gray-300 rounded-lg hover:bg-gray-100 transition"> Отмена</button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {showAddClassModal && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4" onClick={() => setShowAddClassModal(false)}>
                    <div className="bg-white rounded-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
                        <div className="sticky top-0 bg-white border-b border-gray-200 p-4 flex justify-between items-center">
                            <h2 className="font-['Montserrat_Alternates'] font-semibold text-2xl">Создать мастер-класс</h2>
                            <button onClick={() => setShowAddClassModal(false)} className="text-gray-500 hover:text-gray-700 text-2xl">
                                ✕
                            </button>
                        </div>

                        <form onSubmit={handleSubmitClass} className="p-6 space-y-6">
                            {/* Загрузка фото */}
                            <div>
                                <label className="block text-gray-700 mb-2 font-['Montserrat_Alternates'] font-medium">
                                    Анонсирующее изображение
                                </label>
                                <div 
                                    className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center hover:border-firm-pink transition cursor-pointer"
                                    onClick={() => classFileInputRef.current?.click()}
                                >
                                    <input
                                        type="file"
                                        accept="image/*"
                                        multiple
                                        onChange={handleClassImageSelect}
                                        className="hidden"
                                        ref={classFileInputRef}
                                    />
                                    <div className="flex flex-col items-center gap-2">
                                        <svg className="w-12 h-12 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                                        </svg>
                                        <span className="text-gray-500">Загрузить изображение</span>
                                        <span className="text-xs text-gray-400">PNG, JPG, WEBP до 10MB</span>
                                    </div>
                                </div>
                                
                                {/* Предпросмотр изображений */}
                                {classImagePreviews.length > 0 && (
                                    <div className="mt-4">
                                        <div className="grid grid-cols-4 gap-3">
                                            {classImagePreviews.map((preview, idx) => (
                                                <div key={idx} className="relative group aspect-square rounded-lg overflow-hidden border-2 border-gray-200">
                                                    <Image src={preview} alt="preview" className="w-full h-full object-cover" />
                                                    <button
                                                        type="button"
                                                        onClick={() => removeClassImage(idx)}
                                                        className="absolute top-1 right-1 w-6 h-6 bg-red-500 text-white rounded-full text-xs flex items-center justify-center opacity-0 group-hover:opacity-100 transition"
                                                    >
                                                        ✕
                                                    </button>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                )}
                            </div>

                            {/* Название */}
                            <div>
                                <label className="block text-gray-700 mb-1 font-['Montserrat_Alternates'] font-medium">
                                    Название мастер-класса <span className="text-red-500">*</span>
                                </label>
                                <input
                                    type="text"
                                    name="title"
                                    value={classForm.title}
                                    onChange={handleClassInputChange}
                                    required
                                    className="w-full p-3 rounded-lg bg-[#EAEAEA] outline-firm-orange"
                                    placeholder="Например: Вязание свитера с косами для начинающих"
                                />
                            </div>

                            {/* Описание */}
                            <div>
                                <label className="block text-gray-700 mb-1 font-['Montserrat_Alternates'] font-medium">
                                    Описание <span className="text-red-500">*</span>
                                </label>
                                <textarea
                                    name="description"
                                    value={classForm.description}
                                    onChange={handleClassInputChange}
                                    rows={4}
                                    required
                                    className="w-full p-3 rounded-lg bg-[#EAEAEA] outline-firm-pink"
                                    placeholder="Опишите, что будет на мастер-классе, какие навыки получат участники..."
                                />
                            </div>

                            {/* Тип мастер-класса */}
                            <div>
                                <label className="block text-gray-700 mb-1 font-['Montserrat_Alternates'] font-medium">
                                    Формат проведения
                                </label>
                                <div className="flex gap-4">
                                    <label className="flex items-center gap-2 cursor-pointer">
                                        <input
                                            type="radio"
                                            name="type"
                                            value="online"
                                            checked={classForm.type === 'online'}
                                            onChange={handleClassInputChange}
                                            className="w-4 h-4 accent-firm-orange"
                                        />
                                        <span>Онлайн</span>
                                    </label>
                                    <label className="flex items-center gap-2 cursor-pointer">
                                        <input
                                            type="radio"
                                            name="type"
                                            value="offline"
                                            checked={classForm.type === 'offline'}
                                            onChange={handleClassInputChange}
                                            className="w-4 h-4 accent-firm-pink"
                                        />
                                        <span>Офлайн</span>
                                    </label>
                                </div>
                            </div>

                            {/* Цена */}
                            <div>
                                <label className="block text-gray-700 mb-1 font-['Montserrat_Alternates'] font-medium">
                                    Стоимость (₽)
                                </label>
                                <div className="relative">
                                    <input
                                        type="number"
                                        name="price"
                                        value={classForm.price}
                                        onChange={handleClassInputChange}
                                        min="0"
                                        step="100"
                                        className="w-full p-3 rounded-lg bg-[#EAEAEA] outline-firm-orange pr-16"
                                        placeholder="Бесплатно"
                                    />
                                    <span className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-500">₽</span>
                                </div>
                            </div>

                            {/* Максимум участников */}
                            <div>
                                <label className="block text-gray-700 mb-1 font-['Montserrat_Alternates'] font-medium">
                                    Максимум участников
                                </label>
                                <input
                                    type="number"
                                    name="max_participants"
                                    value={classForm.max_participants}
                                    onChange={handleClassInputChange}
                                    min="1"
                                    className="w-full p-3 rounded-lg bg-[#EAEAEA] outline-firm-pink"
                                    placeholder="Например: 10"
                                />
                            </div>

                            {/* Дата и время */}
                            <div>
                                <label className="block text-gray-700 mb-1 font-['Montserrat_Alternates'] font-medium">
                                    Дата и время <span className="text-red-500">*</span>
                                </label>
                                <input
                                    type="datetime-local"
                                    name="date_time"
                                    value={classForm.date_time}
                                    onChange={handleClassInputChange}
                                    required
                                    className="w-full p-3 rounded-lg bg-[#EAEAEA] outline-firm-orange"
                                />
                            </div>

                            {/* Длительность */}
                            <div>
                                <label className="block text-gray-700 mb-1 font-['Montserrat_Alternates'] font-medium">
                                    Длительность (минуты)
                                </label>
                                <input
                                    type="number"
                                    name="duration_minutes"
                                    value={classForm.duration_minutes}
                                    onChange={handleClassInputChange}
                                    min="30"
                                    step="30"
                                    className="w-full p-3 rounded-lg bg-[#EAEAEA] outline-firm-pink"
                                    placeholder="Например: 120"
                                />
                            </div>

                            {/* Место проведения (для офлайн) */}
                            {classForm.type === 'offline' && (
                                <div>
                                    <label className="block text-gray-700 mb-1 font-['Montserrat_Alternates'] font-medium">
                                        Место проведения
                                    </label>
                                    <input
                                        type="text"
                                        name="location"
                                        value={classForm.location}
                                        onChange={handleClassInputChange}
                                        className="w-full p-3 rounded-lg bg-[#EAEAEA] outline-firm-orange"
                                        placeholder="Адрес, студия..."
                                    />
                                </div>
                            )}

                            {/* Ссылка (для онлайн) */}
                            {classForm.type === 'online' && (
                                <div>
                                    <label className="block text-gray-700 mb-1 font-['Montserrat_Alternates'] font-medium">
                                        Ссылка на трансляцию
                                    </label>
                                    <input
                                        type="url"
                                        name="online_link"
                                        value={classForm.online_link}
                                        onChange={handleClassInputChange}
                                        className="w-full p-3 rounded-lg bg-[#EAEAEA] outline-firm-pink"
                                        placeholder="https://zoom.us/... или https://meet.google.com/..."
                                    />
                                </div>
                            )}

                            {/* Необходимые материалы */}
                            <div>
                                <label className="block text-gray-700 mb-1 font-['Montserrat_Alternates'] font-medium">
                                    Необходимые материалы
                                </label>
                                <textarea
                                    name="materials"
                                    value={classForm.materials}
                                    onChange={handleClassInputChange}
                                    rows={3}
                                    className="w-full p-3 rounded-lg bg-[#EAEAEA] outline-firm-orange"
                                    placeholder="Список материалов, которые понадобятся участникам..."
                                />
                            </div>

                            {/* Кнопки */}
                            <div className="flex gap-3 pt-4 border-t">
                                <button
                                    type="submit"
                                    disabled={saving}
                                    className="flex-1 py-3 bg-firm-pink text-white rounded-lg hover:bg-opacity-90 transition disabled:opacity-50 font-['Montserrat_Alternates'] font-medium"
                                >
                                    {saving ? 'Создание...' : 'Создать мастер-класс'}
                                </button>
                                <button
                                    type="button"
                                    onClick={() => setShowAddClassModal(false)}
                                    className="px-6 py-3 border border-gray-300 rounded-lg hover:bg-gray-100 transition"
                                >
                                    Отмена
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {showAddPostModal && (
                <div className="fixed inset-0 bg-[#00000059] bg-opacity-50 flex items-center justify-center z-50 p-4" onClick={() => setShowAddPostModal(false)}>
                    <div className="bg-white rounded-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
                        <div className="sticky top-0 bg-white border-b border-gray-200 p-4 flex justify-between items-center">
                            <h2 className="font-['Montserrat_Alternates'] font-semibold text-2xl">Новая запись в блоге</h2>
                            <button onClick={() => setShowAddPostModal(false)} className="text-gray-500 hover:text-gray-700 text-2xl">
                                ✕
                            </button>
                        </div>

                        <form onSubmit={handleSubmitPost} className="p-6 space-y-6">
                            {/* Загрузка фото */}
                            <div>
                                <label className="block text-gray-700 mb-2 font-['Montserrat_Alternates'] font-medium">
                                    Добавьте фото или видео
                                </label>
                                <div 
                                    className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center hover:border-firm-pink transition cursor-pointer"
                                    onClick={() => postFileInputRef.current?.click()}
                                >
                                    <input
                                        type="file"
                                        accept="image/*"
                                        multiple
                                        onChange={handlePostImageSelect}
                                        className="hidden"
                                        ref={postFileInputRef}
                                    />
                                    <div className="flex flex-col items-center gap-2">
                                        <svg className="w-12 h-12 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                                        </svg>
                                        <span className="text-gray-500">Загрузить с устройства</span>
                                        <span className="text-xs text-gray-400">PNG, JPG, WEBP до 10MB</span>
                                    </div>
                                </div>
                                
                                {/* Предпросмотр изображений */}
                                {postImagePreviews.length > 0 && (
                                    <div className="mt-4">
                                        <p className="text-sm text-gray-500 mb-2">
                                            Загружено фото: {postImagePreviews.length}/10
                                        </p>
                                        <div className="grid grid-cols-4 gap-3">
                                            {postImagePreviews.map((preview, idx) => (
                                                <div key={idx} className="relative group aspect-square rounded-lg overflow-hidden border-2 border-gray-200">
                                                    <Image src={preview} alt="preview" className="w-full h-full object-cover" />
                                                    <button
                                                        type="button"
                                                        onClick={() => removePostImage(idx)}
                                                        className="absolute top-1 right-1 w-6 h-6 bg-red-500 text-white rounded-full text-xs flex items-center justify-center opacity-0 group-hover:opacity-100 transition"
                                                    >
                                                        ✕
                                                    </button>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                )}
                            </div>

                            {/* Заголовок */}
                            <div>
                                <label className="block text-gray-700 mb-1 font-['Montserrat_Alternates'] font-medium">
                                    Заголовок <span className="text-red-500">*</span>
                                </label>
                                <input
                                    type="text"
                                    name="title"
                                    value={postForm.title}
                                    onChange={handlePostInputChange}
                                    required
                                    className="w-full p-3 rounded-lg bg-[#EAEAEA] outline-firm-pink"
                                    placeholder="Например: Как выбрать пряжу для зимнего свитера"
                                />
                            </div>

                            {/* Категория блога */}
                            <div>
                                <label className="block text-gray-700 mb-1 font-['Montserrat_Alternates'] font-medium">
                                    Категория
                                </label>
                                <select
                                    name="category"
                                    value={postForm.category}
                                    onChange={handlePostInputChange}
                                    className="w-full p-3 rounded-lg bg-[#EAEAEA] outline-firm-orange"
                                >
                                    <option value="">Выберите категорию</option>
                                    {blogTags.map(tag => (
                                        <option key={tag} value={tag}>{tag}</option>
                                    ))}
                                </select>
                            </div>

                            {/* Теги */}
                            <div>
                                <label className="block text-gray-700 mb-1 font-['Montserrat_Alternates'] font-medium">
                                    Теги
                                </label>
                                <select
                                    name="tags"
                                    value={postForm.tags}
                                    onChange={handlePostInputChange}
                                    className="w-full p-3 rounded-lg bg-[#EAEAEA] outline-firm-pink"
                                >
                                    <option value="">Выберите тег</option>
                                    {blogTags.map(tag => (
                                        <option key={tag} value={tag}>{tag}</option>
                                    ))}
                                </select>
                                <p className="text-xs text-gray-400 mt-1">Можно добавить несколько тегов через запятую</p>
                            </div>

                            {/* Краткое описание */}
                            <div>
                                <label className="block text-gray-700 mb-1 font-['Montserrat_Alternates'] font-medium">
                                    Краткое описание (анонс)
                                </label>
                                <textarea
                                    name="excerpt"
                                    value={postForm.excerpt}
                                    onChange={handlePostInputChange}
                                    rows={2}
                                    className="w-full p-3 rounded-lg bg-[#EAEAEA] outline-firm-orange"
                                    placeholder="Краткое описание поста, которое будет отображаться в ленте..."
                                />
                            </div>

                            {/* Содержание */}
                            <div>
                                <label className="block text-gray-700 mb-1 font-['Montserrat_Alternates'] font-medium">
                                    Содержание <span className="text-red-500">*</span>
                                </label>
                                <textarea
                                    name="content"
                                    value={postForm.content}
                                    onChange={handlePostInputChange}
                                    rows={10}
                                    required
                                    className="w-full p-3 rounded-lg bg-[#EAEAEA] outline-firm-pink"
                                    placeholder="Напишите ваш пост... Используйте **жирный текст**, *курсив*, #теги..."
                                />
                                <p className="text-xs text-gray-400 mt-1">
                                    Поддерживается Markdown: **жирный**, *курсив*, #теги
                                </p>
                            </div>

                            {/* Кнопки */}
                            <div className="flex gap-3 pt-4 border-t">
                                <button
                                    type="submit"
                                    disabled={saving}
                                    className="flex-1 py-3 bg-firm-pink text-white rounded-lg hover:bg-opacity-90 transition disabled:opacity-50 font-['Montserrat_Alternates'] font-medium"
                                >
                                    {saving ? 'Публикация...' : 'Опубликовать пост'}
                                </button>
                                <button
                                    type="button"
                                    onClick={() => setShowAddPostModal(false)}
                                    className="px-6 py-3 border border-gray-300 rounded-lg hover:bg-gray-100 transition"
                                >
                                    Отмена
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            <div className="bg-white rounded-lg shadow-md mb-8">
                <div className="p-4 border-b border-gray-200">
                    <h2 className="font-['Montserrat_Alternates'] font-semibold text-xl flex items-center gap-2">📦 Заказы {orders.filter(o => o.status === 'new').length > 0 && (<span className="bg-red-500 text-white text-xs px-2 py-1 rounded-full">{orders.filter(o => o.status === 'new').length} новых</span>)}</h2>
                </div>
                <div className="divide-y divide-gray-200">
                    {orders.length === 0 ? (
                        <div className="p-8 text-center text-gray-500">У вас пока нет заказов</div>
                    ) : (
                        orders.slice(0, 5).map(order => (
                            <div key={order.id} className="p-4 hover:bg-gray-50 transition">
                                <div className="flex justify-between items-start">
                                    <div className="flex-1">
                                        <div className="flex items-center gap-3 mb-2">
                                            <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(order.status)}`}>{getStatusText(order.status)}</span>
                                            <span className="text-sm text-gray-500">№{order.order_number}</span>
                                        </div>
                                        <p className="font-medium">{order.product_title}</p>
                                        <div className="flex gap-4 mt-1 text-sm text-gray-500">
                                            <span>👤 {order.buyer_name}</span>
                                            <span>💰 {order.total_amount} ₽</span>
                                            <span>📅 {new Date(order.created_at).toLocaleDateString('ru-RU')}</span>
                                        </div>
                                    </div>
                                    <Link href={`/master/orders/${order.id}`}><button className="px-3 py-1 text-sm border border-firm-orange text-firm-orange rounded-lg hover:bg-firm-orange hover:text-white transition">Подробнее</button></Link>
                                </div>
                            </div>
                        ))
                    )}
                </div>
                {orders.length > 5 && (
                    <div className="p-3 text-center border-t border-gray-200">
                        <Link href="/master/orders" className="text-sm text-firm-orange hover:underline">Все заказы →</Link>
                    </div>
                )}
            </div>

            <div className="bg-white rounded-lg shadow-md">
                <div className="p-4 border-b border-gray-200 flex justify-between items-center">
                    <h2 className="font-['Montserrat_Alternates'] font-semibold text-xl flex items-center gap-2">📰 Лента новостей</h2>
                    <Link href="/master/blog/new"><button className="text-sm text-firm-orange hover:underline flex items-center gap-1"><span>+</span> Написать пост</button></Link>
                </div>
                <div className="divide-y divide-gray-200">
                    {blogPosts.length === 0 ? (
                        <div className="p-8 text-center text-gray-500">
                            <p>У вас пока нет постов</p>
                            <Link href="/master/blog/new" className="text-firm-orange hover:underline mt-2 inline-block">Написать первый пост →</Link>
                        </div>
                    ) : (
                        blogPosts.map(post => (
                            <div key={post.id} className="p-4 hover:bg-gray-50 transition">
                                <Link href={`/blog/${post.id}`}>
                                    <div className="flex gap-4">
                                        <div className="w-12 h-12 rounded-full bg-gradient-to-r from-firm-orange to-firm-pink flex items-center justify-center text-white font-bold flex-shrink-0">
                                            {post.author_name?.charAt(0).toUpperCase()}
                                        </div>
                                        <div className="flex-1">
                                            <div className="flex items-center gap-2 mb-1">
                                                <span className="font-semibold">{post.author_name}</span>
                                                <span className="text-xs text-gray-400">
                                                    {new Date(post.created_at).toLocaleDateString('ru-RU')}
                                                </span>
                                            </div>
                                            <h3 className="font-medium text-lg mb-1">{post.title}</h3>
                                            <p className="text-gray-600 line-clamp-2">{post.excerpt}</p>
                                            <div className="flex gap-4 mt-2 text-sm text-gray-500">
                                                <span>👁️ {post.views_count}</span>
                                                <span>❤️ {post.likes_count}</span>
                                                <span>💬 {post.comments_count}</span>
                                            </div>
                                        </div>
                                    </div>
                                </Link>
                            </div>
                        ))
                    )}
                </div>
                {blogPosts.length > 5 && (
                    <div className="p-3 text-center border-t border-gray-200">
                        <Link href="/master/blog" className="text-sm text-firm-orange hover:underline">Все записи →</Link>
                    </div>
                )}
            </div>
        </div>
    )
}