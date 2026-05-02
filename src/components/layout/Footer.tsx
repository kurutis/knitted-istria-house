'use client'

import Link from "next/link"
import { usePathname } from "next/navigation"
import { motion } from "framer-motion"
import { useState, useEffect } from "react"

export default function Footer() {
    const pathname = usePathname()
    const [isVisible, setIsVisible] = useState(true)

    // Скрываем footer на страницах авторизации и админки
    useEffect(() => {
        const hidePaths = ['/auth/signin', '/auth/signup', '/auth/verify', '/auth/forgot-password', '/auth/reset-password', '/admin']
        const shouldHide = hidePaths.some(path => pathname?.startsWith(path))
        setIsVisible(!shouldHide)
    }, [pathname])

    if (!isVisible) return null

    const footerLinks = {
        masters: [
            { href: "/masters", label: "Мастера" },
            { href: "/about", label: "Изучение" },
            { href: "/master-classes", label: "Мастер-классы" },
            { href: "/blog", label: "Блог" },
        ],
        info: [
            { href: "/contacts", label: "Контакты" },
            { href: "/legal", label: "Юридические данные" },
            { href: "/delivery", label: "Условия доставки" },
            { href: "/security", label: "Система безопасных сделок" },
            { href: "/terms", label: "Пользовательское соглашение" },
        ]
    }

    const currentYear = new Date().getFullYear()

    return (
        <footer className="bg-gradient-to-b from-gray-900 to-gray-950 text-white mt-auto">
            <div className="container mx-auto px-4 py-12">
                <div className="grid grid-cols-1 md:grid-cols-12 gap-8">
                    {/* Логотип и описание */}
                    <div className="md:col-span-4">
                        <Link href="/" className="inline-block">
                            <div className="flex items-center gap-2 mb-4">
                                <div className="w-10 h-10 bg-gradient-to-r from-firm-orange to-firm-pink rounded-xl flex items-center justify-center">
                                    <span className="text-white text-xl">🧶</span>
                                </div>
                                <div>
                                    <div className="font-['Montserrat_Alternates'] font-bold leading-tight">
                                        <span className="text-firm-pink">Дом </span>
                                        <span className="text-firm-orange">вязанных</span>
                                        <br />
                                        <span className="text-firm-pink">историй</span>
                                    </div>
                                </div>
                            </div>
                        </Link>
                        <p className="text-gray-400 text-sm mt-4 leading-relaxed">
                            Платформа для продвижения авторских вязаных изделий. 
                            Соединяем талантливых мастеров с ценителями handmade.
                        </p>
                        <div className="flex gap-4 mt-6">
                            <motion.a
                                whileHover={{ y: -3 }}
                                href="https://t.me/knitted-istria"
                                target="_blank"
                                rel="noopener noreferrer"
                                className="w-10 h-10 rounded-full bg-gray-800 flex items-center justify-center hover:bg-firm-orange transition-colors"
                            >
                                <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                                    <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm4.64 6.8c-.15 1.58-.8 5.42-1.13 7.19-.14.75-.42 1-.68 1.03-.58.05-1.02-.38-1.58-.75-.88-.58-1.38-.94-2.23-1.5-.99-.66-.35-1.02.22-1.61.15-.15 2.79-2.56 2.84-2.78.01-.03.02-.14-.05-.2-.07-.06-.18-.04-.26-.02-.11.02-1.85 1.17-5.22 3.46-.5.34-.94.51-1.35.5-.44-.01-1.29-.25-1.92-.45-.78-.25-1.4-.38-1.35-.81.03-.22.33-.44.92-.67 2.6-1.13 4.34-1.88 5.23-2.25 2.49-1.05 3.01-1.24 3.35-1.24.07 0 .18.01.28.09.09.07.13.17.14.28.01.16-.07.95-.16 1.93z"/>
                                </svg>
                            </motion.a>
                            <motion.a
                                whileHover={{ y: -3 }}
                                href="https://vk.com/knitted-istria"
                                target="_blank"
                                rel="noopener noreferrer"
                                className="w-10 h-10 rounded-full bg-gray-800 flex items-center justify-center hover:bg-firm-orange transition-colors"
                            >
                                <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                                    <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm4.64 6.8c-.15 1.58-.8 5.42-1.13 7.19-.14.75-.42 1-.68 1.03-.58.05-1.02-.38-1.58-.75-.88-.58-1.38-.94-2.23-1.5-.99-.66-.35-1.02.22-1.61.15-.15 2.79-2.56 2.84-2.78.01-.03.02-.14-.05-.2-.07-.06-.18-.04-.26-.02-.11.02-1.85 1.17-5.22 3.46-.5.34-.94.51-1.35.5-.44-.01-1.29-.25-1.92-.45-.78-.25-1.4-.38-1.35-.81.03-.22.33-.44.92-.67 2.6-1.13 4.34-1.88 5.23-2.25 2.49-1.05 3.01-1.24 3.35-1.24.07 0 .18.01.28.09.09.07.13.17.14.28.01.16-.07.95-.16 1.93z"/>
                                </svg>
                            </motion.a>
                            <motion.a
                                whileHover={{ y: -3 }}
                                href="https://instagram.com/knitted-istria"
                                target="_blank"
                                rel="noopener noreferrer"
                                className="w-10 h-10 rounded-full bg-gray-800 flex items-center justify-center hover:bg-firm-pink transition-colors"
                            >
                                <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                                    <path d="M7.8 2h8.4C19.4 2 22 4.6 22 7.8v8.4c0 3.2-2.6 5.8-5.8 5.8H7.8C4.6 22 2 19.4 2 16.2V7.8C2 4.6 4.6 2 7.8 2zm-.2 2C5.6 4 4 5.6 4 7.8v8.4c0 2.2 1.6 3.8 3.8 3.8h8.4c2.2 0 3.8-1.6 3.8-3.8V7.8c0-2.2-1.6-3.8-3.8-3.8H7.6zm8.4 1.5c.8 0 1.5.7 1.5 1.5s-.7 1.5-1.5 1.5-1.5-.7-1.5-1.5.7-1.5 1.5-1.5zM12 8c2.2 0 4 1.8 4 4s-1.8 4-4 4-4-1.8-4-4 1.8-4 4-4zm0 2c-1.1 0-2 .9-2 2s.9 2 2 2 2-.9 2-2-.9-2-2-2z"/>
                                </svg>
                            </motion.a>
                        </div>
                    </div>

                    {/* Мастера */}
                    <div className="md:col-span-2">
                        <h3 className="font-['Montserrat_Alternates'] font-semibold text-lg mb-4 text-firm-orange">
                            Мастерам
                        </h3>
                        <ul className="space-y-2">
                            {footerLinks.masters.map((link) => (
                                <li key={link.href}>
                                    <Link 
                                        href={link.href}
                                        className="text-gray-400 hover:text-firm-pink transition-colors text-sm"
                                    >
                                        {link.label}
                                    </Link>
                                </li>
                            ))}
                        </ul>
                    </div>

                    {/* Информация */}
                    <div className="md:col-span-3">
                        <h3 className="font-['Montserrat_Alternates'] font-semibold text-lg mb-4 text-firm-pink">
                            Информация
                        </h3>
                        <ul className="space-y-2">
                            {footerLinks.info.map((link) => (
                                <li key={link.href}>
                                    <Link 
                                        href={link.href}
                                        className="text-gray-400 hover:text-firm-orange transition-colors text-sm"
                                    >
                                        {link.label}
                                    </Link>
                                </li>
                            ))}
                        </ul>
                    </div>

                    {/* Контакты и подписка */}
                    <div className="md:col-span-3">
                        <h3 className="font-['Montserrat_Alternates'] font-semibold text-lg mb-4 text-firm-orange">
                            Подписка
                        </h3>
                        <p className="text-gray-400 text-sm mb-4">
                            Подпишитесь на рассылку, чтобы первыми узнавать о новинках и акциях
                        </p>
                        <form className="flex flex-col sm:flex-row gap-2">
                            <input
                                type="email"
                                placeholder="Ваш email"
                                className="flex-1 px-4 py-2 rounded-lg bg-gray-800 border border-gray-700 text-white placeholder-gray-500 focus:outline-none focus:border-firm-orange transition-colors text-sm"
                            />
                            <motion.button
                                whileHover={{ scale: 1.02 }}
                                whileTap={{ scale: 0.98 }}
                                type="submit"
                                className="px-4 py-2 bg-gradient-to-r from-firm-orange to-firm-pink text-white rounded-lg text-sm font-medium hover:shadow-lg transition-all"
                            >
                                Подписаться
                            </motion.button>
                        </form>
                        <div className="mt-6 pt-6 border-t border-gray-800">
                            <p className="text-gray-500 text-xs">
                                <span>📞 +7 (495) 123-45-67</span>
                                <br />
                                <span>✉️ info@knitted-istria.ru</span>
                            </p>
                        </div>
                    </div>
                </div>

                {/* Копирайт */}
                <div className="mt-12 pt-8 border-t border-gray-800 text-center">
                    <p className="text-gray-500 text-xs">
                        © {currentYear} Дом вязанных историй. Все права защищены.
                    </p>
                    <p className="text-gray-600 text-xs mt-2">
                        Сайт использует файлы cookie для улучшения работы. Продолжая использовать сайт, вы соглашаетесь с <Link href="/privacy" className="hover:text-firm-orange transition-colors">политикой конфиденциальности</Link>.
                    </p>
                </div>
            </div>
        </footer>
    )
}