'use client'

import { useSession } from "next-auth/react"
import { useRouter } from "next/navigation"
import { useEffect, useState } from "react"
import Image from "next/image"
import Link from "next/link"

interface BlogImage {
    id: string
    url: string
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
    const {data: session, status} = useSession()
    const router = useRouter()
    const [posts, setPosts] = useState<BlogPost[]>([])
    const [loading, setLoading] = useState(true)
    const [actionLoading, setActionLoading] = useState<string | null>(null)
    const [selectedPost, setSelectedPost] = useState<BlogPost | null>(null)
    const [showModal, setShowModal] = useState(false)

    useEffect(() => {
        if (status === 'loading') return

        if (!session || session.user?.role !== 'admin'){
            router.push('/auth/signin')
            return
        }

        loadPosts()
    }, [session, status, router])

    const loadPosts = async () => {
        try{
            setLoading(true)
            const response = await fetch('/api/admin/blog')
            if (!response.ok) throw new Error('Failed to load posts')

            const data = await response.json()
            setPosts(data || [])
        }catch(error){
            console.error('Ошибка загрузки постов:', error)
        } finally{
            setLoading(false)
        }
    }

    const handleApprove = async (postId: string) => {
        if (!confirm("Одобрить публикацию поста?")) return

        setActionLoading(postId)
        try{
            const response = await fetch('/api/admin/blog', {method: 'PUT', headers: {'Content-Type': 'application/json'}, body: JSON.stringify({postId, action: 'approve'})})
            if (!response.ok) throw new Error('Failed to approve')

            await loadPosts()
        }catch(error){
            alert('Ошибка при одобрении поста')
        }finally{
            setActionLoading(null)
        }
    }

    const handleReject = async (postId: string) => {
        const reason = prompt('Укажите причину отклонения:')
        if (reason === null) return

        setActionLoading(postId)
        try{
            const response = await fetch('/api/admin/moderation/blog', {method: 'PUT', headers: {'Content-Type': 'application/json'}, body: JSON.stringify({postId, action: 'reject', reason})})

            if (!response.ok) throw new Error('Failed to reject')
            
            await loadPosts()
        }catch(error){
            alert('Ошибка при отклонении поста')
        }finally{
            setActionLoading(null)
        }
    }

    const handleReturnToDraft = async (postId: string) => {
        if (!confirm("Отправить пост на доработку автору?")) return

        setActionLoading(postId)
        try{
            const response = await fetch('/api/admin/blog', {method: 'PUT', headers: {'Content-Type': 'application/json'}, body: JSON.stringify({postId, action: 'draft'})})
            if (!response.ok) throw new Error('Failed to return to draft')

            await loadPosts()
        }catch(error){
            alert('Ошибка при возврате поста на доработку')
        }finally{
            setActionLoading(null)
        }
    }

    const handleBlock = async (postId: string) => {
        const reason = prompt('Укажите причину блокировки:')
        if (reason === null) return

        setActionLoading(postId)
        try{
            const response = await fetch('/api/admin/blog', {method: 'PUT', headers: {'Content-Type': 'application/json'}, body: JSON.stringify({postId, action: 'block', reason})})

            if (!response.ok) throw new Error('Failed to block')
            
            await loadPosts()
        }catch(error){
            alert('Ошибка при блокировке поста')
        }finally{
            setActionLoading(null)
        }
    }

    const openModal = (post: BlogPost) => {
        setSelectedPost(post)
        setShowModal(true)
    }

    if (loading){
        return (
            <div className="flex items-center justify-center min-h-[60vh]">
                <div className="text-center">
                    <div className="w-16 h-16 border-4 border-firm-orange border-t-transparent rounded-full animate-spin mx-auto"></div>
                    <p className="mt-4 font-['Montserrat_Alternates'] text-gray-600">Загрузка постов...</p>
                </div>
            </div>
        )
    }

    const pendingPosts = posts.filter(p => p.status === 'moderation')
    const draftPosts = posts.filter(p => p.status === 'draft')

