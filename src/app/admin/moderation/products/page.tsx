'use client'

import { useSession } from "next-auth/react"
import { useRouter } from "next/navigation"
import { useEffect, useState } from "react"

export default function AdminModerationProductsPage() {
    const {data: session, status} = useSession()
    const router = useRouter()
    const [loading, setLoading] = useState(true)

    useEffect(()=>{
        if (status === 'loading') return

        if (!session || session.user.role !== 'admin'){
            router.push('/auth/signin')
            return
        }

        setLoading(false)
    }, [session, status, router])

    if(loading) return <div>Загрузка...</div>

    return (
        <div>
            <h1>Модерация товаров</h1>
        </div>
    )
}