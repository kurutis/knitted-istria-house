"use client";

import { useSession } from "next-auth/react";
import { usePathname, useRouter } from "next/navigation";
import React, { useEffect, useState } from "react";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";

import { DashboardIcon } from "@/components/icons/DashboardIcon";
import { UsersIcon } from "@/components/icons/UsersIcon";
import { TagIcon } from "@/components/icons/TagIcon";
import { SupportIcon } from "@/components/icons/SupportIcon";
import { BlogIcon } from "@/components/icons/BlogIcon";
import { ProductsIcon } from "@/components/icons/ProductsIcon";
import { MasterIcon } from "@/components/icons/MasterIcon";

export default function AdminLayout({ children }: { children: React.ReactNode }) {
    const { data: session, status } = useSession();
    const router = useRouter();
    const pathname = usePathname();
    const [sidebarOpen, setSidebarOpen] = useState(false);

    useEffect(() => {
        if (status === 'loading') return;
        if (!session) {
            router.push('/auth/signin?callbackUrl=/admin');
            return;
        }
        if (session.user?.role !== 'admin') {
            router.push('/');
        }
    }, [session, status, router]);

    if (status === 'loading') {
        return (
            <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="flex items-center justify-center min-h-[60vh] bg-main"
            >
                <div className="text-center">
                    <motion.div
                        animate={{ rotate: 360 }}
                        transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                        className="w-16 h-16 border-4 border-firm-orange border-t-transparent rounded-full mx-auto"
                    />
                    <p className="mt-4 font-['Montserrat_Alternates'] text-firm-gray">Загрузка админ панели...</p>
                </div>
            </motion.div>
        );
    }

    if (!session || session.user?.role !== 'admin') {
        return null;
    }

    const renderIcon = (icon: React.ReactNode, isActive: boolean) => {
        const color = isActive ? '#f9f9f9' : '#737682';
        return React.cloneElement(icon as React.ReactElement<{ color?: string }>, { color });
    };

    const navigation: {
        name: string;
        href?: string;
        icon: React.ReactNode;
        children?: { name: string; href: string; icon?: React.ReactNode }[];
    }[] = [
        { name: 'Дашборд', href: '/admin/dashboard', icon: <DashboardIcon size={22} /> },
        { name: 'Пользователи', href: '/admin/users', icon: <UsersIcon size={22} /> },
        {
            name: 'Модерация',
            icon: <TagIcon size={22} />,
            children: [
                { name: 'Мастера', href: '/admin/moderation/masters', icon: <MasterIcon size={18} /> },
                { name: 'Товары', href: '/admin/moderation/products', icon: <ProductsIcon size={18} /> },
                { name: 'Блог', href: '/admin/moderation/blog', icon: <BlogIcon size={18} /> }
            ]
        },
        {
            name: 'Каталог',
            icon: <ProductsIcon size={22} />,
            children: [
                { name: 'Пряжа', href: '/admin/catalog/yarn' },
                { name: 'Категории товаров', href: '/admin/catalog/categories' }
            ]
        },
        {
            name: 'Поддержка',
            icon: <SupportIcon size={22} />,
            children: [
                { name: 'Обращения', href: '/admin/support' },
                { name: 'База знаний', href: '/admin/support/knowledge-base' }
            ]
        }
    ];

    const isActive = (href?: string) => href && pathname === href;

    return (
        <div className="min-h-screen bg-main">
            {/* Мобильная шапка */}
            <div className="lg:hidden sticky top-0 z-50 bg-main border-b border-gray-200">
                <div className="flex items-center gap-3 px-4 py-3">
                    <button
                        onClick={() => setSidebarOpen(true)}
                        className="p-2 bg-linear-to-r from-firm-orange to-firm-pink text-main rounded-xl shadow-md hover:shadow-lg transition-all duration-300"
                    >
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                        </svg>
                    </button>
                    <nav className="flex items-center gap-2 text-sm">
                        <Link href="/admin/dashboard" className="text-firm-gray hover:text-firm-orange transition font-['Montserrat_Alternates']">Админ</Link>
                        <span className="text-firm-gray">/</span>
                        <span className="text-text font-['Montserrat_Alternates'] font-medium capitalize truncate">
                            {pathname.split('/').pop()?.replace(/-/g, ' ') || 'Дашборд'}
                        </span>
                    </nav>
                </div>
            </div>

            {/* Оверлей для мобильного меню */}
            <AnimatePresence>
                {sidebarOpen && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="fixed inset-0 bg-main-black/40 backdrop-blur-sm z-40 lg:hidden"
                        onClick={() => setSidebarOpen(false)}
                    />
                )}
            </AnimatePresence>

            {/* Боковая панель */}
            <aside
                className={`fixed top-0 left-0 z-50 w-72 h-full bg-white shadow-2xl transition-transform duration-300 overflow-y-auto ${
                    sidebarOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'
                }`}
            >
                <div className="flex flex-col h-full">
                    <div className="p-6 border-b border-gray-200">
                        <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                                <span className="text-2xl">🧶</span>
                                <h1 className="font-['Montserrat_Alternates'] font-bold text-xl bg-linear-to-r from-firm-orange to-firm-pink bg-clip-text text-transparent">
                                    Админ панель
                                </h1>
                            </div>
                            <button
                                onClick={() => setSidebarOpen(false)}
                                className="lg:hidden p-1 text-firm-gray hover:text-text transition-colors"
                            >
                                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                </svg>
                            </button>
                        </div>
                        <p className="text-sm text-firm-gray mt-1">Дом вязанных историй</p>
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
                                            <div className="flex items-center gap-3 px-4 py-3 text-text font-['Montserrat_Alternates'] font-medium rounded-lg">
                                                <span className="text-firm-gray">{renderIcon(item.icon, false)}</span>
                                                <span>{item.name}</span>
                                            </div>
                                            <ul className="ml-8 mt-1 space-y-1">
                                                {item.children.map((child) => (
                                                    <li key={child.name}>
                                                        <Link
                                                            href={child.href}
                                                            onClick={() => setSidebarOpen(false)}
                                                            className={`block px-4 py-2 rounded-lg transition-all duration-300 font-['Montserrat_Alternates'] text-sm ${
                                                                isActive(child.href)
                                                                    ? 'bg-linear-to-r from-firm-orange to-firm-pink text-main shadow-md'
                                                                    : 'text-firm-gray hover:bg-footer'
                                                            }`}
                                                        >
                                                            <div className="flex items-center gap-2">
                                                                {child.icon && renderIcon(child.icon, !!isActive(child.href))}
                                                                {child.name}
                                                            </div>
                                                        </Link>
                                                    </li>
                                                ))}
                                            </ul>
                                        </div>
                                    ) : item.href ? (
                                        <Link
                                            href={item.href}
                                            onClick={() => setSidebarOpen(false)}
                                            className={`flex items-center gap-3 px-4 py-3 rounded-lg transition-all duration-300 font-['Montserrat_Alternates'] ${
                                                isActive(item.href)
                                                    ? 'bg-linear-to-r from-firm-orange to-firm-pink text-main shadow-md'
                                                    : 'text-text hover:bg-footer'
                                            }`}
                                        >
                                            <span className={isActive(item.href) ? 'text-main' : 'text-firm-gray'}>
                                                {renderIcon(item.icon, !!isActive(item.href))}
                                            </span>
                                            <span>{item.name}</span>
                                        </Link>
                                    ) : null}
                                </motion.li>
                            ))}
                        </ul>
                    </nav>

                    <div className="p-4 border-t border-gray-200">
                        <div className="flex items-center justify-between mb-3">
                            <div className="flex items-center gap-3">
                                <div className="w-10 h-10 rounded-full bg-linear-to-r from-firm-orange to-firm-pink flex items-center justify-center text-white font-bold shadow-md">
                                    {session.user?.name?.charAt(0).toUpperCase() || 'A'}
                                </div>
                                <div>
                                    <p className="font-['Montserrat_Alternates'] font-semibold text-text">{session.user?.name || 'Администратор'}</p>
                                    <p className="text-xs text-firm-gray">{session.user?.email}</p>
                                </div>
                            </div>
                        </div>
                        <Link
                            href="/"
                            className="flex items-center justify-center gap-2 w-full py-2 text-sm bg-linear-to-r from-firm-orange to-firm-pink text-white rounded-xl hover:shadow-lg transition-all duration-300"
                        >
                            На сайт →
                        </Link>
                    </div>
                </div>
            </aside>

            {/* Основной контент */}
            <main className="lg:ml-72 min-h-screen">
                <div className="hidden lg:block bg-white border-b border-gray-200 sticky top-0 z-30">
                    <div className="px-6 py-4">
                        <div className="flex items-center justify-between">
                            <nav className="flex items-center gap-2 text-sm">
                                <Link href="/admin/dashboard" className="text-firm-gray hover:text-firm-orange transition font-['Montserrat_Alternates']">Админ</Link>
                                <span className="text-firm-gray">/</span>
                                <span className="text-text font-['Montserrat_Alternates'] font-medium capitalize">{pathname.split('/').pop()?.replace(/-/g, ' ') || 'Дашборд'}</span>
                            </nav>
                            <button onClick={() => setSidebarOpen(!sidebarOpen)} className="p-2 text-firm-gray hover:text-firm-orange transition hover:bg-forms rounded-lg">
                                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 8h16M4 16h16" />
                                </svg>
                            </button>
                        </div>
                    </div>
                </div>
                <div className="p-6">{children}</div>
            </main>
        </div>
    );
}