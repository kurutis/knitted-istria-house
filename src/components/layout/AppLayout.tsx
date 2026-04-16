'use client'

import { usePathname } from 'next/navigation'
import Header from './header'

export default function AppLayout({ children }: { children: React.ReactNode }) {
    const pathname = usePathname()
    const isAdminPage = pathname?.startsWith('/admin')

    return (
        <>
            {!isAdminPage && <Header />}
            <main className={!isAdminPage ? "container mx-auto" : ""}>
                {children}
            </main>
        </>
    )
}