'use client'

import { signOut, useSession } from "next-auth/react"
import { useRouter } from "next/navigation"
import { useEffect } from "react"

export const useAuth = (requireAuth = false) => {
    const {data: session, status} = useSession()
    const router = useRouter()
    const isLoading = status === 'loading'

    useEffect(()=>{
        if (!isLoading && requireAuth && !session){
            router.push(`/auth/signin?callbackUrl=${encodeURIComponent(window.location.pathname)}`)
        }

        if (!isLoading && session?.user?.requiresRoleSelection){
            router.push("/auth/role-selection")
        }
    }, [session, isLoading, requireAuth, router])

    const handleSignOut = async () =>{
        await signOut({callbackUrl: "/auth/signin"})
    }

    return {session, isLoading, isAuthenticated: !!session, user: session?.user, signOut: handleSignOut}
}