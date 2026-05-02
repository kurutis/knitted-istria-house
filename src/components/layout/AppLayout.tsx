'use client'

import { usePathname } from 'next/navigation'
import Header from './header'

export default function AppLayout({ children }: { children: React.ReactNode }) {
    const pathname = usePathname()
    const isAdminPage = pathname?.startsWith('/admin')
    const isAuthPage = pathname?.startsWith('/auth')

    return (
        <>
            {!isAdminPage && <Header />}
            <main className={!isAdminPage && !isAuthPage ? "container mx-auto mb-5" : ""}>
                {children}
            </main>
        </>
    )
}