'use client'

import { spawn } from "child_process"
import { useSession } from "next-auth/react"
import { useRouter } from "next/navigation"
import { useEffect, useState } from "react"
import Link from "next/link"

interface Master {
    id: string
    user_id: string
    name: string
    email: string
    description: string
    is_verified: boolean
    is_partner: boolean
    created_at: string
    products_count: number
    rating: number
}

export default function AdminModerationMastersPage(){
    const {data: session, status} = useSession()
    const router = useRouter()
    const [masters, setMasters] = useState<Master[]>([])
    const [loading, setLoading] = useState(true)

    useEffect(()=>{
        if (status === 'loading') return

        if (!session || session.user.role !== 'admin') {
            router.push('/auth/signin')
            return
        }

        loadMasters()
    }, [session, status, router])

    const loadMasters = async () =>{
        //дописать
    }

    const handleApprove = async (masterId: string) => {
        if (!confirm("Одобрить заявку мастера?")) return;

        //дописать
    }

    const handleReject = async (masterId: string) => {
        //дописать
    }

    if (loading){
        return (
            <div>
                <div>
                    Загрузка заявок мастеров...
                </div>
            </div>
        )
    }

    const pendingMasters = masters.filter(m => !m.is_verified)
    const verifiedMasters = masters.filter(m => m.is_verified)

    return(
        <div>
            <h1>Модерация мастеров</h1>

            <div>
                <h2>Ожидают верификации ({pendingMasters.length})</h2>

                {pendingMasters.length === 0 ? (
                    <div>
                        <p>Нет заявок на верификацию</p>
                    </div>
                ):(
                    <div>
                        {pendingMasters.map((master) => (
                            <div key={master.id}>
                                <div>
                                    <div>
                                        <h3>{master.name}</h3>
                                        <p>{master.email}</p>
                                    </div>
                                    <div>
                                        {new Date(master.created_at).toLocaleDateString()}
                                    </div>
                                </div>

                                <p>{master.description}</p>

                                <div>
                                    <div>
                                        <span>Товаров</span> {master.rating || 'Нет отзывов'}
                                    </div>
                                </div>

                                <div>
                                    <button onClick={()=> handleApprove(master.id)}>Одобрить</button>
                                    <button onClick={()=> handleReject(master.id)}>Отклонить</button>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>

            <div>
                <h2>Верифицированные мастера ({verifiedMasters.length})</h2>

                <div>
                    <table>
                        <thead>
                            <tr>
                                <th>Мастер</th>
                                <th>Статистика</th>
                                <th>Статус</th>
                                <th>Действия</th>
                            </tr>
                        </thead>
                        <tbody>
                            {verifiedMasters.map((master)=>(
                                <tr key={master.id}>
                                    <td>
                                        <div>
                                            <div>{master.name}</div>
                                            <div>{master.email}</div>
                                        </div>
                                    </td>
                                    <td>
                                        <div>
                                            <div>Товаров {master.products_count}</div>
                                            <div>Рейтинг {master.rating}</div>
                                        </div>
                                    </td>
                                    <td>
                                        <div>
                                            <span>Верифицирован</span>
                                            {master.is_partner && (
                                                <span>Партнер компании</span>
                                            )}
                                        </div>
                                    </td>
                                    <td>
                                        <div>
                                            <Link href={`/admin/users/${master.user_id}`}>Профиль</Link>
                                            <button onClick={()=> handleReject(master.id)}>Отозвать</button>
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