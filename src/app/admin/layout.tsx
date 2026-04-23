"use client"

import { useSession } from "next-auth/react";
import { usePathname, useRouter } from "next/navigation";
import React, { useEffect, useState } from "react";
import Link from "next/link"

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

        if (session.user.role !== 'admin') {
            router.push('/')
        }
    }, [session, status, router])

    if (status === 'loading') {
        return (
            <div className="mt-5 flex items-center justify-center min-h-[60vh]">
                <div className="text-center">
                    <div className="w-16 h-16 border-4 border-firm-orange border-t-transparent rounded-full animate-spin mx-auto"></div>
                    <p className="mt-4 font-['Montserrat_Alternates'] text-gray-600">Загрузка админ панели...</p>
                </div>
            </div>
        )
    }

    if (!session || session.user.role !== 'admin') {return null}

    const navigation = [{name: 'Дашборд', href: '/admin/dashboard', icon: "📊" }, {name: 'Пользователи', href: '/admin/users', icon: "👥" }, {name: 'Модерация', icon: "✅", children: [{ name: 'Мастера', href: '/admin/moderation/masters' }, { name: 'Товары', href: '/admin/moderation/products' }, { name: 'Блог', href: '/admin/moderation/blog' }] }, {name: 'Категории', icon: '📁', children: [{ name: 'Пряжа', href: '/admin/catalog/yarn' }, { name: 'Категории товаров', href: '/admin/catalog/categories' }]}, { name: 'Поддержка', icon: '💬', children: [{ name: 'Обращения', href: '/admin/support' }, { name: 'База знаний', href: '/admin/support/knowledge-base' }]}]

    const isActive = (href: string) => pathname === href

    return (
        <div className="min-h-screen bg-[#F9F9F9]">
            <div className="lg:hidden fixed top-4 left-4 z-50">
                <button onClick={() => setSidebarOpen(!sidebarOpen)} className="p-2 bg-firm-orange text-white rounded-lg shadow-lg hover:bg-firm-pink transition-colors"><svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" /></svg></button>
            </div>

            {sidebarOpen && (<div className="fixed inset-0 bg-[#00000059] bg-opacity-50 z-40 lg:hidden" onClick={() => setSidebarOpen(false)} />)}

            <aside className={`fixed top-0 left-0 z-40 w-72 h-full bg-white shadow-xl transition-transform duration-300 overflow-y-auto ${sidebarOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}`}>
                <div className="flex flex-col h-full">
                    <div className="p-6 border-b border-gray-200">
                        <div className="flex items-center gap-2">
                            <span className="text-2xl">🧶</span>
                            <h1 className="font-['Montserrat_Alternates'] font-bold text-xl text-firm-pink">Админ панель</h1>
                        </div>
                        <p className="text-sm text-gray-500 mt-1">Дом вязанных историй</p>
                    </div>

                    <nav className="flex-1 p-4">
                        <ul className="space-y-1">
                            {navigation.map((item) => (
                                <li key={item.name}>
                                    {item.children ? (
                                        <div>
                                            <div className="flex items-center gap-3 px-4 py-3 text-gray-700 font-['Montserrat_Alternates'] font-medium rounded-lg">
                                                <span className="text-xl">{item.icon}</span><span>{item.name}</span>
                                            </div>
                                            <ul className="ml-8 mt-1 space-y-1">
                                                {item.children.map((child) => (<li key={child.name}><Link href={child.href} onClick={() => setSidebarOpen(false)} className={`block px-4 py-2 rounded-lg transition-all duration-300 font-['Montserrat_Alternates'] ${isActive(child.href) ? 'bg-firm-orange text-white' : 'text-gray-600 hover:bg-[#EAEAEA]'}`}>{child.name}</Link></li> ))}
                                            </ul>
                                        </div>
                                    ) : (
                                        <Link href={item.href} onClick={() => setSidebarOpen(false)}  className={`flex items-center gap-3 px-4 py-3 rounded-lg transition-all duration-300 font-['Montserrat_Alternates'] ${isActive(item.href) ? 'bg-firm-orange text-white' : 'text-gray-700 hover:bg-[#EAEAEA]'}`}><span className="text-xl">{item.icon}</span><span>{item.name}</span></Link>
                                    )}
                                </li>
                            ))}
                        </ul>
                    </nav>

                    <div className="p-4 border-t border-gray-200">
                        <div className="flex items-center justify-between mb-3">
                            <div className="flex items-center gap-3">
                                <div className="w-10 h-10 rounded-full bg-gradient-to-r from-firm-orange to-firm-pink flex items-center justify-center text-white font-bold">
                                    {session.user.name?.charAt(0).toUpperCase() || 'A'}
                                </div>
                                <div>
                                    <p className="font-['Montserrat_Alternates'] font-semibold text-gray-800">{session.user.name || 'Администратор'}</p>
                                    <p className="text-xs text-gray-500">{session.user.email}</p>
                                </div>
                            </div>
                        </div>
                        <Link href="/" className="flex items-center justify-center gap-2 w-full py-2 text-sm text-firm-orange border border-firm-orange rounded-lg hover:bg-firm-orange hover:text-white transition-all duration-300"><span>На сайт</span><span>→</span></Link>
                    </div>
                </div>
            </aside>

            <main className="lg:ml-72 min-h-screen">
                <div className="bg-white border-b border-gray-200 sticky top-0 z-30">
                    <div className="px-6 py-4">
                        <div className="flex items-center justify-between">
                            <nav className="flex items-center gap-2 text-sm">
                                <Link href="/admin/dashboard" className="text-gray-500 hover:text-firm-orange transition font-['Montserrat_Alternates']">Админ</Link>
                                <span className="text-gray-400">/</span>
                                <span className="text-gray-700 font-['Montserrat_Alternates'] font-medium capitalize">{pathname.split('/').pop()?.replace(/-/g, ' ') || 'Дашборд'}</span>
                            </nav>
                            
                            <button onClick={() => setSidebarOpen(!sidebarOpen)} className="hidden lg:block p-2 text-gray-500 hover:text-firm-orange transition"><svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 8h16M4 16h16" /></svg></button>
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