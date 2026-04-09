'use client'

import { useSession } from "next-auth/react"
import { useRouter } from "next/navigation"
import { useEffect, useState } from "react"
import Link from "next/link"
import Image from "next/image"
import { set } from "lodash"

interface Master {
    id: string
    user_id: string
    name: string
    email: string
    phone: string
    city: string
    description: string
    is_verified: boolean
    is_partner: boolean
    created_at: string
    products_count: number
    rating: number
    full_name: string
    avatar_url: string
}

export default function AdminModerationMastersPage(){
    const {data: session, status} = useSession()
    const router = useRouter()
    const [masters, setMasters] = useState<Master[]>([])
    const [loading, setLoading] = useState(true)
    const [actionLoading, setActionLoading] = useState<string | null>(null)

    useEffect(()=>{
        if (status === 'loading') return

        if (!session || session.user.role !== 'admin') {
            router.push('/auth/signin')
            return
        }

        loadMasters()
    }, [session, status, router])

    const loadMasters = async () =>{
        try{
            setLoading(true)
            const response = await fetch('/api/admin/masters')
            if (!response.ok) throw new Error('Failed to load masters')

            const data = await response.json()
            setMasters(data || [])
        }catch(error){
            console.error('Ошибка загрузки мастеров:', error)
        }finally{
            setLoading(false)
        }
    }

    const handleApprove = async (masterId: string) => {
        if (!confirm("Одобрить заявку мастера?")) return;

        setActionLoading(masterId)
        try{
            const response = await fetch(`/api/admin/masters`, {method: 'PUT', headers: {'Content-Type': 'application/json'}, body: JSON.stringify({masterId, action: 'approve'})})

            if(!response.ok) throw new Error('Failed to approve')

            await loadMasters()
        }catch(error){
            console.error('Ошибка при одобрении:', error)
        }finally{
            setActionLoading(null)
        }
    }

    const handleReject = async (masterId: string) => {
        const reason = prompt('Укажите причину отказа:')
        if (!reason) return

        setActionLoading(masterId)
        try{
            const response = await fetch(`/api/admin/masters`, {method: 'PUT', headers: {'Content-Type': 'application/json'}, body: JSON.stringify({masterId, action: 'reject', reason})})

            if (!response.ok) throw new Error('Failed to reject')
            await loadMasters()
        }catch(error){
            console.error('Ошибка при отклонении:', error)
        } finally{
            setActionLoading(null)
        }
    }

    const handleRemoveVerification = async (masterId: string) => {
        if (!confirm('Отозвать верификацию мастера')) return

        setActionLoading(masterId)
        try{
            const response = await fetch(`/api/admin/masters`, {method: 'PUT', headers: {'Content-Type': 'application/json'}, body: JSON.stringify({masterId, action: 'remove_verification'})})

            if (!response.ok) throw new Error('Failed to remove verification')
            await loadMasters()
        }catch(error){
            console.error('Ошибка при отзыве верификации:', error)
        }finally{
            setActionLoading(null)
        }
    }

    if (loading){
        return (
            <div className="flex items-center justify-center min-h-[60vh]">
                <div className="text-center">
                    <div className="w-16 h-16 border-firm-orange border-t-transparent rounded-full animate-spin mx-auto"></div>
                    <p className="mt-4 font-['Montserrat_Alternates'] text-gray-600">Загрузка заявок мастеров...</p>
                </div>
            </div>
        )
    }

    const pendingMasters = masters.filter(m => !m.is_verified)
    const verifiedMasters = masters.filter(m => m.is_verified)

    return(
        <div className="space-y-8">
            <h1 className="font-['Montserrat_Alternates'] font-semibold text-2xl">Модерация мастеров</h1>
            <div className="bg-white rounded-lg shadow-md overflow-hidden">
                <div className="px-6 py-4 border-b border-gray-200 bg-[#eaeaea]">
                    <h2 className="font-['Montserrat_Alternates'] font-semibold text-xl">Ожидают верификации ({pendingMasters.length})</h2>
                </div>
                
                {pendingMasters.length === 0 ? (
                    <div className="p-12 text-center text-gray-500">
                        <p>Нет заявок на верификацию</p>
                    </div>
                ):(
                    <div className="divide-y divide-gray-200">
                        {pendingMasters.map((master) => (
                            <div key={master.id} className="p-6 hover:bg-[#fafafa] transition-colors">
                                <div className="flex justify-between items-start mb-4">
                                    <div className="flex gap-4">
                                        <div className="w-16 h-16 rounded-full bg-linear-to-r from-firm-orange to-firm-pink flex items-center justify-center text-white font-bold text-xl overflow-hidden">
                                            {master.avatar_url ? (<Image src={master.avatar_url} alt={master.name || master.full_name} width={64} height={64} className="object-cover" />):(<span>{master.name?.charAt(0) || master.full_name?.charAt(0) || 'M'}</span>)}
                                        </div>
                                        <div>
                                            <h3 className="font-['Montserrat_Alternates'] font-semibold text-lg">{master.name || master.full_name}</h3>
                                            <p className="flex gap-3 mt-1 text-xs text-gray-400">{master.email}</p>
                                            <div className="flex gap-3 mt-1 text-xs text-gray-400">
                                                <span>{master.phone || 'Телефон не указан'}</span>
                                                <span>{master.city || 'Город не указан'}</span>
                                                <span>Регистрация: {new Date(master.created_at).toLocaleDateString('ru-RU')}</span>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                                {master.description && (<p className="text-gray-600 mb-4 line-clamp-3">{master.description}</p>)}

                                <div className="flex gap-4 mb-4">
                                    <div className="flex items-center gap-1 text-sm">
                                        <span className="text-gray-500">📦 Товаров:</span>
                                        <span className="font-medium">{master.products_count || 0}</span>
                                    </div>
                                    <div className="flex-items-center gap-1 text-sm">
                                        <span className="text-gray-500">⭐ Рейтинг:</span>
                                        <span className="font-medium">{master.rating || 'Нет оценок'}</span>
                                    </div>
                                </div>

                                <div className="flex gap-3">
                                    <button onClick={()=>handleApprove(master.id)} disabled={actionLoading === master.id} className="px-4 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600 transition disabled:opacity-50">{actionLoading === master.id ? 'Обработка...' : 'Одобрить'}</button>
                                    <button onClick={() => handleReject(master.id)} disabled={actionLoading === master.id} className="px-4 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600 transition disabled:opacity-50">Отклонить</button>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>

            <div className="bg-white rounded-lg shadow-md overflow-hidden">
                <div className="px-6 py-4 border-b border-gray-200 bg-[#eaeaea]">
                    <h2 className="font-['Montserrat_Alternates'] font-semibold text-xl">Верифицированные мастера ({verifiedMasters.length})</h2>
                </div>

                <div className="overflow-x-auto"> 
                    <table className="w-full">
                        <thead className="bg-[#eaeaea]">
                            <tr>
                                <th className="text-left p-4">Мастер</th>
                                <th className="text-left p-4">Статистика</th>
                                <th className="text-left p-4">Статус</th>
                                <th className="text-left p-4">Действия</th>
                            </tr>
                        </thead>
                        <tbody>
                            {verifiedMasters.map((master)=>(
                                <tr key={master.id} className="border-b border-gray-200 hover:bg-[#fafafa] transition-colors">
                                    <td className="p-4">
                                        <div className="flex items-center gap-3">
                                            <div className="w-10 h-10 rounded-full bg-gradient-to-r from-firm-orange to-firm-pink flex items-center justify-center text-white font-bold overflow-hidden">
                                                {master.avatar_url ? (<Image src={master.avatar_url} alt={master.name || master.full_name} width={64} height={64} className="object-cover" />):(<span>{master.name?.charAt(0) || master.full_name?.charAt(0) || 'M'}</span>)}{master.avatar_url ? (<Image src={master.avatar_url} alt={master.name || master.full_name} width={64} height={64} className="object-cover" />):(<span>{master.name?.charAt(0) || master.full_name?.charAt(0) || 'M'}</span>)}
                                            </div>
                                            <div>
                                                <div className="font-semibold">{master.name || master.full_name}</div>
                                                <div className="text-sm text-gray-500">{master.email}</div>
                                            </div>
                                        </div>
                                    </td>
                                    <td className="p-4">
                                        <div className="text-sm">
                                            <div>📦 Товаров: {master.products_count || 0}</div>
                                            <div>⭐ Рейтинг: {master.rating || 'Нет'}</div>
                                        </div>
                                    </td>
                                     <td className="p-4">
                                        <div className="flex flex-wrap gap-1">
                                            <span className="px-2 py-1 bg-green-100 text-green-700 rounded-full text-xs">Верифицирован</span>
                                            {master.is_partner && (<span className="px-2 py-1 bg-orange-100 text-orange-700 rounded-full text-xs">Партнер</span>)}
                                        </div>
                                    </td>
                                    <td className="p-4">
                                        <div className="flex gap-2">
                                            <Link href={`/admin/users/${master.user_id}`} className="px-3 py-1 text-sm bg-firm-orange text-white rounded-lg hover:bg-opacity-90 transition">Профиль</Link>
                                            <button onClick={() => handleRemoveVerification(master.id)} disabled={actionLoading === master.id} className="px-3 py-1 text-sm bg-yellow-500 text-white rounded-lg hover:bg-yellow-600 transition disabled:opacity-50">Отозвать</button>
                                        </div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    )
}