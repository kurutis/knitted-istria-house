'use client'

import { signOut } from "next-auth/react"
import Image from "next/image"
import Link from "next/link"
import React, { useEffect, useState } from "react"

interface MasterProfileProps {
    session: any
}

export default function MasterProfile({session}: MasterProfileProps) {
    const [activeTab, setActiveTab] = useState('dashboard')
    const [isEditing, setIsEditing] = useState(false)
    const [loading, setLoading] = useState(true)

    const [profileData, setProfileData] = useState({fullname: '', email: '', phone: '', city: '', address: '', avatarUrl: null, description: '', is_verified: false, is_partner: false, rating: 0, total_sales: 0, custom_orders_enabled: false, followers: 0})

    const [products, setProducts] = useState([])
    const [orders, setOrders] = useState([])
    const [blogPosts, setBlogPosts] = useState([])
    const [masterClasses, setMasterClasses]  = useState([])
    const [stats, setStats] = useState({total_views: 0, total_orders: 0, total_revenue: 0, total_followers: 0, monthly_views: 0, monthly_orders: 0, monthly_revenue: 0})

    useEffect(() => {
        fetchMasterData()
    }, [])

    const fetchMasterData = async () => {
        try{
            setLoading(true)

            const [profileRes, productRes, ordersRes, blogRes, classesRes] = await Promise.all([fetch('/api/master/profile'), fetch('/api/master/products'),  fetch('/api/master/orders'), fetch('/api/master/blog'), fetch('/api/master/classes')])

            const profile = await profileRes.json()
            const products = await productRes.json()
            const orders = await ordersRes.json()
            const blog = await blogRes.json()
            const classes = await classesRes.json()

            setProfileData(profile)
            setProducts(products)
            setOrders(orders)
            setBlogPosts(blog)
            setMasterClasses(classes)

            const totalViews = products.reduce((sum: number, p: any) => sum + (p.views || 0), 0)
            const totalRevenue = orders.reduce((sum: number, o: any) => sum + o.total_amount, 0)

            const thirtyDaysAgo = new Date()
            thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)

            const monthlyOrders = orders.filter((o: any) => new Date(o.created_at) > thirtyDaysAgo)
            const monthlyRevenue = monthlyOrders.reduce((sum: number, o: any) => sum + o.total_amount, 0)

            setStats({total_views: totalViews, total_orders: orders.length, total_revenue: totalRevenue, total_followers: profile.followers || 0, monthly_views: Math.round(totalViews * 0.3), monthly_orders: monthlyOrders.length, monthly_revenue: monthlyRevenue})
        }catch (error) {
            console.error('Error fetching master data:', error)
        } finally {
            setLoading(false)
        }
    }

    const handleProfileUpdate = async (e: React.FormEvent) => {
        e.preventDefault()
        try{
            const response = await fetch('/api/master/profile', {method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(profileData)})

            if (response.ok) {
                setIsEditing(false)
                await fetchMasterData()
            }
        }catch (error){
            console.error('Error updating profile:', error)
        }
    }

    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
        const {name, value} = e.target
        setProfileData(prev => ({...prev, [name]: value}))
    }

    const handleCheckboxChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const {name, checked} = e.target
        setProfileData(prev => ({...prev, [name]: checked}))
    }

    const handleOrderStatusChange = async (orderId: string, newStatus: string) => {
        try{
            const response = await fetch(`/api/master/orders/${orderId}`, {method: 'PATCH', headers: {'Content-Type':'application/json'}, body: JSON.stringify({status: newStatus})})

            if (response.ok) {
                setOrders(prev => prev.map((order: any) => order.id === orderId ? {...order, status: newStatus} : order))
            }
        }catch (error) {
            console.error('Error updating order:', error)
        }
    }

    const handleProductDelete = async (productId: string) => {
        if (confirm('Вы уверены, что хотите удалить товар?')) {
            try {
                const response = await fetch(`/api/master/products/${productId}`, { method: 'DELETE'})
                if (response.ok) {
                    setProducts(prev => prev.filter((p: any) => p.id !== productId))
                }
            } catch (error) {
                console.error('Error deleting product:', error)
            }
        }
    }

    const handleBlogPostDelete = async (postId: string) => {
        if (confirm('Вы уверены, что хотите удалить пост?')) {
            try {
                const response = await fetch(`/api/master/blog/${postId}`, {method: 'DELETE'})
                if (response.ok) {
                    setBlogPosts(prev => prev.filter((p: any) => p.id !== postId))
                }
            } catch (error) {
                console.error('Error deleting blog post:', error)
            }
        }
    }

    const getStatusColor = (status: string) => {
        switch(status){
            case 'new': return 'text-blue-600 bg-blue-50'
            case 'confirmed': return 'text-green-600 bg-green-50'
            case 'shipped': return 'text-purple-600 bg-purple-50'
            case 'delivered': return 'text-gray-600 bg-gray-50'
            case 'cancelled': return 'text-red-600 bg-red-50'
            case 'moderation': return 'text-yellow-600 bg-yellow-50'
            case 'active': return 'text-green-600 bg-green-50'
            case 'published': return 'text-green-600 bg-green-50'
            case 'draft': return 'text-gray-600 bg-gray-50'
            default: return 'text-gray-600 bg-gray-50'
        }
    }

    const getStatusText = (status: string) => {
        switch(status){
            case 'new': return 'Новый'
            case 'confirmed': return 'Подтвержден'
            case 'shipped': return 'Отправлен'
            case 'delivered': return 'Доставлен'
            case 'cancelled': return 'Отменен'
            case 'moderation': return 'На модерации'
            case 'active': return 'Активен'
            case 'published': return 'Опубликован'
            case 'draft': return 'Черновик'
            default: return status
        }
    }

    const formatDate = (dateString: string) => {
        return new Date(dateString).toLocaleDateString('ru-Ru', {day: '2-digit', month: '2-digit', year: 'numeric'})
    }

    const formatDateTime = (dateString: string) => {
        return new Date(dateString).toLocaleDateString('ru-Ru', {day: '2-digit', month: '2-digit', year: "numeric", hour: '2-digit', minute:'2-digit'})
    }

    if (loading) {
        return(
            <div className="mt-5 flex items-center justify-center min-h-[60vh]">
                <div className="text-center">
                    <div className="w-16 h-16 border-4 border-firm-orange border-t-transparent rounded-full animate-spin mx-auto">
                        <p className="mt-4 font-['Montserrat_Alternates'] text-gray-600">Загрузка</p>
                    </div>
                </div>
            </div>
        )
    }

    return (
        <div className="mt-5 flex items-start justify-center">
            <div className="flex flex-col gap-5 w-[90%] max-w-7xl">
                <div className="flex gap-4 flex-wrap">
                    {profileData.is_verified && (
                        <div className="bg-green-100 text-green-700 px-4 py-2 rounded-full text-sm font-['Montserrat_Alternates'] flex items-center gap-2">
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeWidth={2} d="M5 1314 4L19 7" />
                            </svg>
                            Верифицированный мастер
                        </div>
                    )}
                    {profileData.is_partner && (
                        <div className="bg-firm-orange bg-opacity-10 text-firm-orange px-4 py-2 rounded-full text-sm font-['Montserrat_Alternates'] flex items-center gap-2">
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                            </svg>
                            Партнер фабрики
                        </div>
                    )}
                    {profileData.custom_orders_enabled && (
                        <div className="bg-purple-100 text-purple-700 px-4 py-4 rounded-full text-sm font-['Montserrat_Alternates'] flex items-center gap-2">
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                            </svg>
                            Принимаю индивидуальные заказы
                        </div>
                    )}
                </div>
                <div className="flex gap-8">
                    <div className="w-1/5">
                        <div className="bg-white rounded-lg shadow-md p-4 sticky top-5">
                            <div className="flex flex-col items-center mb-6">
                                <div className="w-24 h-24 rounded-full bg-linear-to-r from-firm-orange to-firm-pink flex items-center justify-center overflow-hidden border-2 border-white shadow-lg">
                                    {profileData.avatarUrl ? (
                                        <Image width={96} height={96} src={profileData.avatarUrl} alt="avatar" className="object-cover w-full h-full" />
                                    ): (
                                        <span className="text-3xl font-['Montserrat_Alternates'] font-semibold text-white">{profileData.fullname?.charAt(0).toUpperCase()}</span>
                                    )}
                                </div>
                                <h3 className="mt-3 font-['Montserrat_Alternates'] font-semibold text-lg text-center">{profileData.fullname}</h3>
                                <p className="text-sm text-gray-500 text-center">{profileData.email}</p>

                                <div className="flex items-center gap-1 mt-3">
                                    {[...Array(5)].map((_, i) => (
                                        <svg key={i} className={`w-5 h-5 ${i < Math.floor(profileData.rating) ? 'text-yellow-400' : 'text-gray-300'}`} fill="currentColor" viewBox="0 0 20 20">
                                            <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                                        </svg>
                                    ))}
                                    <span className="text-sm font-semibold ml-1">{profileData.rating}</span>
                                </div>
                                <p className="text-m text-gray-600 mt-1">{profileData.total_sales} продаж</p>
                                <p className="text-sm text-gray-400 mt-1">{stats.total_followers} подписчиков</p>
                            </div>
                            <nav className="space-y-1">
                                <button onClick={() => setActiveTab('dashboard')} className={`w-full text-left px-4 py-3 rounded-lg transition-all duration-300 font-['Montserrat_Alternates'] flex items-center gap-3 ${activeTab === 'dashboard' ? 'bg-firm-orange text-white' : 'hover:bg-[#eaeaea]'}`}><span>📊</span> Панель управления</button>
                                <button onClick={() => setActiveTab('products')}  className={`w-full text-left px-4 py-3 rounded-lg transition-all duration-300 font-['Montserrat_Alternates'] flex items-center gap-3 ${activeTab === 'products' ? 'bg-firm-pink text-white' : 'hover:bg-[#eaeaea]'}`}><span>🧶</span> Мои товары {products.length > 0 && ( <span className="ml-auto bg-white text-firm-pink text-xs px-2 py-1 rounded-full">{products.length}</span>)}</button>
                                <button onClick={() => setActiveTab('orders')} className={`w-full text-left px-4 py-3 rounded-lg transition-all duration-300 font-['Montserrat_Alternates'] flex items-center gap-3 ${activeTab === 'orders' ? 'bg-firm-orange text-white' : 'hover:bg-[#eaeaea]'}`}> <span>📦</span> Заказы {orders.filter((o: any) => o.status === 'new').length > 0 && (<span className="ml-auto bg-red-500 text-white text-xs px-2 py-1 rounded-full"> {orders.filter((o: any) => o.status === 'new').length}</span>)}</button>
                                <button onClick={() => setActiveTab('blog')} className={`w-full text-left px-4 py-3 rounded-lg transition-all duration-300 font-['Montserrat_Alternates'] flex items-center gap-3 ${activeTab === 'blog' ? 'bg-firm-pink text-white' : 'hover:bg-[#eaeaea]'}`}> <span>✍️</span> Блог</button>
                                <button onClick={() => setActiveTab('master-classes')} className={`w-full text-left px-4 py-3 rounded-lg transition-all duration-300 font-['Montserrat_Alternates'] flex items-center gap-3 ${activeTab === 'master-classes' ? 'bg-firm-orange text-white' : 'hover:bg-[#eaeaea]'}`}><span>🎓</span> Мастер-классы</button>
                                <button onClick={() => setActiveTab('profile')}  className={`w-full text-left px-4 py-3 rounded-lg transition-all duration-300 font-['Montserrat_Alternates'] flex items-center gap-3 ${ activeTab === 'profile' ? 'bg-firm-pink text-white' : 'hover:bg-[#eaeaea]'}`}> <span>👤</span> Профиль</button>
                                <button onClick={() => setActiveTab('settings')} className={`w-full text-left px-4 py-3 rounded-lg transition-all duration-300 font-['Montserrat_Alternates'] flex items-center gap-3 ${activeTab === 'settings' ? 'bg-firm-orange text-white' : 'hover:bg-[#eaeaea]'}`}><span>⚙️</span> Настройки</button>
                                <div className="border-t border-gray-200 my-2"></div>
                                <button onClick={() => signOut({callbackUrl: '/'})} className="w-full text-left px-4 py-3 rounded-lg transition-all duration-300 font-['Montserrat_Alternates'] flex items-center gap-3 text-red-600 hover:bg-red-50"><span>🚪</span> Выйти</button>
                            </nav>
                        </div>
                    </div>
                    <div className="w-4/5">
                        {activeTab === 'dashboard' && (
                            <div className="space-y-6">
                                <div className="flex gap-4 justify-between">
                                    <div className="bg-white rounded-lg shadow-md p-6 w-full">
                                        <p className="text-gray-500 text-sm font-['Montserrat_Alternates']">Просмотры</p>
                                        <p className="text-3xl font-bold font-['Montserrat_Alternates'] text-firm-orange">{stats.total_views}</p>
                                        <p className="text-xs text-green-600 mt-1">+{stats.monthly_views} за месяц</p>
                                    </div>
                                    <div className="bg-white rounded-lg shadow-md p-6  w-full">
                                        <p className="text-gray-500 text-sm font-['Montserrat_Alternates']">Заказы</p>
                                        <p className="text-3xl font-bold font-['Montserrat_Alternates'] text-firm-pink">{stats.total_orders}</p>
                                        <p className="text-xs text-green-600 mt-1">+{stats.monthly_orders} за месяц</p>
                                    </div>
                                    <div className="bg-white rounded-lg shadow-md p-6  w-full">
                                        <p className="text-gray-500 text-sm font-['Montserrat_Alternates']">Выручка</p>
                                        <p className="text-3xl font-bold font-['Montserrat_Alternates'] text-green-600">{stats.total_revenue.toLocaleString()} ₽</p>
                                        <p className="text-xs text-green-600 mt-1">+{stats.monthly_revenue.toLocaleString()} ₽ за месяц</p>
                                    </div>
                                    <div className="bg-white rounded-lg shadow-md p-6  w-full">
                                        <p className="text-gray-500 text-sm font-['Montserrat_Alternates']">Подписчики</p>
                                        <p className="text-3xl font-bold font-['Montserrat_Alternates'] text-yellow-500">{stats.total_followers}</p>
                                        <p className="text-xs text-gray-500 mt-1">+12 за месяц</p>
                                    </div>
                                </div>
                                <div className="bg-white rounded-lg shadow-md p-6">
                                    <h3 className="font-['Montserrat_Alternates'] font-semibold text-lg mb-4">Быстрые действия</h3>
                                    <div className="flex justify-between gap-5">
                                        <Link href="/master/products/new" className="w-full px-4 py-2 bg-firm-orange text-white rounded-lg hover:bg-opacity-90 transition-all duration-300">+ Добавить товар</Link>
                                        <Link href="/master/blog/new" className="w-full px-4 py-2 bg-firm-pink text-white rounded-lg hover:bg-opacity-90 transition-all duration-300">+ Новая запись в блоге</Link>
                                        <Link href="/master/master-classes/new" className="w-full px-4 py-2 border-2 border-firm-orange text-firm-orange rounded-lg hover:bg-firm-orange hover:text-white transition-all duration-300">+ Создать мастер-класс</Link>
                                    </div>
                                </div>
                                <div className="bg-white rounded-lg shadow-md p-6">
                                    <div className="flex justify-between items-center mb-4">
                                        <h3 className="font-['Montserrat_Alternates'] font-semibold text-lg">Последние заказы</h3>
                                        <button onClick={() => setActiveTab('orders')} className="text-sm text-firm-orange hover:underline">Все заказы →</button>
                                    </div>
                                    <div className="space-y-3">
                                        {orders.slice(0, 3).map((order: any) => (
                                            <div key={order.id} className="flex justify-between items-center p-4 border rounded-lg hover:shadow-md transition-shadow">
                                                <div>
                                                    <p className="font-semibold">{order.product_title}</p>
                                                    <div className="flex items-center gap-3 mt-1">
                                                        <p className="text-sm text-gray-500">{order.buyer_name}</p>
                                                        <span className="text-xs text-gray-400">•</span>
                                                        <p className="text-sm text-gray-500">{formatDate(order.created_at)}</p>
                                                    </div>
                                                </div>
                                                <div className="flex items-center gap-4">
                                                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(order.status)}`}>{getStatusText(order.status)}</span>
                                                    <span className="font-semibold text-firm-orange">{order.total_amount} ₽</span>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                                <div className="bg-white rounded-lg shadow-md p-6">
                                    <div className="flex justify-between items-center mb-4">
                                        <h3 className="font-['Montserrat_Alternates'] font-semibold text-lg">Популярные товары</h3>
                                        <button onClick={() => setActiveTab('products')}className="text-sm text-firm-pink hover:underline">Все товары →</button>
                                    </div>
                                    <div className="space-y-3">
                                        {products
                                            .filter((p: any) => p.status === 'active')
                                            .sort((a: any, b: any) => b.views - a.views)
                                            .slice(0, 3)
                                            .map((product: any) => (
                                                <div key={product.id} className="flex justify-between items-center p-4 border rounded-lg hover:shadow-md transition-shadow">
                                                    <div>
                                                        <p className="font-semibold">{product.title}</p>
                                                        <p className="text-sm text-gray-500 mt-1">{product.views} просмотров • {product.orders} продаж</p>
                                                    </div>
                                                    <span className="font-semibold text-firm-pink">{product.price} ₽</span>
                                                </div>
                                            ))}
                                    </div>
                                </div>
                            </div>
                        )}
                        {activeTab === 'products' && (
                            <div className="bg-white rounded-lg shadow-md p-6">
                                <div className="flex justify-between items-center mb-6">
                                    <h2 className="font-['Montserrat_Alternates'] font-semibold text-2xl">Мои товары</h2>
                                    <Link href="/master/products/new"className="px-4 py-2 bg-firm-orange text-white rounded-lg hover:bg-opacity-90 transition-all duration-300 font-['Montserrat_Alternates'] flex items-center gap-2">+ Добавить товар</Link>
                                </div>
                                <div className="flex gap-2 mb-6">
                                    <button className="px-3 py-1 bg-firm-orange text-white rounded-full text-m">Все</button>
                                    <button className="px-3 py-1 border border-gray-300 rounded-full text-m hover:bg-gray-50">Активные</button>
                                    <button className="px-3 py-1 border border-gray-300 rounded-full text-m hover:bg-gray-50">На модерации</button>
                                    <button className="px-3 py-1 border border-gray-300 rounded-full text-m hover:bg-gray-50">Черновики</button>
                                </div>
                                <div className="space-y-4">
                                    {products.map((product: any) => (
                                        <div key={product.id} className="flex items-center gap-4 p-4 border rounded-lg hover:shadow-md transition-shadow">
                                            <div className="w-20 h-20 bg-[#eaeaea] rounded-lg flex items-center justify-center flex-shrink-0">
                                                {product.image ? (<Image src={product.image} alt={product.title} width={80} height={80} className="object-cover rounded-lg" />):(<span className="text-gray-400 text-xs text-center">Нет фото</span>)}
                                            </div>
                                            <div className="flex-1">
                                                <div className="flex items-center gap-3 mb-1">
                                                    <h3 className="font-['Montserrat_Alternates'] font-semibold">{product.title}</h3>
                                                    <span className={`text-xs px-2 py-1 rounded-full ${getStatusColor(product.status)}`}>{getStatusText(product.status)}</span>
                                                </div>
                                                <p className="text-sm text-gray-500">Добавлен: {formatDate(product.created_at)}</p>
                                                <div className="flex gap-4 mt-2 text-sm text-gray-600">
                                                    <span>👁️ {product.views} просмотров</span>
                                                    <span>🛒 {product.orders} продаж</span>
                                                </div>
                                            </div>
                                            <div className="text-right">
                                                <p className="font-['Montserrat_Alternates'] font-bold text-firm-orange text-xl">{product.price} ₽</p>
                                                <div className="flex gap-3 mt-2">
                                                    <Link href={`/master/products/${product.id}/edit`} className="text-sm text-blue-600 hover:underline">Ред.</Link>
                                                    <button onClick={() => handleProductDelete(product.id)}className="text-sm text-red-600 hover:underline">Удалить</button>
                                                </div>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}
                        {activeTab === 'orders' && (
                            <div className="bg-white rounded-lg shadow-md p-6">
                                <h2 className="font-['Montserrat_Alternates'] font-semibold text-2xl mb-6">Заказы</h2>
                                <div className="flex gap-2 mb-6 overflow-x-auto pb-2">
                                    <button className="px-4 py-2 bg-firm-orange text-white rounded-lg text-m whitespace-nowrap">Все заказы</button>
                                    <button className="px-4 py-2 border border-gray-300 rounded-lg text-m hover:bg-gray-50 whitespace-nowrap">Новые</button>
                                    <button className="px-4 py-2 border border-gray-300 rounded-lg text-m hover:bg-gray-50 whitespace-nowrap">Подтвержденные</button>
                                    <button className="px-4 py-2 border border-gray-300 rounded-lg text-m hover:bg-gray-50 whitespace-nowrap">Отправленные</button>
                                    <button className="px-4 py-2 border border-gray-300 rounded-lg text-m hover:bg-gray-50 whitespace-nowrap">Доставленные</button>
                                    <button className="px-4 py-2 border border-gray-300 rounded-lg text-m hover:bg-gray-50 whitespace-nowrap">Отмененные</button>
                                </div>
                                <div className="space-y-4">
                                    {orders.map((order: any) => (
                                        <div key={order.id} className="border rounded-lg p-5 hover:shadow-md transition-shadow">
                                            <div className="flex justify-between items-start mb-3">
                                                <div>
                                                    <div className="flex items-center gap-3 mb-2">
                                                        <span className="font-['Montserrat_Alternates'] font-semibold text-lg">Заказ #{order.order_number}</span>
                                                        <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(order.status)}`}>{getStatusText(order.status)}</span>
                                                    </div>
                                                    <p className="font-medium">{order.product_title}</p>
                                                </div>
                                                <span className="text-sm text-gray-500">{formatDateTime(order.created_at)}</span>
                                            </div>
                                            <div className="grid grid-cols-2 gap-4 mb-4 text-sm">
                                                <div>
                                                    <p className="text-gray-500">Покупатель</p>
                                                    <p className="font-medium">{order.buyer_name}</p>
                                                    <p className="text-gray-600">{order.buyer_phone}</p>
                                                </div>
                                                <div>
                                                    <p className="text-gray-500">Доставка</p>
                                                    <p className="text-gray-600">{order.delivery_address}</p>
                                                </div>
                                            </div>
                                            <div className="flex justify-between items-center">
                                                <div className="flex gap-2">
                                                    {order.status === 'new' && (
                                                        <>
                                                            <button onClick={() => handleOrderStatusChange(order.id, 'confirmed')}className="px-3 py-1 bg-green-500 text-white rounded-lg text-sm hover:bg-green-600">Подтвердить</button>
                                                            <button onClick={() => handleOrderStatusChange(order.id, 'cancelled')} className="px-3 py-1 bg-red-500 text-white rounded-lg text-sm hover:bg-red-600">Отклонить</button>
                                                        </>
                                                    )}
                                                    {order.status === 'confirmed' && (
                                                        <button onClick={() => handleOrderStatusChange(order.id, 'shipped')} className="px-3 py-1 bg-purple-500 text-white rounded-lg text-sm hover:bg-purple-600">Отметить как отправлено</button>
                                                    )}
                                                    {order.status === 'shipped' && (
                                                        <button onClick={() => handleOrderStatusChange(order.id, 'delivered')} className="px-3 py-1 bg-blue-500 text-white rounded-lg text-sm hover:bg-blue-600">Подтвердить доставку</button>
                                                    )}
                                                </div>
                                                <span className="font-['Montserrat_Alternates'] font-bold text-firm-pink text-xl">{order.total_amount} ₽</span>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}
                        {activeTab === 'blog' && (
                            <div className="bg-white rounded-lg shadow-md p-6">
                                <div className="flex justify-between items-center mb-6">
                                    <h2 className="font-['Montserrat_Alternates'] font-semibold text-2xl">Мой блог</h2>
                                    <Link 
                                        href="/master/blog/new"
                                        className="px-4 py-2 bg-firm-pink text-white rounded-lg hover:bg-opacity-90 transition-all duration-300 font-['Montserrat_Alternates'] flex items-center gap-2"
                                    >
                                        + Новая запись
                                    </Link>
                                </div>

                                <div className="space-y-4">
                                    {blogPosts.map((post: any) => (
                                        <div key={post.id} className="border rounded-lg p-5 hover:shadow-md transition-shadow">
                                            <div className="flex justify-between items-start mb-3">
                                                <div>
                                                    <h3 className="font-['Montserrat_Alternates'] font-semibold text-lg">{post.title}</h3>
                                                    <p className="text-sm text-gray-500 mt-1">{formatDate(post.date)}</p>
                                                </div>
                                                <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(post.status)}`}>{getStatusText(post.status)}</span>
                                            </div>
                                            <p className="text-gray-600 mb-3 line-clamp-2">{post.excerpt}</p>
                                            <div className="flex justify-between items-center">
                                                <div className="flex gap-4 text-sm text-gray-500">
                                                    <span>👁️ {post.views} просмотров</span>
                                                    <span>💬 {post.comments} комментариев</span>
                                                    <span>❤️ {post.likes} лайков</span>
                                                </div>
                                                <div className="flex gap-3">
                                                    <Link href={`/master/blog/${post.id}/edit`} className="text-sm text-blue-600 hover:underline">Редактировать</Link>
                                                    <button onClick={() => handleBlogPostDelete(post.id)}className="text-sm text-red-600 hover:underline">Удалить</button>
                                                </div>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}
                        {activeTab === 'master-classes' && (
                            <div className="bg-white rounded-lg shadow-md p-6">
                                <div className="flex justify-between items-center mb-6">
                                    <h2 className="font-['Montserrat_Alternates'] font-semibold text-2xl">Мои мастер-классы</h2>
                                    <Link 
                                        href="/master/master-classes/new"
                                        className="px-4 py-2 bg-firm-orange text-white rounded-lg hover:bg-opacity-90 transition-all duration-300 font-['Montserrat_Alternates'] flex items-center gap-2"
                                    >
                                        + Создать мастер-класс
                                    </Link>
                                </div>

                                <div className="space-y-4">
                                    {masterClasses.map((mc: any) => (
                                        <div key={mc.id} className="border rounded-lg p-5 hover:shadow-md transition-shadow">
                                            <div className="flex justify-between items-start mb-3">
                                                <div>
                                                    <h3 className="font-['Montserrat_Alternates'] font-semibold text-lg">{mc.title}</h3>
                                                    <p className="text-sm text-gray-500 mt-1">{formatDateTime(mc.date)}</p>
                                                </div>
                                                <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(mc.status)}`}>{getStatusText(mc.status)}</span>
                                            </div>
                                            <div className="grid grid-cols-3 gap-4 mb-3 text-sm">
                                                <div>
                                                    <p className="text-gray-500">Тип</p>
                                                    <p className="font-medium">{mc.type === 'online' ? 'Онлайн' : 'Офлайн'}</p>
                                                </div>
                                                <div>
                                                    <p className="text-gray-500">Стоимость</p>
                                                    <p className="font-medium">{mc.price} ₽</p>
                                                </div>
                                                <div>
                                                    <p className="text-gray-500">Участники</p>
                                                    <p className="font-medium">{mc.participants}/{mc.max_participants}</p>
                                                </div>
                                            </div>
                                            <div className="flex justify-between items-center">
                                                <div className="text-sm text-gray-500">
                                                    Записалось: {mc.registrations} чел.
                                                </div>
                                                <div className="flex gap-3">
                                                    <Link href={`/master/master-classes/${mc.id}/edit`} className="text-sm text-blue-600 hover:underline">Редактировать</Link>
                                                    <Link href={`/master/master-classes/${mc.id}/participants`} className="text-sm text-firm-orange hover:underline">Участники</Link>
                                                </div>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}
                         {activeTab === 'profile' && (
                            <div className="bg-white rounded-lg shadow-md p-6">
                                <div className="flex justify-between items-center mb-6">
                                    <h2 className="font-['Montserrat_Alternates'] font-semibold text-2xl">Профиль мастера</h2>
                                    {!isEditing ? (<button className="px-4 py-2 border-2 border-firm-pink rounded-lg hover:scale-105 hover:border-4 hover:bg-firm-pink hover:text-white transition-all duration-300 font-['Montserrat_Alternates']" onClick={() => setIsEditing(true)}>Редактировать</button>) : (<button className="px-4 py-2 bg-gray-500 text-white rounded-lg hover:bg-gray-600 transition-all duration-300 font-['Montserrat_Alternates']" onClick={() => setIsEditing(false)}>Отмена</button>)}
                                </div>
                                {isEditing ? (
                                    <form onSubmit={handleProfileUpdate} className="space-y-4">
                                        <div>
                                            <label className="block text-gray-700 mb-1 font-['Montserrat_Alternates']">Имя <span className="text-red-500">*</span></label>
                                            <input className="w-full p-2 rounded-lg bg-[#eaeaea] outline-firm-orange focus:outline-2" type="text" name="fullname" value={profileData.fullname} onChange={handleInputChange} required/>
                                        </div>
                                        <div>
                                            <label className="block text-gray-700 mb-1 font-['Montserrat_Alternates']">Email <span className="text-red-500">*</span></label>
                                            <input className="w-full p-2 rounded-lg bg-[#eaeaea] outline-firm-pink focus:outline-2" type="email" name="email" value={profileData.email} onChange={handleInputChange} required />
                                        </div>
                                        <div>
                                            <label className="block text-gray-700 mb-1 font-['Montserrat_Alternates']">Телефон</label>
                                            <input className="w-full p-2 rounded-lg bg-[#eaeaea] outline-firm-orange focus:outline-2" type="tel" name="phone" value={profileData.phone || ''} onChange={handleInputChange} placeholder="+7 (999) 123-45-67" />
                                        </div>
                                        <div>
                                            <label className="block text-gray-700 mb-1 font-['Montserrat_Alternates']">Город</label>
                                            <input className="w-full p-2 rounded-lg bg-[#eaeaea] outline-firm-pink focus:outline-2" type="text" name="city" value={profileData.city || ''} onChange={handleInputChange} placeholder="Москва"/>
                                        </div>
                                        <div>
                                            <label className="block text-gray-700 mb-1 font-['Montserrat_Alternates']">Описание</label>
                                            <textarea  className="w-full p-2 rounded-lg bg-[#eaeaea] outline-firm-orange focus:outline-2" name="description" value={profileData.description || ''} onChange={handleInputChange} rows={4} placeholder="Расскажите о себе и своем творчестве..." />
                                        </div>
                                        <div className="flex items-center gap-3">
                                            <div className="relative flex items-center">
                                                <input  type="checkbox" name="custom_orders_enabled" checked={profileData.custom_orders_enabled} onChange={handleCheckboxChange} className="w-5 h-5 appearance-none border-2 border-firm-pink rounded-md bg-[#EAEAEA] checked:bg-firm-pink checked:border-firm-pink transition-all duration-200 cursor-pointer" />
                                                {profileData.custom_orders_enabled && (
                                                    <svg className="absolute w-4 h-4 text-white left-0.5 top-0.5 pointer-events-none" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3">
                                                        <polyline points="20 6 9 17 4 12"></polyline>
                                                    </svg>
                                                )}
                                            </div>
                                            <label className="text-gray-700 cursor-pointer select-none font-['Montserrat_Alternates']">Принимаю индивидуальные заказы</label>
                                        </div>
                                        <button type="submit" className="w-full mt-6 p-3 bg-firm-pink text-white rounded-lg hover:scale-105 transition-all duration-300 font-['Montserrat_Alternates'] font-semibold">Сохранить изменения</button>
                                    </form>
                                ) : (
                                    <div className="space-y-4">
                                        <div className="grid grid-cols-2 gap-4">
                                            <div className="border-b border-gray-400 pb-4">
                                                <p className="text-gray-500 text-sm font-['Montserrat_Alternates']">Имя</p>
                                                <p className="text-lg font-medium">{profileData.fullname}</p>
                                            </div>
                                            <div className="border-b border-gray-400 pb-4">
                                                <p className="text-gray-500 text-sm font-['Montserrat_Alternates']">Email</p>
                                                <p className="text-lg font-medium">{profileData.email}</p>
                                            </div>
                                            <div className="border-b border-gray-400 pb-4">
                                                <p className="text-gray-500 text-sm font-['Montserrat_Alternates']">Телефон</p>
                                                <p className="text-lg font-medium">{profileData.phone || 'Не указано'}</p>
                                            </div>
                                            <div className="border-b border-gray-400 pb-4">
                                                <p className="text-gray-500 text-sm font-['Montserrat_Alternates']">Город</p>
                                                <p className="text-lg font-medium">{profileData.city || 'Не указано'}</p>
                                            </div>
                                            <div className="col-span-2 border-gray-400 border-b pb-4">
                                                <p className="text-gray-500 text-sm font-['Montserrat_Alternates']">Описание</p>
                                                <p className="text-lg font-medium">{profileData.description || 'Не указано'}</p>
                                            </div>
                                            <div className="col-span-2">
                                                <p className="text-gray-500 text-sm font-['Montserrat_Alternates']">Индивидуальные заказы</p>
                                                <p className="text-lg font-medium">
                                                    {profileData.custom_orders_enabled ? '✅ Принимаю' : '❌ Не принимаю'}
                                                </p>
                                            </div>
                                        </div>
                                    </div>
                                )}
                            </div>
                        )}
                        {activeTab === 'settings' && (
                            <div className="bg-white rounded-lg shadow-md p-6">
                                <h2 className="font-['Montserrat_Alternates'] font-semibold text-2xl mb-6">Настройки</h2>
                                <div className="space-y-6">
                                    <div>
                                        <h3 className="font-['Montserrat_Alternates'] font-semibold text-lg mb-3">Смена пароля</h3>
                                        <form className="space-y-4 max-w-md">
                                            <div>
                                                <label className="block text-gray-700 mb-1 font-['Montserrat_Alternates']">Текущий пароль</label>
                                                <input type="password" className="w-full p-2 rounded-lg bg-[#eaeaea] outline-firm-orange" />
                                            </div>
                                            <div>
                                                <label className="block text-gray-700 mb-1 font-['Montserrat_Alternates']">Новый пароль</label>
                                                <input type="password"  className="w-full p-2 rounded-lg bg-[#eaeaea] outline-firm-pink" placeholder="не менее 6 символов" />
                                            </div>
                                            <div>
                                                <label className="block text-gray-700 mb-1 font-['Montserrat_Alternates']">Подтверждение</label>
                                                <input type="password" className="w-full p-2 rounded-lg bg-[#eaeaea] outline-firm-orange" placeholder="повторите пароль" />
                                            </div>
                                            <button className="px-4 py-2 border-2 border-firm-orange rounded-lg hover:scale-105 transition-all duration-300 font-['Montserrat_Alternates']">Изменить пароль</button>
                                        </form>
                                    </div>
                                    <div className="border-t border-gray-400 pt-6">
                                        <h3 className="font-['Montserrat_Alternates'] font-semibold text-lg mb-3">Уведомления</h3>
                                        <div className="space-y-2">
                                            <label className="flex items-center gap-3">
                                                <input type="checkbox" className="w-5 h-5 accent-firm-orange" defaultChecked />
                                                <span className="font-['Montserrat_Alternates']">О новых заказах</span>
                                            </label>
                                            <label className="flex items-center gap-3">
                                                <input type="checkbox" className="w-5 h-5 accent-firm-pink" defaultChecked />
                                                <span className="font-['Montserrat_Alternates']">О сообщениях от покупателей</span>
                                            </label>
                                            <label className="flex items-center gap-3">
                                                <input type="checkbox" className="w-5 h-5 accent-firm-orange" />
                                                <span className="font-['Montserrat_Alternates']">О новых отзывах</span>
                                            </label>
                                        </div>
                                    </div>
                                    <div className="border-t border-gray-400 pt-6">
                                        <h3 className="font-['Montserrat_Alternates'] font-semibold text-lg mb-3">Магазин</h3>
                                        <div className="space-y-2">
                                            <label className="flex items-center gap-3">
                                                <input type="checkbox" className="w-5 h-5 accent-firm-pink" defaultChecked />
                                                <span className="font-['Montserrat_Alternates']">Автоматически подтверждать заказы</span>
                                            </label>
                                            <label className="flex items-center gap-3">
                                                <input type="checkbox" className="w-5 h-5 accent-firm-orange" />
                                                <span className="font-['Montserrat_Alternates']">Отображать мои товары в поиске</span>
                                            </label>
                                        </div>
                                    </div>
                                    <div className="border-t border-gray-400 pt-6">
                                        <h3 className="font-['Montserrat_Alternates'] font-semibold text-lg mb-3 text-red-600">Опасная зона</h3>
                                        <button className="px-4 py-2 border-2 border-red-500 text-red-500 rounded-lg hover:bg-red-500 hover:text-white transition-all duration-300">Удалить аккаунт</button>
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    )
} 