'use client'

import BuyerProfile from "@/components/profile/BuyerProfile"
import MasterProfile from "@/components/profile/MasterProfile"
import LoadingSpinner from "@/components/ui/LoadingSpinner"
import { useSession } from "next-auth/react"
import { useRouter, useSearchParams } from "next/navigation" 
import { useEffect, useState, Suspense } from "react"

function ProfileContent() {
    const { data: session, status } = useSession()
    const router = useRouter()
    const searchParams = useSearchParams()
    const tabParam = searchParams.get('tab')
    const [loading, setLoading] = useState(true)

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
        return <MasterProfile session={session} />
    }

    return <BuyerProfile session={session} initialTab={tabParam === 'profile' ? 'profile' : undefined} />
}

export default function ProfilePage() {
    return (
        <Suspense fallback={<LoadingSpinner />}>
            <ProfileContent />
        </Suspense>
    )
}