'use client'

import { useSession } from "next-auth/react"
import { useRouter } from "next/navigation"
import { useCallback, useEffect, useState } from "react"
import { debounce } from "lodash"

interface User {
    id: string
    name: string
    email: string
    phone: string
    city: string
    role: 'buyer' | 'master' | 'admin'
    role_selected: boolean
    is_verified: boolean
    is_partner: boolean
    is_banned: boolean
    created_at: string
    full_name: string
    avatar_url: string
    master_verified: boolean
    master_partner: boolean
}

interface UsersResponse {
    users: User[]
    total: number
    page: number
    totalPage: number
}

export default function AdminUsersPage() {
    const {data: session, status} = useSession()
    const router = useRouter()
    const [users, setUsers] = useState<User[]>([])
    const [loading, setLoading] = useState(true)
    const [search, setSearch] = useState('')
    const [roleFilter, setRoleFilter] = useState<string>('all')
    const [currentPage, setCurrentPage] = useState(1)
    const [totalPages, setTotalPages] = useState(1)
    const [totalUsers, setTotalUsers] = useState(0)
    const usersPerPage = 10

    useEffect(()=>{
        if (status === 'loading') return

        if (!session || session.user.role !== 'admin'){
            router.push('/auth/signin')
            return
        }

        loadUsers()
    }, [session, status, router, currentPage, roleFilter])

    const debouncedSearch = useCallback(debounce((searchItem: string)=>{setSearch(searchItem); setCurrentPage(1)}, 500), [])

    const loadUsers = async () => {
        try{
            setLoading(true)
            const params = new URLSearchParams({page: currentPage.toString(), limit: usersPerPage.toString(), role: roleFilter, search: search})

            const response = await fetch(`/api/admin/users?${params}`)
            if (!response.ok) throw new Error('Failed to load users')

            const data: UsersResponse = await response.json()
            setUsers(data.users)
            setTotalPages(data.totalPage)
            setTotalUsers(data.total)
        }catch(error){
            console.error('Ошибка загрузки пользователей:', error)
        }finally{
            setLoading(false)
        }
    }

    const handleUpdateStatus = async (userId: string, updates: any) => {
        try{
            const response = await fetch('/api/admin/users', {method: 'PUT', headers: {'Content-Type': 'application/json'}, body: JSON.stringify({userId, updates})})
            if (!response.ok) throw new Error('Failed to update user')

            setUsers(users.map(user => user.id === userId ? {...user, ...updates} : user))
        }catch(error){
            console.error("Ошибка обновления:", error)
        }
    }

    const handleVerifyMaster = async (userId: string) =>{
        if (!confirm("Подтвердить верификацию мастера?")) return
        handleUpdateStatus(userId, {is_verified: true})
    }

    const handleTogglePartner = async (userId: string, currentStatus: boolean)=> {
        handleUpdateStatus(userId, {is_partner: !currentStatus})
    }

    const handleToggleBan = async (userId: string, currentStatus: boolean)=>{
        const action = currentStatus ? 'Разблокировать' : 'Заблокировать'
        if (!confirm(`Вы уверены, что хотите ${action} пользователя?`)) return

        if (currentStatus){
            handleUpdateStatus(userId, {is_banned: false, ban_reason: null})
        }else{
            const reason = prompt('Укажите причину блокировки:')
            if (!reason) return
            handleUpdateStatus(userId, {is_banned: true, ban_reason: reason})
        }
    }

    if (loading && users.length === 0){
        return (
            <div>
                <div>
                    Загрузка пользователей...
                </div>
            </div>
        )
    }

    return(
        <div>
            <div>
                <h1>Управление пользователями</h1>
            </div>

            <div>
                <div>
                    <input type="text" placeholder="Поиск по имени, email или телефону..." onChange={(e)=> debouncedSearch(e.target.value)} />
                    <select value={roleFilter} onChange={(e)=> setRoleFilter(e.target.value)}>
                        <option value="all">Все роли</option>
                        <option value="buyer">Покупатели</option>
                        <option value="master">Мастера</option>
                        <option value="admin">Администраторы</option>
                    </select>
                </div>
            </div>

            <div>
                <div>
                    <table>
                        <thead>
                            <tr>
                                <th>
                                    Пользователь
                                </th>
                                <th>
                                    Контакты
                                </th>
                                <th>
                                    Роль
                                </th>
                                <th>
                                    Статусы
                                </th>
                                <th>
                                    Действия
                                </th>
                            </tr>
                        </thead>
                        <tbody>
                            {users.map((user)=>(
                                <tr key={user.id}>
                                    <td>
                                        <div>
                                            {user.avatar_url ? (
                                            <img src={user.avatar_url} alt={user.name} />
                                            ): (
                                                <div>
                                                    <span>
                                                        {user.name?.charAt(0) || 'U'}
                                                    </span>
                                                </div>
                                            )}
                                            <div>
                                                <div>{user.name || user.full_name}</div>
                                                <div>
                                                    {new Date(user.created_at).toLocaleDateString()}
                                                </div>
                                            </div>
                                        </div>
                                    </td>
                                    <td>
                                        <div>
                                            <div>{user.email}</div>
                                            <div>{user.phone}</div>
                                            <div>{user.city}</div>
                                        </div>
                                    </td>
                                    <td>
                                        <span>
                                            {user.role === 'admin' ? 'Админ' : user.role === 'master' ? 'Мастер' : 'Покупатель'}
                                        </span>
                                    </td>
                                    <td>
                                        <div>
                                            {user.master_verified && (
                                                <span>Верифицирован</span>
                                            )}
                                            {user.master_partner && (
                                                <span>Партнер компании</span>
                                            )}
                                            {user.is_banned && (
                                                <span>Заблокирован</span>
                                            )}
                                        </div>
                                    </td>
                                    <td>
                                        <div>
                                            {user.role === 'master' && !user.is_verified && (
                                                <button onClick={()=>handleVerifyMaster(user.id)}>Верифицировать</button>
                                            )}
                                            {user.role === 'master' && (
                                                <button onClick={()=> handleTogglePartner(user.id, user.is_partner)}>{user.is_partner ? 'Снять партнера' : 'Сделать партнером'}</button>
                                            )}
                                            <button onClick={()=> handleToggleBan(user.id, user.is_banned)}>{user.is_banned ? 'Разблокировать' : 'Заблокировать'}</button>
                                        </div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>

                {totalPages > 1 && (
                    <div>
                        <div>
                            <div>
                                Показано {(currentPage - 1) * usersPerPage + 1}-{Math.min(currentPage*usersPerPage, totalUsers)} из {totalUsers}
                            </div>
                            <div>
                                <button onClick={() => setCurrentPage(prev => Math.max(prev-1, 1))} disabled={currentPage === 1}>Назад</button>
                                {Array.from({ length: totalPages }, (_, i) => i + 1).filter(page => page === 1 || page === totalPages || (page >= currentPage - 1 && page <= currentPage + 1)).map((page, index, array) => (
                                    <>
                                        {index > 0 && page - array[index - 1] > 1 && (
                                            <span key={`ellipsis-${page}`} className="px-2">...</span>
                                        )}
                                        <button
                                            key={page}
                                            onClick={() => setCurrentPage(page)}
                                            className={`px-3 py-1 border rounded ${
                                            currentPage === page ? 'bg-blue-600 text-white' : ''
                                            }`}
                                        >
                                            {page}
                                        </button>
                                    </>
                                ))}
                                <button onClick={()=>setCurrentPage(prev => Math.min(prev + 1, totalPages))} disabled={currentPage === totalPages}>Вперед</button>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </div>
    )
}