// app/profile/orders/[id]/page.tsx
'use client'

import { useSession } from "next-auth/react"
import { useRouter } from "next/navigation"
import { useEffect, useState } from "react"
import Link from "next/link"
import { motion } from "framer-motion"

interface OrderItem {
    id: string
    product_id: string
    product_title: string
    quantity: number
    price: number
    total: number
}

interface Order {
    id: string
    order_number: string
    status: string
    payment_status: string
    total_amount: number
    created_at: string
    subtotal: number
    tax: number
    shipping_cost: number
    discount: number
    buyer_comment: string | null
    shipping_full_name: string
    shipping_phone: string
    shipping_city: string
    shipping_address: string
    shipping_postal_code: string | null
}

export default function OrderDetailPage({ params }: { params: Promise<{ id: string }> }) {
    const { data: session, status } = useSession()
    const router = useRouter()
    const [order, setOrder] = useState<Order | null>(null)
    const [orderItems, setOrderItems] = useState<OrderItem[]>([])
    const [loading, setLoading] = useState(true)

    useEffect(() => {
        if (status === 'loading') return

        if (!session) {
            router.push('/auth/signin?callbackUrl=/profile')
            return
        }

        fetchOrderDetail()
    }, [session, status, router])

    const fetchOrderDetail = async () => {
        try {
            const { id } = await params
            const response = await fetch(`/api/orders/${id}`)
            
            if (!response.ok) {
                throw new Error('Failed to load order')
            }
            
            const data = await response.json()
            setOrder(data.order)
            setOrderItems(data.items || [])
        } catch (error) {
            console.error('Error fetching order:', error)
        } finally {
            setLoading(false)
        }
    }

    const getStatusColor = (status: string) => {
        switch (status) {
            case 'new':
                return 'bg-blue-100 text-blue-700'
            case 'confirmed':
                return 'bg-green-100 text-green-700'
            case 'shipped':
                return 'bg-purple-100 text-purple-700'
            case 'delivered':
                return 'bg-gray-100 text-gray-700'
            case 'cancelled':
                return 'bg-red-100 text-red-700'
            default:
                return 'bg-gray-100 text-gray-700'
        }
    }

    const getStatusText = (status: string) => {
        switch (status) {
            case 'new':
                return 'Новый'
            case 'confirmed':
                return 'Подтвержден'
            case 'shipped':
                return 'Отправлен'
            case 'delivered':
                return 'Доставлен'
            case 'cancelled':
                return 'Отменен'
            default:
                return status
        }
    }

    if (loading) {
        return (
            <div className="flex items-center justify-center min-h-[60vh]">
                <div className="text-center">
                    <div className="w-16 h-16 border-4 border-firm-orange border-t-transparent rounded-full animate-spin mx-auto" />
                    <p className="mt-4 font-['Montserrat_Alternates'] text-gray-600">Загрузка заказа...</p>
                </div>
            </div>
        )
    }

    if (!order) {
        return (
            <div className="flex items-center justify-center min-h-[60vh] px-4">
                <div className="text-center">
                    <p className="text-red-500 mb-4">Заказ не найден</p>
                    <Link href="/profile" className="px-6 py-3 bg-firm-orange text-white rounded-lg inline-block">
                        Вернуться в профиль
                    </Link>
                </div>
            </div>
        )
    }

    return (
        <div className="max-w-4xl mx-auto px-4 py-8">
            {/* Хлебные крошки */}
            <div className="text-sm text-gray-500 mb-6">
                <Link href="/profile" className="hover:text-firm-orange">Профиль</Link>
                <span className="mx-2">/</span>
                <Link href="/profile?tab=orders" className="hover:text-firm-orange">Заказы</Link>
                <span className="mx-2">/</span>
                <span className="text-gray-700">Заказ #{order.order_number}</span>
            </div>

            <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="bg-white rounded-2xl shadow-xl overflow-hidden"
            >
                {/* Заголовок */}
                <div className="bg-gradient-to-r from-firm-orange/10 to-firm-pink/10 p-6 border-b">
                    <div className="flex justify-between items-center flex-wrap gap-4">
                        <div>
                            <h1 className="font-['Montserrat_Alternates'] font-bold text-2xl">
                                Заказ #{order.order_number}
                            </h1>
                            <p className="text-gray-500 mt-1">
                                от {new Date(order.created_at).toLocaleDateString('ru-RU', {
                                    day: '2-digit',
                                    month: '2-digit',
                                    year: 'numeric',
                                    hour: '2-digit',
                                    minute: '2-digit'
                                })}
                            </p>
                        </div>
                        <div className="flex gap-2">
                            <span className={`px-3 py-1 rounded-full text-sm font-medium ${getStatusColor(order.status)}`}>
                                {getStatusText(order.status)}
                            </span>
                            {order.payment_status === 'paid' ? (
                                <span className="px-3 py-1 rounded-full text-sm font-medium bg-green-100 text-green-700">
                                    ✅ Оплачен
                                </span>
                            ) : (
                                <span className="px-3 py-1 rounded-full text-sm font-medium bg-yellow-100 text-yellow-700">
                                    ⏳ Ожидает оплаты
                                </span>
                            )}
                        </div>
                    </div>
                </div>

                <div className="p-6 space-y-6">
                    {/* Товары */}
                    <div>
                        <h2 className="font-['Montserrat_Alternates'] font-semibold text-lg mb-4">Товары в заказе</h2>
                        <div className="space-y-3">
                            {orderItems.map((item) => (
                                <div key={item.id} className="flex justify-between items-center py-3 border-b border-gray-100">
                                    <div className="flex-1">
                                        <Link href={`/catalog/${item.product_id}`} className="font-medium hover:text-firm-orange transition">
                                            {item.product_title}
                                        </Link>
                                        <p className="text-sm text-gray-500">
                                            {item.quantity} шт × {item.price.toLocaleString()} ₽
                                        </p>
                                    </div>
                                    <div className="text-right">
                                        <span className="font-semibold text-firm-orange">
                                            {item.total.toLocaleString()} ₽
                                        </span>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* Адрес доставки */}
                    <div className="bg-gray-50 rounded-xl p-4">
                        <h2 className="font-['Montserrat_Alternates'] font-semibold text-lg mb-3">Адрес доставки</h2>
                        <div className="space-y-1 text-gray-600">
                            <p>{order.shipping_full_name}</p>
                            <p>{order.shipping_phone}</p>
                            <p>{order.shipping_city}, {order.shipping_address}</p>
                            {order.shipping_postal_code && <p>Индекс: {order.shipping_postal_code}</p>}
                        </div>
                        {order.buyer_comment && (
                            <div className="mt-3 pt-3 border-t border-gray-200">
                                <p className="text-sm text-gray-500">Комментарий к заказу:</p>
                                <p className="text-gray-600">{order.buyer_comment}</p>
                            </div>
                        )}
                    </div>

                    {/* Итого */}
                    <div className="bg-gray-50 rounded-xl p-4">
                        <h2 className="font-['Montserrat_Alternates'] font-semibold text-lg mb-3">Детали оплаты</h2>
                        <div className="space-y-2">
                            <div className="flex justify-between">
                                <span className="text-gray-600">Товары:</span>
                                <span>{order.subtotal?.toLocaleString() || (order.total_amount - (order.tax || 0) - (order.shipping_cost || 0) + (order.discount || 0)).toLocaleString()} ₽</span>
                            </div>
                            {order.shipping_cost !== undefined && order.shipping_cost > 0 && (
                                <div className="flex justify-between">
                                    <span className="text-gray-600">Доставка:</span>
                                    <span>{order.shipping_cost.toLocaleString()} ₽</span>
                                </div>
                            )}
                            {order.tax !== undefined && order.tax > 0 && (
                                <div className="flex justify-between">
                                    <span className="text-gray-600">Налог (7%):</span>
                                    <span>{order.tax.toLocaleString()} ₽</span>
                                </div>
                            )}
                            {order.discount !== undefined && order.discount > 0 && (
                                <div className="flex justify-between text-green-600">
                                    <span>Скидка:</span>
                                    <span>- {order.discount.toLocaleString()} ₽</span>
                                </div>
                            )}
                            <div className="flex justify-between pt-2 border-t border-gray-200">
                                <span className="font-semibold">Итого к оплате:</span>
                                <span className="font-bold text-xl text-firm-orange">
                                    {order.total_amount.toLocaleString()} ₽
                                </span>
                            </div>
                        </div>
                    </div>

                    {/* Кнопка возврата */}
                    <div className="flex justify-center">
                        <Link href="/profile?tab=orders">
                            <button className="px-6 py-2 border-2 border-firm-orange text-firm-orange rounded-xl hover:bg-firm-orange hover:text-white transition">
                                ← Вернуться к заказам
                            </button>
                        </Link>
                    </div>
                </div>
            </motion.div>
        </div>
    )
}