    return (
        <div className="space-y-8">
            <h1 className="font-['Montserrat_Alternates'] font-semibold text-2xl">Модерация блога</h1>

            <div className="bg-white rounded-lg shadow-md overflow-hidden">
                <div className="px-6 py-4 border-b border-gray-200 bg-[#EAEAEA]">
                    <h2 className="font-['Montserrat_Alternates'] font-semibold text-xl">На модерации ({pendingPosts.length})</h2>
                </div>

                {pendingPosts.length === 0 ? (
                    <div className="p-12 text-center text-gray-500">
                        <p>Нет постов на модерации</p>
                    </div>
                ): (
                    <div className="divide-y divide-gray-200">
                        {pendingPosts.map((post) => (
                            <div key={post.id} className="p-6 hover:bg-[#fafafa] transition-colors">
                                <div className="flex gap-6">
                                    <div className="w-32 h-32 bg-[#eaeaea] rounded-lg overflow-hidden shrink-0 cursor-pointer" onClick={() => openModal(post)}>
                                        {post.main_image_url ? (<Image src={post.main_image_url} alt={post.title} className="w-full h-full object-cover" />) : (<div className="w-full h-full flex items-center justify-center text-gray-400 text-4xl">📝</div>)}
                                    </div>

                                    <div className="flex-1">
                                        <div className="flex justify-between items-start">
                                            <div>
                                                <h3 className="font-['Montserrat_Alternates'] font-semibold text-lg cursor-pointer hover:text-firm-orange" onClick={() => openModal(post)}>{post.title}</h3>
                                                <div className="flex gap-4 mt-1 text-sm text-gray-500">
                                                    <span>Автор: {post.author_name}</span>
                                                    <span>{post.author_email}</span>
                                                </div>
                                            </div>
                                            <div className="text-right">
                                                <p className="text-sm text-gray-500">{new Date(post.created_at).toLocaleDateString('ru-RU')}</p>
                                            </div>
                                        </div>
                                        <div className="flex flex-wrap gap-2 mt-3">
                                            {post.category && (<span className="px-2 py-1 bg-blue-100 text-blue-700 rounded-full text-xs">{post.category}</span>)}
                                            {post.tags && post.tags.slice(0, 3).map((tag, idx) => (<span key={idx} className="px-2 py-1 bg-gray-100 text-gray-600 rounded-full text-xs">#{tag}</span>))}
                                        </div>
                                        <p className="text-gray-600 mt-3 line-clamp-2">{post.excerpt || post.content.substring(0, 200)}</p>
                                        <div className="flex gap-3 mt-4">
                                            <button onClick={() => handleApprove(post.id)} disabled={actionLoading === post.id} className="px-4 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600 transition disabled:opacity-50">{actionLoading === post.id ? 'Обработка...' : 'Одобрить'}</button>
                                            <button onClick={() => handleReturnToDraft(post.id)} disabled={actionLoading === post.id}  className="px-4 py-2 bg-yellow-500 text-white rounded-lg hover:bg-yellow-600 transition disabled:opacity-50">На доработку</button>
                                            <button onClick={() => handleReject(post.id)} disabled={actionLoading === post.id} className="px-4 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600 transition disabled:opacity-50">Отклонить</button>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>
            {showModal && selectedPost && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4" onClick={() => setShowModal(false)}>
                    <div className="bg-white rounded-lg max-w-4xl w-full max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
                        <div className="p-6">
                            <div className="flex justify-between items-start mb-4">
                                <h2 className="font-['Montserrat_Alternates'] font-semibold text-2xl">{selectedPost.title}</h2>
                                <button onClick={() => setShowModal(false)} className="text-gray-500 hover:text-gray-700 text-xl">✕</button>
                            </div>

                            <div className="flex items-center gap-3 mb-4 pb-4 border-b">
                                <div className="w-10 h-10 rounded-full bg-linear-to-r from-firm-orange to-firm-pink flex items-center justify-center text-white font-bold overflow-hidden">
                                    {selectedPost.author_avatar ? (<Image src={selectedPost.author_avatar} alt={selectedPost.author_name} className="w-full h-full object-cover" />) : (<span>{selectedPost.author_name?.charAt(0).toUpperCase() || 'A'}</span>)}
                                </div>
                                <div>
                                    <p className="font-semibold">{selectedPost.author_name}</p>
                                    <p className="text-sm text-gray-500">{selectedPost.author_email}</p>
                                </div>
                                <div className="ml-auto text-right">
                                    <p className="text-sm text-gray-500">Создан: {new Date(selectedPost.created_at).toLocaleDateString('ru-RU')}</p>
                                    <p className="text-sm text-gray-500">Обновлен: {new Date(selectedPost.updated_at).toLocaleDateString('ru-RU')}</p>
                                </div>
                            </div>

                            {selectedPost.main_image_url && (
                                <div className="mb-4">
                                    <div className="aspect-video bg-[#EAEAEA] rounded-lg overflow-hidden">
                                        <Image src={selectedPost.main_image_url} alt={selectedPost.title} className="w-full h-full object-cover" />
                                    </div>
                                </div>
                            )}
                            {selectedPost.images && selectedPost.images.length > 0 && (
                                <div className="grid grid-cols-3 gap-2 mb-4">
                                    {selectedPost.images.map((img) => (<div key={img.id} className="aspect-square bg-[#EAEAEA] rounded-lg overflow-hidden"><Image  src={img.url} alt={selectedPost.title} className="w-full h-full object-cover" /></div>))}
                                </div>
                            )}

                            <div className="flex flex-wrap gap-2 mb-4">
                                {selectedPost.category && (<span className="px-2 py-1 bg-blue-100 text-blue-700 rounded-full text-sm">{selectedPost.category}</span>)}
                                {selectedPost.tags?.map((tag, idx) => (<span key={idx} className="px-2 py-1 bg-gray-100 text-gray-600 rounded-full text-sm">#{tag}</span>))}
                            </div>

                            <div className="flex gap-4 mb-4 text-sm text-gray-500">
                                <span>👁️ {selectedPost.views_count} просмотров</span>
                                <span>❤️ {selectedPost.likes_count} лайков</span>
                                <span>💬 {selectedPost.comments_count} комментариев</span>
                            </div>

                            <div className="mb-4">
                                <h3 className="font-semibold mb-2">Содержание</h3>
                                <div className="prose max-w-none">
                                    <p className="whitespace-pre-line">{selectedPost.content}</p>
                                </div>
                            </div>

                            <div className="flex gap-3 mt-6 pt-4 border-t">
                                <button onClick={() => {handleApprove(selectedPost.id); setShowModal(false)}} className="flex-1 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600 transition">Одобрить</button>
                                <button onClick={() => {handleReturnToDraft(selectedPost.id); setShowModal(false)}} className="flex-1 py-2 bg-yellow-500 text-white rounded-lg hover:bg-yellow-600 transition">На доработку</button>
                                <button onClick={() => {handleReject(selectedPost.id); setShowModal(false) }} className="flex-1 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600 transition">Отклонить</button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    )
}
