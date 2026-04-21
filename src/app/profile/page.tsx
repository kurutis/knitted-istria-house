'use client'

import BuyerProfile from "@/components/profile/BuyerProfile"
import MasterProfile from "@/components/profile/MasterProfile"
import LoadingSpinner from "@/components/ui/LoadingSpinner"
import { useSession } from "next-auth/react"
import { useRouter } from "next/navigation" 
import { useEffect, useState } from "react"

export default function ProfilePage() {
    const {data: session, status} = useSession()
    const router = useRouter()
    const [loading, setLoading] = useState(true)

    // Добавьте логирование для отладки
    console.log("Session:", session)
    console.log("User role:", session?.user?.role)

    useEffect(() => {
        if (status === 'unauthenticated') {
            router.push('/auth/signin')
        } else if (status === 'authenticated') {
            setLoading(false)
        }
    }, [status, router])

    if (loading) {
        return <LoadingSpinner />
    }

    const userRole = session?.user?.role || session?.user?.userRole || session?.role
    
    if (userRole === 'master') {
        console.log("Rendering MasterProfile")
        return <MasterProfile session={session} />
    }

    console.log("Rendering BuyerProfile")
    return <BuyerProfile session={session} />
}