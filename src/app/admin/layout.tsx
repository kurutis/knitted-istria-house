"use client"

import { useSession } from "next-auth/react";
import { usePathname, useRouter } from "next/navigation";
import React, { useEffect, useState } from "react";
import Link from "next/link"
import { motion, AnimatePresence } from "framer-motion"

export default function AdminLayout({ children }: { children: React.ReactNode }) {
    const { data: session, status } = useSession()
    const router = useRouter()
    const pathname = usePathname()
    const [sidebarOpen, setSidebarOpen] = useState(false)

    useEffect(() => {
        if (status === 'loading') return

        if (!session) {
            router.push('/auth/signin?callbackUrl=/admin')
            return
        }

        // Используем as any для обхода TypeScript
        if (session.user?.role !== 'admin') {
            router.push('/')
        }
    }, [session, status, router])

    if (status === 'loading') {
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
                    <p className="mt-4 font-['Montserrat_Alternates'] text-gray-600">Загрузка админ панели...</p>
                </div>
            </motion.div>
        )
    }

    // Проверяем наличие сессии и роль
    if (!session || session.user?.role !== 'admin') { 
        return null 
    }

    const navigation = [
        { name: 'Дашборд', href: '/admin/dashboard', icon: "📊" },
        { name: 'Пользователи', href: '/admin/users', icon: "👥" },
        {
            name: 'Модерация', icon: "✅", children: [
                { name: 'Мастера', href: '/admin/moderation/masters' },
                { name: 'Товары', href: '/admin/moderation/products' },
                { name: 'Блог', href: '/admin/moderation/blog' }
            ]
        },
        {
            name: 'Категории', icon: '📁', children: [
                { name: 'Пряжа', href: '/admin/catalog/yarn' },
                { name: 'Категории товаров', href: '/admin/catalog/categories' }
            ]
        },
        {
            name: 'Поддержка', icon: '💬', children: [
                { name: 'Обращения', href: '/admin/support' },
                { name: 'База знаний', href: '/admin/support/knowledge-base' }
            ]
        }
    ]

    const isActive = (href: string) => pathname === href

    return (
        <div className="min-h-screen bg-[#F9F9F9]">
            {/* Остальной код без изменений */}
            <div className="lg:hidden sticky top-0 z-50 bg-white border-b border-gray-200">
                <div className="flex items-center gap-3 px-4 py-3">
                    <button
                        onClick={() => setSidebarOpen(true)}
                        className="p-2 bg-gradient-to-r from-firm-orange to-firm-pink text-white rounded-xl shadow-md hover:shadow-lg transition-all duration-300"
                    >
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                        </svg>
                    </button>
                    
                    <nav className="flex items-center gap-2 text-sm">
                        <Link href="/admin/dashboard" className="text-gray-500 hover:text-firm-orange transition font-['Montserrat_Alternates']">Админ</Link>
                        <span className="text-gray-400">/</span>
                        <span className="text-gray-700 font-['Montserrat_Alternates'] font-medium capitalize truncate">
                            {pathname.split('/').pop()?.replace(/-/g, ' ') || 'Дашборд'}
                        </span>
                    </nav>
                </div>
            </div>

            <AnimatePresence>
                {sidebarOpen && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="fixed inset-0 bg-black/40 backdrop-blur-sm z-40 lg:hidden"
                        onClick={() => setSidebarOpen(false)}
                    />
                )}
            </AnimatePresence>

            <aside className={`fixed top-0 left-0 z-50 w-72 h-full bg-white shadow-2xl transition-transform duration-300 overflow-y-auto ${sidebarOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}`}>
                <div className="flex flex-col h-full">
                    <div className="p-6 border-b border-gray-200">
                        <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                                <span className="text-2xl">🧶</span>
                                <h1 className="font-['Montserrat_Alternates'] font-bold text-xl bg-gradient-to-r from-firm-orange to-firm-pink bg-clip-text text-transparent">
                                    Админ панель
                                </h1>
                            </div>
                            <button
                                onClick={() => setSidebarOpen(false)}
                                className="lg:hidden p-1 text-gray-400 hover:text-gray-600 transition-colors"
                            >
                                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                </svg>
                            </button>
                        </div>
                        <p className="text-sm text-gray-500 mt-1">Дом вязанных историй</p>
                    </div>

                    <nav className="flex-1 p-4">
                        <ul className="space-y-1">
                            {navigation.map((item, index) => (
                                <motion.li
                                    key={item.name}
                                    initial={{ opacity: 0, x: -20 }}
                                    animate={{ opacity: 1, x: 0 }}
                                    transition={{ delay: index * 0.05 }}
                                >
                                    {item.children ? (
                                        <div>
                                            <div className="flex items-center gap-3 px-4 py-3 text-gray-700 font-['Montserrat_Alternates'] font-medium rounded-lg">
                                                <span className="text-xl">{item.icon}</span>
                                                <span>{item.name}</span>
                                            </div>
                                            <ul className="ml-8 mt-1 space-y-1">
                                                {item.children.map((child) => (
                                                    <li key={child.name}>
                                                        <Link
                                                            href={child.href}
                                                            onClick={() => setSidebarOpen(false)}
                                                            className={`block px-4 py-2 rounded-lg transition-all duration-300 font-['Montserrat_Alternates'] ${isActive(child.href) ? 'bg-gradient-to-r from-firm-orange to-firm-pink text-white shadow-md' : 'text-gray-600 hover:bg-[#EAEAEA]'}`}
                                                        >
                                                            {child.name}
                                                        </Link>
                                                    </li>
                                                ))}
                                            </ul>
                                        </div>
                                    ) : (
                                        <Link
                                            href={item.href}
                                            onClick={() => setSidebarOpen(false)}
                                            className={`flex items-center gap-3 px-4 py-3 rounded-lg transition-all duration-300 font-['Montserrat_Alternates'] ${isActive(item.href) ? 'bg-gradient-to-r from-firm-orange to-firm-pink text-white shadow-md' : 'text-gray-700 hover:bg-[#EAEAEA]'}`}
                                        >
                                            <span className="text-xl">{item.icon}</span>
                                            <span>{item.name}</span>
                                        </Link>
                                    )}
                                </motion.li>
                            ))}
                        </ul>
                    </nav>

                    <div className="p-4 border-t border-gray-200">
                        <div className="flex items-center justify-between mb-3">
                            <div className="flex items-center gap-3">
                                <div className="w-10 h-10 rounded-full bg-gradient-to-r from-firm-orange to-firm-pink flex items-center justify-center text-white font-bold shadow-md">
                                    {session.user?.name?.charAt(0).toUpperCase() || 'A'}
                                </div>
                                <div>
                                    <p className="font-['Montserrat_Alternates'] font-semibold text-gray-800">{session.user?.name || 'Администратор'}</p>
                                    <p className="text-xs text-gray-500">{session.user?.email}</p>
                                </div>
                            </div>
                        </div>
                        <Link
                            href="/"
                            className="flex items-center justify-center gap-2 w-full py-2 text-sm bg-gradient-to-r from-firm-orange to-firm-pink text-white rounded-xl hover:shadow-lg transition-all duration-300"
                        >
                            <span>На сайт</span>
                            <span>→</span>
                        </Link>
                    </div>
                </div>
            </aside>

            <main className="lg:ml-72 min-h-screen">
                <div className="hidden lg:block bg-white border-b border-gray-200 sticky top-0 z-30">
                    <div className="px-6 py-4">
                        <div className="flex items-center justify-between">
                            <nav className="flex items-center gap-2 text-sm">
                                <Link href="/admin/dashboard" className="text-gray-500 hover:text-firm-orange transition font-['Montserrat_Alternates']">Админ</Link>
                                <span className="text-gray-400">/</span>
                                <span className="text-gray-700 font-['Montserrat_Alternates'] font-medium capitalize">
                                    {pathname.split('/').pop()?.replace(/-/g, ' ') || 'Дашборд'}
                                </span>
                            </nav>
                            
                            <button
                                onClick={() => setSidebarOpen(!sidebarOpen)}
                                className="p-2 text-gray-500 hover:text-firm-orange transition hover:bg-gray-100 rounded-lg"
                            >
                                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 8h16M4 16h16" />
                                </svg>
                            </button>
                        </div>
                    </div>
                </div>

                <div className="p-6">
                    {children}
                </div>
            </main>
        </div>
    )
}