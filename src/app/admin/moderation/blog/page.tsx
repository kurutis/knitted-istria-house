'use client'

import { useSession } from "next-auth/react"
import { useRouter } from "next/navigation"
import { useEffect, useState } from "react"
import Image from "next/image"
import Link from "next/link"
import { motion, AnimatePresence } from "framer-motion"

interface BlogImage {
    id: string
    image_url: string
    sort_order: number
}

interface BlogPost {
    id: string
    title: string
    content: string
    excerpt: string
    category: string
    tags: string[]
    main_image_url: string
    views_count: number
    likes_count: number
    status: string
    created_at: string
    updated_at: string
    author_id: string
    author_name: string
    author_email: string
    author_avatar: string
    images: BlogImage[]
    comments_count: number
}

export default function AdminModerationBlogPage() {
    const { data: session, status } = useSession()
    const router = useRouter()
    const [posts, setPosts] = useState<BlogPost[]>([])
    const [loading, setLoading] = useState(true)
    const [actionLoading, setActionLoading] = useState<string | null>(null)
    const [selectedPost, setSelectedPost] = useState<BlogPost | null>(null)
    const [showModal, setShowModal] = useState(false)
    const [filter, setFilter] = useState<'all' | 'moderation' | 'draft' | 'published' | 'blocked'>('all')

    useEffect(() => {
        if (status === 'loading') return

        if (!session || session.user?.role !== 'admin') {
            router.push('/auth/signin')
            return
        }

        loadPosts()
    }, [session, status, router])

    const loadPosts = async () => {
        try {
            setLoading(true)
            const response = await fetch('/api/admin/blog')
            if (!response.ok) throw new Error('Failed to load posts')

            const data = await response.json()
            setPosts(data || [])
        } catch (error) {
            console.error('Ошибка загрузки постов:', error)
        } finally {
            setLoading(false)
        }
    }

    const handleApprove = async (postId: string) => {
        if (!confirm("Одобрить публикацию поста?")) return

        setActionLoading(postId)
        try {
            const response = await fetch('/api/admin/blog', {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ postId, action: 'approve' })
            })
            
            const result = await response.json()
            if (!response.ok) throw new Error(result.error || 'Failed to approve')

            await loadPosts()
            if (showModal) setShowModal(false)
            alert('Пост успешно одобрен!')
        } catch (error) {
            alert('Ошибка при одобрении поста')
        } finally {
            setActionLoading(null)
        }
    }

    const handleReject = async (postId: string) => {
        const reason = prompt('Укажите причину возврата на доработку:')
        if (reason === null) return

        setActionLoading(postId)
        try {
            const response = await fetch('/api/admin/blog', {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ postId, action: 'reject', reason })
            })
            
            const result = await response.json()
            if (!response.ok) throw new Error(result.error || 'Failed to reject')
            
            await loadPosts()
            if (showModal) setShowModal(false)
            alert('Пост отправлен на доработку!')
        } catch (error) {
            alert('Ошибка при отправке поста на доработку')
        } finally {
            setActionLoading(null)
        }
    }

    const handleBlock = async (postId: string) => {
        const reason = prompt('Укажите причину блокировки:')
        if (reason === null) return

        setActionLoading(postId)
        try {
            const response = await fetch('/api/admin/blog', {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ postId, action: 'block', reason })
            })
            
            const result = await response.json()
            if (!response.ok) throw new Error(result.error || 'Failed to block')
            
            await loadPosts()
            if (showModal) setShowModal(false)
            alert('Пост заблокирован!')
        } catch (error) {
            alert('Ошибка при блокировке поста')
        } finally {
            setActionLoading(null)
        }
    }

    const openModal = (post: BlogPost) => {
        setSelectedPost(post)
        setShowModal(true)
    }

    const formatDate = (dateString: string) => {
        const date = new Date(dateString)
        const now = new Date()
        const diff = Math.floor((now.getTime() - date.getTime()) / 1000 / 60 / 60)

        if (diff < 1) return "только что"
        if (diff < 24) return `${diff} ч назад`
        return date.toLocaleDateString("ru-RU", {
            day: "2-digit",
            month: "2-digit",
            year: "numeric",
            hour: "2-digit",
            minute: "2-digit",
        })
    }

    const getStatusBadge = (status: string) => {
        switch(status) {
            case 'moderation':
                return <span className="px-2 py-1 bg-yellow-100 text-yellow-700 rounded-full text-xs font-medium">⏳ На модерации</span>
            case 'draft':
                return <span className="px-2 py-1 bg-gray-100 text-gray-700 rounded-full text-xs font-medium">📝 На доработке</span>
            case 'published':
                return <span className="px-2 py-1 bg-green-100 text-green-700 rounded-full text-xs font-medium">✅ Опубликован</span>
            case 'blocked':
                return <span className="px-2 py-1 bg-red-100 text-red-700 rounded-full text-xs font-medium">🔒 Заблокирован</span>
            default:
                return null
        }
    }

    // Функция для отображения кнопок в зависимости от статуса
    const renderActionButtons = (post: BlogPost) => {
        switch(post.status) {
            case 'moderation':
                return (
                    <div className="flex flex-wrap gap-3">
                        <button
                            onClick={() => handleApprove(post.id)}
                            disabled={actionLoading === post.id}
                            className="px-4 py-2 bg-green-500 text-white rounded-xl text-sm font-medium hover:bg-green-600 transition disabled:opacity-50"
                        >
                            {actionLoading === post.id ? '⏳' : '✅ Одобрить'}
                        </button>
                        <button
                            onClick={() => handleReject(post.id)}
                            disabled={actionLoading === post.id}
                            className="px-4 py-2 bg-yellow-500 text-white rounded-xl text-sm font-medium hover:bg-yellow-600 transition disabled:opacity-50"
                        >
                            {actionLoading === post.id ? '⏳' : '📝 На доработку'}
                        </button>
                        <button
                            onClick={() => handleBlock(post.id)}
                            disabled={actionLoading === post.id}
                            className="px-4 py-2 bg-red-500 text-white rounded-xl text-sm font-medium hover:bg-red-600 transition disabled:opacity-50"
                        >
                            {actionLoading === post.id ? '⏳' : '🔒 Заблокировать'}
                        </button>
                    </div>
                )
            case 'draft':
                return (
                    <div className="flex flex-wrap gap-3">
                        <button
                            onClick={() => handleApprove(post.id)}
                            disabled={actionLoading === post.id}
                            className="px-4 py-2 bg-green-500 text-white rounded-xl text-sm font-medium hover:bg-green-600 transition disabled:opacity-50"
                        >
                            {actionLoading === post.id ? '⏳' : '✅ Одобрить'}
                        </button>
                        <button
                            onClick={() => handleBlock(post.id)}
                            disabled={actionLoading === post.id}
                            className="px-4 py-2 bg-red-500 text-white rounded-xl text-sm font-medium hover:bg-red-600 transition disabled:opacity-50"
                        >
                            {actionLoading === post.id ? '⏳' : '🔒 Заблокировать'}
                        </button>
                    </div>
                )
            case 'published':
                return (
                    <div className="flex flex-wrap gap-3">
                        <button
                            onClick={() => handleBlock(post.id)}
                            disabled={actionLoading === post.id}
                            className="px-4 py-2 bg-red-500 text-white rounded-xl text-sm font-medium hover:bg-red-600 transition disabled:opacity-50"
                        >
                            {actionLoading === post.id ? '⏳' : '🔒 Заблокировать'}
                        </button>
                    </div>
                )
            case 'blocked':
                return (
                    <div className="flex flex-wrap gap-3">
                        <button
                            onClick={() => handleApprove(post.id)}
                            disabled={actionLoading === post.id}
                            className="px-4 py-2 bg-green-500 text-white rounded-xl text-sm font-medium hover:bg-green-600 transition disabled:opacity-50"
                        >
                            {actionLoading === post.id ? '⏳' : '✅ Разблокировать'}
                        </button>
                    </div>
                )
            default:
                return null
        }
    }

    const stats = {
        all: posts.length,
        moderation: posts.filter(p => p.status === 'moderation').length,
        draft: posts.filter(p => p.status === 'draft').length,
        published: posts.filter(p => p.status === 'published').length,
        blocked: posts.filter(p => p.status === 'blocked').length
    }

    const filteredPosts = posts.filter(p => {
        if (filter === 'all') return true
        return p.status === filter
    })

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
                    <p className="mt-4 font-['Montserrat_Alternates'] text-gray-600">Загрузка постов...</p>
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
            {/* Заголовок */}
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div>
                    <h1 className="font-['Montserrat_Alternates'] font-semibold text-2xl sm:text-3xl bg-gradient-to-r from-firm-orange to-firm-pink bg-clip-text text-transparent">
                        Управление блогом
                    </h1>
                    <p className="text-gray-500 text-sm mt-1">Все посты платформы</p>
                </div>
            </div>

            {/* Фильтры */}
            <motion.div
                initial={{ y: -20, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                transition={{ delay: 0.1 }}
                className="flex flex-wrap gap-3"
            >
                <button
                    onClick={() => setFilter('all')}
                    className={`px-4 py-2 rounded-xl text-sm font-medium transition-all duration-300 ${
                        filter === 'all' 
                            ? 'bg-gradient-to-r from-firm-orange to-firm-pink text-white shadow-md' 
                            : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                    }`}
                >
                    Все ({stats.all})
                </button>
                <button
                    onClick={() => setFilter('moderation')}
                    className={`px-4 py-2 rounded-xl text-sm font-medium transition-all duration-300 ${
                        filter === 'moderation' 
                            ? 'bg-gradient-to-r from-firm-orange to-firm-pink text-white shadow-md' 
                            : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                    }`}
                >
                    На модерации ({stats.moderation})
                </button>
                <button
                    onClick={() => setFilter('draft')}
                    className={`px-4 py-2 rounded-xl text-sm font-medium transition-all duration-300 ${
                        filter === 'draft' 
                            ? 'bg-gradient-to-r from-firm-orange to-firm-pink text-white shadow-md' 
                            : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                    }`}
                >
                    На доработке ({stats.draft})
                </button>
                <button
                    onClick={() => setFilter('published')}
                    className={`px-4 py-2 rounded-xl text-sm font-medium transition-all duration-300 ${
                        filter === 'published' 
                            ? 'bg-gradient-to-r from-firm-orange to-firm-pink text-white shadow-md' 
                            : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                    }`}
                >
                    Опубликованные ({stats.published})
                </button>
                <button
                    onClick={() => setFilter('blocked')}
                    className={`px-4 py-2 rounded-xl text-sm font-medium transition-all duration-300 ${
                        filter === 'blocked' 
                            ? 'bg-gradient-to-r from-firm-orange to-firm-pink text-white shadow-md' 
                            : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                    }`}
                >
                    Заблокированные ({stats.blocked})
                </button>
            </motion.div>

            {/* Список постов */}
            <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: 0.2 }}
                className="space-y-4"
            >
                <AnimatePresence>
                    {filteredPosts.length === 0 ? (
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            className="bg-white rounded-2xl shadow-xl p-12 text-center text-gray-500"
                        >
                            <p className="text-lg">Нет постов для отображения</p>
                        </motion.div>
                    ) : (
                        filteredPosts.map((post, index) => (
                            <motion.div
                                key={post.id}
                                initial={{ opacity: 0, x: -20 }}
                                animate={{ opacity: 1, x: 0 }}
                                exit={{ opacity: 0, x: 20 }}
                                transition={{ delay: index * 0.05 }}
                                whileHover={{ y: -2 }}
                                className="bg-white rounded-2xl shadow-lg hover:shadow-xl transition-all duration-300 overflow-hidden"
                            >
                                <div className="p-6">
                                    <div className="flex flex-col md:flex-row gap-6">
                                        {/* Изображение */}
                                        <div 
                                            className="w-32 h-32 bg-gradient-to-r from-gray-100 to-gray-200 rounded-xl overflow-hidden flex-shrink-0 cursor-pointer shadow-md hover:shadow-lg transition-all duration-300"
                                            onClick={() => openModal(post)}
                                        >
                                            {post.main_image_url ? (
                                                <img
                                                    src={post.main_image_url}
                                                    alt={post.title}
                                                    className="w-full h-full object-cover hover:scale-105 transition-transform duration-300"
                                                />
                                            ) : (
                                                <div className="w-full h-full flex items-center justify-center text-4xl text-gray-400">
                                                    📝
                                                </div>
                                            )}
                                        </div>

                                        <div className="flex-1">
                                            <div className="flex flex-col sm:flex-row justify-between items-start gap-4">
                                                <div className="flex-1">
                                                    <h3 
                                                        className="font-['Montserrat_Alternates'] font-semibold text-xl cursor-pointer hover:text-firm-orange transition-colors"
                                                        onClick={() => openModal(post)}
                                                    >
                                                        {post.title}
                                                    </h3>
                                                    <div className="flex flex-wrap gap-3 mt-2 text-sm text-gray-500">
                                                        <span className="flex items-center gap-1">👤 {post.author_name}</span>
                                                        <span className="flex items-center gap-1">📧 {post.author_email}</span>
                                                    </div>
                                                </div>
                                                <div className="text-right">
                                                    <p className="text-xs text-gray-400">
                                                        📅 {new Date(post.created_at).toLocaleDateString('ru-RU')}
                                                    </p>
                                                </div>
                                            </div>

                                            {/* Теги и статус */}
                                            <div className="flex flex-wrap gap-2 mt-3">
                                                {post.category && (
                                                    <span className="px-2 py-1 bg-blue-100 text-blue-700 rounded-lg text-xs font-medium">
                                                        📁 {post.category}
                                                    </span>
                                                )}
                                                {post.tags?.slice(0, 3).map((tag, idx) => (
                                                    <span key={idx} className="px-2 py-1 bg-gray-100 text-gray-600 rounded-lg text-xs font-medium">
                                                        #{tag}
                                                    </span>
                                                ))}
                                                {getStatusBadge(post.status)}
                                            </div>

                                            {/* Краткое описание */}
                                            <p className="text-gray-600 mt-3 line-clamp-2 text-sm">
                                                {post.excerpt || post.content?.substring(0, 200)}...
                                            </p>

                                            {/* Статистика */}
                                            <div className="flex gap-4 mt-3 text-xs text-gray-400">
                                                <span>👁️ {post.views_count || 0} просмотров</span>
                                                <span>❤️ {post.likes_count || 0} лайков</span>
                                                <span>💬 {post.comments_count || 0} комментариев</span>
                                            </div>

                                            {/* Кнопки действий в зависимости от статуса */}
                                            {renderActionButtons(post)}
                                        </div>
                                    </div>
                                </div>
                            </motion.div>
                        ))
                    )}
                </AnimatePresence>
            </motion.div>

            {/* Модальное окно просмотра поста - аналогично обновить кнопки */}
            <AnimatePresence>
                {showModal && selectedPost && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50 p-4"
                        onClick={() => setShowModal(false)}
                    >
                        <motion.div
                            initial={{ scale: 0.9, opacity: 0, y: 20 }}
                            animate={{ scale: 1, opacity: 1, y: 0 }}
                            exit={{ scale: 0.9, opacity: 0, y: 20 }}
                            transition={{ type: "spring", damping: 25, stiffness: 300 }}
                            className="bg-white rounded-2xl max-w-4xl w-full max-h-[90vh] overflow-y-auto shadow-2xl"
                            onClick={(e) => e.stopPropagation()}
                        >
                            <div className="sticky top-0 bg-white border-b border-gray-200 p-4 flex justify-between items-center">
                                <h2 className="font-['Montserrat_Alternates'] font-semibold text-xl bg-gradient-to-r from-firm-orange to-firm-pink bg-clip-text text-transparent">
                                    {selectedPost.title}
                                </h2>
                                <button onClick={() => setShowModal(false)} className="text-gray-400 hover:text-gray-600 text-2xl transition-colors">✕</button>
                            </div>

                            <div className="p-6">
                                {/* Информация об авторе */}
                                <div className="flex items-center gap-3 mb-6 pb-4 border-b">
                                    <div className="w-12 h-12 rounded-full bg-gradient-to-r from-firm-orange to-firm-pink flex items-center justify-center text-white font-bold overflow-hidden shadow-md">
                                        {selectedPost.author_avatar ? (
                                            <img src={selectedPost.author_avatar} alt={selectedPost.author_name} className="w-full h-full object-cover" />
                                        ) : (
                                            <span className="text-lg">{selectedPost.author_name?.charAt(0).toUpperCase() || 'A'}</span>
                                        )}
                                    </div>
                                    <div>
                                        <p className="font-semibold text-gray-800">{selectedPost.author_name}</p>
                                        <p className="text-sm text-gray-500">{selectedPost.author_email}</p>
                                    </div>
                                    <div className="ml-auto text-right">
                                        <p className="text-sm text-gray-500">📅 {new Date(selectedPost.created_at).toLocaleDateString('ru-RU', {
                                            day: '2-digit',
                                            month: '2-digit',
                                            year: 'numeric',
                                            hour: '2-digit',
                                            minute: '2-digit'
                                        })}</p>
                                    </div>
                                </div>

                                {/* Изображения */}
                                {selectedPost.main_image_url && (
                                    <div className="mb-6">
                                        <div className="aspect-video bg-gray-100 rounded-xl overflow-hidden shadow-md">
                                            <img
                                                src={selectedPost.main_image_url}
                                                alt={selectedPost.title}
                                                className="w-full h-full object-cover"
                                            />
                                        </div>
                                    </div>
                                )}

                                {/* Категория и теги */}
                                <div className="flex flex-wrap gap-2 mb-6">
                                    {selectedPost.category && (
                                        <span className="px-3 py-1 bg-gradient-to-r from-blue-100 to-blue-200 text-blue-700 rounded-full text-sm font-medium">
                                            📁 {selectedPost.category}
                                        </span>
                                    )}
                                    {selectedPost.tags?.map((tag, idx) => (
                                        <span key={idx} className="px-3 py-1 bg-gray-100 text-gray-600 rounded-full text-sm font-medium">
                                            #{tag}
                                        </span>
                                    ))}
                                </div>

                                {/* Статистика */}
                                <div className="flex gap-6 mb-6 pb-4 border-b">
                                    <span className="flex items-center gap-1 text-sm text-gray-500">👁️ {selectedPost.views_count || 0} просмотров</span>
                                    <span className="flex items-center gap-1 text-sm text-gray-500">❤️ {selectedPost.likes_count || 0} лайков</span>
                                    <span className="flex items-center gap-1 text-sm text-gray-500">💬 {selectedPost.comments_count || 0} комментариев</span>
                                </div>

                                {/* Содержание */}
                                <div className="mb-6">
                                    <h3 className="font-['Montserrat_Alternates'] font-semibold text-lg mb-3">Содержание</h3>
                                    <div className="prose max-w-none">
                                        <div className="text-gray-700 whitespace-pre-line leading-relaxed">
                                            {selectedPost.content}
                                        </div>
                                    </div>
                                </div>

                                {/* Кнопки действий в модальном окне */}
                                {renderActionButtons(selectedPost)}
                            </div>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>
        </motion.div>
    )
}