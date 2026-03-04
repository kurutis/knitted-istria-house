'use client'

import { useSession } from "next-auth/react"
import { useRouter } from "next/navigation"
import React, { useEffect, useState } from "react"

interface Yarn {
    id: string
    name: string
    article: string
    brand: string
    color: string
    composition: string
    weight: number
    length: number
    price: number
    in_stock: boolean
    stock_quantity: number
    image_url: string
    description: string
    created_at: string
}

export default function AdminCatalogYarnPage() {
    const {data: session, status} = useSession()
    const router = useRouter()
    const [loading, setLoading] = useState(true)
    const [yarns, setYarns] = useState<Yarn[]>([])
    const [showAddForm, setShowAddForm] = useState(false)
    const [editingYarn, setEditingYarn] = useState<Yarn | null>(null)

    const [formData, setFormData] = useState({name: '', article: '', brand: '', color: '', composition: '', weight: 100, length: 400, price: 0, in_stock: true, stock_quantity: 0, image_url: '', description: ''})

    useEffect(()=>{
        if (status === 'loading') return

        if (!session || session.user.role !== 'admin'){
            router.push('/auth/signin')
            return
        }

        loadYarns()
    }, [session, status, router])

    const loadYarns = async () => {
        try{
            const response  = await fetch('/api/admin/yarn')
            if (!response.ok) throw new Error('Failed to load yarn')

            const data = await response.json()
            setYarns(data)
        }catch(error){
            console.error('Ошибка загрузки пряжи:', error)
        }finally{
            setLoading(false)
        }
    }

    const handleSumbit = async (e: React.FormEvent) => {
        e.preventDefault()

        try{
            if(editingYarn){
                const response = await fetch('/api/admin/yarn', {method: 'PUT', headers: {'Content-Type': 'application/json'}, body: JSON.stringify({id: editingYarn.id, ...formData})})

                if(!response.ok) throw new Error('Failed to update yarn')
                const updatedYarn = await response.json()
                setYarns(yarns.map(y => y.id === updatedYarn.id ?  updatedYarn : y))
            }else{
                const response = await fetch('/api/admin/yarn', {method: 'POST', headers: {'Content-Type': 'application/json'}, body: JSON.stringify(formData)})

                if(!response.ok) throw new Error('Failed to add yarn')
                
                const newYarn = await response.json()
                setYarns([newYarn, ...yarns])
            }

            resetForm()
        } catch (error){
            alert(`Ошибка сохрвнения пряжи: ${error}`)
        }
    }

    const handleDelete = async (id: string) => {
        if (!confirm('Удалить эту пряжу?')) return

        try{
            const response = await fetch(`/api/admin/yarn?id=${id}`, {method: 'DELETE'})
            
            if (!response.ok) throw new Error('Failed to delete yarn')
            setYarns(yarns.filter(y => y.id !== id))
        }catch(error){
            alert(`Ошибка удаления пряжи: ${error}`)
        }
    }

    const resetForm = () => {setFormData({name: '', article: '', brand: '', color: '', composition: '', weight: 100, length: 400, price: 0, in_stock: true, stock_quantity: 0, image_url: '', description: ''}); setEditingYarn(null); setShowAddForm(false)}

    const startEdit = (yarn: Yarn) => {
        setEditingYarn(yarn)
        setFormData({name: yarn.name, article: yarn.article, brand: yarn.brand || '', color: yarn.color || '', composition: yarn.composition || '', weight: yarn.weight || 100, length: yarn.length || 400, price: yarn.price || 0, in_stock: yarn.in_stock, stock_quantity: yarn.stock_quantity || 0, image_url: yarn.image_url || '', description: yarn.description || ''})
        setShowAddForm(true)
    }

    if (loading) {
        return (
            <div>
                <div>Загрузка...</div>
            </div>
        )
    }

    return(
        <div>
            <div>
                <h1>каталог пряжи</h1>
                <button onClick={()=>setShowAddForm(!showAddForm)}>{showAddForm ? 'Скрыть форму' : '+ Добавить пряжу'}</button>
            </div>
            {showAddForm && (
                <div>
                    <h2>{editingYarn ? 'Редактирование пряжи' : 'Добавление пряжи'}</h2>
                    <form onSubmit={handleSumbit}>
                        <div>
                            <div>
                                <label>Название *</label>
                                <input type="text" required value={formData.name} onChange={(e) => setFormData({...formData, name: e.target.value})} />
                            </div>
                            <div>
                                <label>Артикул *</label>
                                <input type="text" required value={formData.article} onChange={(e)=> setFormData({...formData, article: e.target.value})} />
                            </div>
                            <div>
                                <label>Бренд</label>
                                <input type="text" value={formData.brand} onChange={(e)=> setFormData({...formData, brand: e.target.value})} />
                            </div>
                            <div>
                                <label>Цвет</label>
                                <input type="text" value={formData.color} onChange={(e)=> setFormData({...formData, color: e.target.value})} />
                            </div>
                            <div>
                                <label>Состав</label>
                                <input type="text" value={formData.composition} onChange={(e)=> setFormData({...formData, composition: e.target.value})} />
                            </div>
                            <div>
                                <label>Вес (г)</label>
                                <input type="number" value={formData.weight} onChange={(e)=> setFormData({...formData, weight: parseInt(e.target.value)})} />
                            </div>
                            <div>
                                <label>Длинна (м)</label>
                                <input type="number" value={formData.length} onChange={(e) => setFormData({...formData, length: parseInt(e.target.value)})} />
                            </div>
                            <div>
                                <label>Цена (руб)</label>
                                <input type="number" step="0.01" value={formData.price} onChange={(e) => setFormData({...formData, price: parseFloat(e.target.value)})} />
                            </div>
                            <div>
                                <label>В наличии</label>
                                <select value={formData.in_stock.toString()} onChange={(e)=> setFormData({...formData, in_stock: e.target.value === 'true'})}>
                                    <option value="true">Да</option>
                                    <option value="false">Нет</option>
                                </select>
                            </div>
                            <div>
                                <label>Количество на складе</label>
                                <input type="number" value={formData.stock_quantity} onChange={(e)=> setFormData({...formData, stock_quantity: parseInt(e.target.value)})} />
                            </div>
                            <div>
                                <label>URL изображения</label>
                                <input type="text" value={formData.image_url} onChange={(e)=> setFormData({...formData, image_url: e.target.value})} />
                            </div>
                            <div>
                                <label>Описание</label>
                                <textarea value={formData.description} onChange={(e)=> setFormData({...formData, description: e.target.value})} rows={3} />
                            </div>
                        </div>
                        <div>
                            <button type="submit">{editingYarn ? 'Сохранить изменения' : 'Добавить пряжу'}</button>
                            <button type="button" onClick={resetForm}>Отмена</button>
                        </div>
                    </form>
                </div>
            )}

            <div>
                <div>
                    <table>
                        <thead>
                            <tr>
                                <th>Артикул</th>
                                <th>Название</th>
                                <th>Бренд</th>
                                <th>Состав</th>
                                <th>Цена</th>
                                <th>Наличие</th>
                                <th>Действия</th>
                            </tr>
                        </thead>
                        <tbody>
                            {yarns.map((yarn) => (
                                <tr key={yarn.id}>
                                    <td>{yarn.article}</td>
                                    <td>
                                        <div>{yarn.name}</div>
                                        <div>{yarn.color}</div>
                                    </td>
                                    <td>{yarn.brand || '-'}</td>
                                    <td>{yarn.composition || '-'}</td>
                                    <td>{yarn.price.toFixed(2)} руб.</td>
                                    <td>
                                        <span>{yarn.in_stock ?  `В наличии (${yarn.stock_quantity})` : 'Нет в наличии'}</span>
                                    </td>
                                    <td>
                                        <div>
                                            <button onClick={()=> startEdit(yarn)}>Редактирование</button>
                                            <button onClick={()=> handleDelete(yarn.id)}>Удалить</button>
                                        </div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
                {yarns.length === 0 && (
                    <div>Пряжа не найдена. Добавьте первую позицию.</div>
                )}
            </div>
        </div>
    )
}