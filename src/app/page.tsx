// src/app/page.tsx
'use client'

import Link from "next/link";
import { useSession } from "next-auth/react";
import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import MasterDashboard from "@/components/master/MasterDashboard";
import BlogPostCard from "@/components/blog/BlogPostCard";
import TopMasters from "@/components/TopMasters";
import PopularProducts from "@/components/PopularProducts";
import HeroSlider from "@/components/HeroSlider";

interface BlogPost {
    id: string;
    title: string;
    content: string;
    excerpt: string;
    main_image_url: string;
    images?: Array<{ id: string; url: string; sort_order: number }>;
    created_at: string;
    master_id: string;
    master_name: string;
    master_avatar: string;
    author_name: string;
    author_avatar?: string;
    likes_count: number;
    comments_count: number;
    is_liked: boolean;
    views_count: number;
    comments?: Array<{
        id: string;
        content: string;
        created_at: string;
        author_name: string;
        author_avatar?: string;
    }>;
}

export default function HomePage() {
    const { data: session, status } = useSession()
    const [isMaster, setIsMaster] = useState(false)
    const [recentPosts, setRecentPosts] = useState<BlogPost[]>([])
    const [loadingPosts, setLoadingPosts] = useState(true)
    const [showComments, setShowComments] = useState<string | null>(null)
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
            const postsData = Array.isArray(data.posts) ? data.posts : []
            setRecentPosts(postsData)
        } catch (error) {
            console.error('Error fetching recent posts:', error)
            setRecentPosts([])
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
                const data = await response.json()
                setRecentPosts(prev => prev.map(p => 
                    p.id === postId 
                        ? { 
                            ...p, 
                            is_liked: data.is_liked,
                            likes_count: data.likes_count
                          }
                        : p
                ))
            }
        } catch (error) {
            console.error('Error toggling like:', error)
        }
    }

    const handleComment = async (postId: string, text: string) => {
        if (!session) {
            window.location.href = '/auth/signin?callbackUrl=/'
            return false
        }

        if (!text.trim()) return false

        setCommentLoading(true)
        try {
            const response = await fetch(`/api/blog/posts/${postId}/comment`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ content: text })
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
                setShowComments(postId)
                return true
            }
            return false
        } catch (error) {
            console.error('Error adding comment:', error)
            return false
        } finally {
            setCommentLoading(false)
        }
    }

    if (isMaster) {
        const adaptedSession = session ? {
            user: {
                id: session.user?.id || '',
                name: session.user?.name || '',
                email: session.user?.email || '',
                role: session.user?.role || 'master'
            }
        } : null
        return <MasterDashboard session={adaptedSession} />
    }

    return (
        <div className="w-full px-3 sm:px-4 md:px-6 lg:px-8">
            <div>
                <HeroSlider />
            </div>
            <TopMasters />
            
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
                    <Link href="/profile?tab=profile" className="w-full">
                        <button className="w-full font-['Montserrat_Alternates'] font-[450] border-2 border-firm-orange p-2 rounded-xl transition-all duration-300 hover:border-4 hover:bg-firm-orange hover:text-white text-sm md:text-base">
                            Стать мастером
                        </button>
                    </Link>
                </motion.div>
            </div>
            
            <PopularProducts />
            
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
                        {Array.isArray(recentPosts) && recentPosts.map((post) => (
                            <BlogPostCard
                                key={post.id}
                                post={post}
                                onLike={handleLike}
                                onComment={handleComment}
                                showComments={showComments === post.id}
                                variant="default"
                            />
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