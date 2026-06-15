'use client'

import { useSession } from "next-auth/react"
import { useRouter } from "next/navigation"
import { useEffect, useState } from "react"
import { motion, AnimatePresence } from "framer-motion"
import toast from "react-hot-toast"
import ConfirmModal from "@/components/ui/ConfirmModal"
import PromptModal from "@/components/ui/PromptModal"
import { UserIcon } from "@/components/icons/UserIcon"
import { MailIcon } from "@/components/icons/MailIcon"
import { CalendarIcon } from "@/components/icons/CalendarIcon"
import { TagIcon } from "@/components/icons/TagIcon"
import { ClockIcon } from "@/components/icons/ClockIcon"
import { CheckIcon } from "@/components/icons/CheckIcon"
import { EditIcon } from "@/components/icons/EditIcon"
import { CloseIcon } from "@/components/icons/CloseIcon"
import { ViewsIcon } from "@/components/icons/ViewsIcon"
import { RefreshIcon } from "@/components/icons/RefreshIcon"
import { LikeIcon } from "@/components/icons/LikeIcon"
import { CommentIcon } from "@/components/icons/CommentIcon"
import { BlogIcon } from "@/components/icons/BlogIcon"

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
    
    const [confirmModal, setConfirmModal] = useState<{isOpen: boolean; title: string; message: string; onConfirm: () => void; type?: 'danger' | 'warning' | 'info';}>({isOpen: false,  title: '', message: '', onConfirm: () => {}, type: 'warning'})
    const [promptModal, setPromptModal] = useState<{isOpen: boolean; title: string; message: string; onConfirm: (value: string) => void}>({isOpen: false, title: '', message: '', onConfirm: () => {}})

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
            toast.error('Ошибка загрузки постов')
        } finally {
            setLoading(false)
        }
    }

    const handleApprove = async (postId: string) => {
        setConfirmModal({
            isOpen: true,
            title: 'Одобрение поста',
            message: 'Вы уверены, что хотите одобрить этот пост? Он будет опубликован на сайте.',
            type: 'warning',
            onConfirm: async () => {
                setConfirmModal(prev => ({ ...prev, isOpen: false }))
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
                    toast.success('Пост успешно одобрен!')
                } catch (error) {
                    console.error(error)
                    toast.error('Ошибка при одобрении поста')
                } finally {
                    setActionLoading(null)
                }
            }
        })
    }

    const handleReject = async (postId: string) => {
        setPromptModal({
            isOpen: true,
            title: 'Отправка на доработку',
            message: 'Укажите причину возврата поста на доработку:',
            onConfirm: async (reason) => {
                setPromptModal(prev => ({ ...prev, isOpen: false }))
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
                    toast.success('Пост отправлен на доработку!')
                } catch (error) {
                    console.error(error)
                    toast.error('Ошибка при отправке поста на доработку')
                } finally {
                    setActionLoading(null)
                }
            }
        })
    }

    const handleBlock = async (postId: string) => {
        setPromptModal({
            isOpen: true,
            title: 'Блокировка поста',
            message: 'Укажите причину блокировки поста:',
            onConfirm: async (reason) => {
                setPromptModal(prev => ({ ...prev, isOpen: false }))
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
                    toast.success('Пост заблокирован!')
                } catch (error) {
                    console.error(error)
                    toast.error('Ошибка при блокировке поста')
                } finally {
                    setActionLoading(null)
                }
            }
        })
    }

    const openModal = (post: BlogPost) => {
        setSelectedPost(post)
        setShowModal(true)
    }

    const getStatusBadge = (status: string) => {
        switch(status) {
            case 'moderation':
                return <span className="px-2 py-1 bg-firm-orange/20 text-firm-orange rounded-full text-xs font-medium flex items-center gap-1"><ClockIcon size={12} color="#F4A67F" />На модерации</span>
            case 'draft':
                return <span className="px-2 py-1 bg-firm-gray/20 text-firm-gray rounded-full text-xs font-medium flex items-center gap-1"><EditIcon size={12} color="#737682" />На доработке</span>
            case 'published':
                return <span className="px-2 py-1 bg-firm-green/20 text-firm-green rounded-full text-xs font-medium flex items-center gap-1"><CheckIcon size={12} color="#94D06C" />Опубликован</span>
            case 'blocked':
                return <span className="px-2 py-1 bg-firm-red/20 text-firm-red rounded-full text-xs font-medium flex items-center gap-1"><CloseIcon size={12} color="#D77C7C" />Заблокирован</span>
            default:
                return null
        }
    }

    const renderActionButtons = (post: BlogPost) => {
        switch(post.status) {
            case 'moderation':
                return (
                    <div className="flex flex-wrap gap-3 mt-4">
                        <button onClick={() => handleApprove(post.id)} disabled={actionLoading === post.id} className="px-4 py-2 bg-firm-green text-main rounded-xl text-sm font-medium hover:opacity-80 transition disabled:opacity-50 flex items-center gap-2">{actionLoading === post.id ? (<RefreshIcon size={16} color="#f9f9f9" className="animate-spin" />) : ( <CheckIcon size={16} color="#f9f9f9" />)}Одобрить</button>
                        <button onClick={() => handleReject(post.id)} disabled={actionLoading === post.id} className="px-4 py-2 bg-firm-orange text-main rounded-xl text-sm font-medium hover:opacity-80 transition disabled:opacity-50 flex items-center gap-2">{actionLoading === post.id ? (<RefreshIcon size={16} color="#f9f9f9" className="animate-spin" />) : (<EditIcon size={16} color="#f9f9f9" />)}На доработку</button>
                        <button onClick={() => handleBlock(post.id)} disabled={actionLoading === post.id} className="px-4 py-2 bg-firm-red text-main rounded-xl text-sm font-medium hover:opacity-80 transition disabled:opacity-50 flex items-center gap-2">{actionLoading === post.id ? (<RefreshIcon size={16} color="#f9f9f9" className="animate-spin" />) : (<CloseIcon size={16} color="#f9f9f9" />)}Заблокировать</button>
                    </div>
                )
            case 'draft':
                return (
                    <div className="flex flex-wrap gap-3 mt-4">
                        <button onClick={() => handleApprove(post.id)} disabled={actionLoading === post.id} className="px-4 py-2 bg-firm-green text-main rounded-xl text-sm font-medium hover:opacity-80 transition disabled:opacity-50 flex items-center gap-2">{actionLoading === post.id ? (<RefreshIcon size={16} color="#f9f9f9" className="animate-spin" />) : (<CheckIcon size={16} color="#f9f9f9" />)}Одобрить</button>
                        <button onClick={() => handleBlock(post.id)} disabled={actionLoading === post.id} className="px-4 py-2 bg-firm-red text-main rounded-xl text-sm font-medium hover:opacity-80 transition disabled:opacity-50 flex items-center gap-2">{actionLoading === post.id ? (<RefreshIcon size={16} color="#f9f9f9" className="animate-spin" />) : (<CloseIcon size={16} color="#f9f9f9" />)}Заблокировать</button>
                    </div>
                )
            case 'published':
                return (
                    <div className="flex flex-wrap gap-3 mt-4">
                        <button onClick={() => handleBlock(post.id)} disabled={actionLoading === post.id} className="px-4 py-2 bg-firm-red text-main rounded-xl text-sm font-medium hover:opacity-80 transition disabled:opacity-50 flex items-center gap-2">{actionLoading === post.id ? (<RefreshIcon size={16} color="#f9f9f9" className="animate-spin" />) : (<CloseIcon size={16} color="#f9f9f9" />)}Заблокировать</button>
                    </div>
                )
            case 'blocked':
                return (
                    <div className="flex flex-wrap gap-3 mt-4">
                        <button onClick={() => handleApprove(post.id)} disabled={actionLoading === post.id} className="px-4 py-2 bg-firm-green text-main rounded-xl text-sm font-medium hover:opacity-80 transition disabled:opacity-50 flex items-center gap-2">{actionLoading === post.id ? (<RefreshIcon size={16} color="#f9f9f9" className="animate-spin" />) : (<CheckIcon size={16} color="#f9f9f9" />)}Разблокировать</button>
                    </div>
                )
            default:
                return null
        }
    }

    const stats = {all: posts.length, moderation: posts.filter(p => p.status === 'moderation').length, draft: posts.filter(p => p.status === 'draft').length, published: posts.filter(p => p.status === 'published').length, blocked: posts.filter(p => p.status === 'blocked').length}

    const filteredPosts = posts.filter(p => {
        if (filter === 'all') return true
        return p.status === filter
    })

    if (loading) {
        return (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex items-center justify-center min-h-[60vh] bg-main">
                <div className="text-center">
                    <motion.div animate={{ rotate: 360 }} transition={{ duration: 1, repeat: Infinity, ease: "linear" }} className="w-16 h-16 border-4 border-firm-orange border-t-transparent rounded-full mx-auto" />
                    <p className="mt-4 font-['Montserrat_Alternates'] text-firm-gray flex items-center justify-center gap-2"><RefreshIcon size={18} color="#737682" className="animate-spin" />Загрузка постов...</p>
                </div>
            </motion.div>
        )
    }

    return (
        <>
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }} className="space-y-6 p-4 sm:p-6 bg-main min-h-screen">
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                    <div>
                        <h1 className="font-['Montserrat_Alternates'] font-semibold text-2xl sm:text-3xl bg-linear-to-r from-firm-orange to-firm-pink bg-clip-text text-transparent">Управление блогом</h1>
                        <p className="text-firm-gray text-sm mt-1">Все посты платформы</p>
                    </div>
                </div>

                <motion.div initial={{ y: -20, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ delay: 0.1 }} className="flex flex-wrap gap-3">
                    <button onClick={() => setFilter('all')} className={`px-4 py-2 rounded-xl text-sm font-medium transition-all duration-300 ${filter === 'all' ? 'bg-linear-to-r from-firm-orange to-firm-pink text-main shadow-md' : 'bg-forms text-firm-gray hover:bg-gray-200'}`}>Все ({stats.all})</button>
                    <button onClick={() => setFilter('moderation')} className={`px-4 py-2 rounded-xl text-sm font-medium transition-all duration-300 flex items-center gap-1 ${filter === 'moderation' ? 'bg-linear-to-r from-firm-orange to-firm-pink text-main shadow-md' : 'bg-forms text-firm-gray hover:bg-gray-200'}`}><ClockIcon size={14} color={filter === 'moderation' ? '#f9f9f9' : '#737682'} />На модерации ({stats.moderation})</button>
                    <button onClick={() => setFilter('draft')} className={`px-4 py-2 rounded-xl text-sm font-medium transition-all duration-300 flex items-center gap-1 ${filter === 'draft' ? 'bg-linear-to-r from-firm-orange to-firm-pink text-main shadow-md' : 'bg-forms text-firm-gray hover:bg-gray-200'}`}><EditIcon size={14} color={filter === 'draft' ? '#f9f9f9' : '#737682'} />На доработке ({stats.draft})</button>
                    <button onClick={() => setFilter('published')} className={`px-4 py-2 rounded-xl text-sm font-medium transition-all duration-300 flex items-center gap-1 ${filter === 'published' ? 'bg-linear-to-r from-firm-orange to-firm-pink text-main shadow-md' : 'bg-forms text-firm-gray hover:bg-gray-200' }`}><CheckIcon size={14} color={filter === 'published' ? '#f9f9f9' : '#737682'} />Опубликованные ({stats.published})</button>
                    <button onClick={() => setFilter('blocked')} className={`px-4 py-2 rounded-xl text-sm font-medium transition-all duration-300 flex items-center gap-1 ${filter === 'blocked' ? 'bg-linear-to-r from-firm-orange to-firm-pink text-main shadow-md' : 'bg-forms text-firm-gray hover:bg-gray-200'}`}><CloseIcon size={14} color={filter === 'blocked' ? '#f9f9f9' : '#737682'} />Заблокированные ({stats.blocked})</button>
                </motion.div>

                <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: 0.2 }} className="space-y-4">
                    <AnimatePresence>
                        {filteredPosts.length === 0 ? (
                            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="bg-main rounded-2xl shadow-xl p-12 text-center text-firm-gray">
                                <BlogIcon size={48} color="#737682" className="mx-auto mb-4 opacity-50" />
                                <p className="text-lg">Нет постов для отображения</p>
                            </motion.div>
                        ) : (
                            filteredPosts.map((post, index) => (
                                <motion.div key={post.id} initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 20 }} transition={{ delay: index * 0.05 }} whileHover={{ y: -2 }} className="bg-main rounded-2xl shadow-lg hover:shadow-xl transition-all duration-300 overflow-hidden">
                                    <div className="p-6">
                                        <div className="flex flex-col md:flex-row gap-6">
                                            <div className="w-32 h-32 bg-linear-to-r from-gray-100 to-gray-200 rounded-xl overflow-hidden shrink-0 cursor-pointer shadow-md hover:shadow-lg transition-all duration-300 flex items-center justify-center" onClick={() => openModal(post)}>
                                                {post.main_image_url ? (
                                                    <img src={post.main_image_url} alt={post.title} className="w-full h-full object-cover hover:scale-105 transition-transform duration-300" />) : (<BlogIcon size={40} color="#737682" />)}
                                            </div>

                                            <div className="flex-1">
                                                <div className="flex flex-col sm:flex-row justify-between items-start gap-4">
                                                    <div className="flex-1">
                                                        <h3 className="font-['Montserrat_Alternates'] font-semibold text-xl cursor-pointer hover:text-firm-orange transition-colors text-text" onClick={() => openModal(post)}>{post.title}</h3>
                                                        <div className="flex flex-wrap gap-3 mt-2 text-firm-gray text-sm">
                                                            <span className="flex items-center gap-1"><UserIcon size={14} color="#737682" />{post.author_name}</span>
                                                            <span className="flex items-center gap-1"><MailIcon size={14} color="#737682" />{post.author_email}</span>
                                                        </div>
                                                    </div>
                                                    <div className="text-right">
                                                        <p className="text-xs text-firm-gray flex items-center justify-end gap-1"><CalendarIcon size={12} color="#737682" />{new Date(post.created_at).toLocaleDateString('ru-RU')}</p>
                                                    </div>
                                                </div>

                                                <div className="flex flex-wrap gap-2 mt-3">
                                                    {post.category && (<span className="px-2 py-1 bg-firm-pink/20 text-firm-pink rounded-lg text-xs font-medium flex items-center gap-1"><TagIcon size={12} color="#D97C8E" /> {post.category}</span> )}
                                                    {post.tags?.slice(0, 3).map((tag, idx) => (<span key={idx} className="px-2 py-1 bg-forms text-firm-gray rounded-lg text-xs font-medium">#{tag}</span>))}
                                                    {getStatusBadge(post.status)}
                                                </div>

                                                <p className="text-firm-gray mt-3 line-clamp-2 text-sm">{post.excerpt || post.content?.substring(0, 200)}...</p>

                                                <div className="flex gap-4 mt-3 text-xs text-firm-gray">
                                                    <span className="flex items-center gap-1"><ViewsIcon size={12} color="#737682" />{post.views_count || 0} просмотров</span>
                                                    <span className="flex items-center gap-1"><LikeIcon size={12} color="#737682" />{post.likes_count || 0} лайков</span>
                                                    <span className="flex items-center gap-1"><CommentIcon size={12} color="#737682" />{post.comments_count || 0} комментариев</span>
                                                </div>
                                                {renderActionButtons(post)}
                                            </div>
                                        </div>
                                    </div>
                                </motion.div>
                            ))
                        )}
                    </AnimatePresence>
                </motion.div>
                <AnimatePresence>
                    {showModal && selectedPost && (
                        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 bg-main-black/40 backdrop-blur-sm flex items-center justify-center z-50 p-4" onClick={() => setShowModal(false)} >
                            <motion.div initial={{ scale: 0.9, opacity: 0, y: 20 }} animate={{ scale: 1, opacity: 1, y: 0 }} exit={{ scale: 0.9, opacity: 0, y: 20 }} transition={{ type: "spring", damping: 25, stiffness: 300 }} className="bg-main rounded-2xl max-w-4xl w-full max-h-[90vh] overflow-y-auto shadow-2xl" onClick={(e) => e.stopPropagation()}>
                                <div className="sticky top-0 bg-white border-b border-gray-200 p-4 flex justify-between items-center">
                                    <h2 className="font-['Montserrat_Alternates'] font-semibold text-xl bg-linear-to-r from-firm-orange to-firm-pink bg-clip-text text-transparent">{selectedPost.title}</h2>
                                    <button onClick={() => setShowModal(false)} className="text-firm-gray hover:text-text transition-colors"><CloseIcon size={24} color="#737682" /></button>
                                </div>

                                <div className="p-6">
                                    <div className="flex items-center gap-3 mb-6 pb-4 border-b border-gray-200">
                                        <div className="w-12 h-12 rounded-full bg-linear-to-r from-firm-orange to-firm-pink flex items-center justify-center text-white font-bold overflow-hidden shadow-md">
                                            {selectedPost.author_avatar ? (<img src={selectedPost.author_avatar} alt={selectedPost.author_name} className="w-full h-full object-cover" />) : (<span className="text-lg">{selectedPost.author_name?.charAt(0).toUpperCase() || 'A'}</span>)}
                                        </div>
                                        <div>
                                            <p className="font-semibold text-text">{selectedPost.author_name}</p>
                                            <p className="text-sm text-firm-gray flex items-center gap-1"><MailIcon size={12} color="#737682" />{selectedPost.author_email}</p>
                                        </div>
                                        <div className="ml-auto text-right">
                                            <p className="text-sm text-firm-gray flex items-center gap-1"><CalendarIcon size={12} color="#737682" />{new Date(selectedPost.created_at).toLocaleDateString('ru-RU', {day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit',  minute: '2-digit'})}</p>
                                        </div>
                                    </div>

                                    {selectedPost.main_image_url && (
                                        <div className="mb-6">
                                            <div className="aspect-video bg-forms rounded-xl overflow-hidden shadow-md">
                                                <img src={selectedPost.main_image_url} alt={selectedPost.title} className="w-full h-full object-cover" />
                                            </div>
                                        </div>
                                    )}

                                    <div className="flex flex-wrap gap-2 mb-6">
                                        {selectedPost.category && (<span className="px-3 py-1 bg-firm-pink/20 text-firm-pink rounded-full text-sm font-medium flex items-center gap-1"><TagIcon size={12} color="#D97C8E" /> {selectedPost.category}</span>)}
                                        {selectedPost.tags?.map((tag, idx) => (<span key={idx} className="px-3 py-1 bg-forms text-firm-gray rounded-full text-sm font-medium">#{tag}</span>))}
                                    </div>

                                    <div className="flex flex-wrap gap-6 mb-6 pb-4 border-b border-gray-200">
                                        <span className="flex items-center gap-1 text-sm text-firm-gray"><ViewsIcon size={14} color="#737682" />{selectedPost.views_count || 0} просмотров</span>
                                        <span className="flex items-center gap-1 text-sm text-firm-gray"><LikeIcon size={14} color="#737682" />{selectedPost.likes_count || 0} лайков</span>
                                        <span className="flex items-center gap-1 text-sm text-firm-gray"><CommentIcon size={14} color="#737682" />{selectedPost.comments_count || 0} комментариев</span>
                                    </div>

                                    <div className="mb-6">
                                        <h3 className="font-['Montserrat_Alternates'] font-semibold text-lg mb-3 text-text">Содержание</h3>
                                        <div className="prose max-w-none">
                                            <div className="text-text whitespace-pre-line leading-relaxed">
                                                {selectedPost.content}
                                            </div>
                                        </div>
                                    </div>

                                    {renderActionButtons(selectedPost)}
                                </div>
                            </motion.div>
                        </motion.div>
                    )}
                </AnimatePresence>
            </motion.div>

            <ConfirmModal isOpen={confirmModal.isOpen} title={confirmModal.title} message={confirmModal.message} type={confirmModal.type} onConfirm={confirmModal.onConfirm} onCancel={() => setConfirmModal(prev => ({ ...prev, isOpen: false }))} />
            <PromptModal isOpen={promptModal.isOpen} title={promptModal.title} message={promptModal.message} onConfirm={promptModal.onConfirm} onCancel={() => setPromptModal(prev => ({ ...prev, isOpen: false }))} />
        </>
    )
}