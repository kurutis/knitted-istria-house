'use client'

import Link from "next/link";
import HeroSlider from "@/components/HeroSlider"
import { useSession } from "next-auth/react";
import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import MasterDashboard from "@/components/master/MasterDashboard";
import TopMasters from "@/components/TopMasters";
import PopularProducts from "@/components/PopularProducts";
import MediaGallery from "@/components/blog/MediaGallery";
import { AnimatedButton } from "@/components/ui/AnimatedButton";

interface BlogPost {
    id: string
    title: string
    content: string
    excerpt: string
    main_image_url: string
    images?: Array<{ id: string; url: string; sort_order: number }>
    created_at: string
    master_id: string
    master_name: string
    master_avatar: string
    likes_count: number
    comments_count: number
    is_liked: boolean
    views_count: number
}

export default function HomePage() {
    const { data: session, status } = useSession()
    const [isMaster, setIsMaster] = useState(false)
    const [recentPosts, setRecentPosts] = useState<BlogPost[]>([])
    const [loadingPosts, setLoadingPosts] = useState(true)
    const [showComments, setShowComments] = useState<string | null>(null)
    const [commentText, setCommentText] = useState('')
    const [commentLoading, setCommentLoading] = useState(false)
    const [isMobile, setIsMobile] = useState(false)


    useEffect(() => {
        const checkMobile = () => setIsMobile(window.innerWidth < 768)
        checkMobile()
        window.addEventListener('resize', checkMobile)
        return () => window.removeEventListener('resize', checkMobile)
    }, [])

    useEffect(() => {
        if (status === 'authenticated' && session?.user?.role === 'master') {
            setIsMaster(true)
        } else {
            setIsMaster(false)
        }
    }, [session, status])

    useEffect(() => {
        fetchRecentPosts()
    }, [])

    const fetchRecentPosts = async () => {
        try {
            const response = await fetch('/api/blog/posts?limit=4')
            const data = await response.json()
            setRecentPosts(data)
        } catch (error) {
            console.error('Error fetching recent posts:', error)
        } finally {
            setLoadingPosts(false)
        }
    }

    const handleLike = async (postId: string) => {
        if (!session) {
            window.location.href = '/auth/signin?callbackUrl=/'
            return
        }

        try {
            const post = recentPosts.find(p => p.id === postId)
            const response = await fetch(`/api/blog/posts/${postId}/like`, {
                method: post?.is_liked ? 'DELETE' : 'POST'
            })

            if (response.ok) {
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
        } catch (error) {
            console.error('Error toggling like:', error)
        }
    }

    const handleComment = async (postId: string) => {
        if (!session) {
            window.location.href = '/auth/signin?callbackUrl=/'
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
                setRecentPosts(prev => prev.map(p =>
                    p.id === postId
                        ? {
                            ...p,
                            comments: [newComment, ...(p.comments || [])],
                            comments_count: p.comments_count + 1
                        }
                        : p
                ))
                setCommentText('')
                setShowComments(postId)
            }
        } catch (error) {
            console.error('Error adding comment:', error)
        } finally {
            setCommentLoading(false)
        }
    }

    const formatDate = (dateString: string) => {
        const date = new Date(dateString)
        const now = new Date()
        const diff = Math.floor((now.getTime() - date.getTime()) / 1000 / 60 / 60)
        
        if (diff < 1) return 'только что'
        if (diff < 24) return `${diff} ч назад`
        return date.toLocaleDateString('ru-RU')
    }

    if (isMaster) {
        return <MasterDashboard session={session} />
    }

    return (
        <div className="w-full px-3 sm:px-4 md:px-6 lg:px-8">
            <div>
                <HeroSlider />
            </div>
            <TopMasters />
            
            {/* Кнопки */}
            <div className="flex flex-col sm:flex-row items-center gap-4 md:gap-20 justify-center mt-5 mb-16 px-4">
                <motion.div
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    className="w-full sm:w-[60%] md:w-[40%] lg:w-[20%]"
                >
                    <Link href="/catalog" className="w-full">
                        <button className="w-full font-['Montserrat_Alternates'] font-[450] border-2 border-firm-pink p-2 rounded-xl transition-all duration-300 hover:border-4 hover:bg-firm-pink hover:text-white text-sm md:text-base">
                            Найти изделие для себя
                        </button>
                    </Link>
                </motion.div>
                <motion.div
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    className="w-full sm:w-[60%] md:w-[40%] lg:w-[20%]"
                >
                    <Link href="/masters" className="w-full">
                        <button className="w-full font-['Montserrat_Alternates'] font-[450] border-2 border-firm-orange p-2 rounded-xl transition-all duration-300 hover:border-4 hover:bg-firm-orange hover:text-white text-sm md:text-base">
                            Найти своего мастера
                        </button>
                    </Link>
                </motion.div>
            </div>
            
            <PopularProducts />
            
            {/* Лента новостей */}
            <motion.div 
                className="py-12 md:py-16"
                initial={{ opacity: 0 }}
                whileInView={{ opacity: 1 }}
                viewport={{ once: true, amount: 0.3 }}
                transition={{ duration: 0.6 }}
            >
                <div className="text-center mb-8 md:mb-12">
                    <motion.h2 
                        className="font-['Montserrat_Alternates'] font-semibold text-2xl md:text-3xl text-gray-800"
                        initial={{ y: -30, opacity: 0 }}
                        animate={{ y: 0, opacity: 1 }}
                        transition={{ duration: 0.5 }}
                    >
                        Последние из блога
                    </motion.h2>
                    
                    <motion.p 
                        className="text-gray-500 mt-2 md:mt-3 text-sm px-4"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        transition={{ delay: 0.2, duration: 0.5 }}
                    >
                        Интересные новости от наших мастеров
                    </motion.p>
                    <motion.div 
                        className="w-20 h-1 bg-gradient-to-r from-firm-orange to-firm-pink mx-auto mt-3 rounded-full"
                        initial={{ width: 0 }}
                        animate={{ width: 80 }}
                        transition={{ duration: 0.6, delay: 0.3 }}
                    />
                </div>

                {loadingPosts ? (
                    <div className="text-center py-12">
                        <motion.div 
                            className="w-8 h-8 border-2 border-gray-200 border-t-firm-orange rounded-full inline-block"
                            animate={{ rotate: 360 }}
                            transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                        />
                    </div>
                ) : recentPosts.length === 0 ? (
                    <div className="text-center py-12 bg-gray-50 rounded-lg mx-4">
                        <p className="text-gray-500">Пока нет постов</p>
                    </div>
                ) : (
                    <div className="space-y-6 flex flex-col items-center px-4">
                        {recentPosts.map((post, index) => (
                            <motion.div 
                                key={post.id} 
                                className="bg-white rounded-lg shadow-md overflow-hidden w-full max-w-2xl lg:max-w-3xl"
                                initial={{ opacity: 0, y: 50 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ delay: index * 0.1, duration: 0.5 }}
                                whileHover={{ y: -5, boxShadow: "0 20px 40px rgba(0,0,0,0.1)" }}
                            >
                                {/* Шапка поста */}
                                <div className="p-3 md:p-4 flex items-center justify-between border-b border-gray-200">
                                    <Link href={`/masters/${post.master_id}`} className="flex items-center gap-2 md:gap-3 group">
                                        <motion.div 
                                            className="w-8 h-8 md:w-10 md:h-10 rounded-full bg-gradient-to-r from-firm-orange to-firm-pink flex items-center justify-center text-white font-bold overflow-hidden text-sm md:text-base"
                                            whileHover={{ scale: 1.1 }}
                                            transition={{ duration: 0.3 }}
                                        >
                                            {post.master_avatar ? (
                                                <img src={post.master_avatar} alt={post.master_name} className="w-full h-full object-cover" />
                                            ) : (
                                                post.master_name?.charAt(0).toUpperCase()
                                            )}
                                        </motion.div>
                                        <div>
                                            <p className="font-semibold text-sm md:text-base group-hover:text-firm-orange transition-colors">{post.master_name}</p>
                                            <p className="text-xs text-gray-400">{formatDate(post.created_at)}</p>
                                        </div>
                                    </Link>
                                </div>

                                {/* Контент поста */}
                                <div className="p-3 md:p-4">
                                    <h3 className="font-['Montserrat_Alternates'] font-semibold text-lg md:text-xl mb-2">
                                        {post.title}
                                    </h3>
                                    
                                    {(post.images?.length > 0 || post.main_image_url) && (
                                        <MediaGallery 
                                            images={
                                                post.images?.length 
                                                    ? post.images 
                                                    : (post.main_image_url ? [{ url: post.main_image_url, sort_order: 0 }] : [])
                                            } 
                                            video={null}
                                            title={post.title}
                                        />
                                    )}
                                    
                                    <p className="text-gray-700 mt-3 md:mt-4 line-clamp-3 text-sm md:text-base">
                                        {post.excerpt || post.content?.substring(0, 300)}...
                                    </p>
                                    
                                    <Link 
                                        href={`/blog/${post.id}`}
                                        className="text-firm-orange hover:underline text-xs md:text-sm mt-2 inline-block group"
                                    >
                                        Читать полностью 
                                        <motion.span 
                                            className="inline-block ml-1"
                                            animate={{ x: [0, 5, 0] }}
                                            transition={{ duration: 1.5, repeat: Infinity }}
                                        >
                                            →
                                        </motion.span>
                                    </Link>
                                </div>

                                {/* Кнопки взаимодействия */}
                                <div className="px-3 md:px-4 py-2 md:py-3 border-t border-gray-200 flex items-center gap-3 md:gap-6">
                                    <AnimatedButton
                                        icon={
                                            <svg 
                                                className="w-5 h-5 md:w-7 md:h-7" 
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
                                        isActive={post.is_liked}
                                        onClick={() => handleLike(post.id)}
                                        activeColor="text-firm-pink"
                                    />
                                    
                                    <AnimatedButton
                                        icon={
                                            <svg 
                                                className="w-5 h-5 md:w-7 md:h-7" 
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
                                    <span className="text-xs md:text-sm text-gray-400 flex items-center gap-1">
                                        <svg className="w-4 h-4 md:w-6 md:h-6" fill="none" stroke="#9CA3AF" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                                        </svg>
                                        {post.views_count}
                                    </span>
                                </div>

                                {/* Комментарии */}
                                {showComments === post.id && (
                                    <motion.div 
                                        className="px-3 md:px-4 py-3 border-t bg-gray-50"
                                        initial={{ opacity: 0, height: 0 }}
                                        animate={{ opacity: 1, height: "auto" }}
                                        exit={{ opacity: 0, height: 0 }}
                                        transition={{ duration: 0.3 }}
                                    >
                                        {session && (
                                            <div className="flex gap-2 md:gap-3 mb-4">
                                                <div className="w-7 h-7 md:w-8 md:h-8 rounded-full bg-gradient-to-r from-firm-orange to-firm-pink flex items-center justify-center text-white text-xs md:text-sm font-bold flex-shrink-0">
                                                    {session.user.name?.charAt(0).toUpperCase()}
                                                </div>
                                                <div className="flex-1">
                                                    <textarea
                                                        value={commentText}
                                                        onChange={(e) => setCommentText(e.target.value)}
                                                        placeholder="Написать комментарий..."
                                                        rows={2}
                                                        className="w-full p-2 rounded-lg bg-white border border-gray-200 outline-firm-orange text-sm"
                                                    />
                                                    <motion.button
                                                        onClick={() => handleComment(post.id)}
                                                        disabled={commentLoading || !commentText.trim()}
                                                        className="mt-2 px-3 md:px-4 py-1 md:py-1.5 bg-firm-orange text-white rounded-lg text-xs md:text-sm hover:bg-opacity-90 transition disabled:opacity-50"
                                                        whileHover={{ scale: 1.02 }}
                                                        whileTap={{ scale: 0.98 }}
                                                    >
                                                        {commentLoading ? 'Отправка...' : 'Отправить'}
                                                    </motion.button>
                                                </div>
                                            </div>
                                        )}
                                        
                                        <div className="space-y-3 max-h-96 overflow-y-auto">
                                            {post.comments?.length === 0 ? (
                                                <p className="text-gray-400 text-xs md:text-sm text-center py-4">
                                                    Будьте первым, кто оставит комментарий
                                                </p>
                                            ) : (
                                                post.comments?.map((comment: any, idx: number) => (
                                                    <motion.div 
                                                        key={comment.id} 
                                                        className="flex gap-2 md:gap-3"
                                                        initial={{ opacity: 0, x: -20 }}
                                                        animate={{ opacity: 1, x: 0 }}
                                                        transition={{ delay: idx * 0.05 }}
                                                    >
                                                        <div className="w-7 h-7 md:w-8 md:h-8 rounded-full bg-gray-300 flex items-center justify-center text-white text-xs md:text-sm font-bold flex-shrink-0 overflow-hidden">
                                                            {comment.author_avatar ? (
                                                                <img src={comment.author_avatar} alt={comment.author_name} className="w-full h-full object-cover" />
                                                            ) : (
                                                                comment.author_name?.charAt(0).toUpperCase()
                                                            )}
                                                        </div>
                                                        <div className="flex-1">
                                                            <div className="bg-white rounded-lg p-2 md:p-3">
                                                                <p className="font-semibold text-xs md:text-sm">{comment.author_name}</p>
                                                                <p className="text-gray-700 text-xs md:text-sm mt-1">{comment.content}</p>
                                                            </div>
                                                            <p className="text-xs text-gray-400 mt-1">{formatDate(comment.created_at)}</p>
                                                        </div>
                                                    </motion.div>
                                                ))
                                            )}
                                        </div>
                                    </motion.div>
                                )}
                            </motion.div>
                        ))}
                    </div>
                )}

                <div className="text-center mt-8 md:mt-12 px-4">
                    <motion.div
                        whileHover={{ scale: 1.05 }}
                        whileTap={{ scale: 0.95 }}
                    >
                        <Link
                            href="/blog"
                            className="inline-flex items-center gap-2 px-4 md:px-6 py-2 md:py-3 border-2 border-firm-pink text-firm-pink rounded-xl font-['Montserrat_Alternates'] font-medium hover:bg-firm-pink hover:text-white transition-all duration-300 text-sm md:text-base"
                        >
                            Перейти в блог
                            <motion.svg 
                                className="w-3 h-3 md:w-4 md:h-4" 
                                fill="none" 
                                stroke="currentColor" 
                                viewBox="0 0 24 24"
                                animate={{ x: [0, 5, 0] }}
                                transition={{ duration: 1.5, repeat: Infinity }}
                            >
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                            </motion.svg>
                        </Link>
                    </motion.div>
                </div>
            </motion.div>
        </div>
    )
}
