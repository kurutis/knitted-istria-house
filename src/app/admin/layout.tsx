"use client"

import { useSession } from "next-auth/react";
import { usePathname, useRouter } from "next/navigation";
import React, { useEffect, useState } from "react";
import Link from "next/link"

export default function AdminLayout({children}:React.ReactNode){
    const {data: session, status} = useSession()
    const router = useRouter()
    const pathname = usePathname()
    const [sidebarOpen, setSidebarOpen] = useState(false)
    
    // useEffect(() => {
    //     if (status === 'loading') return

    //     if (!session) {
    //         router.push('/auth/signin?callbackUrl=/admin')
    //         return
    //     }

    //     if (session.user.role !== 'admin'){
    //         router.push('/')
    //     }
    // }, [session, status, router])

    if (status === 'loading'){
        return(
            <div>
                <div>
                    Загрузка админ панели
                </div>
            </div>
        )
    }

    // if (!session || session.user.role !== 'admin'){
    //     return null
    // }

    const navigation = [{name: 'Дашборд', href: '/admin/dashboard', icon: "📊"}, {name: 'Пользователи', href: '/admin/users', icon: "👥"}, {name: 'Модерация', icon: "✅", children: [{name: 'Мастера', href: '/admin/moderation/masters'}, {name: 'Товары', href:'/admin/moderation/products'}, {name: 'Блог', href: '/admin/moderation/blog'}]}, {name: 'Категории', icon: '📁', children:[{name: 'Пряжа', href: '/admin/catalog/yarn'}, {name: 'Категории', href: '/admin/catalog/categories'}]}]
    const isActive = (href: string) => pathname === href
    
    return(
        <>
            <div>
                <div>
                    <button onClick={()=>setSidebarOpen(!sidebarOpen)}>☰</button>
                </div>
            </div>
            <div>
                <div>
                    <h1>Админ панель</h1>
                    <p>Дом Вязанных историй</p>
                </div>

                <nav>
                    <ul>
                        {navigation.map((item)=>(
                            <li key={item.name}>
                                {item.children ? (
                                    <div>
                                        <div>
                                            <span>{item.icon}</span>
                                            {item.name}
                                        </div>
                                        <ul>
                                            {item.children.map((child)=>(
                                                <li key={child.name}>
                                                    <Link href={child.href} onClick={()=> setSidebarOpen(false)}>{child.name}</Link>
                                                </li>
                                            ))}
                                        </ul>
                                    </div>
                                ) : (
                                    <Link href={item.href} onClick={()=>setSidebarOpen(false)}>
                                        <span>{item.icon}</span>
                                        {item.name}
                                    </Link>
                                )}
                            </li>
                        ))}
                    </ul>
                </nav>

                <div>
                    <div>
                        <div>
                            {/* <p>{session.user.name}</p> */}
                            <p>Администратор</p>
                        </div>
                        <Link href="/">На сайт →</Link>
                    </div>
                </div>
            </div>

            <div>
                <div>
                    <div>
                        <nav>
                            <ol>
                                <li>
                                    <Link href="/admin/dashboard">Админ</Link>
                                </li>
                                <li>
                                    <span>/</span>
                                </li>
                                <li>
                                    {pathname.split('/').pop()?.replace('-', ' ') || 'Дашбоард'}
                                </li>
                            </ol>
                        </nav>
                    </div>
                    {children}
                </div>
            </div>
        </>
    )
}