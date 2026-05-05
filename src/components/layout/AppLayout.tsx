'use client'

import { usePathname } from 'next/navigation'
import Header from './header'
import Footer from './Footer'

export default function AppLayout({ children }: { children: React.ReactNode }) {
    const pathname = usePathname()
    const isAdminPage = pathname?.startsWith('/admin')
    const isAuthPage = pathname?.startsWith('/auth')

    return (
        <div className="min-h-screen flex flex-col">
            {!isAdminPage && <Header />}
            <main className={`flex-1 ${!isAdminPage && !isAuthPage ? "container mx-auto mt-10" : ""}`}>
                {children}
            </main>
            <Footer />
        </div>
    )
}